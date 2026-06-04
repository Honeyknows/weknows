/**
 * ============================================================
 * SubnetMaster – Export Center Module
 * ============================================================
 * Centralized hub for generating PDF, CSV, and JSON exports
 * of user history, favorites, and quiz data.
 * ============================================================
 */

import { getHistory, getFavorites, getQuizScores } from '../../utils/storage-utils.js';
import { exportJSON, exportCSV, exportPDF, generateTableHTML } from '../../utils/export-utils.js';
import { showToast } from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <h3>Export Center</h3>
            </div>
            <div class="card-body">
                <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 24px;">
                    Generate and download professional reports and backups of your SubnetMaster data.
                </p>

                <div class="grid-3">
                    <!-- History Export -->
                    <div style="padding: 20px; background: var(--bg-input); border: 1px solid var(--border-secondary); border-radius: var(--radius-sm);">
                        <h4 style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Calculation History</h4>
                        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Export all previous calculations.</p>
                        <div class="btn-group">
                            <button class="btn btn-secondary btn-sm export-btn" data-target="history" data-format="pdf">PDF Report</button>
                            <button class="btn btn-secondary btn-sm export-btn" data-target="history" data-format="csv">CSV</button>
                            <button class="btn btn-secondary btn-sm export-btn" data-target="history" data-format="json">JSON</button>
                        </div>
                    </div>

                    <!-- Favorites Export -->
                    <div style="padding: 20px; background: var(--bg-input); border: 1px solid var(--border-secondary); border-radius: var(--radius-sm);">
                        <h4 style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Saved Favorites</h4>
                        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Export bookmarked configurations.</p>
                        <div class="btn-group">
                            <button class="btn btn-secondary btn-sm export-btn" data-target="favorites" data-format="pdf">PDF Report</button>
                            <button class="btn btn-secondary btn-sm export-btn" data-target="favorites" data-format="json">JSON</button>
                        </div>
                    </div>

                    <!-- Quiz Scores Export -->
                    <div style="padding: 20px; background: var(--bg-input); border: 1px solid var(--border-secondary); border-radius: var(--radius-sm);">
                        <h4 style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Quiz Performance</h4>
                        <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Export training scores.</p>
                        <div class="btn-group">
                            <button class="btn btn-secondary btn-sm export-btn" data-target="quiz" data-format="csv">CSV</button>
                            <button class="btn btn-secondary btn-sm export-btn" data-target="quiz" data-format="json">JSON</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function init() {
    document.querySelectorAll('.export-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.dataset.target;
            const format = e.target.dataset.format;
            handleExport(target, format);
        });
    });
}

function handleExport(target, format) {
    let data = [];
    let title = '';

    if (target === 'history') {
        data = getHistory();
        title = 'Calculation History Report';
    } else if (target === 'favorites') {
        data = getFavorites();
        title = 'Saved Configurations Report';
    } else if (target === 'quiz') {
        data = getQuizScores();
        title = 'Quiz Performance Report';
    }

    if (data.length === 0) {
        showToast('No data available to export', 'warning');
        return;
    }

    const filename = `subnetmaster-${target}-${new Date().toISOString().split('T')[0]}`;

    if (format === 'json') {
        exportJSON(data, filename);
        showToast('JSON export generated', 'success');
    } else if (format === 'csv') {
        exportCSV(data, filename);
        showToast('CSV export generated', 'success');
    } else if (format === 'pdf') {
        generatePdfReport(data, target, title, filename);
        showToast('Preparing PDF Report...', 'info');
    }
}

function generatePdfReport(data, target, title, filename) {
    let contentHtml = '';

    if (target === 'history') {
        const columns = [
            { key: 'type', label: 'Calculation Type' },
            { key: 'input', label: 'Input' },
            { key: 'result', label: 'Result' },
            { key: 'timestamp', label: 'Time' }
        ];
        
        const rows = data.map(d => ({
            ...d,
            timestamp: new Date(d.timestamp).toLocaleString()
        }));

        contentHtml = `
            <h2>Activity Log</h2>
            ${generateTableHTML(rows, columns)}
        `;
    } else if (target === 'favorites') {
        contentHtml = data.map(fav => {
            let details = '';
            if (fav.type === 'subnet' && fav.data) {
                details = `
                    <div style="font-family: monospace; background: #f8fafc; padding: 10px; border: 1px solid #e2e8f0;">
                        Network: ${fav.data.networkAddress}<br>
                        Broadcast: ${fav.data.broadcastAddress}<br>
                        Mask: ${fav.data.subnetMask}
                    </div>
                `;
            }
            return `
                <div style="margin-bottom: 20px;">
                    <h3>${fav.label}</h3>
                    <div style="color: #64748b; font-size: 12px; margin-bottom: 8px;">Type: ${fav.type} | Saved: ${new Date(fav.timestamp).toLocaleDateString()}</div>
                    ${details}
                </div>
            `;
        }).join('');
    }

    exportPDF({ title, content: contentHtml }, filename);
}
