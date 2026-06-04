import { Command } from 'commander';
import chalk from 'chalk';
import { calculateSubnet, parseCidr, isValidIp, isValidCidr, intToBinary } from '../../core/ip-utils.js';

const cmd = new Command('binary')
    .description('Display binary representation of an IP/subnet')
    .argument('<ip_cidr>', 'IP address with CIDR (e.g. 192.168.1.0/24)')
    .action((input) => {
        const parsed = parseCidr(input);
        if (!parsed) {
            console.log(chalk.red('\n✖ Error: Invalid format. Use <IP>/<CIDR>'));
            process.exit(1);
        }

        const result = calculateSubnet(parsed.ip, parsed.cidr);

        console.log(chalk.blue.bold(`\nBinary Visualization for ${input}\n`));

        const rows = [
            { label: 'IP Address', decimal: result.ip, binary: result.binaryIp },
            { label: 'Subnet Mask', decimal: result.subnetMask, binary: result.binaryMask },
            { label: 'Network', decimal: result.networkAddress, binary: result.binaryNetwork },
            { label: 'Broadcast', decimal: result.broadcastAddress, binary: result.binaryBroadcast }
        ];

        rows.forEach(row => {
            console.log(chalk.dim(`  ${row.label.padEnd(14)}`));
            console.log(`  ${chalk.white(row.decimal.padEnd(16))} ${colorBinary(row.binary, parsed.cidr)}`);
            console.log('');
        });

        console.log(chalk.dim(`  Legend: ${chalk.cyan('■')} Network bits (${parsed.cidr})  ${chalk.yellow('■')} Host bits (${32 - parsed.cidr})\n`));
    });

function colorBinary(binary, cidr) {
    const bits = binary.replace(/\./g, '');
    let result = '';
    for (let i = 0; i < 32; i++) {
        if (i > 0 && i % 8 === 0) result += chalk.dim('.');
        result += i < cidr ? chalk.cyan(bits[i]) : chalk.yellow(bits[i]);
    }
    return result;
}

export default cmd;
