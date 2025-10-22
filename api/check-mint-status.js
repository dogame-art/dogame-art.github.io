/**
 * GET /api/check-mint-status?signature=xxx
 * Check the status of a mint by transaction signature
 */

import { getMintBySignature } from './_lib/db.js';
import { isValidTransactionSignature } from './_lib/validation.js';
import { getExplorerUrl, getAccountExplorerUrl } from './_lib/solana.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { signature } = req.query;

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'signature query parameter is required',
      });
    }

    // Validate signature format
    const validation = isValidTransactionSignature(signature);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid signature: ${validation.error}`,
      });
    }

    // Look up mint record
    const mint = await getMintBySignature(signature);

    if (!mint) {
      return res.status(404).json({
        success: false,
        error: 'Mint not found',
        signature,
      });
    }

    // Return mint details
    const network = process.env.SOLANA_NETWORK || 'devnet';

    return res.status(200).json({
      success: true,
      mint: {
        nftAddress: mint.nft_mint_address,
        userWallet: mint.user_wallet,
        artworkSlug: mint.artwork_slug,
        editionNumber: mint.edition_number,
        amountPaid: mint.amount_paid,
        timestamp: mint.created_at,
        transactionSignature: mint.transaction_signature,
        explorerUrls: {
          transaction: getExplorerUrl(mint.transaction_signature, network),
          nft: getAccountExplorerUrl(mint.nft_mint_address, network),
        },
      },
    });
  } catch (error) {
    console.error('Error in check-mint-status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to check mint status',
    });
  }
}
