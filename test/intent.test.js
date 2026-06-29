// test/intent.test.js
// Test intent parser
import { parseIntent } from '../src/intent.js';

const tests = [
  // Token Safety
  { input: 'Is 0xdC404a4D7E482e4EC5Ca96215aD45A670Ee82989 safe?', expected: 'tokenSafety' },
  { input: 'Check token 0xdC404a4D7E482e4EC5Ca96215aD45A670Ee82989', expected: 'tokenSafety' },
  { input: 'Analyze 0xdC404a4D7E482e4EC5Ca96215aD45A670Ee82989', expected: 'tokenSafety' },
  { input: 'Is this a honeypot? 0xdC404a4D7E482e4EC5Ca96215aD45A670Ee82989', expected: 'tokenSafety' },
  { input: 'Rug check 0xdC404a4D7E482e4EC5Ca96215aD45A670Ee82989', expected: 'tokenSafety' },

  // Yield Scan
  { input: 'Best yields on Pharos?', expected: 'yieldScan' },
  { input: 'Where can I earn APY?', expected: 'yieldScan' },
  { input: 'DeFi opportunities', expected: 'yieldScan' },
  { input: 'Low risk yields', expected: 'yieldScan' },
  { input: 'Staking options', expected: 'yieldScan' },

  // Batch Scan
  { input: 'Scan top tokens', expected: 'batchScan' },
  { input: 'Which tokens are safe?', expected: 'batchScan' },
  { input: 'Scan 0xdC404a4D7E482e4EC5Ca96215aD45A670Ee82989, 0x0000000000000000000000000000000000000001', expected: 'batchScan' },

  // Wallet Intel
  { input: 'Analyze wallet 0xdC404a4D7E482e4EC5Ca96215aD45A670Ee82989', expected: 'walletIntel' },
  { input: 'Portfolio 0xdC404a4D7E482e4EC5Ca96215aD45A670Ee82989', expected: 'walletIntel' },

  // Help
  { input: 'hello', expected: 'help' },
  { input: 'what can you do?', expected: 'help' },
  { input: '', expected: 'help' },

  // Default to token safety if just address
  { input: '0xdC404a4D7E482e4EC5Ca96215aD45A670Ee82989', expected: 'tokenSafety' },
];

let passed = 0;
let failed = 0;

console.log('=== Intent Parser Tests ===\n');

for (const test of tests) {
  const result = parseIntent(test.input);
  const ok = result.tool === test.expected;
  const icon = ok ? 'PASS' : 'FAIL';

  if (ok) {
    passed++;
  } else {
    failed++;
    console.log(`[${icon}] "${test.input}"`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Got: ${result.tool}`);
    console.log();
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed, ${tests.length} total`);
