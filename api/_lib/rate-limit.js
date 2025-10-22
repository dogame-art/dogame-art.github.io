/**
 * Rate Limiting Utility for NFT Store API
 * Prevents abuse by limiting requests per wallet and IP
 * Uses in-memory storage (upgradeable to Redis for production)
 */

// In-memory storage for rate limiting
// Key format: "wallet:{address}" or "ip:{address}"
const rateLimitStore = new Map();

// Configuration
const RATE_LIMITS = {
  MINT_PER_WALLET_WINDOW: 60 * 60 * 1000, // 1 hour in milliseconds
  MINT_PER_WALLET_MAX: 5, // 5 mints per wallet per hour
  API_PER_IP_WINDOW: 60 * 1000, // 1 minute in milliseconds
  API_PER_IP_MAX: 20, // 20 API calls per IP per minute
};

/**
 * Clean up expired entries from the rate limit store
 * Called periodically to prevent memory leaks
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Check if a wallet has exceeded mint rate limit
 * @param {string} walletAddress - The wallet address to check
 * @returns {{ allowed: boolean, retryAfter?: number, remaining?: number }}
 */
export function checkWalletMintLimit(walletAddress) {
  const key = `wallet:${walletAddress}`;
  const now = Date.now();
  const limit = rateLimitStore.get(key);

  // No previous requests or window expired
  if (!limit || now > limit.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMITS.MINT_PER_WALLET_WINDOW,
    });
    return {
      allowed: true,
      remaining: RATE_LIMITS.MINT_PER_WALLET_MAX - 1,
    };
  }

  // Check if limit exceeded
  if (limit.count >= RATE_LIMITS.MINT_PER_WALLET_MAX) {
    const retryAfter = Math.ceil((limit.resetAt - now) / 1000); // seconds
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
    };
  }

  // Increment count
  limit.count += 1;
  rateLimitStore.set(key, limit);

  return {
    allowed: true,
    remaining: RATE_LIMITS.MINT_PER_WALLET_MAX - limit.count,
  };
}

/**
 * Check if an IP has exceeded API rate limit
 * @param {string} ipAddress - The IP address to check
 * @returns {{ allowed: boolean, retryAfter?: number, remaining?: number }}
 */
export function checkIpApiLimit(ipAddress) {
  const key = `ip:${ipAddress}`;
  const now = Date.now();
  const limit = rateLimitStore.get(key);

  // No previous requests or window expired
  if (!limit || now > limit.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + RATE_LIMITS.API_PER_IP_WINDOW,
    });
    return {
      allowed: true,
      remaining: RATE_LIMITS.API_PER_IP_MAX - 1,
    };
  }

  // Check if limit exceeded
  if (limit.count >= RATE_LIMITS.API_PER_IP_MAX) {
    const retryAfter = Math.ceil((limit.resetAt - now) / 1000); // seconds
    return {
      allowed: false,
      retryAfter,
      remaining: 0,
    };
  }

  // Increment count
  limit.count += 1;
  rateLimitStore.set(key, limit);

  return {
    allowed: true,
    remaining: RATE_LIMITS.API_PER_IP_MAX - limit.count,
  };
}

/**
 * Get client IP address from request headers
 * Handles Vercel's forwarded headers
 * @param {object} req - The request object
 * @returns {string} - The client IP address
 */
export function getClientIp(req) {
  // Vercel provides the real IP in x-forwarded-for or x-real-ip
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can be comma-separated, take the first one
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp;
  }

  // Fallback to connection remote address
  return req.connection?.remoteAddress || 'unknown';
}

/**
 * Middleware function to apply rate limiting
 * @param {object} req - The request object
 * @param {string} walletAddress - Optional wallet address to check
 * @returns {{ allowed: boolean, error?: string, retryAfter?: number }}
 */
export function applyRateLimit(req, walletAddress = null) {
  const ip = getClientIp(req);

  // Check IP-based rate limit
  const ipLimit = checkIpApiLimit(ip);
  if (!ipLimit.allowed) {
    return {
      allowed: false,
      error: `Too many requests from this IP. Try again in ${ipLimit.retryAfter} seconds.`,
      retryAfter: ipLimit.retryAfter,
    };
  }

  // Check wallet-based rate limit if wallet provided
  if (walletAddress) {
    const walletLimit = checkWalletMintLimit(walletAddress);
    if (!walletLimit.allowed) {
      return {
        allowed: false,
        error: `Too many mints from this wallet. Try again in ${walletLimit.retryAfter} seconds.`,
        retryAfter: walletLimit.retryAfter,
      };
    }
    return {
      allowed: true,
      remaining: walletLimit.remaining,
    };
  }

  return {
    allowed: true,
    remaining: ipLimit.remaining,
  };
}

/**
 * Reset rate limits for a specific wallet (admin function)
 * @param {string} walletAddress - The wallet address to reset
 */
export function resetWalletLimit(walletAddress) {
  const key = `wallet:${walletAddress}`;
  rateLimitStore.delete(key);
}

/**
 * Reset rate limits for a specific IP (admin function)
 * @param {string} ipAddress - The IP address to reset
 */
export function resetIpLimit(ipAddress) {
  const key = `ip:${ipAddress}`;
  rateLimitStore.delete(key);
}

/**
 * Get current rate limit stats (for monitoring)
 * @returns {object} - Statistics about rate limiting
 */
export function getRateLimitStats() {
  let walletEntries = 0;
  let ipEntries = 0;

  for (const key of rateLimitStore.keys()) {
    if (key.startsWith('wallet:')) walletEntries++;
    if (key.startsWith('ip:')) ipEntries++;
  }

  return {
    totalEntries: rateLimitStore.size,
    walletEntries,
    ipEntries,
    limits: RATE_LIMITS,
  };
}

export default {
  checkWalletMintLimit,
  checkIpApiLimit,
  getClientIp,
  applyRateLimit,
  resetWalletLimit,
  resetIpLimit,
  getRateLimitStats,
};
