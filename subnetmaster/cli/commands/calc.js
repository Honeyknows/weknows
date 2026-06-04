import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { calculateSubnet, isValidIp, isValidCidr, parseCidr, getIpClass, getIpType } from '../../core/ip-utils.js';
import { addToHistory } from '../utils/storage.js';

const cmd = new Command('calc')
    .description('Calculate subnet details from IP and CIDR')
    .argument('<ip_cidr>', 'IP address with CIDR (e.g. 192.168.1.0/24)')
    .action((input) => {
        const parsed = parseCidr(input);
        
        if (!parsed) {
            console.log(chalk.red('\n✖ Error: Invalid format. Use <IP>/<CIDR> (e.g. 192.168.1.0/24)'));
            process.exit(1);
        }

        if (!isValidIp(parsed.ip)) {
            console.log(chalk.red('\n✖ Error: Invalid IPv4 address'));
            process.exit(1);
        }

        if (!isValidCidr(parsed.cidr)) {
            console.log(chalk.red('\n✖ Error: CIDR must be between 0 and 32'));
            process.exit(1);
        }

        const result = calculateSubnet(parsed.ip, parsed.cidr);
        const ipClass = getIpClass(parsed.ip);
        const ipType = getIpType(parsed.ip);

        // Save to history
        addToHistory({ type: 'subnet', input, result: `${result.networkAddress}/${parsed.cidr}` });

        console.log(chalk.blue.bold(`\nSubnet Details for ${input}\n`));

        const table = new Table({
            chars: { 'top': '═', 'bottom': '═', 'mid': '─', 'left': '║', 'right': '║', 'middle': '│' },
            style: { head: ['cyan'] }
        });

        table.push(
            ['Network Address', chalk.green(result.networkAddress)],
            ['Broadcast Address', chalk.yellow(result.broadcastAddress)],
            ['Subnet Mask', result.subnetMask],
            ['Wildcard Mask', result.wildcardMask],
            ['First Usable Host', chalk.green(result.firstHost)],
            ['Last Usable Host', chalk.yellow(result.lastHost)],
            ['Total Addresses', result.totalAddresses.toLocaleString()],
            ['Usable Hosts', result.usableHosts.toLocaleString()],
            ['IP Class', `Class ${ipClass}`],
            ['Network Type', ipType.isPrivate ? chalk.yellow('Private') : (ipType.isPublic ? chalk.green('Public') : 'Other')]
        );

        console.log(table.toString());
        console.log('');
    });

export default cmd;
