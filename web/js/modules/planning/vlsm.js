/**
 * ============================================================
 * SubnetMaster – VLSM Planner Module
 * ============================================================
 * Variable Length Subnet Masking (VLSM) calculator.
 * Allocates optimal subnets based on varying host requirements.
 * ============================================================
 */

import { vlsmAllocate, isValidIp, isValidCidr, parseCidr } from '../../../../core/ip-utils.js';
import { addToHistory, addToFavorites } from '../../utils/storage-utils.js';
import { showToast, formatNumber } from '../../utils/ui-utils.js';

let lastVlsmResult = null;

export function render(container) {
    container.innerHTML = `
        <div class="grid-2">
            <div class="card animate-in">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <h3>VLSM Planner</h3>
                </div>
                <div class="card-body">
                    <div class="input-group" style="margin-bottom: 24px;">
                        <label for="vlsm-network">Major Network / CIDR</label>
                        <input type="text" id="vlsm-network" placeholder="e.g. 192.168.0.0/24" autocomplete="off" spellcheck="false">
                    </div>
                    
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                        <h4 style="font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase;">Subnets / Departments</h4>
                        <button class="btn btn-ghost btn-sm" id="vlsm-add-dept">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add
                        </button>
                    </div>
                    
                    <div id="vlsm-departments" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                        <!-- Default rows -->
                    </div>
                    
                    <div class="btn-group">
                        <button class="btn btn-primary" id="vlsm-calculate">Calculate VLSM</button>
                        <button class="btn btn-secondary" id="vlsm-favorite" title="Save to Favorites">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </button>
                        <button class="btn btn-secondary" id="vlsm-clear">Clear</button>
                    </div>
                </div>
            </div>
            
            <div class="card animate-in" style="animation-delay: 0.05s;">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    <h3>Allocation Visualizer</h3>
                </div>
                <div class="card-body">
                    <div id="vlsm-visualizer">
                        <div class="empty-state">
                            <p>Calculate VLSM to see the address space allocation.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="vlsm-results" style="margin-top: 24px;"></div>
    `;
}

export function init() {
    const addBtn = document.getElementById('vlsm-add-dept');
    const calcBtn = document.getElementById('vlsm-calculate');
    const clearBtn = document.getElementById('vlsm-clear');
    const favBtn = document.getElementById('vlsm-favorite');
    const deptContainer = document.getElementById('vlsm-departments');

    // Add initial rows
    addDepartmentRow('HR', 100);
    addDepartmentRow('IT', 50);
    addDepartmentRow('Sales', 25);

    addBtn.addEventListener('click', () => addDepartmentRow());
    calcBtn.addEventListener('click', calculate);
    clearBtn.addEventListener('click', () => {
        document.getElementById('vlsm-network').value = '';
        deptContainer.innerHTML = '';
        addDepartmentRow();
        addDepartmentRow();
        document.getElementById('vlsm-results').innerHTML = '';
        document.getElementById('vlsm-visualizer').innerHTML = '<div class="empty-state"><p>Calculate VLSM to see the address space allocation.</p></div>';
        lastVlsmResult = null;
    });

    favBtn.addEventListener('click', () => {
        if (!lastVlsmResult) {
            showToast('Calculate VLSM first', 'warning');
            return;
        }
        addToFavorites({
            type: 'vlsm',
            label: `VLSM Plan for ${document.getElementById('vlsm-network').value}`,
            data: lastVlsmResult
        });
        showToast('Saved to favorites!', 'success');
    });

    function addDepartmentRow(name = '', hosts = '') {
        const row = document.createElement('div');
        row.className = 'input-row dept-row';
        row.innerHTML = `
            <div class="input-group" style="flex: 2;">
                <input type="text" class="dept-name" placeholder="Department Name" value="${name}">
            </div>
            <div class="input-group" style="flex: 1;">
                <input type="number" class="dept-hosts" placeholder="Hosts" min="1" value="${hosts}">
            </div>
            <button class="btn btn-ghost btn-icon remove-dept" style="color: var(--error);" title="Remove">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        `;
        row.querySelector('.remove-dept').addEventListener('click', () => row.remove());
        deptContainer.appendChild(row);
    }
}

