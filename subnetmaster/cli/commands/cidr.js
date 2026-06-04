import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { cidrToMask, intToIp, isValidCidr, isValidMask, maskStringToCidr } from '../../core/ip-utils.js';
import { CIDR_CHEAT_SHEET } from '../../core/rfc-data.js';

const cmd = new Command('cidr')
    .description('CIDR conversion tools')
    .argument('<value>', 'CIDR prefix (e.g. 24) or subnet mask (e.g. 255.255.255.0)')
    .action((value) => {
        // Determine if input is CIDR or mask
        if (value.includes('.')) {
            // Mask to CIDR
            if (!isValidMask(value)) {
                console.log(chalk.red('\n✖ Error: Invalid subnet mask'));
                process.exit(1);
            }
            const cidr = maskStringToCidr(value);
            console.log(chalk.blue.bold('\nMask → CIDR Conversion\n'));
            const table = new Table();
            table.push(
                ['Subnet Mask', chalk.cyan(value)],
                ['CIDR Prefix', chalk.green(`/${cidr}`)],
                ['Usable Hosts', (Math.pow(2, 32 - cidr) - 2).toLocaleString()]
            );
            console.log(table.toString());
        } else {
            // CIDR to Mask
            const cidr = parseInt(value);
            if (!isValidCidr(cidr)) {
                console.log(chalk.red('\n✖ Error: CIDR must be between 0 and 32'));
                process.exit(1);
            }
            const mask = intToIp(cidrToMask(cidr));
            console.log(chalk.blue.bold('\nCIDR → Mask Conversion\n'));

            const table = new Table();
            table.push(
                ['CIDR Prefix', chalk.cyan(`/${cidr}`)],
                ['Subnet Mask', chalk.green(mask)],
                ['Usable Hosts', (cidr >= 31 ? (cidr === 32 ? 1 : 2) : Math.pow(2, 32 - cidr) - 2).toLocaleString()]
            );
            console.log(table.toString());

            // Show nearby CIDRs for context
            console.log(chalk.dim('\n  Nearby CIDR values:'));
            const nearby = CIDR_CHEAT_SHEET.filter(c => {
                const n = parseInt(c.cidr.slice(1));
                return Math.abs(n - cidr) <= 2;
            });
            nearby.forEach(c => {
                const prefix = c.cidr === `/${cidr}` ? chalk.green('► ') : '  ';
                console.log(`${prefix}${chalk.cyan(c.cidr.padEnd(5))} ${c.mask.padEnd(16)} ${chalk.dim(c.usage)}`);
            });
        }
        console.log('');
    });

export default cmd;
