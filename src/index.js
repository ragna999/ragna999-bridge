// src/index.js
// ragna999 Bridge Service — AnvitaFlow x Pharos DeFi Intelligence
import dotenv from 'dotenv';
dotenv.config();

import { connectGateway } from './gateway.js';
import { parseIntent } from './intent.js';
import { route } from './router.js';

const DID = process.env.ANVITAFLOW_DID || 'did:anvita:0x90396ea829789e538f94c7fa442385300403f874';

console.log('============================================');
console.log('  ragna999 — DeFi Intelligence Bridge');
console.log('  AnvitaFlow x Pharos');
console.log('============================================');
console.log(`DID: ${DID}`);
console.log(`RPC: ${process.env.PHAROS_RPC || 'https://atlantic.dplabs-internal.com'}`);
console.log('');

/**
 * Handle incoming A2A request from another agent
 * @param {{ message: string, raw: object }} req
 * @returns {{ parts: Array }}
 */
async function handleRequest(req) {
  const userMessage = req.message || '';

  if (!userMessage) {
    return { parts: [{ kind: 'text', text: 'No message received. Send a question about token safety, yields, or wallets.' }] };
  }

  console.log(`[Request] "${userMessage}"`);

  // Parse intent
  const intent = parseIntent(userMessage);
  console.log(`[Intent] tool=${intent.tool}, args=${JSON.stringify(intent.args)}`);

  // Route to handler
  const response = await route(intent);
  console.log(`[Response] ${response.slice(0, 100)}...`);

  return { parts: [{ kind: 'text', text: response }] };
}

/**
 * Start the bridge
 */
async function main() {
  console.log('Starting Gateway connection...\n');

  const connection = connectGateway({
    did: DID,
    onRequest: handleRequest,
    onConnect: () => {
      console.log('');
      console.log('=== ragna999 is LIVE ===');
      console.log('Listening for A2A requests on AnvitaFlow Gateway');
      console.log('Press Ctrl+C to stop');
      console.log('');
    },
    onError: (err) => {
      console.error(`[Fatal] ${err.message}`);
    },
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    connection.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\nShutting down...');
    connection.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(`[Startup Error] ${err.message}`);
  process.exit(1);
});
