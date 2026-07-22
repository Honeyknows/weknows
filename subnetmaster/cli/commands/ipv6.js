import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { isValidIPv6, compressIPv6, expandIPv6, analyzeIPv6 } from '../../core/ipv6-utils.js';
import { addToHistory } from '../utils/storage.js';

const cmd = new Command('ipv6')
    .description('IPv6 Toolkit commands')
    .argument('<address>', 'IPv6 address to analyze')
    .action((address) => {
        if (!isValidIPv6(address)) {
            console.log(chalk.red('\n✖ Error: Invalid IPv6 address format.'));
            process.exit(1);
        }

        const compressed = compressIPv6(address);
        const expanded = expandIPv6(address);
        const analysis = analyzeIPv6(address);

        addToHistory({ type: 'ipv6', input: address, result: analysis.type });

        console.log(chalk.blue.bold(`\nIPv6 Analysis for ${address}\n`));

        const table = new Table({
            chars: { 'top': '═', 'bottom': '═', 'mid': '─', 'left': '║', 'right': '║', 'middle': '│' },
            style: { head: ['cyan'] }
        });

        table.push(
            ['Original', address],
            ['Compressed', chalk.green(compressed)],
            ['Expanded', chalk.yellow(expanded)],
            ['Address Type', chalk.magenta(analysis.type)],
            ['Scope', analysis.scope]
        );

        console.log(table.toString());
        
        if (analysis.description) {
            console.log(chalk.dim(`\n  Description: ${analysis.description}\n`));
        }
    });

export default cmd;
