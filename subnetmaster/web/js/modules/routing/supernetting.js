/**
 * ============================================================
 * SubnetMaster – Supernetting Module
 * ============================================================
 * Aggregates multiple contiguous networks into a single supernet.
 * ============================================================
 */

import { calculateSupernet, parseCidr, isValidIp, isValidCidr } from '../../../../core/ip-utils.js';
import { addToHistory } from '../../utils/storage-utils.js';
import { showToast, createCopyButton, formatNumber } from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/>
                    <polyline points="2 12 12 17 22 12"/>
                </svg>
                <h3>Supernetting Calculator</h3>
            </div>
            <div class="card-body">
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                    Enter multiple networks (e.g., 192.168.0.0/24, 192.168.1.0/24) to find the smallest encompassing supernet.
                </p>
                <div class="input-group" style="margin-bottom: 24px;">
                    <textarea id="super-networks" rows="5" placeholder="Enter one network per line (e.g. 192.168.0.0/24)"></textarea>
                </div>
                <div class="btn-group">
                    <button class="btn btn-primary" id="super-submit">Calculate Supernet</button>
                    <button class="btn btn-secondary" id="super-clear">Clear</button>
                </div>
            </div>
        </div>

        <div id="super-results" style="margin-top: 24px;"></div>
    `;
}

export function init() {
    const submitBtn = document.getElementById('super-submit');
    const clearBtn = document.getElementById('super-clear');
    const inputArea = document.getElementById('super-networks');

    submitBtn.addEventListener('click', calculate);
    clearBtn.addEventListener('click', () => {
        inputArea.value = '';
        document.getElementById('super-results').innerHTML = '';
    });
}

function calculate() {
    const inputLines = document.getElementById('super-networks').value.split('\n');
    const networks = [];

    for (const line of inputLines) {
        const t = line.trim();
        if (!t) continue;
        const parsed = parseCidr(t);
        if (!parsed) {
            showToast(`Invalid network format: ${t}`, 'error');
            return;
        }
        networks.push(parsed);
    }

    if (networks.length < 2) {
        showToast('Please enter at least two networks', 'warning');
        return;
    }

    const result = calculateSupernet(networks);

    addToHistory({
        type: 'supernet',
        input: `${networks.length} networks`,
        result: result.notation
    });

    document.getElementById('super-results').innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <h3>Supernet Result</h3>
            </div>
            <div class="card-body">
                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div style="padding: 16px; background: var(--bg-input); border: 1px solid var(--accent-primary); border-radius: var(--radius-sm); text-align: center;">
                        <div style="font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Summary Route</div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--accent-primary); font-family: var(--font-mono);">${result.notation}</div>
                    </div>
                    
                    <div class="grid-2">
                        <div class="result-row"><span class="result-label">Network Address</span><span class="result-value">${result.supernetAddress}</span></div>
                        <div class="result-row"><span class="result-label">Subnet Mask</span><span class="result-value">${result.supernetMask}</span></div>
                        <div class="result-row"><span class="result-label">Total Addresses</span><span class="result-value">${formatNumber(result.totalAddresses)}</span></div>
                        <div class="result-row"><span class="result-label">Networks Combined</span><span class="result-value">${networks.length}</span></div>
                    </div>
                </div>
            </div>
        </div>
    `;
}
