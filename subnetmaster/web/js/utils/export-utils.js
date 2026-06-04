/**
 * ============================================================
 * SubnetMaster – Export Utility Functions
 * ============================================================
 * Handles exporting data as PDF, CSV, and JSON files.
 * Uses browser-native APIs for file generation and download.
 * ============================================================
 */

/**
 * Triggers a file download in the browser.
 * Creates a temporary anchor element to initiate the download.
 * @param {string} content - File content
 * @param {string} filename - Name of the downloaded file
 * @param {string} mimeType - MIME type of the file
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Exports data as a JSON file.
 * @param {Object|Array} data - Data to export
 * @param {string} filename - Filename (without extension)
 */
export function exportJSON(data, filename = 'subnetmaster-export') {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `${filename}.json`, 'application/json');
}

/**
 * Exports data as a CSV file.
 * Handles nested objects by flattening them.
 * @param {Array<Object>} data - Array of objects to export as CSV rows
 * @param {string} filename - Filename (without extension)
 */
export function exportCSV(data, filename = 'subnetmaster-export') {
    if (!Array.isArray(data) || data.length === 0) return;
    
    // Extract headers from all objects to handle varying keys
    const headers = [...new Set(data.flatMap(Object.keys))];
    
    // Build CSV content
    const csvRows = [
        headers.join(','), // Header row
        ...data.map(row => 
            headers.map(h => {
                let val = row[h];
                if (val === undefined || val === null) val = '';
                if (typeof val === 'object') val = JSON.stringify(val);
                // Escape quotes and wrap in quotes if contains comma or quote
                val = String(val);
                if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(',')
        )
    ];
    
    downloadFile(csvRows.join('\n'), `${filename}.csv`, 'text/csv');
}

/**
 * Exports data as a PDF file.
 * Uses a simple HTML-to-PDF approach via window.print().
 * For a production app, this creates a print-friendly HTML document.
 * @param {Object} reportData - Report data
 * @param {string} reportData.title - Report title
 * @param {string} reportData.content - HTML content for the report
 * @param {string} filename - Filename hint
 */
export function exportPDF(reportData, filename = 'subnetmaster-report') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${reportData.title || 'SubnetMaster Report'}</title>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 40px;
                    color: #1a1a2e;
                    line-height: 1.6;
                }
                .report-header {
                    border-bottom: 3px solid #0ea5e9;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .report-header h1 { 
                    font-size: 24px; 
                    color: #0f172a;
                    margin-bottom: 5px;
                }
                .report-header .subtitle {
                    color: #64748b;
                    font-size: 14px;
                }
                .report-header .date {
                    color: #94a3b8;
                    font-size: 12px;
                    margin-top: 5px;
                }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    margin: 15px 0;
                    font-size: 13px;
                }
                th, td { 
                    padding: 10px 12px; 
                    text-align: left; 
                    border: 1px solid #e2e8f0; 
                }
                th { 
                    background: #f1f5f9; 
                    font-weight: 600;
                    color: #334155;
                }
                tr:nth-child(even) { background: #f8fafc; }
                h2 { 
                    font-size: 18px; 
                    margin: 25px 0 10px;
                    color: #0f172a;
                    border-left: 4px solid #0ea5e9;
                    padding-left: 10px;
                }
                h3 { 
                    font-size: 15px; 
                    margin: 15px 0 8px;
                    color: #334155;
                }
                .result-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #f1f5f9;
                }
                .result-label { color: #64748b; }
                .result-value { font-weight: 600; font-family: 'Consolas', monospace; }
                .footer {
                    margin-top: 40px;
                    padding-top: 15px;
                    border-top: 1px solid #e2e8f0;
                    color: #94a3b8;
                    font-size: 11px;
                    text-align: center;
                }
                @media print {
                    body { padding: 20px; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <h1>${reportData.title || 'SubnetMaster Report'}</h1>
                <div class="subtitle">Advanced Network Addressing & Subnet Planning Suite</div>
                <div class="date">Generated: ${new Date().toLocaleString()}</div>
            </div>
            ${reportData.content}
            <div class="footer">
                Generated by SubnetMaster &copy; ${new Date().getFullYear()} | Professional Network Addressing Tool
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 500);
}

/**
 * Generates HTML table content from an array of objects.
 * Used internally by exportPDF for creating report tables.
 * @param {Array<Object>} rows - Array of row objects
 * @param {Array<{key: string, label: string}>} columns - Column definitions
 * @returns {string} HTML table string
 */
export function generateTableHTML(rows, columns) {
    const headerRow = columns.map(c => `<th>${c.label}</th>`).join('');
    const dataRows = rows.map(row => 
        `<tr>${columns.map(c => `<td>${row[c.key] ?? ''}</td>`).join('')}</tr>`
    ).join('');
    
    return `<table><thead><tr>${headerRow}</tr></thead><tbody>${dataRows}</tbody></table>`;
}

/**
 * Generates a result items list for PDF reports.
 * @param {Array<{label: string, value: string}>} items - Result items
 * @returns {string} HTML content
 */
export function generateResultHTML(items) {
    return items.map(item => `
        <div class="result-item">
            <span class="result-label">${item.label}</span>
            <span class="result-value">${item.value}</span>
        </div>
    `).join('');
}
