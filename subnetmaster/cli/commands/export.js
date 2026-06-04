import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getHistory, getFavorites } from '../utils/storage.js';
import { exportJSON, exportCSV } from '../utils/export.js';

const cmd = new Command('export')
    .description('Export data to JSON or CSV')
    .action(async () => {
        console.log(chalk.blue.bold('\nExport Center\n'));

        const answers = await inquirer.prompt([
            {
                type: 'list',
                name: 'dataType',
                message: 'What data do you want to export?',
                choices: [
                    { name: 'History', value: 'history' },
                    { name: 'Favorites', value: 'favorites' }
                ]
            },
            {
                type: 'list',
                name: 'format',
                message: 'Select export format:',
                choices: [
                    { name: 'JSON', value: 'json' },
                    { name: 'CSV', value: 'csv' }
                ]
            }
        ]);

        const data = answers.dataType === 'history' ? getHistory() : getFavorites();

        if (data.length === 0) {
            console.log(chalk.yellow(`\n✖ No ${answers.dataType} data available to export.\n`));
            return;
        }

        const filename = `subnetmaster-${answers.dataType}-export`;

        if (answers.format === 'json') {
            exportJSON(data, filename);
        } else {
            exportCSV(data, filename);
        }

        console.log('');
    });

export default cmd;
