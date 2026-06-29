# ragna999 — DeFi Intelligence Bridge

> AnvitaFlow x Pharos — Multi-agent DeFi intelligence on-chain

## What Is This

ragna999 is an AI agent on the AnvitaFlow marketplace that provides DeFi intelligence services. Other agents send natural language queries via A2A protocol, and ragna999 returns structured analysis powered by on-chain consensus data and GoPlus Security API.

## Architecture

```
Agent → AnvitaFlow Gateway → ragna999 Bridge → Response
                                ↓
                    ┌───────────┴───────────┐
                    │                       │
              Pharos Contracts         GoPlus API
              (on-chain consensus)     (multi-chain security)
```

## Services

| Service | Query Example | Source |
|---------|--------------|--------|
| Token Safety | "Is 0xABC safe?" | Pharos TokenSafetyRegistry |
| GoPlus Scan | "Check 0xABC on Base" | GoPlus Security API |
| Yield Scanner | "Best yields on Pharos?" | Pharos YieldRegistry |
| Batch Scan | "Scan 0x123, 0x456" | Pharos TokenSafetyRegistry |
| Wallet Intel | "Analyze wallet 0xABC" | Pharos RPC |

### GoPlus Multi-Chain Support

ETH, Base, BNB, Polygon, Arbitrum, Avalanche, Solana, Optimism, Fantom, Cronos, Linea, Blast, zkSync

## Quick Start

```bash
# Install dependencies
cd ~/ragna999-bridge && npm install

# Configure .env
cp .env.example .env
# Edit .env with your values

# Run tests
node test/intent.test.js

# Start bridge
node src/index.js
```

## Environment Variables

```
PHAROS_RPC=https://atlantic.dplabs-internal.com
ANVITAFLOW_DID=did:anvita:0x90396ea829789e538f94c7fa442385300403f874
YIELD_REGISTRY_ADDRESS=  # optional, set after deployment
```

## Contract Addresses (Pharos Atlantic Testnet)

| Contract | Address | Status |
|----------|---------|--------|
| TokenSafetyRegistry | `0xdC404a4D7E482e4EC5Ca96215aD45A670Ee82989` | Active |
| YieldRegistry | TBD | Pending deployment |

## Project Structure

```
ragna999-bridge/
├── src/
│   ├── index.js              Entry point
│   ├── gateway.js            AnvitaFlow Gateway WebSocket client
│   ├── intent.js             Intent parser (keyword matching)
│   ├── router.js             Tool router
│   ├── contracts/
│   │   ├── provider.js       Pharos RPC provider
│   │   ├── token-safety.js   TokenSafetyRegistry interactions
│   │   └── yield-registry.js YieldRegistry interactions
│   └── tools/
│       ├── token-safety.js   Token safety check tool
│       ├── yield-scan.js     Yield scanner tool
│       ├── batch-scan.js     Batch safety scan tool
│       ├── wallet-intel.js   Wallet analysis tool
│       └── goplus-scanner.js GoPlus multi-chain scanner
├── abi/
│   ├── TokenSafetyRegistry.json
│   └── YieldRegistry.json
├── test/
│   ├── intent.test.js        Intent parser tests (19/19)
│   └── contracts.test.js     Contract interaction tests
├── .env
├── package.json
├── PROGRESS.md
└── README.md
```

## AnvitaFlow Agent

- Agent ID: `agent_CAQM6GGZ252W`
- Agent Name: `ragna999`
- DID: `did:anvita:0x90396ea829789e538f94c7fa442385300403f874`
- Smart Account: `0x90396ea829789e538f94c7fa442385300403f874`
- Price: $0.01/request
- Marketplace: Published

## How It Works

1. Agent browses AnvitaFlow marketplace → finds ragna999
2. Agent sends A2A message: "Is 0xABC safe on Base?"
3. Gateway forwards message via WebSocket
4. Bridge parses intent → detects chain → routes to GoPlus
5. GoPlus returns security data → formatted as report
6. Response sent back via Gateway
7. x402 settlement: $0.01

## Multi-Agent Consensus

The TokenSafetyRegistry contract supports multi-agent consensus:
- Multiple agents can submit safety reports for the same token
- Contract aggregates into consensus score
- Each agent has a reputation score
- Data is transparent and verifiable on-chain

## Tech Stack

- Node.js 22+
- ethers.js 6.17
- ws 8.x
- AnvitaFlow CLI 2.0.0
- Solidity 0.8.20 (Foundry)
- GoPlus Security API (free, no key)

## License

MIT
