/**
 * ============================================================
 * SubnetMaster – History Module
 * ============================================================
 * Displays calculation history from LocalStorage.
 * ============================================================
 */

import { getHistory, clearHistory, deleteHistoryItem } from '../../utils/storage-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <h3>Calculation History</h3>
                <button class="btn btn-ghost btn-sm" id="hist-clear" style="margin-left: auto; color: var(--error);">
                    Clear History
                </button>
            </div>
            <div class="card-body" style="padding: 0;">
                <div id="hist-container">
                    <!-- History rows injected here -->
                </div>
            </div>
        </div>
    `;
}

export function init() {
    document.getElementById('hist-clear').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all history?')) {
            clearHistory();
            renderHistory();
        }
    });
    
    renderHistory();
}

function renderHistory() {
    const history = getHistory();
    const container = document.getElementById('hist-container');

    if (history.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>No calculation history found.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Input</th>
                    <th>Result</th>
                    <th>Time</th>
                    <th style="width: 50px;"></th>
                </tr>
            </thead>
            <tbody>
                ${history.map(item => {
                    const time = new Date(item.timestamp);
                    const timeStr = time.toLocaleDateString() + ' ' + time.toLocaleTimeString();
                    
                    let typeBadge = '';
                    if (item.type === 'subnet') typeBadge = '<span class="badge badge-info">Subnet</span>';
                    else if (item.type === 'vlsm') typeBadge = '<span class="badge badge-accent">VLSM</span>';
                    else if (item.type === 'supernet') typeBadge = '<span class="badge badge-warning">Supernet</span>';
                    else if (item.type === 'ipv6') typeBadge = '<span class="badge badge-success">IPv6</span>';
                    else typeBadge = `<span class="badge badge-secondary">${item.type}</span>`;

                    return `
                        <tr>
                            <td>${typeBadge}</td>
                            <td style="font-family: var(--font-mono); font-weight: 600;">${item.input}</td>
                            <td>${item.result}</td>
                            <td style="color: var(--text-muted); font-size: 12px;">${timeStr}</td>
                            <td>
                                <button class="btn btn-ghost btn-icon delete-hist" data-id="${item.id}" title="Delete">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    document.querySelectorAll('.delete-hist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteHistoryItem(id);
            renderHistory();
        });
    });
}
