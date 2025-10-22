#!/usr/bin/env node

/**
 * Upload artwork to IPFS using Pinata
 * Usage: node scripts/upload-to-ipfs.js --artwork ArtworkSlug
 */

import { readFileSync, writeFileSync } from 'fs';
import { parse, stringify } from 'yaml';
import { PinataSDK } from 'pinata-web3';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get artwork slug from command line
const args = process.argv.slice(2);
const artworkIndex = args.indexOf('--artwork');

if (artworkIndex === -1 || !args[artworkIndex + 1]) {
  console.error('Usage: node scripts/upload-to-ipfs.js --artwork <slug>');
  console.error('Example: node scripts/upload-to-ipfs.js --artwork FlowerPower');
  process.exit(1);
}

const artworkSlug = args[artworkIndex + 1];

// Initialize Pinata
const pinataApiKey = process.env.PINATA_API_KEY;
const pinataSecretKey = process.env.PINATA_SECRET_KEY;

if (!pinataApiKey || !pinataSecretKey) {
  console.error('Error: PINATA_API_KEY and PINATA_SECRET_KEY must be set in .env file');
  process.exit(1);
}

const pinata = new PinataSDK({
  pinataJwt: pinataApiKey,
  pinataGateway: process.env.PINATA_GATEWAY || 'gateway.pinata.cloud',
});

async function main() {
  try {
    console.log(`\n=€ Uploading "${artworkSlug}" to IPFS...\n`);

    // 1. Read store-config.yml
    console.log('=Ö Reading store-config.yml...');
    const configPath = './store-config.yml';
    const configFile = readFileSync(configPath, 'utf8');
    const config = parse(configFile);

    // 2. Find artwork
    const artwork = config.artworks.find(a => a.slug === artworkSlug);
    if (!artwork) {
      console.error(`L Artwork "${artworkSlug}" not found in store-config.yml`);
      process.exit(1);
    }

    console.log(` Found artwork: ${artwork.title}`);

    // 3. Upload image to IPFS
    console.log(`\n=ø Uploading image to IPFS...`);
    const imagePath = `./${artwork.image}`;

    try {
      const imageFile = readFileSync(imagePath);
      const imageUpload = await pinata.upload.file(imageFile, {
        name: `${artworkSlug}-image`,
        metadata: {
          keyvalues: {
            artwork: artworkSlug,
            type: 'image',
          },
        },
      });

      const imageUri = `https://${process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'}/ipfs/${imageUpload.IpfsHash}`;
      console.log(` Image uploaded: ${imageUri}`);

      artwork.ipfs_image_uri = imageUri;
    } catch (err) {
      console.error(`L Failed to upload image:`, err.message);
      process.exit(1);
    }

    // 4. Generate metadata JSON
    console.log(`\n=Ý Generating metadata...`);
    const metadata = {
      name: artwork.title,
      description: artwork.description,
      image: artwork.ipfs_image_uri,
      external_url: `https://dogame.art/main/${artworkSlug}`,
      attributes: [
        {
          trait_type: 'Artist',
          value: 'Dogame',
        },
        {
          trait_type: 'Type',
          value: artwork.type === '1of1' ? '1 of 1' : 'Edition',
        },
        {
          trait_type: 'Year',
          value: new Date().getFullYear(),
        },
      ],
      properties: {
        category: 'image',
        files: [
          {
            uri: artwork.ipfs_image_uri,
            type: 'image/jpeg',
          },
        ],
        creators: [
          {
            address: process.env.UPDATE_AUTHORITY_PUBLIC_KEY || 'PLACEHOLDER',
            share: 100,
          },
        ],
      },
      seller_fee_basis_points: parseInt(process.env.ROYALTY_PERCENTAGE || '5') * 100,
    };

    console.log('Metadata:', JSON.stringify(metadata, null, 2));

    // 5. Upload metadata to IPFS
    console.log(`\n=ä Uploading metadata to IPFS...`);
    try {
      const metadataUpload = await pinata.upload.json(metadata, {
        name: `${artworkSlug}-metadata`,
        metadata: {
          keyvalues: {
            artwork: artworkSlug,
            type: 'metadata',
          },
        },
      });

      const metadataUri = `https://${process.env.PINATA_GATEWAY || 'gateway.pinata.cloud'}/ipfs/${metadataUpload.IpfsHash}`;
      console.log(` Metadata uploaded: ${metadataUri}`);

      artwork.ipfs_metadata_uri = metadataUri;
    } catch (err) {
      console.error(`L Failed to upload metadata:`, err.message);
      process.exit(1);
    }

    // 6. Update store-config.yml
    console.log(`\n=¾ Updating store-config.yml...`);
    const updatedConfig = stringify(config);
    writeFileSync(configPath, updatedConfig);
    console.log(' Configuration updated');

    // 7. Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`<‰ Successfully uploaded "${artwork.title}" to IPFS!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Image URI:    ${artwork.ipfs_image_uri}`);
    console.log(`Metadata URI: ${artwork.ipfs_metadata_uri}`);
    console.log(`\n Artwork is ready for minting!`);
    console.log(`\nNext steps:`);
    console.log(`1. Set available: true in store-config.yml`);
    console.log(`2. Deploy to production: vercel --prod`);
    console.log(`3. Test minting on ${process.env.SOLANA_NETWORK || 'devnet'}`);
    console.log('');
  } catch (error) {
    console.error('\nL Upload failed:', error);
    process.exit(1);
  }
}

main();
