// src/contracts/token-safety.js
// TokenSafetyRegistry contract interactions
import { ethers } from 'ethers';
import { getProvider, getSigner } from './provider.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ABI_PATH = join(__dirname, '../../abi/TokenSafetyRegistry.json');
const ABI = JSON.parse(readFileSync(ABI_PATH, 'utf8'));

// Contract address on Pharos Atlantic Testnet
const CONTRACT_ADDRESS = '0xF11c856D021900f9c312e0e80913A7a0D6af40ED';

let contract = null;
let writeContract = null;

function getReadContract() {
  if (!contract) {
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, getProvider());
  }
  return contract;
}

function getWriteContract() {
  if (!writeContract) {
    const signer = getSigner();
    if (!signer) throw new Error('No private key configured for write operations');
    writeContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  }
  return writeContract;
}

/**
 * Check if a token is safe (based on consensus)
 * @param {string} tokenAddress
 * @returns {boolean}
 */
export async function isTokenSafe(tokenAddress) {
  const c = getReadContract();
  return await c.isTokenSafe(tokenAddress);
}

/**
 * Batch check multiple tokens
 * @param {string[]} tokenAddresses
 * @returns {boolean[]}
 */
export async function batchIsTokenSafe(tokenAddresses) {
  const c = getReadContract();
  return await c.batchIsTokenSafe(tokenAddresses);
}

/**
 * Get consensus report for a token
 * Uses raw call + manual decode to handle struct return
 * Falls back to isTokenSafe boolean if struct decode fails
 * @param {string} tokenAddress
 * @returns {Object}
 */
export async function getConsensus(tokenAddress) {
  const c = getReadContract();
  try {
    // Try calling getConsensus with raw provider call
    const provider = getProvider();
    const iface = new ethers.Interface(ABI);
    const data = iface.encodeFunctionData('getConsensus', [tokenAddress]);
    const result = await provider.call({ to: CONTRACT_ADDRESS, data });
    const decoded = iface.decodeFunctionResult('getConsensus', result);
    const r = decoded[0];
    return {
      avgScore: Number(r[0] || r.avgScore || 0),
      reportCount: Number(r[1] || r.reportCount || 0),
      consensusHoneypot: r[2] || r.consensusHoneypot || false,
      avgBuyTax: Number(r[3] || r.avgBuyTax || 0),
      avgSellTax: Number(r[4] || r.avgSellTax || 0),
      lastUpdated: Number(r[5] || r.lastUpdated || 0),
      isStale: r[6] || r.isStale || false,
    };
  } catch {
    // Fallback: use isTokenSafe boolean
    const safe = await isTokenSafe(tokenAddress);
    return {
      avgScore: safe ? 100 : 0,
      reportCount: 0,  // unknown
      consensusHoneypot: !safe,
      avgBuyTax: 0,
      avgSellTax: 0,
      lastUpdated: 0,
      isStale: true,
      _fallback: true,  // flag that this is a fallback result
    };
  }
}

/**
 * Get number of reporters for a token
 * @param {string} tokenAddress
 * @returns {number}
 */
export async function getReporterCount(tokenAddress) {
  const c = getReadContract();
  try {
    return Number(await c.getReporterCount(tokenAddress));
  } catch {
    return 0;
  }
}

/**
 * Check if consensus is stale (>24h old)
 * @param {string} tokenAddress
 * @returns {boolean}
 */
export async function isConsensusStale(tokenAddress) {
  const c = getReadContract();
  try {
    return await c.isConsensusStale(tokenAddress);
  } catch {
    return true;
  }
}

/**
 * Submit a safety report (WRITE operation — needs gas)
 */
export async function updateReport(tokenAddress, score, isHoneypot, isMintable, buyTax, sellTax, holderCount) {
  const c = getWriteContract();
  const tx = await c.updateReport(tokenAddress, score, isHoneypot, isMintable, buyTax, sellTax, holderCount);
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Format consensus report as readable text
 */
export function formatSafetyReport(tokenAddress, consensus) {
  const verdict = consensus.avgScore >= 70 && !consensus.consensusHoneypot ? 'SAFE' :
                  consensus.avgScore >= 50 ? 'CAUTION' : 'AVOID';

  if (consensus._fallback) {
    const icon = consensus.avgScore >= 70 ? '[OK]' : '[XX]';
    return [
      `TOKEN SAFETY CHECK`,
      `Address: ${tokenAddress}`,
      `${icon} Verdict: ${verdict}`,
      `Note: Limited data available. Full consensus report not accessible.`,
    ].join('\n');
  }

  if (consensus.reportCount === 0) {
    return `Token ${tokenAddress}\nNo safety data on-chain. No reporters have analyzed this token yet.`;
  }

  const freshness = consensus.isStale ? ' [STALE - data >24h old]' : '';

  return [
    `TOKEN SAFETY REPORT${freshness}`,
    `Address: ${tokenAddress}`,
    `Score: ${consensus.avgScore}/100 — ${verdict}`,
    `Honeypot: ${consensus.consensusHoneypot ? 'YES [DANGER]' : 'No'}`,
    `Buy Tax: ${consensus.avgBuyTax}%`,
    `Sell Tax: ${consensus.avgSellTax}%`,
    `Consensus: ${consensus.reportCount} reporter(s)`,
    `Last Updated: ${consensus.lastUpdated > 0 ? new Date(consensus.lastUpdated * 1000).toISOString() : 'Never'}`,
  ].join('\n');
}
