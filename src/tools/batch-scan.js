// src/tools/batch-scan.js
// Batch Token Safety Scanner
import { batchIsTokenSafe, getConsensus, formatSafetyReport } from '../contracts/token-safety.js';

export const name = 'batchScan';
export const description = 'Batch scan multiple tokens for safety';

/**
 * Execute batch scan
 * @param {Object} args
 * @param {string[]} args.addresses - Token addresses to scan
 * @returns {string} Formatted batch results
 */
export async function execute({ addresses = [] } = {}) {
  if (addresses.length === 0) {
    return 'No token addresses provided. Send addresses to scan, e.g.:\n"Scan 0x1234..., 0x5678..."';
  }

  if (addresses.length > 20) {
    return 'Too many addresses (max 20 per batch).';
  }

  try {
    // Batch check safety
    const safeResults = await batchIsTokenSafe(addresses);

    // Get detailed consensus for each
    const details = await Promise.all(
      addresses.map(async (addr, i) => {
        try {
          const consensus = await getConsensus(addr);
          return { address: addr, safe: safeResults[i], consensus };
        } catch {
          return { address: addr, safe: false, consensus: null, error: true };
        }
      })
    );

    const lines = ['BATCH SAFETY SCAN RESULTS', ''];

    details.forEach(({ address, safe, consensus, error }) => {
      if (error || !consensus || consensus.reportCount === 0) {
        lines.push(`[??] ${address} — No data`);
      } else {
        const icon = safe ? '[OK]' : consensus.avgScore < 30 ? '[XX]' : '[!!]';
        const verdict = safe ? 'SAFE' : consensus.avgScore < 30 ? 'AVOID' : 'CAUTION';
        lines.push(`${icon} ${address} — Score ${consensus.avgScore}/100 — ${verdict}`);
      }
    });

    const safeCount = safeResults.filter(Boolean).length;
    lines.push('');
    lines.push(`Summary: ${safeCount}/${addresses.length} safe`);

    return lines.join('\n');
  } catch (err) {
    return `Error in batch scan: ${err.message}`;
  }
}
