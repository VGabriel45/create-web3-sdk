import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import ora from 'ora';

interface CreateOptions {
    typescript: boolean;
    git: boolean;
    typechain?: boolean;
}

const packageJson = (projectName: string, options: CreateOptions) => ({
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
        build: options.typechain
            ? "rimraf dist && bun run build:esm && bun run build:cjs && bun run build:types && bun run build:typechain"
            : "rimraf dist && bun run build:esm && bun run build:cjs && bun run build:types",
        "build:esm": "tsc -p tsconfig/esm.json",
        "build:cjs": "tsc -p tsconfig/cjs.json",
        "build:types": "tsc -p tsconfig/types.json",
        ...(options.typechain && {
            "build:typechain": "typechain --target=ethers-v6 --out-dir typechain/contracts './abis/**/*.json'"
        }),
        "docs": "typedoc",
        "docs:watch": "typedoc --watch",
        "format": "biome format --write ./src",
        "lint": "biome lint ./src",
        "check": "biome check ./src",
        test: "vitest",
        prepare: "bun run build"
    },
    dependencies: {
        "viem": "^2.22.12",
        ...(options.typechain && {
            "ethers": "^6.0.0"
        })
    },
    devDependencies: {
        "@biomejs/biome": "1.5.3",
        "rimraf": "^5.0.0",
        "typedoc": "^0.25.0",
        "typescript": "^5.7.0",
        "vitest": "^3.0.0",
        ...(options.typechain && {
            "@typechain/ethers-v6": "^0.5.0",
            "typechain": "^8.3.0"
        })
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
        const pkg = packageJson(projectName, options);
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

        // Update sample SDK file with better documentation
        await writeFile('src/index.ts', `
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import type { Address } from 'viem'

/**
 * Configuration options for the SDK
 * @property rpcUrl - The RPC URL for the Ethereum node
 * @property chain - The chain configuration (defaults to mainnet)
 */
export interface SDKConfig {
  rpcUrl: string
  chain?: typeof mainnet
}

/**
 * Creates a new SDK instance
 * @param config - The SDK configuration
 * @returns An object containing SDK methods
 * 
 * @example
 * \`\`\`ts
 * const sdk = main({
 *   rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key'
 * })
 * 
 * const blockNumber = await sdk.getBlockNumber()
 * \`\`\`
 */
export function main(config: SDKConfig) {
  const client = createPublicClient({
    chain: config.chain ?? mainnet,
    transport: http(config.rpcUrl)
  })

  return {
    /**
     * Gets the current block number
     * @returns The current block number
     */
    getBlockNumber: async () => {
      return client.getBlockNumber()
    },

    /**
     * Gets the balance of an address
     * @param address - The Ethereum address to get the balance for
     * @returns The balance in wei
     */
    getBalance: async (address: Address) => {
      return client.getBalance({ address })
    },

    // Add more functions as needed...
  }
}
`);

        // Create sample test file
        await writeFile('test/sdk.test.ts', `
import { describe, it, expect } from 'vitest'
import { main } from '../src'
import { mainnet } from 'viem/chains'

describe('SDK', () => {
  const sdk = main({
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key',
    chain: mainnet
  })

  it('should be defined', () => {
    expect(sdk).toBeDefined()
    expect(sdk.getBlockNumber).toBeDefined()
    expect(sdk.getBalance).toBeDefined()
  })
})
`);

        // Create TypeChain directories and files if enabled
        if (options.typechain) {
            await mkdir('typechain');
            await mkdir('typechain/contracts');
            await mkdir('abis');

            // Add sample ABI
            await writeFile('abis/ERC20.json', JSON.stringify({
                "name": "ERC20",
                "abi": [
                    {
                        "inputs": [
                            {
                                "internalType": "string",
                                "name": "name_",
                                "type": "string"
                            },
                            {
                                "internalType": "string",
                                "name": "symbol_",
                                "type": "string"
                            }
                        ],
                        "stateMutability": "nonpayable",
                        "type": "constructor"
                    },
                    {
                        "inputs": [
                            {
                                "internalType": "address",
                                "name": "owner",
                                "type": "address"
                            },
                            {
                                "internalType": "address",
                                "name": "spender",
                                "type": "address"
                            }
                        ],
                        "name": "allowance",
                        "outputs": [
                            {
                                "internalType": "uint256",
                                "name": "",
                                "type": "uint256"
                            }
                        ],
                        "stateMutability": "view",
                        "type": "function"
                    }
                ]
            }, null, 2));
        }

        // Update README with TypeChain instructions if enabled
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

${options.typechain ? `### Smart Contract Types

1. Add your contract ABIs to the \`abis\` directory
2. Run \`bun run build:typechain\` to generate TypeScript types
3. Import and use the generated types in your SDK

` : ''}## Scripts

- \`bun run build\` - Build the SDK${options.typechain ? ' (includes contract types)' : ''}
${options.typechain ? '- \`bun run build:typechain\` - Generate TypeScript types from ABIs\n' : ''}- \`bun run test\` - Run tests
- \`bun run check\` - Format and lint code
`);

        // Update .gitignore
        if (options.git) {
            await writeFile('.gitignore', `
node_modules
dist
docs
.env
${options.typechain ? 'typechain/contracts' : ''}
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