import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import ora from 'ora';

interface CreateOptions {
    typescript: boolean;
    git: boolean;
}

const packageJson = (projectName: string) => ({
    name: projectName,
    version: '0.1.0',
    type: "module",
    main: "./dist/cjs/index.js",
    module: "./dist/esm/index.js",
    types: "./dist/types/index.d.ts",
    exports: {
        ".": {
            types: "./dist/types/index.d.ts",
            import: "./dist/esm/index.js",
            require: "./dist/cjs/index.js"
        }
    },
    scripts: {
        build: "rimraf dist && bun run build:esm && bun run build:cjs && bun run build:types",
        "build:esm": "tsc -p tsconfig/esm.json",
        "build:cjs": "tsc -p tsconfig/cjs.json",
        "build:types": "tsc -p tsconfig/types.json",
        "docs": "typedoc",
        "docs:watch": "typedoc --watch",
        "format": "biome format --write ./src",
        "lint": "biome lint ./src",
        "check": "biome check ./src",
        "fork:base-sepolia": "anvil --fork-url https://sepolia.base.org -vvvv",
        "test": "concurrently \"bun run fork:base-sepolia\" \"wait-on tcp:8545 && vitest\" \"kill -9 $(lsof -t -i:8545)\"",
        prepare: "bun run build",
        "changeset": "changeset",
        "version": "changeset version",
        "release": "npm run build && changeset publish --access public"
    },
    dependencies: {
        "viem": "^2.22.12"
    },
    devDependencies: {
        "@biomejs/biome": "1.5.3",
        "@changesets/cli": "^2.27.11",
        "rimraf": "^5.0.0",
        "typedoc": "^0.25.0",
        "typescript": "^5.7.0",
        "vitest": "^3.0.0",
        "concurrently": "^8.2.2",
        "wait-on": "^7.2.0",
        "@viem/anvil": "^0.0.10"
    },
    peerDependencies: {
        "typescript": "^5.0.0"
    }
});

const tsConfig = {
    compilerOptions: {
        target: 'ES2020',
        module: 'ESNext',
        moduleResolution: 'node',
        declaration: true,
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: './dist'
    },
    include: ['src'],
    exclude: ['node_modules', 'dist', '**/*.test.ts']
};

