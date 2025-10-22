/**
 * Validation Utilities for NFT Store API
 * Provides input validation and sanitization functions
 */

import bs58 from 'bs58';

/**
 * Validates a Solana wallet address (base58 encoded, 32-44 characters)
 * @param {string} address - The address to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function isValidSolanaAddress(address) {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Address must be a non-empty string' };
  }

  // Remove whitespace
  address = address.trim();

  // Check length (base58 addresses are typically 32-44 characters)
  if (address.length < 32 || address.length > 44) {
    return { valid: false, error: 'Address length is invalid' };
  }

  // Validate base58 encoding
  try {
    const decoded = bs58.decode(address);

    // Solana public keys are 32 bytes
    if (decoded.length !== 32) {
      return { valid: false, error: 'Decoded address must be 32 bytes' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid base58 encoding' };
  }
}

/**
 * Validates a Solana transaction signature (base58 encoded, ~88 characters)
 * @param {string} signature - The transaction signature to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function isValidTransactionSignature(signature) {
  if (!signature || typeof signature !== 'string') {
    return { valid: false, error: 'Signature must be a non-empty string' };
  }

  // Remove whitespace
  signature = signature.trim();

  // Transaction signatures are typically 88 characters in base58
  if (signature.length < 87 || signature.length > 89) {
    return { valid: false, error: 'Signature length is invalid' };
  }

  // Validate base58 encoding
  try {
    const decoded = bs58.decode(signature);

    // Solana signatures are 64 bytes
    if (decoded.length !== 64) {
      return { valid: false, error: 'Decoded signature must be 64 bytes' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid base58 encoding' };
  }
}

/**
 * Validates that a SOL amount matches the expected price
 * @param {number} amount - The actual amount (in lamports or SOL)
 * @param {number} expected - The expected amount
 * @param {number} toleranceLamports - Tolerance in lamports (default: 1000 = 0.000001 SOL)
 * @returns {{ valid: boolean, error?: string }}
 */
export function isValidAmount(amount, expected, toleranceLamports = 1000) {
  if (typeof amount !== 'number' || typeof expected !== 'number') {
    return { valid: false, error: 'Amount and expected must be numbers' };
  }

  if (amount < 0 || expected < 0) {
    return { valid: false, error: 'Amounts cannot be negative' };
  }

  // Check if amounts match within tolerance
  const difference = Math.abs(amount - expected);

  if (difference > toleranceLamports) {
    return {
      valid: false,
      error: `Amount mismatch: expected ${expected}, got ${amount}`
    };
  }

  return { valid: true };
}

/**
 * Sanitizes user input to prevent injection attacks
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/['"]/g, '') // Remove quotes
    .replace(/\\/g, '') // Remove backslashes
    .substring(0, 1000); // Limit length
}

/**
 * Validates a complete mint request payload
 * @param {object} body - The request body
 * @returns {{ valid: boolean, error?: string, data?: object }}
 */
export function validateMintRequest(body) {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  // Validate wallet address
  if (!body.walletAddress) {
    return { valid: false, error: 'walletAddress is required' };
  }
  const walletValidation = isValidSolanaAddress(body.walletAddress);
  if (!walletValidation.valid) {
    return { valid: false, error: `Invalid walletAddress: ${walletValidation.error}` };
  }

  // Validate transaction signature
  if (!body.transactionSignature) {
    return { valid: false, error: 'transactionSignature is required' };
  }
  const signatureValidation = isValidTransactionSignature(body.transactionSignature);
  if (!signatureValidation.valid) {
    return { valid: false, error: `Invalid transactionSignature: ${signatureValidation.error}` };
  }

  // Validate artwork slug
  if (!body.artworkSlug || typeof body.artworkSlug !== 'string') {
    return { valid: false, error: 'artworkSlug is required and must be a string' };
  }
  const sanitizedSlug = sanitizeInput(body.artworkSlug);
  if (sanitizedSlug.length === 0) {
    return { valid: false, error: 'artworkSlug cannot be empty' };
  }

  // Optional: validate quantity for editions
  let quantity = 1;
  if (body.quantity !== undefined) {
    quantity = parseInt(body.quantity, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > 10) {
      return { valid: false, error: 'quantity must be between 1 and 10' };
    }
  }

  // Return validated and sanitized data
  return {
    valid: true,
    data: {
      walletAddress: body.walletAddress.trim(),
      transactionSignature: body.transactionSignature.trim(),
      artworkSlug: sanitizedSlug,
      quantity
    }
  };
}

/**
 * Validates artwork slug format
 * @param {string} slug - The slug to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function isValidArtworkSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug must be a non-empty string' };
  }

  // Slugs should be lowercase alphanumeric with hyphens/underscores
  const slugRegex = /^[a-z0-9_-]+$/i;

  if (!slugRegex.test(slug)) {
    return { valid: false, error: 'Slug contains invalid characters' };
  }

  if (slug.length < 2 || slug.length > 100) {
    return { valid: false, error: 'Slug length must be between 2 and 100 characters' };
  }

  return { valid: true };
}

/**
 * Validates email format (for notifications)
 * @param {string} email - The email to validate
 * @returns {{ valid: boolean, error?: string }}
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email must be a non-empty string' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
}

/**
 * Validates a numeric value is within range
 * @param {number} value - The value to check
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {{ valid: boolean, error?: string }}
 */
export function isInRange(value, min, max) {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, error: 'Value must be a number' };
  }

  if (value < min || value > max) {
    return { valid: false, error: `Value must be between ${min} and ${max}` };
  }

  return { valid: true };
}

export default {
  isValidSolanaAddress,
  isValidTransactionSignature,
  isValidAmount,
  sanitizeInput,
  validateMintRequest,
  isValidArtworkSlug,
  isValidEmail,
  isInRange
};
