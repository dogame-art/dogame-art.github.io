/**
 * Database Utilities using Supabase
 * Handles all database operations for NFT store
 */

import { createClient } from '@supabase/supabase-js';

// Cached Supabase client
let supabase = null;

/**
 * Get or create Supabase client
 * @returns {SupabaseClient} - Supabase client instance
 */
export function getSupabaseClient() {
  if (supabase) {
    return supabase;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured in environment variables');
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return supabase;
}

/**
 * Record a new NFT mint in the database
 * @param {object} params - Mint record parameters
 * @param {string} params.transactionSignature - Payment transaction signature
 * @param {string} params.userWallet - Buyer's wallet address
 * @param {string} params.nftId - NFT identifier
 * @param {string} params.nftMintAddress - NFT mint address on Solana
 * @param {number} params.amountPaid - Amount paid in lamports
 * @param {string} params.artworkSlug - Artwork slug
 * @param {number} params.editionNumber - Edition number (null for 1/1s)
 * @returns {Promise<object>} - Inserted record
 */
export async function recordMint({
  transactionSignature,
  userWallet,
  nftId,
  nftMintAddress,
  amountPaid,
  artworkSlug,
  editionNumber = null,
}) {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('mints')
      .insert({
        transaction_signature: transactionSignature,
        user_wallet: userWallet,
        nft_id: nftId,
        nft_mint_address: nftMintAddress,
        amount_paid: amountPaid,
        artwork_slug: artworkSlug,
        edition_number: editionNumber,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error recording mint:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in recordMint:', error);
    throw error;
  }
}

/**
 * Get mint record by transaction signature
 * @param {string} signature - Transaction signature
 * @returns {Promise<object|null>} - Mint record or null
 */
export async function getMintBySignature(signature) {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('mints')
      .select('*')
      .eq('transaction_signature', signature)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching mint by signature:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getMintBySignature:', error);
    throw error;
  }
}

/**
 * Get all mints by a wallet address
 * @param {string} walletAddress - Wallet address
 * @returns {Promise<Array>} - Array of mint records
 */
export async function getMintsByWallet(walletAddress) {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('mints')
      .select('*')
      .eq('user_wallet', walletAddress)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mints by wallet:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getMintsByWallet:', error);
    throw error;
  }
}

/**
 * Get artwork by slug
 * @param {string} slug - Artwork slug
 * @returns {Promise<object|null>} - Artwork record or null
 */
export async function getArtworkBySlug(slug) {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('artworks')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error fetching artwork by slug:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getArtworkBySlug:', error);
    throw error;
  }
}

/**
 * Get all available artworks
 * @param {string} type - Filter by type ('1of1' | 'edition' | null)
 * @returns {Promise<Array>} - Array of artwork records
 */
export async function getAvailableArtworks(type = null) {
  try {
    const client = getSupabaseClient();

    let query = client
      .from('artworks')
      .select('*')
      .eq('is_active', true);

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching available artworks:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAvailableArtworks:', error);
    throw error;
  }
}

/**
 * Update mint count for an artwork (for editions)
 * @param {string} slug - Artwork slug
 * @returns {Promise<object>} - Updated artwork record
 */
export async function incrementMintCount(slug) {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client.rpc('increment_mint_count', {
      artwork_slug: slug,
    });

    if (error) {
      console.error('Error incrementing mint count:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in incrementMintCount:', error);
    throw error;
  }
}

/**
 * Create or update an artwork record
 * @param {object} artwork - Artwork data
 * @returns {Promise<object>} - Artwork record
 */
export async function upsertArtwork(artwork) {
  try {
    const client = getSupabaseClient();

    const { data, error } = await client
      .from('artworks')
      .upsert(
        {
          slug: artwork.slug,
          title: artwork.title,
          type: artwork.type,
          price_sol: artwork.price_sol,
          max_supply: artwork.max_supply || null,
          metadata_uri: artwork.metadata_uri || null,
          is_active: artwork.is_active !== false,
          minted_count: artwork.minted_count || 0,
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting artwork:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in upsertArtwork:', error);
    throw error;
  }
}

/**
 * Get total mints count
 * @returns {Promise<number>} - Total number of mints
 */
export async function getTotalMintsCount() {
  try {
    const client = getSupabaseClient();

    const { count, error } = await client
      .from('mints')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error getting total mints count:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getTotalMintsCount:', error);
    throw error;
  }
}

/**
 * Get mints count for a specific artwork
 * @param {string} slug - Artwork slug
 * @returns {Promise<number>} - Number of mints for this artwork
 */
export async function getArtworkMintsCount(slug) {
  try {
    const client = getSupabaseClient();

    const { count, error } = await client
      .from('mints')
      .select('*', { count: 'exact', head: true })
      .eq('artwork_slug', slug);

    if (error) {
      console.error('Error getting artwork mints count:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getArtworkMintsCount:', error);
    throw error;
  }
}

/**
 * Check if artwork has reached max supply
 * @param {string} slug - Artwork slug
 * @returns {Promise<boolean>} - True if sold out
 */
export async function isArtworkSoldOut(slug) {
  try {
    const artwork = await getArtworkBySlug(slug);

    if (!artwork) {
      throw new Error('Artwork not found');
    }

    // 1/1s are sold out after 1 mint
    if (artwork.type === '1of1') {
      return artwork.minted_count >= 1;
    }

    // Editions check against max_supply
    if (artwork.type === 'edition' && artwork.max_supply) {
      return artwork.minted_count >= artwork.max_supply;
    }

    // Open editions never sell out
    return false;
  } catch (error) {
    console.error('Error checking if artwork is sold out:', error);
    throw error;
  }
}

export default {
  getSupabaseClient,
  recordMint,
  getMintBySignature,
  getMintsByWallet,
  getArtworkBySlug,
  getAvailableArtworks,
  incrementMintCount,
  upsertArtwork,
  getTotalMintsCount,
  getArtworkMintsCount,
  isArtworkSoldOut,
};
