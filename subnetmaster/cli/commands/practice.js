import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { calculateSubnet, intToIp } from '../../core/ip-utils.js';

const cmd = new Command('practice')
    .description('Practice calculating subnet details')
    .argument('[difficulty]', 'Difficulty level: easy (default), medium, hard', 'easy')
    .action(async (difficulty) => {
        let minCidr = 24, maxCidr = 30;
        if (difficulty === 'medium') {
            minCidr = 16; maxCidr = 24;
        } else if (difficulty === 'hard') {
            minCidr = 8; maxCidr = 16;
        }

        const octet1 = Math.floor(Math.random() * 223) + 1;
        const octet2 = Math.floor(Math.random() * 256);
        const octet3 = Math.floor(Math.random() * 256);
        const octet4 = Math.floor(Math.random() * 256);
        const ip = `${octet1}.${octet2}.${octet3}.${octet4}`;
        const cidr = Math.floor(Math.random() * (maxCidr - minCidr + 1)) + minCidr;

        const subnetInfo = calculateSubnet(ip, cidr);

        console.log(chalk.blue.bold(`\nPractice Lab: ${difficulty.toUpperCase()} Level\n`));
        console.log(`Calculate the following for: ${chalk.green.bold(`${ip}/${cidr}`)}\n`);

        const questions = [
            { name: 'networkAddress', message: 'Network Address (e.g. 192.168.1.0): ' },
            { name: 'broadcastAddress', message: 'Broadcast Address (e.g. 192.168.1.255): ' },
            { name: 'firstHost', message: 'First Usable Host: ' },
            { name: 'lastHost', message: 'Last Usable Host: ' },
            { name: 'usableHosts', message: 'Total Usable Hosts (number): ' }
        ];

        const answers = await inquirer.prompt(questions.map(q => ({
            type: 'input',
            name: q.name,
            message: chalk.cyan(q.message)
        })));

        console.log(chalk.blue.bold('\nResults:\n'));

        let score = 0;
        questions.forEach(q => {
            const userAns = answers[q.name].trim();
            const correctAns = subnetInfo[q.name].toString();
            
            if (userAns === correctAns) {
                console.log(`  ${chalk.green('✓')} ${q.name}: ${chalk.green(userAns)}`);
                score++;
            } else {
                console.log(`  ${chalk.red('✖')} ${q.name}: ${chalk.red(userAns)} (Correct: ${chalk.green(correctAns)})`);
            }
        });

        console.log(`\n  Score: ${score}/${questions.length}`);
        if (score === questions.length) console.log(chalk.green('  Perfect!\n'));
        else console.log(chalk.yellow('  Keep practicing!\n'));
    });

export default cmd;
