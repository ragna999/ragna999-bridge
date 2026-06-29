// src/tools/goplus-scanner.js
// GoPlus Security API — real-time token scanning for supported chains
// Free, no API key required

const GOPLUS_BASE = 'https://api.gopluslabs.io/api/v1';

// Chain ID mapping
const CHAIN_MAP = {
  'eth': 1, 'ethereum': 1,
  'bsc': 56, 'bnb': 56,
  'polygon': 137, 'matic': 137,
  'arbitrum': 42161, 'arb': 42161,
  'avalanche': 43114, 'avax': 43114,
  'base': 8453,
  'optimism': 10, 'op': 10,
  'fantom': 250, 'ftm': 250,
  'cronos': 25,
  'solana': 792703890, 'sol': 792703890,
  'linea': 59144,
  'blast': 81457,
  'zksync': 324,
};

// Detect chain from context or default to ETH
function detectChain(message) {
  const lower = (message || '').toLowerCase();
  for (const [name, id] of Object.entries(CHAIN_MAP)) {
    if (lower.includes(name)) return { id, name };
  }
  return { id: 1, name: 'eth' }; // default
}

/**
 * Query GoPlus token security API
 * @param {string} contractAddress
 * @param {number} chainId
 * @returns {Promise<Object|null>}
 */
export async function scanToken(contractAddress, chainId = 1) {
  try {
    const url = `${GOPLUS_BASE}/token_security/${chainId}?contract_addresses=${contractAddress.toLowerCase()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    const data = await res.json();

    if (data.code !== 1 || !data.result) return null;

    const key = contractAddress.toLowerCase();
    return data.result[key] || null;
  } catch (err) {
    console.error(`[GoPlus] Error: ${err.message}`);
    return null;
  }
}

/**
 * Format GoPlus scan result as readable text
 */
export function formatGoPlusReport(address, data, chainName) {
  if (!data) return `No GoPlus data found for ${address} on ${chainName}.`;

  const isHoneypot = data.is_honeypot === '1';
  const isOpenSource = data.is_open_source === '1';
  const buyTax = parseFloat(data.buy_tax || '0') * 100;
  const sellTax = parseFloat(data.sell_tax || '0') * 100;
  const holders = parseInt(data.holder_count || '0');
  const ownerCanMint = data.is_mintable === '1';
  const canBlacklist = data.is_blacklisted === '1';
  const canWhitelist = data.is_whitelisted === '1';
  const proxy = data.is_proxy === '1';
  const selfDestruct = data.selfdestruct === '1';
  const antiWhale = data.is_anti_whale === '1';
  const tradingCooldown = data.trading_cooldown === '1';
  const trustList = data.trust_list === '1';

  // Risk assessment
  const risks = [];
  if (isHoneypot) risks.push('HONEYPOT');
  if (!isOpenSource) risks.push('CLOSED SOURCE');
  if (buyTax > 10) risks.push(`HIGH BUY TAX (${buyTax.toFixed(1)}%)`);
  if (sellTax > 10) risks.push(`HIGH SELL TAX (${sellTax.toFixed(1)}%)`);
  if (ownerCanMint) risks.push('MINTABLE');
  if (canBlacklist) risks.push('BLACKLIST');
  if (proxy) risks.push('PROXY CONTRACT');
  if (selfDestruct) risks.push('SELF-DESTRUCT');

  const verdict = risks.length === 0 ? 'SAFE' :
                  risks.some(r => ['HONEYPOT', 'SELF-DESTRUCT'].includes(r)) ? 'DANGER' :
                  risks.length <= 2 ? 'CAUTION' : 'AVOID';

  const lines = [
    `TOKEN SECURITY SCAN [${chainName.toUpperCase()}]`,
    `Address: ${address}`,
    `Name: ${data.token_name || 'Unknown'} (${data.token_symbol || '?'})`,
    `Supply: ${parseFloat(data.total_supply || '0').toLocaleString()}`,
    '',
    `Verdict: ${verdict} ${verdict === 'SAFE' ? '[OK]' : verdict === 'DANGER' ? '[XX]' : '[!!]'}`,
    '',
    `Holders: ${holders.toLocaleString()}`,
    `Open Source: ${isOpenSource ? 'Yes' : 'NO [RISK]'}`,
    `Honeypot: ${isHoneypot ? 'YES [DANGER]' : 'No'}`,
    `Buy Tax: ${buyTax.toFixed(1)}%`,
    `Sell Tax: ${sellTax.toFixed(1)}%`,
    `Mintable: ${ownerCanMint ? 'YES [RISK]' : 'No'}`,
    `Blacklist: ${canBlacklist ? 'YES [RISK]' : 'No'}`,
    `Proxy: ${proxy ? 'YES [RISK]' : 'No'}`,
    `Self-Destruct: ${selfDestruct ? 'YES [DANGER]' : 'No'}`,
    `Anti-Whale: ${antiWhale ? 'Yes' : 'No'}`,
    `Trading Cooldown: ${tradingCooldown ? 'Yes' : 'No'}`,
    `Trust List: ${trustList ? 'Yes' : 'No'}`,
  ];

  if (data.is_in_dex === '1') {
    lines.push(`DEX Listed: Yes`);
  }
  if (data.is_in_cex?.listed === '1') {
    lines.push(`CEX Listed: ${data.is_in_cex.cex_list?.join(', ') || 'Yes'}`);
  }

  if (risks.length > 0) {
    lines.push('', `RISKS: ${risks.join(', ')}`);
  }

  // Top holders
  if (data.holders?.length > 0) {
    const top3 = data.holders.slice(0, 3);
    lines.push('', 'Top Holders:');
    top3.forEach((h, i) => {
      const pct = parseFloat(h.percent * 100).toFixed(2);
      const tag = h.tag ? ` [${h.tag}]` : '';
      lines.push(`  ${i + 1}. ${h.address.slice(0, 8)}...${h.address.slice(-6)} — ${pct}%${tag}`);
    });
  }

  return lines.join('\n');
}

/**
 * Execute GoPlus scan tool
 */
export const name = 'goplusScan';
export const description = 'Scan token security via GoPlus API (multi-chain)';

export async function execute({ address, chain }) {
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return 'Invalid token address. Please provide a valid 0x... address.';
  }

  const { id: chainId, name: chainName } = detectChain(chain);
  const data = await scanToken(address, chainId);

  return formatGoPlusReport(address, data, chainName);
}
