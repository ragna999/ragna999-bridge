// src/router.js
// Tool Router — maps intent to handler

import * as tokenSafety from './tools/token-safety.js';
import * as yieldScan from './tools/yield-scan.js';
import * as batchScan from './tools/batch-scan.js';
import * as walletIntel from './tools/wallet-intel.js';
import * as goplusScan from './tools/goplus-scanner.js';
import { getHelpText } from './intent.js';

// Registry of tools
const tools = {
  tokenSafety,
  yieldScan,
  batchScan,
  walletIntel,
  goplusScan,
};

/**
 * Route an intent to the appropriate tool and execute
 * @param {{ tool: string, args: Object }} intent
 * @returns {Promise<string>}
 */
export async function route(intent) {
  const { tool, args } = intent;

  if (tool === 'help') {
    return getHelpText();
  }

  const handler = tools[tool];
  if (!handler) {
    return `Unknown tool: ${tool}. Send "help" to see available tools.`;
  }

  try {
    const result = await handler.execute(args);
    return result;
  } catch (err) {
    return `Error executing ${tool}: ${err.message}`;
  }
}
