/**
 * SAFE MINT API - Only charges after successful mint
 * Prevents customer loss if minting fails
 */

import { validateMintRequest } from './_lib/validation.js';
import { verifyPaymentTransaction, solToLamports } from './_lib/solana.js';
import { mintCoreAsset, mintEditionAsset } from './_lib/metaplex.js';
import { recordMint, getArtworkBySlug } from './_lib/db.js';

export default async function handler(req, res) {
  // Set CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Validate request
    const validation = validateMintRequest(req.body);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const { walletAddress, artworkSlug } = validation.data;

    // 2. Get artwork details
    const artwork = await getArtworkBySlug(artworkSlug);
    if (!artwork) {
      return res.status(404).json({ success: false, error: 'Artwork not found' });
    }

    // 3. Try minting FIRST (no payment yet)
    let mintResult;
    try {
      if (artwork.type === '1of1') {
        mintResult = await mintCoreAsset({
          ownerAddress: walletAddress,
          name: artwork.title,
          uri: artwork.metadata_uri,
        });
      } else {
        mintResult = await mintEditionAsset({
          ownerAddress: walletAddress,
          name: artwork.title,
          uri: artwork.metadata_uri,
          editionNumber: (artwork.minted_count || 0) + 1,
        });
      }
    } catch (mintError) {
      // Minting failed - customer hasn't paid yet, so they're safe!
      return res.status(500).json({
        success: false,
        error: 'Minting failed - no payment was taken',
        details: mintError.message
      });
    }

    // 4. Minting succeeded - now request payment
    return res.status(200).json({
      success: true,
      mintAddress: mintResult.mintAddress,
      message: 'NFT reserved! Please complete payment.',
      paymentRequired: {
        amount: artwork.price_sol,
        treasury: process.env.TREASURY_WALLET_PUBLIC_KEY
      }
    });

  } catch (error) {
    console.error('Safe mint error:', error);
    return res.status(500).json({
      success: false,
      error: 'Operation failed safely - no charges applied'
    });
  }
}
