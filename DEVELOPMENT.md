# Dogame NFT Store - Development Guide

Complete guide for setting up, testing, and deploying the NFT store.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [IPFS Upload](#ipfs-upload)
6. [Local Development](#local-development)
7. [Deployment](#deployment)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts

- **GitHub**: Version control and hosting
- **Vercel**: Serverless deployment platform
- **Helius**: Solana RPC provider ([helius.dev](https://helius.dev))
- **Pinata**: IPFS file storage ([pinata.cloud](https://pinata.cloud))
- **Supabase**: PostgreSQL database ([supabase.com](https://supabase.com))

### Solana Wallets

You need 3 Solana wallets:

1. **Mint Authority**: Signs NFT minting transactions
2. **Treasury**: Receives payment from customers
3. **Update Authority**: Can update NFT metadata

### Local Tools

```bash
# Node.js (v18+)
node --version

# Git
git --version

# Vercel CLI (for local dev)
npm install -g vercel
```

---

## Initial Setup

### 1. Clone & Install Dependencies

```bash
# Clone your repository
git clone https://github.com/YOUR_USERNAME/dogame-art.github.io.git
cd dogame-art.github.io

# Install dependencies
npm install
```

### 2. Create Solana Wallets

```bash
# Install Solana CLI (optional but recommended)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Create wallets
solana-keygen new --outfile mint-authority.json
solana-keygen new --outfile treasury.json
solana-keygen new --outfile update-authority.json

# Get addresses
solana-keygen pubkey mint-authority.json
solana-keygen pubkey treasury.json
solana-keygen pubkey update-authority.json

# Fund wallets on devnet
solana airdrop 2 $(solana-keygen pubkey mint-authority.json) --url devnet
solana airdrop 2 $(solana-keygen pubkey treasury.json) --url devnet
```

---

## Environment Configuration

### 1. Create .env File

```bash
cp .env.example .env
```

### 2. Fill in Environment Variables

Edit `.env` with your actual values:

#### Solana Configuration

```bash
# Convert mint authority keypair to base58
# You'll need to use a script or tool for this
MINT_AUTHORITY_PRIVATE_KEY=<base58_encoded_private_key>

# Public keys (addresses)
TREASURY_WALLET_PUBLIC_KEY=<treasury_wallet_address>
UPDATE_AUTHORITY_PUBLIC_KEY=<update_authority_address>

# Network settings
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
```

#### IPFS (Pinata)

1. Go to [pinata.cloud](https://pinata.cloud)
2. Sign up / Log in
3. Navigate to Account → API Keys
4. Create new API key with pinning permissions
5. Copy API Key and Secret

```bash
PINATA_API_KEY=your_api_key_here
PINATA_SECRET_KEY=your_secret_key_here
PINATA_GATEWAY=gateway.pinata.cloud
```

#### Database (Supabase)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Navigate to Settings → API
4. Copy values:

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
```

#### Store Configuration

```bash
ROYALTY_PERCENTAGE=5
STORE_ENABLED=true
```

### 3. Set Environment Variables in Vercel

```bash
# Login to Vercel
vercel login

# Link your project
vercel link

# Add each environment variable
vercel env add MINT_AUTHORITY_PRIVATE_KEY
vercel env add TREASURY_WALLET_PUBLIC_KEY
vercel env add UPDATE_AUTHORITY_PUBLIC_KEY
vercel env add SOLANA_RPC_URL
vercel env add SOLANA_NETWORK
vercel env add PINATA_API_KEY
vercel env add PINATA_SECRET_KEY
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel env add ROYALTY_PERCENTAGE
vercel env add STORE_ENABLED

# Choose "production", "preview", and "development" for each
```

---

## Database Setup

### 1. Create Supabase Tables

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Open `database/schema.sql` from this repo
4. Copy entire contents
5. Paste into SQL Editor
6. Click **Run**

### 2. Verify Tables Created

Navigate to **Table Editor** and confirm:
- `mints` table exists
- `artworks` table exists
- Sample artworks are inserted

### 3. Update RLS Policies (Optional)

Row Level Security policies are already set for public read access.
Modify `database/schema.sql` if you need different security rules.

---

## IPFS Upload

Before artworks can be minted, they must be uploaded to IPFS.

### 1. Prepare Artwork

Make sure artwork exists in your repo:
```bash
ls art/FlowerPower.jpg  # Should exist
```

### 2. Run Upload Script

```bash
# Upload specific artwork
npm run upload:ipfs -- --artwork FlowerPower

# The script will:
# 1. Upload image to IPFS
# 2. Generate metadata JSON
# 3. Upload metadata to IPFS
# 4. Update store-config.yml with URIs
```

### 3. Verify Upload

Check `store-config.yml` - these fields should now be filled:
```yaml
artworks:
  - slug: "FlowerPower"
    ipfs_image_uri: "https://gateway.pinata.cloud/ipfs/Qm..."
    ipfs_metadata_uri: "https://gateway.pinata.cloud/ipfs/Qm..."
```

### 4. Enable Artwork for Sale

In `store-config.yml`:
```yaml
  - slug: "FlowerPower"
    available: true  # Change to true
```

### 5. Sync to Database (Optional)

If using Supabase, update the artwork:
```sql
UPDATE artworks
SET
  metadata_uri = 'https://gateway.pinata.cloud/ipfs/Qm...',
  is_active = true
WHERE slug = 'FlowerPower';
```

---

## Local Development

### 1. Start Development Server

```bash
# Start Vercel dev server (runs API functions)
npm run dev

# Or directly:
vercel dev
```

Server runs at `http://localhost:3000`

### 2. Test API Endpoints

```bash
# Get artworks
curl http://localhost:3000/api/get-artworks

# Verify payment (replace with real tx signature)
curl -X POST http://localhost:3000/api/verify-payment \
  -H "Content-Type: application/json" \
  -d '{"transactionSignature": "...", "artworkSlug": "FlowerPower"}'
```

### 3. Test Frontend

1. Open `http://localhost:3000/store/` in browser
2. Connect Phantom wallet (set to devnet)
3. Try minting an NFT
4. Check Solana Explorer for transactions

---

## Deployment

### 1. Deploy to Vercel

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### 2. Verify Deployment

1. Visit your deployed URL
2. Check `/store/` page loads
3. Test wallet connection
4. Attempt to mint on devnet

### 3. Switch to Mainnet (When Ready)

Update environment variables in Vercel:
```bash
SOLANA_NETWORK=mainnet-beta
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

Then redeploy:
```bash
vercel --prod
```

---

## Testing

### Testing Checklist

#### Frontend Tests
- [ ] Store page loads
- [ ] Artworks display correctly
- [ ] Filter tabs work
- [ ] Wallet connects (Phantom)
- [ ] Wallet disconnects
- [ ] Modal opens on NFT click
- [ ] Modal closes properly

#### Minting Flow Tests
- [ ] Payment transaction created
- [ ] User approves transaction
- [ ] Payment confirmed on Solana
- [ ] NFT minted successfully
- [ ] NFT appears in user's wallet
- [ ] Database updated with mint
- [ ] Explorer links work

#### Error Handling Tests
- [ ] Insufficient balance
- [ ] User rejects transaction
- [ ] Network errors
- [ ] Sold out artwork
- [ ] Invalid transaction
- [ ] Rate limiting works

### Manual Testing Script

```bash
# 1. Connect wallet
# 2. Check balance (needs at least 0.2 SOL)
# 3. Select NFT
# 4. Confirm modal details
# 5. Approve payment
# 6. Wait for confirmation
# 7. Wait for minting
# 8. Check success
# 9. View on explorer
# 10. Verify in Phantom wallet
```

---

## Troubleshooting

### Common Issues

#### 1. "Transaction signature verification failed"

**Cause**: Transaction not confirmed yet
**Solution**: Wait longer, or increase confirmation level in code

#### 2. "Mint authority not configured"

**Cause**: `MINT_AUTHORITY_PRIVATE_KEY` not set correctly
**Solution**: Verify base58 encoding of private key

#### 3. "Failed to fetch artworks"

**Cause**: Database not set up or API endpoint failing
**Solution**:
- Check Supabase connection
- Verify tables exist
- Check `store-config.yml` exists

#### 4. "Insufficient funds"

**Cause**: Wallet doesn't have enough SOL
**Solution**:
- Devnet: `solana airdrop 2 <address> --url devnet`
- Mainnet: Send SOL to wallet

#### 5. "Artwork metadata not uploaded"

**Cause**: IPFS upload not completed
**Solution**: Run `npm run upload:ipfs -- --artwork <slug>`

#### 6. Wallet won't connect

**Cause**: Phantom not installed or wrong network
**Solution**:
- Install Phantom
- Switch to correct network (devnet/mainnet)
- Refresh page

### Debug Mode

Add console logging:
```javascript
// In store.js, add:
console.log('Debug:', { wallet, artwork, signature });
```

Check browser console for errors.

### API Debugging

Check Vercel function logs:
```bash
vercel logs <deployment-url>
```

---

## Next Steps

After successful setup:

1. ✅ Test minting on devnet thoroughly
2. ✅ Upload all artworks to IPFS
3. ✅ Set artworks to `available: true`
4. ✅ Get mainnet RPC from Helius
5. ✅ Switch environment to mainnet
6. ✅ Fund mainnet treasury wallet
7. ✅ Deploy to production
8. ✅ Test one mint on mainnet
9. ✅ Announce to community!

---

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/dogame-art.github.io/issues)
- **Solana Docs**: [docs.solana.com](https://docs.solana.com)
- **Metaplex Docs**: [developers.metaplex.com](https://developers.metaplex.com)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)

---

**Built with Claude Code**
