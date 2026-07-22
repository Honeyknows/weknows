/**
 * ============================================================
 * SubnetMaster – Route Summarization Module
 * ============================================================
 * Identifies how routes can be aggregated and shows the binary
 * comparison used to determine the summary route.
 * ============================================================
 */

import { calculateSupernet, parseCidr, intToBinary, ipToInt, cidrToMask } from '../../../core/ip-utils.js';
import { showToast } from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/>
                    <path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>
                </svg>
                <h3>Route Summarization Analysis</h3>
            </div>
            <div class="card-body">
                <div class="input-group" style="margin-bottom: 24px;">
                    <label>Enter Routes to Summarize</label>
                    <textarea id="route-input" rows="4" placeholder="10.1.1.0/24\n10.1.2.0/24\n10.1.3.0/24"></textarea>
                </div>
                <button class="btn btn-primary" id="route-submit">Analyze Routes</button>
            </div>
        </div>
        <div id="route-results" style="margin-top: 24px;"></div>
    `;
}

export function init() {
    document.getElementById('route-submit').addEventListener('click', analyzeRoutes);
}

function analyzeRoutes() {
    const input = document.getElementById('route-input').value.split('\n');
    const networks = [];

    for (const line of input) {
        const t = line.trim();
        if (!t) continue;
        const parsed = parseCidr(t);
        if (!parsed) {
            showToast(`Invalid format: ${t}`, 'error');
            return;
        }
        networks.push(parsed);
    }

    if (networks.length < 2) {
        showToast('Please enter at least 2 routes', 'warning');
        return;
    }

    const result = calculateSupernet(networks);
    
    // Generate binary comparison
    let binaryHtml = '';
    const superCidr = result.supernetCidr;
    
    networks.forEach(net => {
        const bin = intToBinary(ipToInt(net.ip) & cidrToMask(net.cidr)).replace(/\./g, '');
        let formattedBin = '';
        for (let i = 0; i < 32; i++) {
            if (i > 0 && i % 8 === 0) formattedBin += '<span style="color: var(--text-muted); margin: 0 4px;">.</span>';
            const color = i < superCidr ? 'var(--success)' : 'var(--error)';
            formattedBin += `<span style="color: ${color};">${bin[i]}</span>`;
        }
        binaryHtml += `
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-secondary);">
                <span style="font-family: var(--font-mono); font-size: 13px;">${net.ip}/${net.cidr}</span>
                <span style="font-family: var(--font-mono); font-size: 13px; letter-spacing: 1px;">${formattedBin}</span>
            </div>
        `;
    });

    // Add the summary route binary
    const sumBin = intToBinary(ipToInt(result.supernetAddress)).replace(/\./g, '');
    let formattedSumBin = '';
    for (let i = 0; i < 32; i++) {
        if (i > 0 && i % 8 === 0) formattedSumBin += '<span style="color: var(--text-muted); margin: 0 4px;">.</span>';
        const isMatch = i < superCidr;
        formattedSumBin += `<span style="color: ${isMatch ? 'var(--accent-primary)' : 'var(--text-muted)'}; font-weight: ${isMatch ? 'bold' : 'normal'};">${isMatch ? sumBin[i] : '0'}</span>`;
    }

    document.getElementById('route-results').innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <h3>Summarization Analysis</h3>
            </div>
            <div class="card-body">
                <div style="margin-bottom: 24px; padding: 16px; background: var(--success-bg); border-left: 4px solid var(--success); border-radius: var(--radius-sm);">
                    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Aggregated Route</div>
                    <div style="font-size: 24px; font-weight: 700; color: var(--success); font-family: var(--font-mono);">${result.notation}</div>
                    <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">Matching Bits: ${superCidr}</div>
                </div>

                <h4 style="font-size: 13px; font-weight: 600; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px;">Binary Comparison</h4>
                <div style="background: var(--bg-input); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-secondary); overflow-x: auto;">
                    ${binaryHtml}
                    <div style="display: flex; justify-content: space-between; padding: 12px 0 0; margin-top: 6px; border-top: 2px solid var(--border-focus);">
                        <span style="font-weight: bold; color: var(--accent-primary);">Summary</span>
                        <span style="font-family: var(--font-mono); font-size: 13px; letter-spacing: 1px;">${formattedSumBin}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}
