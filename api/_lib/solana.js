/**
 * Solana Blockchain Utilities
 * Handles all Solana network interactions
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js';

// Connection instance (cached)
let connection = null;

/**
 * Get or create Solana connection
 * @returns {Connection} - Solana connection instance
 */
export function getConnection() {
  if (connection) {
    return connection;
  }

  const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('devnet');
  const commitment = 'confirmed'; // Balance between speed and finality

  connection = new Connection(rpcUrl, commitment);

  return connection;
}

/**
 * Get transaction details from signature
 * @param {string} signature - The transaction signature
 * @returns {Promise<object|null>} - Transaction details or null if not found
 */
export async function getTransaction(signature) {
  try {
    const conn = getConnection();
    const tx = await conn.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    return tx;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    throw new Error(`Failed to fetch transaction: ${error.message}`);
  }
}

/**
 * Verify a transaction is confirmed on-chain
 * @param {string} signature - The transaction signature
 * @returns {Promise<boolean>} - True if confirmed
 */
export async function isTransactionConfirmed(signature) {
  try {
    const tx = await getTransaction(signature);
    return tx !== null && tx.meta?.err === null;
  } catch (error) {
    console.error('Error checking transaction confirmation:', error);
    return false;
  }
}

/**
 * Verify a payment transaction
 * @param {string} signature - The transaction signature
 * @param {string} expectedRecipient - Expected recipient wallet address
 * @param {number} expectedAmount - Expected amount in lamports
 * @returns {Promise<{ valid: boolean, error?: string, amount?: number }>}
 */
export async function verifyPaymentTransaction(signature, expectedRecipient, expectedAmount) {
  try {
    const tx = await getTransaction(signature);

    // Check if transaction exists
    if (!tx) {
      return { valid: false, error: 'Transaction not found' };
    }

    // Check if transaction succeeded
    if (tx.meta?.err !== null) {
      return { valid: false, error: 'Transaction failed on-chain' };
    }

    // Parse transaction to find SOL transfer
    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;
    const accountKeys = tx.transaction.message.accountKeys ||
                        tx.transaction.message.staticAccountKeys;

    // Find the recipient's account index
    const recipientPubkey = new PublicKey(expectedRecipient);
    let recipientIndex = -1;

    for (let i = 0; i < accountKeys.length; i++) {
      const key = accountKeys[i];
      // Handle both legacy and versioned transactions
      const pubkey = typeof key === 'string' ? new PublicKey(key) : key;

      if (pubkey.equals(recipientPubkey)) {
        recipientIndex = i;
        break;
      }
    }

    if (recipientIndex === -1) {
      return { valid: false, error: 'Recipient not found in transaction' };
    }

    // Calculate amount received
    const amountReceived = postBalances[recipientIndex] - preBalances[recipientIndex];

    // Verify amount (with small tolerance for fees)
    const tolerance = 1000; // 0.000001 SOL tolerance
    if (Math.abs(amountReceived - expectedAmount) > tolerance) {
      return {
        valid: false,
        error: `Amount mismatch: expected ${expectedAmount} lamports, got ${amountReceived} lamports`,
        amount: amountReceived,
      };
    }

    return {
      valid: true,
      amount: amountReceived,
    };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { valid: false, error: `Verification failed: ${error.message}` };
  }
}

/**
 * Get wallet balance in SOL
 * @param {string} walletAddress - The wallet address
 * @returns {Promise<number>} - Balance in SOL
 */
export async function getWalletBalance(walletAddress) {
  try {
    const conn = getConnection();
    const publicKey = new PublicKey(walletAddress);
    const balance = await conn.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw new Error(`Failed to get balance: ${error.message}`);
  }
}

/**
 * Get recent blockhash for transactions
 * @returns {Promise<string>} - Recent blockhash
 */
export async function getRecentBlockhash() {
  try {
    const conn = getConnection();
    const { blockhash } = await conn.getLatestBlockhash('finalized');
    return blockhash;
  } catch (error) {
    console.error('Error getting recent blockhash:', error);
    throw new Error(`Failed to get blockhash: ${error.message}`);
  }
}

/**
 * Convert SOL to lamports
 * @param {number} sol - Amount in SOL
 * @returns {number} - Amount in lamports
 */
export function solToLamports(sol) {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Convert lamports to SOL
 * @param {number} lamports - Amount in lamports
 * @returns {number} - Amount in SOL
 */
export function lamportsToSol(lamports) {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Get transaction explorer URL
 * @param {string} signature - The transaction signature
 * @param {string} cluster - The cluster (devnet | mainnet-beta)
 * @returns {string} - Explorer URL
 */
export function getExplorerUrl(signature, cluster = 'devnet') {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/tx/${signature}${clusterParam}`;
}

/**
 * Get account explorer URL
 * @param {string} address - The account address
 * @param {string} cluster - The cluster (devnet | mainnet-beta)
 * @returns {string} - Explorer URL
 */
export function getAccountExplorerUrl(address, cluster = 'devnet') {
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  return `https://explorer.solana.com/address/${address}${clusterParam}`;
}

/**
 * Check if RPC connection is healthy
 * @returns {Promise<boolean>} - True if healthy
 */
export async function checkRpcHealth() {
  try {
    const conn = getConnection();
    const slot = await conn.getSlot();
    return slot > 0;
  } catch (error) {
    console.error('RPC health check failed:', error);
    return false;
  }
}

/**
 * Get network information
 * @returns {Promise<object>} - Network info
 */
export async function getNetworkInfo() {
  try {
    const conn = getConnection();
    const [version, slot, blockTime] = await Promise.all([
      conn.getVersion(),
      conn.getSlot(),
      conn.getBlockTime(await conn.getSlot()),
    ]);

    return {
      version,
      slot,
      blockTime,
      network: process.env.SOLANA_NETWORK || 'devnet',
      rpcUrl: process.env.SOLANA_RPC_URL || clusterApiUrl('devnet'),
    };
  } catch (error) {
    console.error('Error getting network info:', error);
    throw new Error(`Failed to get network info: ${error.message}`);
  }
}

export default {
  getConnection,
  getTransaction,
  isTransactionConfirmed,
  verifyPaymentTransaction,
  getWalletBalance,
  getRecentBlockhash,
  solToLamports,
  lamportsToSol,
  getExplorerUrl,
  getAccountExplorerUrl,
  checkRpcHealth,
  getNetworkInfo,
};
