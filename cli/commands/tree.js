import { Command } from 'commander';
import chalk from 'chalk';
import { splitSubnet, parseCidr } from '../../core/ip-utils.js';

const cmd = new Command('tree')
    .description('Visualize subnet divisions as a tree')
    .argument('<network>', 'Network in CIDR notation (e.g. 10.0.0.0/24)')
    .action((network) => {
        const parsed = parseCidr(network);
        if (!parsed) {
            console.log(chalk.red('\n✖ Error: Invalid network format.'));
            process.exit(1);
        }

        console.log(chalk.blue.bold(`\nSubnet Tree for ${network}\n`));
        console.log(chalk.green(network));

        // Let's do a simple 2-level split tree
        if (parsed.cidr >= 31) {
            console.log(chalk.dim('  Cannot split further.'));
            return;
        }

        const level1 = splitSubnet(parsed.ip, parsed.cidr, 2);
        
        level1.forEach((sub1, i1) => {
            const isLast1 = i1 === level1.length - 1;
            const prefix1 = isLast1 ? '└── ' : '├── ';
            console.log(chalk.dim(prefix1) + chalk.cyan(`${sub1.networkAddress}/${sub1.cidr}`));

            if (sub1.cidr < 32) {
                const level2 = splitSubnet(sub1.networkAddress, sub1.cidr, 2);
                level2.forEach((sub2, i2) => {
                    const isLast2 = i2 === level2.length - 1;
                    const prefix2 = (isLast1 ? '    ' : '│   ') + (isLast2 ? '└── ' : '├── ');
                    console.log(chalk.dim(prefix2) + chalk.white(`${sub2.networkAddress}/${sub2.cidr}`));
                });
            }
        });

        console.log('');
    });

export default cmd;
