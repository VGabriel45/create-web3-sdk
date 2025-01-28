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
            import: "./dist/esm/index.js",
            require: "./dist/cjs/index.js",
            types: "./dist/types/index.d.ts"
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
        test: "vitest",
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
        "vitest": "^3.0.0"
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
import { createPublicClient, http, type Address } from 'viem'
import { baseSepolia } from 'viem/chains'
import { getContract } from 'viem'
import { erc20Abi } from 'viem'

/**
 * Configuration options for the SDK
 * @property rpcUrl - The RPC URL (defaults to Base Sepolia)
 * @property chain - The chain configuration
 */
export interface SDKConfig {
  rpcUrl?: string
  chain?: typeof baseSepolia
}

/**
 * Creates a new SDK instance
 */
export function main(config: SDKConfig = {}) {
  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: http(config.rpcUrl ?? baseSepolia.rpcUrls.default.http[0])
  })

  return {
    getBlockNumber: async () => {
      return publicClient.getBlockNumber()
    },

    getBalance: async (address: Address) => {
      return publicClient.getBalance({ address })
    },

    getTokenBalance: async (tokenAddress: Address, address: Address) => {
      const contract = getContract({
        address: tokenAddress,
        abi: erc20Abi,
        client: publicClient
      })

      return contract.read.balanceOf([address])
    }
  }
}`;

        await writeFile('src/index.ts', sdkContent);

        // Create test file
        await writeFile('test/sdk.test.ts', `
import { describe, it, expect } from 'vitest'
import { main } from '../src'
import { baseSepolia } from 'viem/chains'

// Mock USDC token on Base Sepolia
const TEST_TOKEN = '0x5dEaC602762362FE5f135FA5904351916053cF70' as const

describe('SDK', () => {
  const sdk = main({
    chain: baseSepolia,
    privateKey: process.env.TESTING_PRIVATE_KEY as \`0x\${string}\`
  })

  it('should get block number', async () => {
    const blockNumber = await sdk.getBlockNumber()
    expect(blockNumber).toBeTypeOf('bigint')
  })

  it('should get address balance', async () => {
    const balance = await sdk.getBalance('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045')
    expect(balance).toBeTypeOf('bigint')
  })

  it('should get token balance', async () => {
    const balance = await sdk.getTokenBalance(
      TEST_TOKEN,
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
    )
    console.log(balance)
    expect(balance).toBeTypeOf('bigint')
  })
})
`);

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
        await writeFile('README.md', `
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
- \`bun run test\` - Run tests
- \`bun run check\` - Format and lint code

### Versioning and Changelog

This project uses [changesets](https://github.com/changesets/changesets) for versioning and changelog generation.

1. Make your changes
2. Run \`bun changeset\` to create a new changeset
3. Follow the prompts to describe your changes
4. Commit the generated changeset file
5. When ready to release:
   - Run \`bun run version\` to update versions and changelog
   - Run \`bun run release\` to publish to npm
`);

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