export async function create(projectName: string, options: CreateOptions) {
    const spinner = ora('Creating Web3 SDK project...').start();

    try {
        // Create project directory
        const projectPath = join(process.cwd(), projectName);
        await mkdir(projectPath);
        process.chdir(projectPath);

        // Create necessary directories
        await mkdir('src');
        await mkdir('test');
        await mkdir('tsconfig');

        // Write tsconfig files in the tsconfig folder
        await writeFile('tsconfig/base.json', JSON.stringify({
            ...tsConfig,
            compilerOptions: {
                ...tsConfig.compilerOptions,
                rootDir: "../src",
                outDir: "../dist"
            },
            include: ["../src/**/*"],
            exclude: ["../node_modules", "../dist", "../**/*.test.ts"]
        }, null, 2));

        await writeFile('tsconfig/esm.json', JSON.stringify({
            extends: "../tsconfig/base.json",
            compilerOptions: {
                outDir: "../dist/esm"
            }
        }, null, 2));

        await writeFile('tsconfig/cjs.json', JSON.stringify({
            extends: "../tsconfig/base.json",
            compilerOptions: {
                module: "CommonJS",
                outDir: "../dist/cjs"
            }
        }, null, 2));

        await writeFile('tsconfig/types.json', JSON.stringify({
            extends: "../tsconfig/base.json",
            compilerOptions: {
                emitDeclarationOnly: true,
                outDir: "../dist/types"
            }
        }, null, 2));

        // Update main tsconfig.json to extend from base
        await writeFile('tsconfig.json', JSON.stringify({
            extends: "./tsconfig/base.json"
        }, null, 2));

        // Write package.json
        const pkg = packageJson(projectName);
        await writeFile('package.json', JSON.stringify(pkg, null, 2));

        // Add typedoc configuration
        await writeFile('typedoc.json', JSON.stringify({
            "$schema": "https://typedoc.org/schema.json",
            "entryPoints": ["src/index.ts"],
            "exclude": [
                "src/test/**/*.ts"
            ],
            "basePath": "src/",
            "includes": "src/",
            "out": "docs",
            "gitRevision": "main"
        }
            , null, 2));

        // Add Biome configuration
        await writeFile('biome.json', JSON.stringify({
            "$schema": "https://biomejs.dev/schemas/1.5.3/schema.json",
            "organizeImports": {
                "enabled": false
            },
            "linter": {
                "enabled": true,
                "rules": {
                    "recommended": true,
                    "suspicious": {
                        "noConsoleLog": "off"
                    },
                    "style": {
                        "noNonNullAssertion": "off",
                        "useShorthandArrayType": "off",
                        "noUselessElse": "off",
                        "noUnusedTemplateLiteral": "off",
                        "useSingleVarDeclarator": "off",
                        "noParameterAssign": "off",
                        "useTemplate": "off",
                        "noShoutyConstants": "off"
                    }
                }
            },
            "formatter": {
                "enabled": true,
                "formatWithErrors": false,
                "indentStyle": "space",
                "indentWidth": 2,
                "lineWidth": 80
            },
            "files": {
                "ignore": [
                    "dist/**/*",
                    "node_modules/**/*"
                ]
            }
        }, null, 2));

        // Create .env.example file
        await writeFile('.env.example', `
# Required for testing token transfers
TESTING_PRIVATE_KEY=your_private_key_here

# Optional: Override default RPC URL
RPC_URL=your_rpc_url_here
`);

        // Create example SDK file
        const sdkContent = `
// Implement SDK
`;

        await writeFile('src/index.ts', sdkContent);

        // Create test config file
        const testConfigContent = `
import { createTestClient, defineChain, http, publicActions, walletActions } from 'viem'

export const ANVIL_RPC_URL = 'http://127.0.0.1:8545'

export const testChain = defineChain({
  id: 84532,
  name: 'Base Sepolia Fork',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [ANVIL_RPC_URL],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://sepolia.basescan.org' },
  },
})

export const testClient = createTestClient({
  chain: testChain,
  mode: 'anvil',
  transport: http(ANVIL_RPC_URL),
})
  .extend(walletActions)
  .extend(publicActions)

// Anvil's first test account - has 10000 ETH
export const TEST_ACCOUNT = {
  address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
} as const
`;

        // Create test utilities file
        const testUtilsContent = `
import { createWalletClient, http, parseEther, type Address } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { testChain, TEST_ACCOUNT, testClient } from './test.config'

export async function fundAddress(address: Address, amount: string) {
  const account = privateKeyToAccount(TEST_ACCOUNT.privateKey)
  const client = createWalletClient({
    account,
    chain: testChain,
    transport: http()
  })

  const tx = await client.sendTransaction({
    to: address,
    value: parseEther(amount)
  })

  return tx
}

export async function getBalance(address: Address) {
  return testClient.getBalance({ address })
}

export async function impersonateAccount(address: Address) {
  await testClient.impersonateAccount({ address })
}
`;

        // Update the test file content
        const testFileContent = `
import { describe, it, expect } from 'vitest'
import { http, parseEther, createPublicClient } from 'viem'
import { testChain, ANVIL_RPC_URL, testClient } from './config/test.config'
import { fundAddress, getBalance, impersonateAccount } from './config/test.utils'

// Vitalik's address for impersonation test
const VITALIK = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045' as const

describe('SDK Example Tests', () => {
  it('should fund an address using utility function', async () => {
    const recipient = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

    // Fund the recipient using our utility function
    const fundTx = await fundAddress(recipient, '1.5')

    // Verify the transfer
    const publicClient = createPublicClient({
      transport: http(ANVIL_RPC_URL),
      chain: testChain
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash: fundTx })
    expect(receipt.status).toBe('success')

    const balance = await getBalance(recipient)
    expect(balance >= parseEther('1.5')).toBe(true)
  })

  it('should impersonate Vitalik and send ETH', async () => {
    const recipient = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

    // Get initial balances
    const initialBalance = await getBalance(recipient)

    const vitalikBalance = await getBalance(VITALIK)
    console.log('Vitalik balance:', vitalikBalance)

    // Impersonate Vitalik
    await impersonateAccount(VITALIK)

    // Send 1 ETH from Vitalik's account to the recipient
    const txHash = await testClient.sendUnsignedTransaction({
      from: VITALIK,
      to: recipient,
      value: parseEther('1')
    })

    // Wait for transaction
    const receipt = await testClient.waitForTransactionReceipt({ hash: txHash })
    expect(receipt.status).toBe('success')

    // Verify the transfer
    const finalBalance = await getBalance(recipient)
    expect(finalBalance - initialBalance).toBe(parseEther('1'))

    // Stop impersonating
    await testClient.stopImpersonatingAccount({ address: VITALIK })
  })
})`;

        // In the create function, add these files:
        await mkdir('test/config');
        await writeFile('test/config/test.config.ts', testConfigContent);
        await writeFile('test/config/test.utils.ts', testUtilsContent);
        await writeFile('test/sdk.test.ts', testFileContent);

        // Add changesets configuration
        await mkdir('.changeset');
        await writeFile('.changeset/config.json', JSON.stringify({
            "$schema": "https://unpkg.com/@changesets/config@2.3.1/schema.json",
            "changelog": "@changesets/cli/changelog",
            "commit": false,
            "fixed": [],
            "linked": [],
            "access": "public",
            "baseBranch": "main",
            "updateInternalDependencies": "patch",
            "ignore": []
        }, null, 2));

        // Update README with versioning instructions
        const readmeContent = `
# ${projectName}

## Installation

Using bun (recommended):
\`\`\`bash
bunx create-web3-sdk my-sdk
\`\`\`

Using npm:
\`\`\`bash
npx create-web3-sdk my-sdk
\`\`\`

## Development

### Scripts

- \`bun run build\` - Build the SDK
- \`bun run test\` - Run tests against Base Sepolia
- \`bun run test:fork\` - Run tests against local Anvil fork
- \`bun run fork:base-sepolia\` - Start Anvil fork of Base Sepolia
- \`bun run check\` - Format and lint code

### Testing with Local Fork

For faster and more reliable tests, you can run them against a local Anvil fork:

1. Install Anvil (comes with Foundry): https://book.getfoundry.sh/
2. Run \`bun run test:fork\` - This will:
   - Start an Anvil fork of Base Sepolia
   - Wait for the fork to be ready
   - Run the tests against the local fork

### Versioning and Changelog

This project uses [changesets](https://github.com/changesets/changesets) for versioning and changelog generation.

1. Make your changes
2. Run \`bun changeset\` to create a new changeset
3. Follow the prompts to describe your changes
4. Commit the generated changeset file
5. When ready to release:
   - Run \`bun run version\` to update versions and changelog
   - Run \`bun run release\` to publish to npm
`;

        await writeFile('README.md', readmeContent);

        // Update .gitignore
        if (options.git) {
            await writeFile('.gitignore', `
node_modules
dist
docs
.env
`);
        }

        // Initialize git if requested
        if (options.git) {
            execSync('git init');
        }

        // Install dependencies
        spinner.text = 'Installing dependencies...';
        execSync('bun install', { stdio: 'inherit' });

        spinner.succeed(`Successfully created ${projectName}!`);
        console.log('\nNext steps:');
        console.log(`  cd ${projectName}`);
        console.log('  bun install     # Install dependencies');
        console.log('  bun run check   # Format and lint code');
        console.log('  bun run test    # Run tests');
        console.log('  bun run build   # Build the SDK');

    } catch (error) {
        spinner.fail('Failed to create project');
        throw error;
    }
} 