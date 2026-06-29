// src/gateway.js
// Minimal test — no message handler, just connect and stay alive
import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

const GATEWAY_WS_URL = process.env.GATEWAY_WS_URL || 'wss://hub.anvita.xyz/ws';
const PING_INTERVAL = 10_000;

function getGatewayAuth() {
  const configPath = join(process.env.HOME || process.env.USERPROFILE, '.anvitaflow', 'config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const token = config.gatewayAccessToken;
  const did = `did:anvita:${config.activeAgent?.agentSmartAccount || 'unknown'}`;
  if (!token) throw new Error('No gatewayAccessToken in config');
  return { token, did };
}

export function connectGateway(opts) {
  const { did, onRequest, onError, onConnect } = opts;
  let ws = null;
  let pingTimer = null;
  let stopped = false;

  function sendFrame(frame) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(frame));
    }
  }

  // Handle A2A request — extract message, call onRequest, send response
  async function handleA2ARequest(fr) {
    const payload = fr.payload;
    // Extract message text from A2A JSON-RPC payload
    let userMessage = '';
    if (payload?.params?.message?.parts) {
      const textParts = payload.params.message.parts.filter(p => p.kind === 'text' || p.type === 'text');
      userMessage = textParts.map(p => p.text).join(' ');
    } else if (payload?.params?.message?.text) {
      userMessage = payload.params.message.text;
    } else if (typeof payload?.params?.message === 'string') {
      userMessage = payload.params.message;
    }

    if (!userMessage) {
      console.log(`[A2A] No message extracted from payload: ${JSON.stringify(payload).slice(0, 200)}`);
    }

    const ts = new Date().toISOString().slice(11, 19);
    console.log(`[${ts}] [A2A] Message: "${userMessage}"`);

    // Call onRequest if provided
    let responseParts = [{ kind: 'text', text: 'No handler configured.' }];
    if (opts.onRequest) {
      try {
        const result = await opts.onRequest({ message: userMessage, raw: payload });
        if (result?.parts) {
          responseParts = result.parts;
        } else if (typeof result === 'string') {
          responseParts = [{ kind: 'text', text: result }];
        }
      } catch (err) {
        console.error(`[${ts}] [A2A] onRequest error: ${err.message}`);
        responseParts = [{ kind: 'text', text: `Error: ${err.message}` }];
      }
    }

    // Send event frame with response
    const jsonrpcId = payload?.id || randomUUID();
    sendFrame({
      type: 'event',
      id: fr.id,
      payload: {
        jsonrpc: '2.0',
        id: jsonrpcId,
        result: {
          kind: 'message',
          messageId: randomUUID(),
          role: 'agent',
          parts: responseParts,
        },
      },
    });

    // Send final ack (no payload)
    sendFrame({ type: 'res', id: fr.id, ok: true });
    console.log(`[A2A] Response sent (${responseParts[0]?.text?.length || 0} chars)`);
  }

  function connectOnce() {
    return new Promise((resolve, reject) => {
      const { token, did: authDid } = getGatewayAuth();
      const useDid = did || authDid;

      console.log(`[Gateway] Connecting to ${GATEWAY_WS_URL}...`);
      ws = new WebSocket(GATEWAY_WS_URL);

      // Minimal handler — just log frames
      ws.on('message', (data, isBin) => {
        if (isBin) return;
        const raw = data.toString();
        try {
          const fr = JSON.parse(raw);
          if (fr.type === 'pong') return;
          const ts = new Date().toISOString().slice(11, 19);
          console.log(`[${ts}] [RX] ${fr.type} ${fr.method || ''} ${fr.id || ''}`);
          
          // Handle getAgentCard
          if (fr.type === 'req' && fr.method === 'getAgentCard') {
            sendFrame({ type: 'res', id: fr.id, ok: true, payload: { name: 'ragna999', description: 'DeFi Intelligence Agent — token safety (Pharos on-chain + GoPlus multi-chain), yield scanning, wallet analysis. Supports ETH, Base, BNB, Polygon, Arbitrum, Avalanche, Solana.', version: '1.1.0', capabilities: ['tokenSafety', 'yieldScan', 'batchScan', 'walletIntel', 'goplusScan'] } });
          }
          // Handle A2A requests — call onRequest, send response
          if (fr.type === 'req' && fr.payload !== undefined) {
            const ts2 = new Date().toISOString().slice(11, 19);
            console.log(`[${ts2}] [A2A] GOT REQUEST!`);
            handleA2ARequest(fr).catch(err => {
              console.error(`[A2A] Handler error: ${err.message}`);
              sendFrame({ type: 'res', id: fr.id, ok: false, error: err.message });
            });
          }
        } catch {}
      });

      ws.on('open', () => {
        console.log('[Gateway] WebSocket open');

        // Auth
        const authId = randomUUID();
        ws.send(JSON.stringify({ type: 'auth', id: authId, params: { token } }));

        // Register after 2s
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'req', method: 'register', id: randomUUID(), params: { did: useDid } }));
          console.log(`[Gateway] Registered: ${useDid}`);
          
          // Ping after 3s
          setTimeout(() => {
            ws.send(JSON.stringify({ type: 'ping' }));
          }, 3000);

          // Keepalive
          pingTimer = setInterval(() => {
            sendFrame({ type: 'ping' });
          }, PING_INTERVAL);

          if (onConnect) onConnect();
          resolve();
        }, 2000);
      });

      ws.on('close', (code, reason) => {
        console.log(`[Gateway] Closed: ${code} ${reason?.toString() || ''}`);
        if (pingTimer) { clearInterval(pingTimer); pingTimer = null; }
      });

      ws.on('error', (err) => {
        console.error(`[Gateway] Error: ${err.message}`);
        reject(err);
      });
    });
  }

  async function runLoop() {
    while (!stopped) {
      try {
        await connectOnce();
        await new Promise((resolve) => {
          const onClose = () => { ws.off('close', onClose); resolve(); };
          ws.on('close', onClose);
        });
      } catch (e) {
        console.error(`[Gateway] Failed: ${e.message}`);
      }
      if (stopped) break;
      console.log('[Gateway] Reconnecting in 5s...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  runLoop().catch(err => { if (onError) onError(err); });

  return {
    stop() {
      stopped = true;
      if (pingTimer) clearInterval(pingTimer);
      if (ws) try { ws.close(); } catch {}
    },
  };
}
