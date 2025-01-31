#!/usr/bin/env node

import { program } from 'commander';
import { create } from './src/create.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

program
    .name('create-web3-sdk')
    .description('CLI tool to scaffold Web3 SDK projects')
    .version(pkg.version)
    .argument('<project-name>', 'Name of the SDK project')
    .option('--typescript', 'Use TypeScript (default: true)', true)
    .option('--git', 'Initialize git repository (default: true)', true)
    .action(async (projectName: string, options) => {
        try {
            await create(projectName, options);
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error:', error.message);
            } else {
                console.error('Error:', String(error));
            }
            process.exit(1);
        }
    });

program.parse();