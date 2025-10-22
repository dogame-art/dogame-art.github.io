/**
 * POST /api/verify-payment
 * Verifies a Solana payment transaction before minting
 */

import { isValidTransactionSignature } from './_lib/validation.js';
import { verifyPaymentTransaction, solToLamports, getExplorerUrl } from './_lib/solana.js';
import { getMintBySignature, getArtworkBySlug } from './_lib/db.js';
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
    const { transactionSignature, artworkSlug } = req.body;

    // Validate inputs
    if (!transactionSignature) {
      return res.status(400).json({
        success: false,
        error: 'transactionSignature is required',
      });
    }

    if (!artworkSlug) {
      return res.status(400).json({
        success: false,
        error: 'artworkSlug is required',
      });
    }

    // Validate signature format
    const sigValidation = isValidTransactionSignature(transactionSignature);
    if (!sigValidation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid transaction signature: ${sigValidation.error}`,
      });
    }

    // Apply rate limiting
    const rateLimit = applyRateLimit(req);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        error: rateLimit.error,
        retryAfter: rateLimit.retryAfter,
      });
    }

    // Check if signature already used
    try {
      const existingMint = await getMintBySignature(transactionSignature);
      if (existingMint) {
        return res.status(400).json({
          success: false,
          error: 'This transaction has already been used for minting',
          used: true,
        });
      }
    } catch (dbError) {
      console.warn('Database check failed, continuing:', dbError.message);
    }

    // Get artwork details to verify price
    let artwork;
    try {
      artwork = await getArtworkBySlug(artworkSlug);
    } catch (dbError) {
      // Fallback to config file
      try {
        const { readFileSync } = await import('fs');
        const { parse } = await import('yaml');
        const { join } = await import('path');
        const configPath = join(process.cwd(), 'store-config.yml');
        const configFile = readFileSync(configPath, 'utf8');
        const config = parse(configFile);
        artwork = config.artworks?.find(a => a.slug === artworkSlug);

        if (artwork) {
          artwork.price_sol = artwork.price_sol;
        }
      } catch (configError) {
        console.error('Failed to load artwork from config:', configError);
      }
    }

    if (!artwork) {
      return res.status(404).json({
        success: false,
        error: 'Artwork not found',
      });
    }

    // Verify the transaction
    const treasuryWallet = process.env.TREASURY_WALLET_PUBLIC_KEY;
    if (!treasuryWallet) {
      console.error('TREASURY_WALLET_PUBLIC_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'Payment verification not configured',
      });
    }

    const expectedAmountLamports = solToLamports(artwork.price_sol);

    const verification = await verifyPaymentTransaction(
      transactionSignature,
      treasuryWallet,
      expectedAmountLamports
    );

    if (!verification.valid) {
      return res.status(400).json({
        success: false,
        error: verification.error,
        verified: false,
      });
    }

    // Payment verified successfully
    const network = process.env.SOLANA_NETWORK || 'devnet';

    return res.status(200).json({
      success: true,
      verified: true,
      transaction: {
        signature: transactionSignature,
        amount: verification.amount,
        explorerUrl: getExplorerUrl(transactionSignature, network),
      },
      artwork: {
        slug: artwork.slug,
        title: artwork.title,
        price: artwork.price_sol,
      },
    });
  } catch (error) {
    console.error('Error in verify-payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Payment verification failed',
      details: error.message,
    });
  }
}
