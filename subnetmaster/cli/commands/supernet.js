import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { calculateSupernet, parseCidr } from '../../core/ip-utils.js';
import { addToHistory } from '../utils/storage.js';

const cmd = new Command('supernet')
    .description('Aggregate multiple networks into a supernet')
    .argument('<networks...>', 'Networks in CIDR notation (e.g. 192.168.0.0/24 192.168.1.0/24)')
    .action((networks) => {
        const parsed = networks.map(n => parseCidr(n)).filter(Boolean);

        if (parsed.length < 2) {
            console.log(chalk.red('\n✖ Error: At least 2 valid networks required'));
            process.exit(1);
        }

        const result = calculateSupernet(parsed);

        addToHistory({ type: 'supernet', input: networks.join(', '), result: result.notation });

        console.log(chalk.blue.bold('\nSupernet Aggregation\n'));

        console.log(chalk.dim('  Input Networks:'));
        parsed.forEach(n => console.log(`    ${chalk.white(`${n.ip}/${n.cidr}`)}`));

        console.log('');
        const table = new Table();
        table.push(
            ['Summary Route', chalk.green.bold(result.notation)],
            ['Network Address', result.supernetAddress],
            ['Subnet Mask', result.supernetMask],
            ['Total Addresses', result.totalAddresses.toLocaleString()]
        );
        console.log(table.toString());
        console.log('');
    });

export default cmd;
