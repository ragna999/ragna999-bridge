// src/contracts/provider.js
// Pharos Testnet RPC Provider
import { ethers } from 'ethers';
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const RPC_URL = process.env.PHAROS_RPC || 'https://atlantic.dplabs-internal.com';
const CHAIN_ID = parseInt(process.env.PHAROS_CHAIN_ID || '688689');

let provider = null;

export function getProvider() {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  }
  return provider;
}

export function getSigner() {
  const key = process.env.PRIVATE_KEY;
  if (!key) return null;
  return new ethers.Wallet(key, getProvider());
}

export { RPC_URL, CHAIN_ID };
