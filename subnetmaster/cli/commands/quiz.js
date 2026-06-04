import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { calculateSubnet, intToIp, ipToInt, isValidIp } from '../../core/ip-utils.js';

const cmd = new Command('quiz')
    .description('Take an interactive subnetting quiz')
    .action(async () => {
        console.log(chalk.blue.bold('\nWelcome to the Subnetting Quiz!'));
        console.log(chalk.dim('Answer 5 questions to test your knowledge.\n'));

        const questions = [];
        let score = 0;

        for (let i = 0; i < 5; i++) {
            // Generate random Class C-ish subnet for quiz
            const octet1 = Math.floor(Math.random() * (223 - 192 + 1)) + 192;
            const octet2 = Math.floor(Math.random() * 256);
            const octet3 = Math.floor(Math.random() * 256);
            const ip = `${octet1}.${octet2}.${octet3}.0`;
            const cidr = Math.floor(Math.random() * (30 - 24 + 1)) + 24;

            const subnetInfo = calculateSubnet(ip, cidr);
            const qTypes = ['network', 'broadcast', 'usableHosts'];
            const qType = qTypes[Math.floor(Math.random() * qTypes.length)];

            let questionText, correct;
            let options = [];

            if (qType === 'network') {
                const randomHost = intToIp((ipToInt(subnetInfo.firstHost) + Math.floor(Math.random() * subnetInfo.usableHosts)) >>> 0);
                questionText = `What is the Network Address for ${randomHost}/${cidr}?`;
                correct = subnetInfo.networkAddress;
                options = generateIpOptions(correct, subnetInfo.networkInt, cidr);
            } else if (qType === 'broadcast') {
                const randomHost = intToIp((ipToInt(subnetInfo.firstHost) + Math.floor(Math.random() * subnetInfo.usableHosts)) >>> 0);
                questionText = `What is the Broadcast Address for ${randomHost}/${cidr}?`;
                correct = subnetInfo.broadcastAddress;
                options = generateIpOptions(correct, subnetInfo.broadcastInt, cidr);
            } else {
                questionText = `How many usable hosts are in a /${cidr} network?`;
                correct = subnetInfo.usableHosts.toString();
                options = generateNumOptions(subnetInfo.usableHosts);
            }

            questions.push({
                type: 'list',
                name: `q${i}`,
                message: questionText,
                choices: shuffleArray(options),
                correctAnswer: correct
            });
        }

        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            const answer = await inquirer.prompt([{
                type: q.type,
                name: 'ans',
                message: chalk.cyan(`Q${i + 1}: `) + q.message,
                choices: q.choices
            }]);

            if (answer.ans === q.correctAnswer) {
                console.log(chalk.green('  ✓ Correct!\n'));
                score++;
            } else {
                console.log(chalk.red(`  ✖ Incorrect. The correct answer was ${q.correctAnswer}\n`));
            }
        }

        console.log(chalk.blue.bold(`\nQuiz Complete! Your Score: ${score}/${questions.length}`));
        if (score === questions.length) {
            console.log(chalk.green('Perfect score! You are a SubnetMaster.'));
        } else if (score >= 3) {
            console.log(chalk.yellow('Good job! Keep practicing.'));
        } else {
            console.log(chalk.red('You might need to study more. Check out the practice lab.'));
        }
        console.log('');
    });

function generateIpOptions(correctIp, baseInt, cidr) {
    const opts = new Set([correctIp]);
    const step = Math.pow(2, 32 - cidr);
    while (opts.size < 4) {
        let distractorInt = (baseInt + (Math.floor(Math.random() * 5) - 2) * step) >>> 0;
        const distractor = intToIp(distractorInt);
        if (distractor !== correctIp && isValidIp(distractor)) opts.add(distractor);
    }
    return Array.from(opts);
}

function generateNumOptions(correctNum) {
    const opts = new Set([correctNum.toString()]);
    while (opts.size < 4) {
        const p = Math.floor(Math.log2(correctNum + 2));
        let distractor = Math.pow(2, p + Math.floor(Math.random() * 3) - 1) - 2;
        if (distractor <= 0 || distractor === correctNum) distractor = correctNum + Math.floor(Math.random() * 10) - 5;
        if (distractor > 0) opts.add(distractor.toString());
    }
    return Array.from(opts);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export default cmd;
