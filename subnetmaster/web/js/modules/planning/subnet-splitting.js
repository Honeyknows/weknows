/**
 * ============================================================
 * SubnetMaster – Subnet Splitting Module
 * ============================================================
 * Divides a given network into smaller, equal-sized subnets.
 * ============================================================
 */

import { splitSubnet, isValidIp, isValidCidr, parseCidr } from '../../../core/ip-utils.js';
import { addToHistory } from '../../utils/storage-utils.js';
import { showToast, createCopyButton, formatNumber } from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <h3>Subnet Splitting</h3>
            </div>
            <div class="card-body">
                <div class="grid-3" style="margin-bottom: 24px;">
                    <div class="input-group">
                        <label for="split-ip">Network Address</label>
                        <input type="text" id="split-ip" placeholder="e.g. 192.168.1.0/24" autocomplete="off" spellcheck="false">
                    </div>
                    <div class="input-group">
                        <label for="split-cidr">Original CIDR</label>
                        <input type="number" id="split-cidr" placeholder="24" min="0" max="31" value="24">
                    </div>
                    <div class="input-group">
                        <label for="split-count">Number of Subnets</label>
                        <select id="split-count">
                            <option value="2">2 Subnets</option>
                            <option value="4">4 Subnets</option>
                            <option value="8">8 Subnets</option>
                            <option value="16">16 Subnets</option>
                            <option value="32">32 Subnets</option>
                            <option value="64">64 Subnets</option>
                        </select>
                    </div>
                </div>
                
                <button class="btn btn-primary" id="split-submit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Split Network
                </button>
            </div>
        </div>

        <div id="split-results" style="margin-top: 24px;"></div>
    `;
}

export function init() {
    const ipInput = document.getElementById('split-ip');
    const cidrInput = document.getElementById('split-cidr');
    const submitBtn = document.getElementById('split-submit');

    ipInput.addEventListener('input', () => {
        const parsed = parseCidr(ipInput.value);
        if (parsed) {
            cidrInput.value = parsed.cidr;
        }
    });

    submitBtn.addEventListener('click', performSplit);
    ipInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSplit(); });
}

function performSplit() {
    const ipInput = document.getElementById('split-ip');
    const cidrInput = document.getElementById('split-cidr');
    const countInput = document.getElementById('split-count');
    const resultsDiv = document.getElementById('split-results');

    let ip = ipInput.value.trim();
    let cidr = parseInt(cidrInput.value);
    const count = parseInt(countInput.value);

    const parsed = parseCidr(ip);
    if (parsed) {
        ip = parsed.ip;
        cidr = parsed.cidr;
    }

    if (!isValidIp(ip)) {
        showToast('Please enter a valid network address', 'error');
        return;
    }
    if (!isValidCidr(cidr) || cidr >= 32) {
        showToast('Original CIDR must be between 0 and 31', 'error');
        return;
    }

    const subnets = splitSubnet(ip, cidr, count);

    if (subnets.length === 0) {
        showToast('Cannot split further. Prefix length would exceed /32', 'error');
        return;
    }

    addToHistory({
        type: 'split',
        input: `${ip}/${cidr} into ${count}`,
        result: `${subnets[0].networkAddress}/${subnets[0].cidr} (x${count})`
    });

    resultsDiv.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                <h3>Generated Subnets (${count})</h3>
                <div style="margin-left: auto; display: flex; gap: 8px;">
                    <span class="badge badge-info">New CIDR: /${subnets[0].cidr}</span>
                    <span class="badge badge-success">${formatNumber(subnets[0].usableHosts)} Hosts/Subnet</span>
                </div>
            </div>
            <div class="card-body" style="padding: 0; max-height: 600px; overflow-y: auto;">
                <table class="data-table">
                    <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 10;">
                        <tr>
                            <th>#</th>
                            <th>Network Address</th>
                            <th>Host Range</th>
                            <th>Broadcast Address</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${subnets.map((sub, i) => `
                            <tr>
                                <td style="color: var(--text-muted); font-weight: 600;">${i + 1}</td>
                                <td style="color: var(--accent-primary); font-weight: 600;">${sub.networkAddress}/${sub.cidr}</td>
                                <td>${sub.firstHost} - ${sub.lastHost}</td>
                                <td style="color: var(--text-secondary);">${sub.broadcastAddress}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
