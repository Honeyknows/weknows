/**
 * ============================================================
 * SubnetMaster – IPv6 Toolkit Module
 * ============================================================
 * Comprehensive IPv6 tool for validation, compression/expansion,
 * prefix calculations, and address type identification.
 * ============================================================
 */

import { analyzeIPv6, isValidIPv6, compressIPv6, expandIPv6 } from '../../../core/ipv6-utils.js';
import { addToHistory } from '../../utils/storage-utils.js';
import { showToast, createCopyButton } from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header" style="background: var(--accent-gradient); border-bottom: none;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <h3 style="color: white;">IPv6 Toolkit</h3>
                <span class="badge" style="margin-left: auto; background: rgba(255,255,255,0.2); color: white;">NEW</span>
            </div>
            <div class="card-body">
                <div class="grid-2">
                    <div class="input-group">
                        <label for="ipv6-input">IPv6 Address / Prefix Notation</label>
                        <input type="text" id="ipv6-input" placeholder="e.g. 2001:db8::1/64 or fe80::" autocomplete="off" spellcheck="false" style="font-size: 15px;">
                    </div>
                    <div class="input-group">
                        <label for="ipv6-prefix">Prefix Length</label>
                        <input type="number" id="ipv6-prefix" placeholder="64" min="0" max="128" value="64">
                    </div>
                </div>
                
                <div class="btn-group" style="margin-top: 20px;">
                    <button class="btn btn-primary" id="ipv6-submit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Analyze IPv6
                    </button>
                    <button class="btn btn-secondary" id="ipv6-compress">Compress (::)</button>
                    <button class="btn btn-secondary" id="ipv6-expand">Expand Fully</button>
                </div>
            </div>
        </div>

        <div id="ipv6-results" style="margin-top: 24px;"></div>
    `;
}

export function init() {
    const input = document.getElementById('ipv6-input');
    const prefixInput = document.getElementById('ipv6-prefix');
    const submitBtn = document.getElementById('ipv6-submit');
    const compressBtn = document.getElementById('ipv6-compress');
    const expandBtn = document.getElementById('ipv6-expand');

    // Handle embedded prefix in input
    input.addEventListener('input', () => {
        const val = input.value.trim();
        if (val.includes('/')) {
            const [ip, pref] = val.split('/');
            const p = parseInt(pref);
            if (!isNaN(p) && p >= 0 && p <= 128) {
                prefixInput.value = p;
            }
        }
    });

    submitBtn.addEventListener('click', analyze);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') analyze(); });
    prefixInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') analyze(); });

    // Quick Format Buttons
    compressBtn.addEventListener('click', () => {
        const val = getIpFromInput();
        if (isValidIPv6(val)) {
            input.value = compressIPv6(val);
            showToast('Address compressed', 'success');
        } else {
            showToast('Invalid IPv6 address', 'error');
        }
    });

    expandBtn.addEventListener('click', () => {
        const val = getIpFromInput();
        if (isValidIPv6(val)) {
            input.value = expandIPv6(val);
            showToast('Address expanded', 'success');
        } else {
            showToast('Invalid IPv6 address', 'error');
        }
    });
}

function getIpFromInput() {
    const val = document.getElementById('ipv6-input').value.trim();
    return val.includes('/') ? val.split('/')[0] : val;
}

function analyze() {
    const inputVal = document.getElementById('ipv6-input').value.trim();
    const prefix = parseInt(document.getElementById('ipv6-prefix').value);
    const resultsDiv = document.getElementById('ipv6-results');

    let ip = inputVal;
    if (inputVal.includes('/')) {
        ip = inputVal.split('/')[0];
    }

    if (!isValidIPv6(ip)) {
        showToast('Please enter a valid IPv6 address', 'error');
        return;
    }
    if (isNaN(prefix) || prefix < 0 || prefix > 128) {
        showToast('Prefix length must be between 0 and 128', 'error');
        return;
    }

    const result = analyzeIPv6(ip, prefix);

    addToHistory({
        type: 'ipv6',
        input: `${ip}/${prefix}`,
        result: result.types[0]?.type || 'IPv6'
    });

    resultsDiv.innerHTML = `
        <div class="grid-2">
            <!-- Format Details -->
            <div class="card animate-in">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <h3>Formats & Prefix</h3>
                </div>
                <div class="card-body" id="ipv6-formats"></div>
            </div>

            <!-- Address Classification -->
            <div class="card animate-in" style="animation-delay: 0.05s;">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                    </svg>
                    <h3>Classification</h3>
                </div>
                <div class="card-body">
                    ${result.types.length > 0 ? result.types.map(t => `
                        <div style="padding: 12px; background: var(--bg-input); border: 1px solid var(--border-secondary); border-radius: var(--radius-sm); margin-bottom: 12px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                                <div style="font-weight: 600; color: var(--accent-primary);">${t.type}</div>
                                <span class="badge badge-info">${t.rfc}</span>
                            </div>
                            <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">${t.description}</div>
                        </div>
                    `).join('') : `
                        <div class="empty-state">
                            <p>Global Unicast Address</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    // Render format rows with copy buttons
    const formatsDiv = document.getElementById('ipv6-formats');
    
    const formatRows = [
        ['Compressed', result.compressed],
        ['Expanded', result.expanded],
        ['Network Prefix', `${result.networkPrefix}/${prefix}`],
        ['Last Address', result.lastAddress],
    ];

    formatRows.forEach(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'result-row';
        row.innerHTML = `<span class="result-label">${label}</span><span class="result-value" style="font-size: 13px;">${value}</span>`;
        row.appendChild(createCopyButton(value, label));
        formatsDiv.appendChild(row);
    });
}
