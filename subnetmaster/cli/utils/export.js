import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export function exportJSON(data, filename) {
    const outPath = path.resolve(process.cwd(), `${filename}.json`);
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.log(chalk.green(`\n✓ Exported JSON to: ${outPath}`));
}

export function exportCSV(data, filename) {
    if (!data || data.length === 0) {
        console.log(chalk.yellow('No data to export.'));
        return;
    }
    
    // Flatten logic for CSV
    const keys = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
    let csv = keys.join(',') + '\n';
    
    data.forEach(item => {
        const row = keys.map(k => {
            let val = item[k];
            if (val === null || val === undefined) val = '';
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        csv += row.join(',') + '\n';
    });
    
    const outPath = path.resolve(process.cwd(), `${filename}.csv`);
    fs.writeFileSync(outPath, csv);
    console.log(chalk.green(`\n✓ Exported CSV to: ${outPath}`));
}
