/**
 * GET /api/get-user-nfts?wallet=xxx
 * Get all NFTs minted by a specific wallet
 */

import { getMintsByWallet } from './_lib/db.js';
import { isValidSolanaAddress } from './_lib/validation.js';
import { getAccountExplorerUrl } from './_lib/solana.js';

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
    const { wallet } = req.query;

    if (!wallet) {
      return res.status(400).json({
        success: false,
        error: 'wallet query parameter is required',
      });
    }

    // Validate wallet address
    const validation = isValidSolanaAddress(wallet);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: `Invalid wallet address: ${validation.error}`,
      });
    }

    // Get mints from database
    const mints = await getMintsByWallet(wallet);

    // Format response
    const network = process.env.SOLANA_NETWORK || 'devnet';

    return res.status(200).json({
      success: true,
      wallet,
      count: mints.length,
      nfts: mints.map(mint => ({
        nftAddress: mint.nft_mint_address,
        artworkSlug: mint.artwork_slug,
        editionNumber: mint.edition_number,
        amountPaid: mint.amount_paid,
        timestamp: mint.created_at,
        explorerUrl: getAccountExplorerUrl(mint.nft_mint_address, network),
      })),
    });
  } catch (error) {
    console.error('Error in get-user-nfts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user NFTs',
    });
  }
}
