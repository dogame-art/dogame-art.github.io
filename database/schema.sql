-- ============================================
-- DOGAME NFT STORE - SUPABASE DATABASE SCHEMA
-- ============================================
-- Run this SQL in your Supabase SQL editor to create tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MINTS TABLE
-- Records every NFT mint transaction
-- ============================================
CREATE TABLE IF NOT EXISTS mints (
  id SERIAL PRIMARY KEY,
  transaction_signature TEXT UNIQUE NOT NULL,
  user_wallet TEXT NOT NULL,
  nft_id TEXT NOT NULL,
  nft_mint_address TEXT NOT NULL,
  amount_paid BIGINT NOT NULL, -- Amount in lamports
  artwork_slug TEXT NOT NULL,
  edition_number INTEGER, -- NULL for 1/1s
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes for performance
  CONSTRAINT unique_transaction UNIQUE (transaction_signature)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_mints_user_wallet ON mints(user_wallet);
CREATE INDEX IF NOT EXISTS idx_mints_artwork_slug ON mints(artwork_slug);
CREATE INDEX IF NOT EXISTS idx_mints_created_at ON mints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mints_nft_mint_address ON mints(nft_mint_address);

-- ============================================
-- ARTWORKS TABLE
-- NFT inventory and configuration
-- ============================================
CREATE TABLE IF NOT EXISTS artworks (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('1of1', 'edition')),
  price_sol NUMERIC(10, 4) NOT NULL,
  max_supply INTEGER, -- NULL for open editions
  minted_count INTEGER DEFAULT 0,
  metadata_uri TEXT,
  image TEXT,
  is_active BOOLEAN DEFAULT true,
  collection_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_price CHECK (price_sol > 0),
  CONSTRAINT valid_supply CHECK (max_supply IS NULL OR max_supply > 0),
  CONSTRAINT valid_minted_count CHECK (minted_count >= 0)
);

-- Index for active artworks
CREATE INDEX IF NOT EXISTS idx_artworks_active ON artworks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_artworks_type ON artworks(type);

-- ============================================
-- STORED PROCEDURE: Increment Mint Count
-- Safely increments the minted_count for an artwork
-- ============================================
CREATE OR REPLACE FUNCTION increment_mint_count(artwork_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE artworks
  SET
    minted_count = minted_count + 1,
    updated_at = NOW()
  WHERE slug = artwork_slug;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Configure these based on your security needs
-- ============================================

-- Enable RLS on tables
ALTER TABLE mints ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;

-- Allow public read access to artworks
CREATE POLICY "Allow public read on artworks"
  ON artworks
  FOR SELECT
  TO public
  USING (is_active = true);

-- Allow public read access to mints
CREATE POLICY "Allow public read on mints"
  ON mints
  FOR SELECT
  TO public
  USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access to mints"
  ON mints
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow service role full access to artworks"
  ON artworks
  FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- INITIAL DATA (Optional)
-- Seed with artworks from store-config.yml
-- ============================================

INSERT INTO artworks (slug, title, description, type, price_sol, max_supply, is_active) VALUES
  ('FlowerPower', 'Flower Power', 'Power from beauty - A unique 1/1 digital artwork', '1of1', 0.1, 1, false),
  ('PortalOverflow', 'Portal Overflow', 'Sometimes the unknown is meant to stay that way - 1/1 NFT', '1of1', 0.15, 1, false),
  ('WindowShopping', 'Window Shopping', 'Sometimes it is nice to look at it before you buy it - Limited edition of 100', 'edition', 0.05, 100, false),
  ('ChickenHead', 'Chicken Head', 'A unique vision waiting to be revealed', '1of1', 0.2, 1, false)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- ANALYTICS VIEWS (Optional)
-- Useful for dashboards and reporting
-- ============================================

-- Total sales summary
CREATE OR REPLACE VIEW sales_summary AS
SELECT
  COUNT(*) as total_mints,
  SUM(amount_paid) as total_revenue_lamports,
  SUM(amount_paid) / 1000000000.0 as total_revenue_sol,
  COUNT(DISTINCT user_wallet) as unique_buyers,
  MIN(created_at) as first_mint,
  MAX(created_at) as last_mint
FROM mints;

-- Sales by artwork
CREATE OR REPLACE VIEW sales_by_artwork AS
SELECT
  m.artwork_slug,
  a.title,
  a.type,
  COUNT(*) as mints,
  SUM(m.amount_paid) / 1000000000.0 as revenue_sol,
  a.price_sol as price_per_mint,
  a.max_supply,
  a.minted_count
FROM mints m
JOIN artworks a ON m.artwork_slug = a.slug
GROUP BY m.artwork_slug, a.title, a.type, a.price_sol, a.max_supply, a.minted_count
ORDER BY mints DESC;

-- Recent mints
CREATE OR REPLACE VIEW recent_mints AS
SELECT
  m.id,
  m.user_wallet,
  m.artwork_slug,
  a.title as artwork_title,
  m.nft_mint_address,
  m.amount_paid / 1000000000.0 as amount_sol,
  m.edition_number,
  m.created_at
FROM mints m
JOIN artworks a ON m.artwork_slug = a.slug
ORDER BY m.created_at DESC
LIMIT 100;

-- ============================================
-- INSTRUCTIONS
-- ============================================
--
-- 1. Copy this entire SQL script
-- 2. Go to your Supabase project dashboard
-- 3. Navigate to SQL Editor
-- 4. Paste and run this script
-- 5. Verify tables were created in Table Editor
-- 6. Update your .env file with Supabase credentials
--
-- Note: The artworks will be set to is_active = false initially.
-- After uploading to IPFS, update them:
--
-- UPDATE artworks
-- SET metadata_uri = 'ipfs://...', is_active = true
-- WHERE slug = 'FlowerPower';
