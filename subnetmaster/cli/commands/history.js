import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getHistory, clearHistory } from '../utils/storage.js';

const cmd = new Command('history')
    .description('View or clear calculation history')
    .option('-c, --clear', 'Clear all history')
    .action((options) => {
        if (options.clear) {
            clearHistory();
            console.log(chalk.green('\n✓ History cleared.\n'));
            return;
        }

        const history = getHistory();

        console.log(chalk.blue.bold('\nCalculation History\n'));

        if (history.length === 0) {
            console.log(chalk.dim('  No history found.\n'));
            return;
        }

        const table = new Table({
            head: ['Date', 'Type', 'Input', 'Result'].map(h => chalk.cyan(h))
        });

        history.forEach(h => {
            const date = new Date(h.timestamp).toLocaleString();
            table.push([date, h.type, h.input, h.result]);
        });

        console.log(table.toString());
        console.log('');
    });

export default cmd;
