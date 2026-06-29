// src/tools/token-safety.js
// Token Safety Check Tool
import { getConsensus, getReporterCount, isConsensusStale, formatSafetyReport } from '../contracts/token-safety.js';

export const name = 'tokenSafety';
export const description = 'Check token safety using on-chain consensus data';

/**
 * Execute token safety check
 * @param {Object} args
 * @param {string} args.address - Token address to check
 * @returns {string} Formatted safety report
 */
export async function execute({ address }) {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return 'Invalid token address. Please provide a valid 0x... address.';
  }

  try {
    const [consensus, reporterCount] = await Promise.all([
      getConsensus(address),
      getReporterCount(address),
    ]);

    if (consensus.reportCount === 0) {
      return `No safety data for ${address} on-chain yet.\nNo agents have submitted reports for this token.\nRun a scan to be the first reporter!`;
    }

    let report = formatSafetyReport(address, consensus);

    // Add staleness warning
    if (consensus.isStale) {
      report += '\n\nWARNING: Data is older than 24 hours. Consider re-scanning.';
    }

    return report;
  } catch (err) {
    return `Error checking token safety: ${err.message}`;
  }
}
