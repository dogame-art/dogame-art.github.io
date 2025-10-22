/**
 * Metaplex Core NFT Minting Utilities
 * Handles NFT creation using Metaplex Core standard
 */

import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity, generateSigner, publicKey } from '@metaplex-foundation/umi';
import { create, createCollection, fetchAssetsByOwner } from '@metaplex-foundation/mpl-core';
import bs58 from 'bs58';
import { getConnection } from './solana.js';

// Cached UMI instance
let umi = null;

/**
 * Initialize and get UMI instance
 * @returns {Umi} - UMI instance configured with mint authority
 */
export function getUmi() {
  if (umi) {
    return umi;
  }

  // Get RPC URL from environment
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  // Initialize UMI
  umi = createUmi(rpcUrl);

  // Load mint authority keypair from environment
  const mintAuthorityPrivateKey = process.env.MINT_AUTHORITY_PRIVATE_KEY;

  if (!mintAuthorityPrivateKey) {
    throw new Error('MINT_AUTHORITY_PRIVATE_KEY environment variable not set');
  }

  try {
    // Decode base58 private key
    const secretKey = bs58.decode(mintAuthorityPrivateKey);

    // Create keypair from secret key
    const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);

    // Create signer
    const signer = createSignerFromKeypair(umi, keypair);

    // Set as identity
    umi.use(signerIdentity(signer));

    console.log('UMI initialized with mint authority:', keypair.publicKey);

    return umi;
  } catch (error) {
    console.error('Error initializing UMI:', error);
    throw new Error(`Failed to initialize Metaplex UMI: ${error.message}`);
  }
}

/**
 * Mint a 1/1 Core NFT
 * @param {object} params - Minting parameters
 * @param {string} params.ownerAddress - Recipient wallet address
 * @param {string} params.name - NFT name
 * @param {string} params.uri - Metadata URI (IPFS or Arweave)
 * @param {number} params.sellerFeeBasisPoints - Royalty (500 = 5%)
 * @returns {Promise<{ mintAddress: string, signature: string }>}
 */
export async function mintCoreAsset({
  ownerAddress,
  name,
  uri,
  sellerFeeBasisPoints = 500, // 5% default royalty
}) {
  try {
    const umiInstance = getUmi();

    // Generate new asset keypair
    const asset = generateSigner(umiInstance);

    // Get update authority from env or use mint authority
    const updateAuthority = process.env.UPDATE_AUTHORITY_PUBLIC_KEY
      ? publicKey(process.env.UPDATE_AUTHORITY_PUBLIC_KEY)
      : umiInstance.identity.publicKey;

    console.log('Minting Core Asset:', {
      asset: asset.publicKey,
      owner: ownerAddress,
      name,
      uri,
    });

    // Create the Core asset
    const result = await create(umiInstance, {
      asset,
      name,
      uri,
      owner: publicKey(ownerAddress),
      updateAuthority,
      plugins: [
        {
          type: 'Royalties',
          data: {
            basisPoints: sellerFeeBasisPoints,
            creators: [
              {
                address: umiInstance.identity.publicKey,
                percentage: 100,
              },
            ],
            ruleSet: publicKey('EveryHere11111111111111111111111111111111111'), // Allow all marketplaces
          },
        },
      ],
    }).sendAndConfirm(umiInstance);

    console.log('Core Asset minted successfully:', {
      mintAddress: asset.publicKey,
      signature: bs58.encode(result.signature),
    });

    return {
      mintAddress: asset.publicKey,
      signature: bs58.encode(result.signature),
    };
  } catch (error) {
    console.error('Error minting Core Asset:', error);
    throw new Error(`Failed to mint NFT: ${error.message}`);
  }
}

/**
 * Create a collection for editions (optional)
 * @param {object} params - Collection parameters
 * @param {string} params.name - Collection name
 * @param {string} params.uri - Collection metadata URI
 * @returns {Promise<{ collectionAddress: string, signature: string }>}
 */
