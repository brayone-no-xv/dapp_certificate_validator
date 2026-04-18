# Document Certificate DApp (Stellar + Soroban)

Document Certificate DApp is a decentralized anti-fraud application for issuing and verifying document certificates on the Stellar Soroban testnet.

The app does not store document files on-chain. It stores only the document hash and metadata, so users can prove authenticity without exposing private file contents.

## Application Description

This project provides a trustless certificate verification flow:

- Issuers register a document certificate on-chain.
- The frontend computes a SHA-256 hash in-browser.
- Verifiers can upload a file (or paste a hash) to validate authenticity.
- Issuers can revoke certificates, and revocation status is publicly auditable.

## Key Features

- Wallet connection with Freighter (Stellar testnet)
- Certificate issuance with metadata (`doc_name`, `note`, owner address)
- Hash-based verification (`VALID` / `REVOKED`)
- Per-user listing:
- `Issued by Me`
- `Owned by Me`
- Issuer-only certificate revocation

## Testnet Smart Contract

- Network: `Stellar Testnet`
- Contract ID: `CB56EHRETWRDJTPDPOYBB3E3QBCDM7WUONACL4HIUXCUBHKLIXOA7R7U`
- Stellar Expert: `https://stellar.expert/explorer/testnet/contract/CB56EHRETWRDJTPDPOYBB3E3QBCDM7WUONACL4HIUXCUBHKLIXOA7R7U`

## Testnet Screenshots

### Smart Contract (Testnet Explorer)

![Smart Contract Testnet](smartcontract.png)

### Frontend (Issue/Verify UI)

![Frontend Testnet](frontend.png)

## App Flow

1. `Issue`
- Connect wallet
- Fill owner address and document name
- Upload document file
- Hash is generated in browser
- App calls `issue_certificate(...)`

2. `Verify`
- Upload file or paste hash
- App calls `verify_by_hash(hash_hex)`
- App shows certificate details and status

3. `My Certificates`
- Loads data from `get_by_issuer(address)` and `get_by_owner(address)`
- Allows issuer to revoke using `revoke_certificate(...)`

## Smart Contract API

- `issue_certificate(issuer, owner, hash_hex, doc_name, note) -> u64`
- `verify_by_hash(hash_hex) -> Option<Certificate>`
- `get_certificate(id) -> Option<Certificate>`
- `get_by_owner(owner) -> Vec<Certificate>`
- `get_by_issuer(issuer) -> Vec<Certificate>`
- `revoke_certificate(issuer, id, reason) -> bool`

## Project Structure

- `contracts/hello-world/src/lib.rs`: Soroban smart contract implementation
- `contracts/hello-world/src/test.rs`: contract unit tests
- `frontend/src/App.jsx`: main UI (Issue, Verify, My Certificates)
- `frontend/src/hooks/useContract.js`: wallet + contract read/write layer

## Requirements

- Rust toolchain
- Soroban/Stellar CLI
- Node.js and npm
- Freighter wallet extension (testnet mode)

## Local Setup

1. Install dependencies:

```bash
cd frontend
npm install
```

2. Configure environment in `frontend/.env`:

```env
VITE_CONTRACT_ID=CB56EHRETWRDJTPDPOYBB3E3QBCDM7WUONACL4HIUXCUBHKLIXOA7R7U
VITE_RPC_URL=https://soroban-testnet.stellar.org
```

3. Run the frontend:

```bash
cd frontend
npm run dev
```

## Build and Deploy Contract

From `contracts/hello-world`:

```bash
stellar contract build
stellar contract deploy \
  --wasm ../../target/wasm32v1-none/release/hello_world.wasm \
  --source <YOUR_KEY_NAME> \
  --network testnet
```

After deployment, update `VITE_CONTRACT_ID` in `frontend/.env` and restart the dev server.

## Testing

```bash
cargo test
```

## Troubleshooting

- If you see `MissingValue` for `issue_certificate`, the frontend is using an old contract ID.
- Confirm contract interface:

```bash
stellar contract info interface --id <CONTRACT_ID> --network testnet
```

The output should include `issue_certificate`, `verify_by_hash`, and `revoke_certificate`.

## Security Notes

- Never store document contents on-chain.
- Store only hash and minimal metadata.
- Any file change creates a different SHA-256 hash.

