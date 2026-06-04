import { Command } from 'commander';
import chalk from 'chalk';
import { calculateSupernet, parseCidr, ipToInt, intToBinary, cidrToMask } from '../../core/ip-utils.js';

const cmd = new Command('summarize')
    .description('Summarize routes with binary bit-matching analysis')
    .argument('<networks...>', 'Networks in CIDR notation')
    .action((networks) => {
        const parsed = networks.map(n => parseCidr(n)).filter(Boolean);

        if (parsed.length < 2) {
            console.log(chalk.red('\n✖ Error: At least 2 valid routes required'));
            process.exit(1);
        }

        const result = calculateSupernet(parsed);
        const superCidr = result.supernetCidr;

        console.log(chalk.blue.bold('\nRoute Summarization Analysis\n'));

        console.log(chalk.dim('  Binary Comparison:\n'));

        parsed.forEach(net => {
            const netAddr = (ipToInt(net.ip) & cidrToMask(net.cidr)) >>> 0;
            const bin = intToBinary(netAddr).replace(/\./g, '');
            let colored = '';
            for (let i = 0; i < 32; i++) {
                if (i > 0 && i % 8 === 0) colored += chalk.dim('.');
                colored += i < superCidr ? chalk.green(bin[i]) : chalk.red(bin[i]);
            }
            console.log(`  ${chalk.white(`${net.ip}/${net.cidr}`.padEnd(20))} ${colored}`);
        });

        // Summary route
        const sumBin = intToBinary(ipToInt(result.supernetAddress)).replace(/\./g, '');
        let coloredSum = '';
        for (let i = 0; i < 32; i++) {
            if (i > 0 && i % 8 === 0) coloredSum += chalk.dim('.');
            coloredSum += i < superCidr ? chalk.cyan.bold(sumBin[i]) : chalk.dim('0');
        }
        console.log(chalk.dim('  ' + '─'.repeat(55)));
        console.log(`  ${chalk.cyan.bold('Summary'.padEnd(20))} ${coloredSum}`);

        console.log(`\n  ${chalk.green.bold('Aggregated Route:')} ${chalk.green.bold(result.notation)}`);
        console.log(chalk.dim(`  Matching bits: ${superCidr}\n`));
    });

export default cmd;
