import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { detectOverlaps, parseCidr } from '../../core/ip-utils.js';

const cmd = new Command('overlap')
    .description('Detect overlapping subnets from a list')
    .argument('<subnets...>', 'Subnets in CIDR notation')
    .action((subnets) => {
        const parsed = subnets.map(s => parseCidr(s)).filter(Boolean);

        if (parsed.length < 2) {
            console.log(chalk.red('\n✖ Error: At least 2 valid subnets required'));
            process.exit(1);
        }

        const conflicts = detectOverlaps(parsed);

        console.log(chalk.blue.bold('\nOverlap Detection\n'));

        if (conflicts.length === 0) {
            console.log(chalk.green('  ✓ No overlaps detected!'));
            console.log(chalk.dim(`  All ${parsed.length} subnets are distinct.\n`));
        } else {
            console.log(chalk.red.bold(`  ✖ ${conflicts.length} conflict(s) found!\n`));

            const table = new Table({
                head: ['Subnet A', 'Subnet B', 'Conflict Type'].map(h => chalk.cyan(h)),
            });

            conflicts.forEach(c => {
                let typeLabel;
                if (c.type === 'identical') typeLabel = chalk.red('Identical');
                else if (c.type === 'contains' || c.type === 'contained_by') typeLabel = chalk.yellow('Subset/Contains');
                else typeLabel = chalk.magenta('Partial Overlap');

                table.push([c.subnetA, c.subnetB, typeLabel]);
            });

            console.log(table.toString());
            console.log('');
        }
    });

export default cmd;
