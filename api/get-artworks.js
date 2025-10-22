/**
 * GET /api/get-artworks
 * Returns all available artworks for the NFT store
 */

import { getAvailableArtworks } from './_lib/db.js';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { join } from 'path';

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
    // Try to get from database first
    let artworks;

    try {
      artworks = await getAvailableArtworks();

      // If we have artworks in database, return them
      if (artworks && artworks.length > 0) {
        return res.status(200).json({
          success: true,
          source: 'database',
          artworks: artworks.map(formatArtwork),
        });
      }
    } catch (dbError) {
      console.warn('Database not available, falling back to config file:', dbError.message);
    }

    // Fallback to store-config.yml if database is empty or unavailable
    try {
      const configPath = join(process.cwd(), 'store-config.yml');
      const configFile = readFileSync(configPath, 'utf8');
      const config = parse(configFile);

      if (!config.artworks || !Array.isArray(config.artworks)) {
        return res.status(200).json({
          success: true,
          source: 'config',
          artworks: [],
        });
      }

      // Filter only available artworks
      artworks = config.artworks
        .filter(art => art.available !== false)
        .map(art => ({
          slug: art.slug,
          title: art.title,
          description: art.description || '',
          image: art.image,
          type: art.type,
          price_sol: art.price_sol,
          max_supply: art.max_supply || null,
          minted_count: art.minted_count || 0,
          metadata_uri: art.ipfs_metadata_uri || null,
          is_active: true,
        }));

      return res.status(200).json({
        success: true,
        source: 'config',
        artworks: artworks.map(formatArtwork),
      });
    } catch (configError) {
      console.error('Error reading config file:', configError);

      // Return empty array if both sources fail
      return res.status(200).json({
        success: true,
        source: 'none',
        artworks: [],
        message: 'No artworks configured yet',
      });
    }
  } catch (error) {
    console.error('Error in get-artworks:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch artworks',
    });
  }
}

/**
 * Format artwork for API response
 * @param {object} artwork - Raw artwork object
 * @returns {object} - Formatted artwork
 */
function formatArtwork(artwork) {
  return {
    slug: artwork.slug,
    title: artwork.title,
    description: artwork.description || '',
    image: artwork.image,
    type: artwork.type,
    priceSol: artwork.price_sol,
    maxSupply: artwork.max_supply,
    mintedCount: artwork.minted_count || 0,
    available: artwork.is_active && !isSoldOut(artwork),
    metadataUri: artwork.metadata_uri,
    remaining: getRemainingSupply(artwork),
  };
}

/**
 * Check if artwork is sold out
 * @param {object} artwork - Artwork object
 * @returns {boolean} - True if sold out
 */
function isSoldOut(artwork) {
  if (artwork.type === '1of1') {
    return artwork.minted_count >= 1;
  }

  if (artwork.type === 'edition' && artwork.max_supply) {
    return artwork.minted_count >= artwork.max_supply;
  }

  return false;
}

/**
 * Get remaining supply
 * @param {object} artwork - Artwork object
 * @returns {number|null} - Remaining supply or null for open editions
 */
function getRemainingSupply(artwork) {
  if (artwork.type === '1of1') {
    return artwork.minted_count >= 1 ? 0 : 1;
  }

  if (artwork.type === 'edition' && artwork.max_supply) {
    return Math.max(0, artwork.max_supply - artwork.minted_count);
  }

  return null; // Open edition
}