function calculate() {
    const netInput = document.getElementById('vlsm-network').value.trim();
    const parsed = parseCidr(netInput);
    
    if (!parsed) {
        showToast('Please enter a valid Network and CIDR (e.g. 10.0.0.0/24)', 'error');
        return;
    }

    const rows = document.querySelectorAll('.dept-row');
    const departments = [];
    
    let valid = true;
    rows.forEach((row, i) => {
        let name = row.querySelector('.dept-name').value.trim();
        const hosts = parseInt(row.querySelector('.dept-hosts').value);
        if (!name) name = `Subnet ${i + 1}`;
        if (isNaN(hosts) || hosts < 1) valid = false;
        else departments.push({ name, hosts });
    });

    if (!valid || departments.length === 0) {
        showToast('Please provide valid host requirements for all departments', 'error');
        return;
    }

    const result = vlsmAllocate(parsed.ip, parsed.cidr, departments);

    if (!result.success) {
        showToast(result.error, 'error');
        return;
    }

    lastVlsmResult = result;
    
    addToHistory({
        type: 'vlsm',
        input: netInput,
        result: `${result.allocations.length} subnets, ${result.utilizationPercent}% used`
    });

    renderResults(result);
    renderVisualizer(result);
}

function renderResults(result) {
    const container = document.getElementById('vlsm-results');
    
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <h3>VLSM Allocation Table</h3>
                <div style="margin-left: auto; display: flex; gap: 8px;">
                    <span class="badge badge-success">${result.utilizationPercent}% Utilized</span>
                </div>
            </div>
            <div class="card-body" style="padding: 0; overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Needed</th>
                            <th>Allocated</th>
                            <th>Network</th>
                            <th>Subnet Mask</th>
                            <th>Host Range</th>
                            <th>Broadcast</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.allocations.map(a => `
                            <tr>
                                <td style="font-weight: 600;">${a.name}</td>
                                <td>${a.requestedHosts}</td>
                                <td style="color: var(--success);">${a.usableHosts}</td>
                                <td style="color: var(--accent-primary); font-weight: 600;">${a.networkAddress}/${a.cidr}</td>
                                <td>${a.subnetMask}</td>
                                <td><span style="font-family: var(--font-mono); font-size: 12px;">${a.firstHost} - ${a.lastHost}</span></td>
                                <td style="color: var(--text-secondary);">${a.broadcastAddress}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderVisualizer(result) {
    const container = document.getElementById('vlsm-visualizer');
    
    // Generate colors for segments
    const colors = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    
    let segmentsHtml = result.allocations.map((a, i) => {
        const pct = (a.totalAddresses / result.totalAvailable) * 100;
        const color = colors[i % colors.length];
        return `
            <div class="allocation-segment" style="width: ${pct}%; background: ${color};" title="${a.name}: ${a.networkAddress}/${a.cidr}">
                ${pct > 5 ? a.name : ''}
            </div>
        `;
    }).join('');
    
    const remPct = (result.remaining / result.totalAvailable) * 100;
    if (remPct > 0) {
        segmentsHtml += `
            <div class="allocation-segment allocation-remaining" style="width: ${remPct}%;" title="Free Space: ${result.remaining} addresses">
                ${remPct > 10 ? 'Free Space' : ''}
            </div>
        `;
    }

    container.innerHTML = `
        <div style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; color: var(--text-secondary);">
                <span>Total Addresses: ${formatNumber(result.totalAvailable)}</span>
                <span>Used: ${formatNumber(result.totalUsed)}</span>
                <span>Free: ${formatNumber(result.remaining)}</span>
            </div>
            <div class="allocation-bar animate-in">
                ${segmentsHtml}
            </div>
        </div>
        
        <div style="display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px;">
            ${result.allocations.map((a, i) => `
                <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary);">
                    <div style="width: 12px; height: 12px; border-radius: 2px; background: ${colors[i % colors.length]};"></div>
                    ${a.name} (/${a.cidr})
                </div>
            `).join('')}
        </div>
    `;
}
