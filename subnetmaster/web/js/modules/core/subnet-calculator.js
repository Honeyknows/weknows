/**
 * ============================================================
 * SubnetMaster – IPv4 Subnet Calculator Module
 * ============================================================
 * The primary tool: calculates complete subnet information
 * from an IPv4 address and CIDR prefix.
 * ============================================================
 */

import { calculateSubnet, isValidIp, isValidCidr, parseCidr } from '../../../core/ip-utils.js';
import { addToHistory, trackCidr } from '../../utils/storage-utils.js';
import { addToFavorites } from '../../utils/storage-utils.js';
import { showToast, createCopyButton, formatNumber } from '../../utils/ui-utils.js';

let lastResult = null;

export function render(container) {
    container.innerHTML = `
        <div class="grid-2">
            <!-- Input Panel -->
            <div class="card animate-in">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="4" y="4" width="16" height="16" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/>
                        <line x1="10" y1="4" x2="10" y2="20"/>
                    </svg>
                    <h3>IPv4 Subnet Calculator</h3>
                </div>
                <div class="card-body">
                    <div class="input-group" style="margin-bottom: 16px;">
                        <label for="calc-ip">IPv4 Address / CIDR Notation</label>
                        <input type="text" id="calc-ip" placeholder="e.g. 192.168.1.0/24 or 10.0.0.0" autocomplete="off" spellcheck="false">
                        <span class="input-hint">Enter IP with CIDR (192.168.1.0/24) or just IP address</span>
                    </div>
                    <div class="input-group" style="margin-bottom: 20px;">
                        <label for="calc-cidr">CIDR Prefix Length</label>
                        <input type="number" id="calc-cidr" placeholder="e.g. 24" min="0" max="32" value="24">
                        <input type="range" id="calc-cidr-slider" min="0" max="32" value="24" style="margin-top: 8px; width: 100%; accent-color: var(--accent-primary);">
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-primary" id="calc-submit">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="4" y="4" width="16" height="16" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/>
                                <line x1="10" y1="4" x2="10" y2="20"/>
                            </svg>
                            Calculate
                        </button>
                        <button class="btn btn-secondary" id="calc-favorite" title="Save to Favorites">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                        </button>
                        <button class="btn btn-secondary" id="calc-clear">Clear</button>
                    </div>
                </div>
            </div>

            <!-- Quick Presets -->
            <div class="card animate-in" style="animation-delay: 0.05s;">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    <h3>Quick Presets</h3>
                </div>
                <div class="card-body" style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '192.168.1.0/24', '10.0.0.0/24', '10.10.10.0/28', '172.16.0.0/30', '192.168.100.0/25'].map(p => `
                        <button class="btn btn-ghost btn-sm preset-btn" data-preset="${p}" style="font-family: var(--font-mono); font-size: 12px; border: 1px solid var(--border-secondary);">${p}</button>
                    `).join('')}
                </div>
            </div>
        </div>

        <!-- Results -->
        <div id="calc-results" style="margin-top: 24px;"></div>
    `;
}

export function init() {
    const ipInput = document.getElementById('calc-ip');
    const cidrInput = document.getElementById('calc-cidr');
    const cidrSlider = document.getElementById('calc-cidr-slider');
    const submitBtn = document.getElementById('calc-submit');
    const clearBtn = document.getElementById('calc-clear');
    const favoriteBtn = document.getElementById('calc-favorite');

    // Sync CIDR input and slider
    cidrInput.addEventListener('input', () => {
        cidrSlider.value = cidrInput.value;
    });
    cidrSlider.addEventListener('input', () => {
        cidrInput.value = cidrSlider.value;
    });

    // Handle IP input with embedded CIDR
    ipInput.addEventListener('input', () => {
        const parsed = parseCidr(ipInput.value);
        if (parsed) {
            cidrInput.value = parsed.cidr;
            cidrSlider.value = parsed.cidr;
        }
    });

    // Calculate
    submitBtn.addEventListener('click', calculate);

    // Enter key
    ipInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') calculate(); });
    cidrInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') calculate(); });

    // Clear
    clearBtn.addEventListener('click', () => {
        ipInput.value = '';
        cidrInput.value = '24';
        cidrSlider.value = '24';
        document.getElementById('calc-results').innerHTML = '';
        lastResult = null;
    });

    // Favorite
    favoriteBtn.addEventListener('click', () => {
        if (!lastResult) {
            showToast('Calculate a subnet first', 'warning');
            return;
        }
        addToFavorites({
            type: 'subnet',
            label: `${lastResult.ip}/${lastResult.cidr}`,
            data: lastResult
        });
        showToast('Saved to favorites!', 'success');
    });

    // Presets
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            ipInput.value = preset;
            const parsed = parseCidr(preset);
            if (parsed) {
                cidrInput.value = parsed.cidr;
                cidrSlider.value = parsed.cidr;
                calculate();
            }
        });
    });
}

