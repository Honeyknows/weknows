#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Commands
import calcCmd from './commands/calc.js';
import cidrCmd from './commands/cidr.js';
import binaryCmd from './commands/binary.js';
import splitCmd from './commands/split.js';
import vlsmCmd from './commands/vlsm.js';
import supernetCmd from './commands/supernet.js';
import summarizeCmd from './commands/summarize.js';
import overlapCmd from './commands/overlap.js';
import ipv6Cmd from './commands/ipv6.js';
import growthCmd from './commands/growth.js';
import treeCmd from './commands/tree.js';
import quizCmd from './commands/quiz.js';
import practiceCmd from './commands/practice.js';
import historyCmd from './commands/history.js';
import favoritesCmd from './commands/favorites.js';
import exportCmd from './commands/export.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

const program = new Command();

program
  .name('subnetmaster')
  .description(chalk.blue.bold('Professional IPv4/IPv6 Subnet Calculator and Network Planning Tool'))
  .version(packageJson.version)
  .configureHelp({
    subcommandTerm: (cmd) => chalk.cyan(cmd.name() + ' ' + cmd.usage()),
  });

// Core networking commands
program.addCommand(calcCmd);
program.addCommand(cidrCmd);
program.addCommand(binaryCmd);

// Planning and routing commands
program.addCommand(splitCmd);
program.addCommand(vlsmCmd);
program.addCommand(supernetCmd);
program.addCommand(summarizeCmd);
program.addCommand(overlapCmd);
program.addCommand(growthCmd);
program.addCommand(treeCmd);

// IPv6 commands
program.addCommand(ipv6Cmd);

// Learning commands
program.addCommand(quizCmd);
program.addCommand(practiceCmd);

// Data management commands
program.addCommand(historyCmd);
program.addCommand(favoritesCmd);
program.addCommand(exportCmd);

// Default action when no command is provided
program.action(() => {
  console.log(chalk.blue.bold('\nWelcome to SubnetMaster CLI'));
  console.log('Run ' + chalk.cyan('subnetmaster --help') + ' to see available commands.\n');
});

program.parse(process.argv);
