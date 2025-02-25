# create-web3-sdk

A CLI tool to quickly scaffold a modern Web3 SDK with TypeScript, testing, documentation and more.

## Features

- ✅ TypeScript-first development
- ✅ Automatic API documentation with TypeDoc
- ✅ Testing setup with Vitest
- ✅ Code quality with Biome (linting, formatting)
- ✅ Dual ESM/CJS builds
- ✅ Modern tooling with Bun
- ✅ viem for Ethereum RPC 
- ✅ Built in versioning and changelog with changesets
- ✅ Built in anvil network for fast and easy testing of on-chain actions 

## Upcoming Features
- ⚙️ Professional documentation website with vocs
- ⚙️ CI/CD setup with Github Actions
- ⚙️ Easy deployment of smart contracts on anvil network for testing
- ⚙️ Automatic typescript interfaces for your contracts

## Usage

Create a new SDK project:

```bash
npm install -g create-web3-sdk
npx create-web3-sdk my-sdk 
cd my-sdk
bun install
bun run test # Run tests
bun run build # Build the SDK
bun run start # Start the SDK
```

Built with ❤️ 