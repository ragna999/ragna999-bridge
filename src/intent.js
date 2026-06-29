// src/intent.js
// Intent Parser — keyword matching, no LLM

/**
 * Parse user message into tool + args
 * @param {string} message - User's message
 * @returns {{ tool: string, args: Object }}
 */
export function parseIntent(message) {
  if (!message || typeof message !== 'string') {
    return { tool: 'help', args: {} };
  }

  const lower = message.toLowerCase().trim();

  // Extract Ethereum addresses
  const addressMatches = message.match(/0x[a-fA-F0-9]{40}/g);
  const address = addressMatches ? addressMatches[0] : null;
  const addresses = addressMatches || [];

  // Tool 3: Wallet Intelligence (check BEFORE token safety since "analyze wallet" has both keywords)
  // "Analyze wallet 0xABC", "Portfolio 0xABC"
  if (address && /wallet|portfolio|balance/i.test(lower)) {
    return { tool: 'walletIntel', args: { address } };
  }

  // Tool 1: Token Safety Check (on-chain Pharos consensus)
  // "Is 0xABC safe?", "Check token 0xABC", "Analyze 0xABC", "honeypot 0xABC"
  if (address && /safe|check|analy[sz]|honeypot|rug|scam|inspect|audit/i.test(lower)) {
    // If user mentions a non-Pharos chain, use GoPlus instead
    const chainKeywords = /(\beth\b|\bethereum\b|\bbsc\b|\bbnb\b|\bpolygon\b|\bmatic\b|\barbitrum\b|\barb\b|\bavalanche\b|\bavax\b|\bbase\b|\boptimism\b|\bop\b|\bfantom\b|\bftm\b|\bcronos\b|\bsolana\b|\bsol\b|\blinea\b|\bblast\b|\bzksync\b|\bgo.?plus\b)/i;
    const chainMatch = lower.match(chainKeywords);
    if (chainMatch) {
      return { tool: 'goplusScan', args: { address, chain: chainMatch[1].replace(/\./g, '') } };
    }
    return { tool: 'tokenSafety', args: { address } };
  }

  // Tool 5: GoPlus Security Scan (explicit)
  // "GoPlus scan 0xABC", "security scan 0xABC on base"
  if (address && /goplus|security scan|multi.?chain/i.test(lower)) {
    const chainMatch = lower.match(/(\beth\b|\bethereum\b|\bbsc\b|\bbnb\b|\bpolygon\b|\bbase\b|\barbitrum\b|\bavax\b|\bsolana\b)/i);
    return { tool: 'goplusScan', args: { address, chain: chainMatch?.[1] || 'eth' } };
  }

  // Tool 4: Batch Scan (multiple addresses or "scan" + "tokens")
  if (addresses.length > 1 || (/scan|top|trending|which.*safe|batch/i.test(lower) && !address)) {
    return { tool: 'batchScan', args: { addresses } };
  }

  // Tool 2: Yield Scanner
  // "Best yields?", "Where to earn?", "APY on Pharos", "lending", "staking"
  if (/yield|apy|earn|best.*pool|best.*yield|lend|stak|farm|defi|opportunity/i.test(lower)) {
    const riskLevel = /low.*risk|safe|conservative/i.test(lower) ? 1 :
                      /high.*risk|degen|aggressive/i.test(lower) ? 3 : null;
    return { tool: 'yieldScan', args: { riskLevel } };
  }

  // Tool 3: Wallet Intelligence
  // "Analyze wallet 0xABC", "Portfolio 0xABC"
  if (address && /wallet|portfolio|balance|address/i.test(lower)) {
    return { tool: 'walletIntel', args: { address } };
  }

  // If just an address with no clear intent, default to token safety
  if (address) {
    return { tool: 'tokenSafety', args: { address } };
  }

  // Help / unknown
  return { tool: 'help', args: {} };
}

/**
 * Get help text
 */
export function getHelpText() {
  return [
    'ragna999 — DeFi Intelligence Agent on Pharos',
    '',
    'Available tools:',
    '',
    '1. Token Safety Check',
    '   "Is 0xABC... safe?" / "Check token 0xABC..."',
    '   Returns on-chain consensus safety score',
    '',
    '2. Yield Scanner',
    '   "Best yields on Pharos?" / "Where to earn APY?"',
    '   Returns ranked yield opportunities',
    '',
    '3. Batch Safety Scan',
    '   "Scan 0x123..., 0x456..., 0x789..."',
    '   Returns safety grid for multiple tokens',
    '',
    '4. Wallet Intelligence',
    '   "Analyze wallet 0xABC..."',
    '   Returns wallet risk assessment',
    '',
    '5. GoPlus Security Scan (multi-chain)',
    '   "Is 0xABC safe on Base?" / "GoPlus scan 0xABC"',
    '   Returns real-time security data (ETH, Base, BNB, Polygon, etc.)',
    '',
    'Powered by on-chain consensus data from Pharos testnet',
    'and GoPlus Security API for multi-chain scanning.',
  ].join('\n');
}
