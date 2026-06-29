// test/contracts.test.js
// Test contract interactions locally
import { getConsensus, isTokenSafe, getReporterCount, formatSafetyReport } from '../src/contracts/token-safety.js';

const TEST_TOKENS = [
  '0x0000000000000000000000000000000000000001',  // dummy
  '0x000000000000000000000000000000000000dEaD',  // dead address
];

async function testTokenSafety() {
  console.log('=== TokenSafetyRegistry Contract Tests ===\n');

  for (const token of TEST_TOKENS) {
    console.log(`Testing: ${token}`);
    try {
      const consensus = await getConsensus(token);
      console.log(`  Consensus:`, JSON.stringify(consensus, null, 2));

      const safe = await isTokenSafe(token);
      console.log(`  isSafe: ${safe}`);

      const count = await getReporterCount(token);
      console.log(`  Reporters: ${count}`);

      console.log(`\nFormatted:\n${formatSafetyReport(token, consensus)}\n`);
    } catch (err) {
      console.log(`  Error: ${err.message}\n`);
    }
  }
}

async function main() {
  console.log('ragna999 Bridge — Contract Tests\n');
  console.log('RPC: https://atlantic.dplabs-internal.com');
  console.log('Chain: Pharos Atlantic Testnet (688689)\n');

  await testTokenSafety();

  console.log('=== Tests Complete ===');
}

main().catch(console.error);
