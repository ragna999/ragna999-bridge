import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

const configPath = join(process.env.HOME || process.env.USERPROFILE, '.anvitaflow', 'config.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const token = config.gatewayAccessToken;
const did = 'did:anvita:' + config.activeAgent.agentSmartAccount;

console.log('Token role: server, connecting...');

const ws = new WebSocket('wss://hub.anvita.xyz/ws');
let frameCount = 0;

ws.on('open', () => {
  console.log('OPEN');
  
  ws.on('message', (data, isBin) => {
    frameCount++;
    const raw = data.toString();
    console.log(`[${frameCount}] ${raw.slice(0, 300)}`);
  });

  // Auth
  const authId = randomUUID();
  ws.send(JSON.stringify({ type: 'auth', id: authId, params: { token } }));
  console.log('AUTH_SENT id=' + authId);

  // Wait for auth response, then register
  setTimeout(() => {
    const regId = randomUUID();
    ws.send(JSON.stringify({ type: 'req', method: 'register', id: regId, params: { did } }));
    console.log('REGISTER_SENT id=' + regId);
  }, 2000);

  // Send ping after 5s
  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'ping' }));
    console.log('PING_SENT');
  }, 5000);
});

ws.on('close', (code, reason) => {
  console.log(`CLOSE: code=${code} reason=${reason?.toString()} frames=${frameCount}`);
});

ws.on('error', (err) => {
  console.log('ERROR:', err.message);
});

// Auto-exit after 25s
setTimeout(() => {
  console.log('TIMEOUT - exiting');
  ws.close();
  process.exit(0);
}, 25000);
