import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { planGrowth } from '../../core/ip-utils.js';

const cmd = new Command('growth')
    .description('Network Growth Planner')
    .argument('<currentHosts>', 'Current number of hosts')
    .argument('<growthPercent>', 'Expected annual growth percentage')
    .action((currentHosts, growthPercent) => {
        const hosts = parseInt(currentHosts);
        const percent = parseFloat(growthPercent);

        if (isNaN(hosts) || hosts < 1) {
            console.log(chalk.red('\n✖ Error: Current hosts must be a positive integer.'));
            process.exit(1);
        }
        if (isNaN(percent) || percent <= 0) {
            console.log(chalk.red('\n✖ Error: Growth percentage must be a positive number.'));
            process.exit(1);
        }

        const result = planGrowth(hosts, percent, 3);

        console.log(chalk.blue.bold(`\nNetwork Growth Projection (${percent}% annually)\n`));

        const table = new Table({
            head: ['Year', 'Projected Hosts'].map(h => chalk.cyan(h))
        });

        table.push(['Current', hosts.toLocaleString()]);
        result.yearlyProjections.forEach(p => {
            table.push([`Year ${p.year}`, p.hosts.toLocaleString()]);
        });

        console.log(table.toString());

        console.log(chalk.dim('\n  Recommendations:'));
        console.log(`  Minimum CIDR for 3-year growth: ${chalk.green.bold(result.recommendedCidr)} (${result.recommendedCapacity.toLocaleString()} hosts)`);
        console.log(`  Safe CIDR (with margin):        ${chalk.yellow.bold(result.safeRecommendation)} (${result.safeCapacity.toLocaleString()} hosts)\n`);
    });

export default cmd;
