import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { splitSubnet, parseCidr } from '../../core/ip-utils.js';
import { addToHistory } from '../utils/storage.js';

const cmd = new Command('split')
    .description('Split a network into equal-sized subnets')
    .argument('<network>', 'Network in CIDR notation (e.g. 192.168.1.0/24)')
    .argument('<count>', 'Number of subnets (power of 2: 2, 4, 8, 16...)')
    .action((network, count) => {
        const parsed = parseCidr(network);
        if (!parsed) {
            console.log(chalk.red('\n✖ Error: Invalid network format. Use <IP>/<CIDR>'));
            process.exit(1);
        }

        const numSubnets = parseInt(count);
        if (isNaN(numSubnets) || numSubnets < 2 || (numSubnets & (numSubnets - 1)) !== 0) {
            console.log(chalk.red('\n✖ Error: Subnet count must be a power of 2 (2, 4, 8, 16...)'));
            process.exit(1);
        }

        const subnets = splitSubnet(parsed.ip, parsed.cidr, numSubnets);

        if (subnets.length === 0) {
            console.log(chalk.red('\n✖ Error: Cannot split further. Prefix length would exceed /32'));
            process.exit(1);
        }

        addToHistory({ type: 'split', input: `${network} → ${count}`, result: `/${subnets[0].cidr}` });

        console.log(chalk.blue.bold(`\nSplit ${network} into ${numSubnets} subnets\n`));

        const table = new Table({
            head: ['#', 'Network', 'First Host', 'Last Host', 'Broadcast'].map(h => chalk.cyan(h)),
        });

        subnets.forEach((sub, i) => {
            table.push([
                i + 1,
                chalk.green(`${sub.networkAddress}/${sub.cidr}`),
                sub.firstHost,
                sub.lastHost,
                chalk.dim(sub.broadcastAddress)
            ]);
        });

        console.log(table.toString());
        console.log(chalk.dim(`\n  New CIDR: /${subnets[0].cidr}  |  ${subnets[0].usableHosts.toLocaleString()} usable hosts per subnet\n`));
    });

export default cmd;
