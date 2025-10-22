/**
 * POST /api/mint-nft
 * Main NFT minting endpoint - verifies payment and mints NFT
 */

import { validateMintRequest } from './_lib/validation.js';
import { verifyPaymentTransaction, solToLamports, getExplorerUrl, getAccountExplorerUrl } from './_lib/solana.js';
import { mintCoreAsset, mintEditionAsset, getRoyaltyBasisPoints } from './_lib/metaplex.js';
import {
  recordMint,
  getMintBySignature,
  getArtworkBySlug,
  incrementMintCount,
  isArtworkSoldOut
} from './_lib/db.js';
import { applyRateLimit } from './_lib/rate-limit.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if store is enabled
    const storeEnabled = process.env.STORE_ENABLED !== 'false';
    if (!storeEnabled) {
      return res.status(503).json({
        success: false,
        error: 'Store is temporarily disabled',
      });
    }

    // Validate request body
    const validation = validateMintRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error,
      });
    }

    const { walletAddress, transactionSignature, artworkSlug, quantity } = validation.data;

    // Apply rate limiting
    const rateLimit = applyRateLimit(req, walletAddress);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: rateLimit.error,
        retryAfter: rateLimit.retryAfter,
      });
    }

    console.log('Mint request:', {
      wallet: walletAddress,
      signature: transactionSignature,
      artwork: artworkSlug,
    });

    // 1. Check if transaction already used
    let existingMint;
    try {
      existingMint = await getMintBySignature(transactionSignature);
      if (existingMint) {
        return res.status(400).json({
          success: false,
          error: 'This transaction has already been used for minting',
          mint: {
            address: existingMint.nft_mint_address,
            timestamp: existingMint.created_at,
          },
        });
      }
    } catch (dbError) {
      console.warn('Database check failed:', dbError.message);
    }

    // 2. Get artwork details
    let artwork;
    try {
      artwork = await getArtworkBySlug(artworkSlug);
    } catch (dbError) {
      // Fallback to config file
      const { readFileSync } = await import('fs');
      const { parse } = await import('yaml');
      const { join } = await import('path');
      const configPath = join(process.cwd(), 'store-config.yml');
      const configFile = readFileSync(configPath, 'utf8');
      const config = parse(configFile);
      artwork = config.artworks?.find(a => a.slug === artworkSlug);

      if (artwork) {
        // Convert config format to database format
        artwork = {
          slug: artwork.slug,
          title: artwork.title,
          type: artwork.type,
          price_sol: artwork.price_sol,
          max_supply: artwork.max_supply,
          minted_count: artwork.minted_count || 0,
          metadata_uri: artwork.ipfs_metadata_uri,
          is_active: artwork.available !== false,
        };
      }
    }

    if (!artwork) {
      return res.status(404).json({
        success: false,
        error: 'Artwork not found',
      });
    }

    if (!artwork.is_active) {
      return res.status(400).json({
        success: false,
        error: 'This artwork is not available for minting',
      });
    }

    // 3. Check if sold out
    try {
      const soldOut = await isArtworkSoldOut(artworkSlug);
      if (soldOut) {
        return res.status(400).json({
          success: false,
          error: 'This artwork is sold out',
        });
      }
    } catch (error) {
      console.warn('Could not check sold out status:', error.message);
    }

    // 4. Verify payment transaction
    const treasuryWallet = process.env.TREASURY_WALLET_PUBLIC_KEY;
    if (!treasuryWallet) {
      return res.status(500).json({
        success: false,
        error: 'Payment configuration missing',
      });
    }

    const expectedAmountLamports = solToLamports(artwork.price_sol * quantity);

    console.log('Verifying payment:', {
      signature: transactionSignature,
      recipient: treasuryWallet,
      expectedAmount: expectedAmountLamports,
    });

    const verification = await verifyPaymentTransaction(
      transactionSignature,
      treasuryWallet,
      expectedAmountLamports
    );

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: `Payment verification failed: ${verification.error}`,
      });
    }

    console.log('Payment verified successfully');

    // 5. Mint the NFT
    if (!artwork.metadata_uri) {
      return res.status(400).json({
        success: false,
        error: 'Artwork metadata not uploaded to IPFS yet',
      });
    }

    let mintResult;
    const royaltyBasisPoints = getRoyaltyBasisPoints();

    if (artwork.type === '1of1') {
      // Mint 1/1 asset
      mintResult = await mintCoreAsset({
        ownerAddress: walletAddress,
        name: artwork.title,
        uri: artwork.metadata_uri,
        sellerFeeBasisPoints: royaltyBasisPoints,
      });
    } else if (artwork.type === 'edition') {
      // Mint edition asset
      const editionNumber = (artwork.minted_count || 0) + 1;
      mintResult = await mintEditionAsset({
        ownerAddress: walletAddress,
        name: artwork.title,
        uri: artwork.metadata_uri,
        editionNumber,
        sellerFeeBasisPoints: royaltyBasisPoints,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid artwork type',
      });
    }

    console.log('NFT minted successfully:', mintResult);

    // 6. Record mint in database
    try {
      await recordMint({
        transactionSignature,
        userWallet: walletAddress,
        nftId: artwork.slug,
        nftMintAddress: mintResult.mintAddress,
        amountPaid: verification.amount,
        artworkSlug: artwork.slug,
        editionNumber: mintResult.editionNumber || null,
      });

      // Update mint count
      await incrementMintCount(artwork.slug);

      console.log('Mint recorded in database');
    } catch (dbError) {
      console.error('Failed to record mint in database:', dbError);
      // Continue anyway - the NFT was minted successfully
    }

    // 7. Return success
    const network = process.env.SOLANA_NETWORK || 'devnet';

    return res.status(200).json({
      success: true,
      mint: {
        address: mintResult.mintAddress,
        signature: mintResult.signature,
        explorerUrl: getAccountExplorerUrl(mintResult.mintAddress, network),
      },
      transaction: {
        signature: transactionSignature,
        explorerUrl: getExplorerUrl(transactionSignature, network),
      },
      artwork: {
        title: artwork.title,
        slug: artwork.slug,
        editionNumber: mintResult.editionNumber,
      },
    });
  } catch (error) {
    console.error('Error in mint-nft:', error);
    return res.status(500).json({
      success: false,
      error: 'NFT minting failed',
      details: error.message,
    });
  }
}