function calculate() {
    const ipInput = document.getElementById('calc-ip');
    const cidrInput = document.getElementById('calc-cidr');
    const resultsDiv = document.getElementById('calc-results');

    let ip = ipInput.value.trim();
    let cidr = parseInt(cidrInput.value);

    // Parse CIDR notation
    const parsed = parseCidr(ip);
    if (parsed) {
        ip = parsed.ip;
        cidr = parsed.cidr;
    }

    // Validate
    if (!isValidIp(ip)) {
        showToast('Please enter a valid IPv4 address', 'error');
        return;
    }
    if (!isValidCidr(cidr)) {
        showToast('CIDR must be between 0 and 32', 'error');
        return;
    }

    // Calculate
    const result = calculateSubnet(ip, cidr);
    lastResult = result;

    // Track for analytics
    trackCidr(cidr);
    addToHistory({
        type: 'subnet',
        input: `${ip}/${cidr}`,
        result: `${result.networkAddress}/${cidr}`,
        data: result
    });

    // Render results
    renderResults(resultsDiv, result);
}

function renderResults(container, r) {
    const typeFlags = r.ipType;
    const typeBadges = [];
    if (typeFlags.isPrivate) typeBadges.push('<span class="badge badge-warning">Private</span>');
    if (typeFlags.isPublic) typeBadges.push('<span class="badge badge-success">Public</span>');
    if (typeFlags.isLoopback) typeBadges.push('<span class="badge badge-info">Loopback</span>');
    if (typeFlags.isMulticast) typeBadges.push('<span class="badge badge-danger">Multicast</span>');
    if (typeFlags.isLinkLocal) typeBadges.push('<span class="badge badge-warning">Link-Local</span>');
    if (typeFlags.isAPIPA) typeBadges.push('<span class="badge badge-warning">APIPA</span>');
    if (typeFlags.isReserved) typeBadges.push('<span class="badge badge-danger">Reserved</span>');
    if (typeFlags.isDocumentation) typeBadges.push('<span class="badge badge-info">Documentation</span>');

    container.innerHTML = `
        <div class="grid-2">
            <!-- Network Information -->
            <div class="card animate-in">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <h3>Network Information</h3>
                    <div style="margin-left: auto; display: flex; gap: 4px;">
                        <span class="badge badge-accent">Class ${r.ipClass}</span>
                        ${typeBadges.join('')}
                    </div>
                </div>
                <div class="card-body" id="result-rows-network">
                </div>
            </div>

            <!-- Address Details -->
            <div class="card animate-in" style="animation-delay: 0.05s;">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    </svg>
                    <h3>Address Details</h3>
                </div>
                <div class="card-body" id="result-rows-address">
                </div>
            </div>
        </div>

        <!-- Binary Representation -->
        <div class="card animate-in" style="margin-top: 20px; animation-delay: 0.1s;">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>
                <h3>Binary Representation</h3>
            </div>
            <div class="card-body">
                <div class="binary-display">
                    ${renderBinaryRow('IP Address', r.binaryIp, r.cidr)}
                    ${renderBinaryRow('Subnet Mask', r.binaryMask, r.cidr)}
                    ${renderBinaryRow('Network', r.binaryNetwork, r.cidr)}
                    ${renderBinaryRow('Broadcast', r.binaryBroadcast, r.cidr)}
                </div>
            </div>
        </div>
    `;

    // Add result rows with copy buttons
    const networkRows = document.getElementById('result-rows-network');
    const addressRows = document.getElementById('result-rows-address');

    const networkData = [
        ['Network Address', r.networkAddress],
        ['Broadcast Address', r.broadcastAddress],
        ['Subnet Mask', r.subnetMask],
        ['Wildcard Mask', r.wildcardMask],
        ['CIDR Notation', `/${r.cidr}`],
    ];

    const addressData = [
        ['First Usable Host', r.firstHost],
        ['Last Usable Host', r.lastHost],
        ['Total Addresses', formatNumber(r.totalAddresses)],
        ['Usable Hosts', formatNumber(r.usableHosts)],
        ['Network Bits', `${r.cidr} bits`],
        ['Host Bits', `${32 - r.cidr} bits`],
    ];

    networkData.forEach(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'result-row';
        row.innerHTML = `<span class="result-label">${label}</span><span class="result-value">${value}</span>`;
        row.appendChild(createCopyButton(value, label));
        networkRows.appendChild(row);
    });

    addressData.forEach(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'result-row';
        row.innerHTML = `<span class="result-label">${label}</span><span class="result-value">${value}</span>`;
        row.appendChild(createCopyButton(String(value), label));
        addressRows.appendChild(row);
    });
}

function renderBinaryRow(label, binary, cidr) {
    const bits = binary.replace(/\./g, '');
    let html = '';
    for (let i = 0; i < 32; i++) {
        if (i > 0 && i % 8 === 0) html += '<span class="dot-sep">.</span>';
        const cls = i < cidr ? 'network-bit' : 'host-bit';
        html += `<span class="${cls}">${bits[i]}</span>`;
    }
    return `
        <div style="margin-bottom: 12px;">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; font-family: var(--font-sans); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${label}</div>
            <div>${html}</div>
        </div>
    `;
}
