// src/tools/yield-scan.js
// Yield Scanner Tool
import { getAllProtocols, getProtocol, getLatestYield, isYieldFresh, formatYieldReport } from '../contracts/yield-registry.js';

export const name = 'yieldScan';
export const description = 'Scan DeFi yield opportunities on Pharos';

/**
 * Execute yield scan
 * @param {Object} args
 * @param {number|null} args.riskLevel - Filter by risk (1=LOW, 2=MEDIUM, 3=HIGH)
 * @returns {string} Formatted yield report
 */
export async function execute({ riskLevel = null } = {}) {
  try {
    let protocolAddrs;
    try {
      protocolAddrs = await getAllProtocols();
    } catch (err) {
      // YieldRegistry not deployed or not configured
      return [
        'YIELD SCANNER — Pharos Testnet',
        '',
        'Status: YieldRegistry contract not yet deployed.',
        'The yield scanning feature is ready but awaiting contract deployment.',
        '',
        'What this tool does when active:',
        '  - Scans registered DeFi protocols on Pharos',
        '  - Returns APY, TVL, risk level per pool',
        '  - Filters by risk level (LOW / MEDIUM / HIGH)',
        '  - Shows protocol verification status',
        '',
        'To activate: Deploy YieldRegistry contract to Pharos testnet',
        'and set YIELD_REGISTRY_ADDRESS in .env',
        '',
        'Meanwhile, use "GoPlus scan 0xADDR on [chain]" for multi-chain',
        'token security analysis via GoPlus API.',
      ].join('\n');
    }

    if (protocolAddrs.length === 0) {
      return 'No protocols registered on-chain yet.\nNo yield data available.';
    }

    const yields = [];

    for (const addr of protocolAddrs) {
      try {
        const [protocol, latestYield, fresh] = await Promise.all([
          getProtocol(addr),
          getLatestYield(addr),
          isYieldFresh(addr),
        ]);

        // Skip if no yield data
        if (latestYield.reportedAt === 0) continue;

        // Filter by risk if specified
        if (riskLevel && latestYield.riskLevel !== riskLevel) continue;

        yields.push({
          protocol: addr,
          protocolName: protocol.name,
          pair: latestYield.pair,
          apy: latestYield.apy,
          tvlUsd: latestYield.tvlUsd,
          riskLevel: latestYield.riskLevel,
          reportedAt: latestYield.reportedAt,
          fresh,
        });
      } catch (err) {
        // Skip failed protocol reads
        continue;
      }
    }

    return formatYieldReport(yields);
  } catch (err) {
    return `Error scanning yields: ${err.message}`;
  }
}
