import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { vlsmAllocate, parseCidr } from '../../core/ip-utils.js';
import { addToHistory } from '../utils/storage.js';

const cmd = new Command('vlsm')
    .description('Allocate subnets using VLSM for varying host requirements')
    .argument('<network>', 'Network in CIDR notation (e.g. 10.0.0.0/24)')
    .argument('<hosts...>', 'Space-separated host counts (e.g. 100 50 20)')
    .action((network, hosts) => {
        const parsed = parseCidr(network);
        if (!parsed) {
            console.log(chalk.red('\n✖ Error: Invalid network format'));
            process.exit(1);
        }

        const departments = hosts.map((h, i) => ({
            name: `Subnet ${i + 1}`,
            hosts: parseInt(h)
        }));

        if (departments.some(d => isNaN(d.hosts) || d.hosts < 1)) {
            console.log(chalk.red('\n✖ Error: Host counts must be positive integers'));
            process.exit(1);
        }

        const result = vlsmAllocate(parsed.ip, parsed.cidr, departments);

        if (!result.success) {
            console.log(chalk.red(`\n✖ ${result.error}`));
            process.exit(1);
        }

        addToHistory({ type: 'vlsm', input: network, result: `${result.allocations.length} subnets` });

        console.log(chalk.blue.bold(`\nVLSM Allocation for ${network}\n`));

        const table = new Table({
            head: ['Name', 'Needed', 'Allocated', 'Network', 'Mask', 'Range'].map(h => chalk.cyan(h)),
        });

        result.allocations.forEach(a => {
            table.push([
                a.name,
                a.requestedHosts,
                chalk.green(a.usableHosts),
                chalk.green(`${a.networkAddress}/${a.cidr}`),
                a.subnetMask,
                `${a.firstHost} – ${a.lastHost}`
            ]);
        });

        console.log(table.toString());

        // Utilization bar
        const barWidth = 40;
        const usedChars = Math.round((result.totalUsed / result.totalAvailable) * barWidth);
        const freeChars = barWidth - usedChars;
        const bar = chalk.green('█'.repeat(usedChars)) + chalk.dim('░'.repeat(freeChars));

        console.log(`\n  ${bar}  ${chalk.green(result.utilizationPercent + '%')} utilized`);
        console.log(chalk.dim(`  Total: ${result.totalAvailable.toLocaleString()}  Used: ${result.totalUsed.toLocaleString()}  Free: ${result.remaining.toLocaleString()}\n`));
    });

export default cmd;
