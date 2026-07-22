/**
 * ============================================================
 * SubnetMaster – Binary Visualizer Module
 * ============================================================
 * Visualizes the binary representation of IP addresses and
 * subnet masks, highlighting network vs. host portions.
 * ============================================================
 */

import { calculateSubnet, isValidIp, isValidCidr, parseCidr, intToBinary } from '../../../core/ip-utils.js';
import { showToast } from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <h3>Binary Visualization</h3>
            </div>
            <div class="card-body">
                <div class="grid-2" style="margin-bottom: 24px;">
                    <div class="input-group">
                        <label for="viz-ip">IPv4 Address / CIDR Notation</label>
                        <input type="text" id="viz-ip" placeholder="e.g. 192.168.1.10/24" autocomplete="off" spellcheck="false">
                    </div>
                    <div class="input-group">
                        <label for="viz-cidr">CIDR Prefix</label>
                        <input type="number" id="viz-cidr" placeholder="24" min="0" max="32" value="24">
                    </div>
                </div>
                <button class="btn btn-primary" id="viz-submit" style="margin-bottom: 32px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                    </svg>
                    Visualize
                </button>

                <div id="viz-results"></div>
            </div>
        </div>
    `;
}

export function init() {
    const ipInput = document.getElementById('viz-ip');
    const cidrInput = document.getElementById('viz-cidr');
    const submitBtn = document.getElementById('viz-submit');

    // Handle CIDR in IP input
    ipInput.addEventListener('input', () => {
        const parsed = parseCidr(ipInput.value);
        if (parsed) {
            cidrInput.value = parsed.cidr;
        }
    });

    submitBtn.addEventListener('click', visualize);
    ipInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') visualize(); });
    cidrInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') visualize(); });
}

function visualize() {
    const ipInput = document.getElementById('viz-ip');
    const cidrInput = document.getElementById('viz-cidr');
    const resultsDiv = document.getElementById('viz-results');

    let ip = ipInput.value.trim();
    let cidr = parseInt(cidrInput.value);

    const parsed = parseCidr(ip);
    if (parsed) {
        ip = parsed.ip;
        cidr = parsed.cidr;
    }

    if (!isValidIp(ip)) {
        showToast('Please enter a valid IPv4 address', 'error');
        return;
    }
    if (!isValidCidr(cidr)) {
        showToast('CIDR must be between 0 and 32', 'error');
        return;
    }

    const result = calculateSubnet(ip, cidr);

    resultsDiv.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid var(--border-secondary);">
            <div style="display: flex; gap: 16px; align-items: center;">
                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);">Legend:</div>
                <div style="display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-secondary);">
                    <div style="width: 12px; height: 12px; background: var(--accent-primary); border-radius: 2px;"></div> Network Bits
                </div>
                <div style="display: flex; gap: 8px; align-items: center; font-size: 13px; color: var(--text-secondary);">
                    <div style="width: 12px; height: 12px; background: var(--warning); border-radius: 2px;"></div> Host Bits
                </div>
            </div>
            <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 600; color: var(--text-primary);">
                ${ip}/${cidr}
            </div>
        </div>

        <div class="binary-viz-container" style="display: flex; flex-direction: column; gap: 32px;">
            ${renderInteractiveBinaryRow('IP Address', result.ip, result.binaryIp, cidr)}
            ${renderInteractiveBinaryRow('Subnet Mask', result.subnetMask, result.binaryMask, cidr)}
            ${renderInteractiveBinaryRow('Network Address (IP AND Mask)', result.networkAddress, result.binaryNetwork, cidr)}
            ${renderInteractiveBinaryRow('Broadcast Address (IP OR Inverse Mask)', result.broadcastAddress, result.binaryBroadcast, cidr)}
        </div>
    `;
}

function renderInteractiveBinaryRow(label, decValue, binValue, cidr) {
    const decParts = decValue.split('.');
    const binParts = binValue.split('.');
    
    let blocksHtml = '';
    let globalBitIndex = 0;

    for (let i = 0; i < 4; i++) {
        let octetHtml = '';
        for (let j = 0; j < 8; j++) {
            const bit = binParts[i][j];
            const isNetwork = globalBitIndex < cidr;
            const bitClass = isNetwork ? 'network-bit' : 'host-bit';
            const bitStyle = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 32px;
                margin: 0 1px;
                background: var(--bg-input);
                border: 1px solid var(--border-secondary);
                border-radius: 4px;
                font-family: var(--font-mono);
                font-size: 16px;
                font-weight: 600;
                color: ${isNetwork ? 'var(--accent-primary)' : 'var(--warning)'};
                border-color: ${isNetwork ? 'rgba(14, 165, 233, 0.3)' : 'rgba(245, 158, 11, 0.3)'};
            `;
            
            octetHtml += `<span style="${bitStyle}">${bit}</span>`;
            globalBitIndex++;
        }

        blocksHtml += `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div style="font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--text-primary);">${decParts[i]}</div>
                <div style="display: flex;">${octetHtml}</div>
            </div>
        `;

        if (i < 3) {
            blocksHtml += `<div style="display: flex; align-items: flex-end; padding-bottom: 4px; font-size: 24px; color: var(--text-muted);">.</div>`;
        }
    }

    return `
        <div class="animate-in">
            <div style="font-size: 13px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px;">${label}</div>
            <div style="display: flex; justify-content: center; gap: 16px;">
                ${blocksHtml}
            </div>
        </div>
    `;
}
