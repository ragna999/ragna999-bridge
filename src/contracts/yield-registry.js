// src/contracts/yield-registry.js
// YieldRegistry contract interactions
import { ethers } from 'ethers';
import { getProvider, getSigner } from './provider.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ABI_PATH = join(__dirname, '../../abi/YieldRegistry.json');
const ABI = JSON.parse(readFileSync(ABI_PATH, 'utf8'));

// YieldRegistry address — update after deployment
// For now, will be set via env or discovered
const CONTRACT_ADDRESS = process.env.YIELD_REGISTRY_ADDRESS || '0x6c65B773e1250D40e5902615FDd33d054C455ede';

let contract = null;
let writeContract = null;

function getReadContract() {
  if (!CONTRACT_ADDRESS) throw new Error('YieldRegistry address not configured');
  if (!contract) {
    contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, getProvider());
  }
  return contract;
}

function getWriteContract() {
  if (!CONTRACT_ADDRESS) throw new Error('YieldRegistry address not configured');
  if (!writeContract) {
    const signer = getSigner();
    if (!signer) throw new Error('No private key configured for write operations');
    writeContract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  }
  return writeContract;
}

/**
 * Get all registered protocol addresses
 * @returns {string[]}
 */
export async function getAllProtocols() {
  const c = getReadContract();
  return await c.getAllProtocols();
}

/**
 * Get protocol info
 * @param {string} protocolAddr
 * @returns {Object}
 */
export async function getProtocol(protocolAddr) {
  const c = getReadContract();
  const p = await c.getProtocol(protocolAddr);
  return {
    name: p.name,
    category: p.category,
    contractAddr: p.contractAddr,
    verified: p.verified,
    registeredAt: Number(p.registeredAt),
  };
}

/**
 * Get latest yield for a protocol
 * @param {string} protocolAddr
 * @returns {Object}
 */
export async function getLatestYield(protocolAddr) {
  const c = getReadContract();
  const y = await c.getLatestYield(protocolAddr);
  return {
    protocol: y.protocol,
    pair: y.pair,
    apy: Number(y.apy),       // basis points (100 = 1%)
    tvlUsd: Number(y.tvlUsd),
    riskLevel: Number(y.riskLevel),  // 1=LOW, 2=MEDIUM, 3=HIGH
    reportedAt: Number(y.reportedAt),
    reporter: y.reporter,
  };
}

/**
 * Get yield history for a protocol
 * @param {string} protocolAddr
 * @returns {Object[]}
 */
export async function getYieldHistory(protocolAddr) {
  const c = getReadContract();
  const history = await c.getYieldHistory(protocolAddr);
  return history.map(y => ({
    protocol: y.protocol,
    pair: y.pair,
    apy: Number(y.apy),
    tvlUsd: Number(y.tvlUsd),
    riskLevel: Number(y.riskLevel),
    reportedAt: Number(y.reportedAt),
    reporter: y.reporter,
  }));
}

/**
 * Get number of registered protocols
 * @returns {number}
 */
export async function getProtocolCount() {
  const c = getReadContract();
  return Number(await c.getProtocolCount());
}

/**
 * Check if yield data is fresh (<24h)
 * @param {string} protocolAddr
 * @returns {boolean}
 */
export async function isYieldFresh(protocolAddr) {
  const c = getReadContract();
  return await c.isYieldFresh(protocolAddr);
}

/**
 * Register a protocol (WRITE — needs gas)
 */
export async function registerProtocol(protocolAddr, name, category, contractAddr) {
  const c = getWriteContract();
  const tx = await c.registerProtocol(protocolAddr, name, category, contractAddr);
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Report yield data (WRITE — needs gas)
 */
export async function reportYield(protocol, pair, apy, tvlUsd, riskLevel) {
  const c = getWriteContract();
  const tx = await c.reportYield(protocol, pair, apy, tvlUsd, riskLevel);
  const receipt = await tx.wait();
  return { hash: receipt.hash, blockNumber: receipt.blockNumber };
}

/**
 * Format yield data as readable text
 */
const RISK_LABELS = { 1: 'LOW', 2: 'MEDIUM', 3: 'HIGH' };

export function formatYieldReport(yields) {
  if (!yields || yields.length === 0) {
    return 'No yield data on-chain. No protocols have reported yields yet.';
  }

  // Sort by APY descending
  const sorted = [...yields].sort((a, b) => b.apy - a.apy);

  const lines = ['TOP YIELDS ON PHAROS', ''];
  sorted.forEach((y, i) => {
    const apyPercent = (y.apy / 100).toFixed(2);
    const tvlFormatted = y.tvlUsd > 0 ? `$${(y.tvlUsd / 100).toLocaleString()}` : 'N/A';
    const risk = RISK_LABELS[y.riskLevel] || 'UNKNOWN';
    const fresh = y.fresh ? '' : ' [stale]';
    lines.push(`${i + 1}. ${y.protocolName || y.protocol} ${y.pair} — APY: ${apyPercent}% — TVL: ${tvlFormatted} — Risk: ${risk}${fresh}`);
  });

  return lines.join('\n');
}
