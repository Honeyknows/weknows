import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getFavorites, addToFavorites, removeFavorite, clearFavorites } from '../utils/storage.js';

const cmd = new Command('favorites')
    .description('Manage saved favorite networks')
    .option('-a, --add <network>', 'Add a network to favorites')
    .option('-l, --label <label>', 'Label for the new favorite (used with -a)')
    .option('-r, --remove <id>', 'Remove a favorite by ID')
    .option('-c, --clear', 'Clear all favorites')
    .action((options) => {
        if (options.clear) {
            clearFavorites();
            console.log(chalk.green('\n✓ All favorites cleared.\n'));
            return;
        }

        if (options.add) {
            addToFavorites({
                label: options.label || options.add,
                type: 'subnet',
                network: options.add
            });
            console.log(chalk.green(`\n✓ Added ${options.add} to favorites.\n`));
            return;
        }

        if (options.remove) {
            removeFavorite(options.remove);
            console.log(chalk.green(`\n✓ Removed favorite ${options.remove}.\n`));
            return;
        }

        // List favorites
        const favorites = getFavorites();

        console.log(chalk.blue.bold('\nSaved Favorites\n'));

        if (favorites.length === 0) {
            console.log(chalk.dim('  No favorites found.\n'));
            return;
        }

        const table = new Table({
            head: ['ID', 'Label', 'Network', 'Date'].map(h => chalk.cyan(h))
        });

        favorites.forEach(f => {
            const date = new Date(f.timestamp).toLocaleDateString();
            table.push([f.id, f.label, f.network || '-', date]);
        });

        console.log(table.toString());
        console.log(chalk.dim('\n  Use "subnetmaster favorites -a <network>" to add a favorite.'));
        console.log(chalk.dim('  Use "subnetmaster favorites -r <id>" to remove a favorite.\n'));
    });

export default cmd;