export async function createCoreCollection({ name, uri }) {
  try {
    const umiInstance = getUmi();

    // Generate collection keypair
    const collection = generateSigner(umiInstance);

    // Get update authority
    const updateAuthority = process.env.UPDATE_AUTHORITY_PUBLIC_KEY
      ? publicKey(process.env.UPDATE_AUTHORITY_PUBLIC_KEY)
      : umiInstance.identity.publicKey;

    console.log('Creating Core Collection:', {
      collection: collection.publicKey,
      name,
      uri,
    });

    // Create the collection
    const result = await createCollection(umiInstance, {
      collection,
      name,
      uri,
      updateAuthority,
    }).sendAndConfirm(umiInstance);

    console.log('Collection created successfully:', {
      collectionAddress: collection.publicKey,
      signature: bs58.encode(result.signature),
    });

    return {
      collectionAddress: collection.publicKey,
      signature: bs58.encode(result.signature),
    };
  } catch (error) {
    console.error('Error creating collection:', error);
    throw new Error(`Failed to create collection: ${error.message}`);
  }
}

/**
 * Mint an edition from a collection
 * @param {object} params - Minting parameters
 * @param {string} params.ownerAddress - Recipient wallet address
 * @param {string} params.name - NFT name (with edition number)
 * @param {string} params.uri - Metadata URI
 * @param {string} params.collectionAddress - Collection address (optional)
 * @param {number} params.editionNumber - Edition number
 * @param {number} params.sellerFeeBasisPoints - Royalty
 * @returns {Promise<{ mintAddress: string, signature: string }>}
 */
export async function mintEditionAsset({
  ownerAddress,
  name,
  uri,
  collectionAddress = null,
  editionNumber,
  sellerFeeBasisPoints = 500,
}) {
  try {
    const umiInstance = getUmi();

    // Generate new asset keypair
    const asset = generateSigner(umiInstance);

    // Add edition number to name
    const editionName = `${name} #${editionNumber}`;

    // Get update authority
    const updateAuthority = process.env.UPDATE_AUTHORITY_PUBLIC_KEY
      ? publicKey(process.env.UPDATE_AUTHORITY_PUBLIC_KEY)
      : umiInstance.identity.publicKey;

    console.log('Minting Edition Asset:', {
      asset: asset.publicKey,
      owner: ownerAddress,
      name: editionName,
      edition: editionNumber,
      uri,
    });

    // Create the edition asset
    const createParams = {
      asset,
      name: editionName,
      uri,
      owner: publicKey(ownerAddress),
      updateAuthority,
      plugins: [
        {
          type: 'Royalties',
          data: {
            basisPoints: sellerFeeBasisPoints,
            creators: [
              {
                address: umiInstance.identity.publicKey,
                percentage: 100,
              },
            ],
            ruleSet: publicKey('EveryHere11111111111111111111111111111111111'),
          },
        },
        {
          type: 'Edition',
          data: {
            number: editionNumber,
          },
        },
      ],
    };

    // Add collection if provided
    if (collectionAddress) {
      createParams.collection = publicKey(collectionAddress);
    }

    const result = await create(umiInstance, createParams).sendAndConfirm(umiInstance);

    console.log('Edition Asset minted successfully:', {
      mintAddress: asset.publicKey,
      signature: bs58.encode(result.signature),
      edition: editionNumber,
    });

    return {
      mintAddress: asset.publicKey,
      signature: bs58.encode(result.signature),
      editionNumber,
    };
  } catch (error) {
    console.error('Error minting edition:', error);
    throw new Error(`Failed to mint edition: ${error.message}`);
  }
}

/**
 * Get all NFTs owned by a wallet
 * @param {string} walletAddress - The wallet address
 * @returns {Promise<Array>} - Array of NFT assets
 */
export async function getAssetsByOwner(walletAddress) {
  try {
    const umiInstance = getUmi();

    const assets = await fetchAssetsByOwner(umiInstance, publicKey(walletAddress));

    return assets.map(asset => ({
      address: asset.publicKey,
      name: asset.name,
      uri: asset.uri,
      owner: asset.owner,
      updateAuthority: asset.updateAuthority,
    }));
  } catch (error) {
    console.error('Error fetching assets:', error);
    throw new Error(`Failed to fetch assets: ${error.message}`);
  }
}

/**
 * Get royalty percentage from environment
 * @returns {number} - Basis points (500 = 5%)
 */
export function getRoyaltyBasisPoints() {
  const percentage = parseInt(process.env.ROYALTY_PERCENTAGE || '5', 10);
  return percentage * 100; // Convert percentage to basis points
}

export default {
  getUmi,
  mintCoreAsset,
  createCoreCollection,
  mintEditionAsset,
  getAssetsByOwner,
  getRoyaltyBasisPoints,
};
