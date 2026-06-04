/**
 * ============================================================
 * SubnetMaster – CIDR Toolkit Module
 * ============================================================
 * Provides CIDR conversion tools, a host capacity calculator,
 * and a full reference cheat sheet.
 * ============================================================
 */

import { CIDR_CHEAT_SHEET } from '../../../../core/rfc-data.js';
import * as ipUtils from '../../../../core/ip-utils.js';
import * as uiUtils from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="grid-2">
            <!-- CIDR to Mask -->
            <div class="card animate-in">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                    <h3>CIDR Converter</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; gap: 16px; align-items: flex-end; margin-bottom: 24px;">
                        <div class="input-group" style="flex: 1;">
                            <label for="cidr-to-mask">CIDR (/0 to /32)</label>
                            <input type="number" id="cidr-to-mask" placeholder="24" min="0" max="32">
                        </div>
                        <div style="padding-bottom: 8px; color: var(--text-muted);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                            </svg>
                        </div>
                        <div class="input-group" style="flex: 2;">
                            <label>Subnet Mask</label>
                            <div class="result-value" id="res-mask" style="padding: 10px 14px; background: var(--bg-input); border: 1px solid var(--border-secondary); border-radius: var(--radius-sm); min-height: 42px; display: flex; align-items: center;">—</div>
                        </div>
                    </div>

                    <div style="display: flex; gap: 16px; align-items: flex-end;">
                        <div class="input-group" style="flex: 2;">
                            <label for="mask-to-cidr">Subnet Mask</label>
                            <input type="text" id="mask-to-cidr" placeholder="255.255.255.0" autocomplete="off" spellcheck="false">
                        </div>
                        <div style="padding-bottom: 8px; color: var(--text-muted);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                            </svg>
                        </div>
                        <div class="input-group" style="flex: 1;">
                            <label>CIDR</label>
                            <div class="result-value" id="res-cidr" style="padding: 10px 14px; background: var(--bg-input); border: 1px solid var(--border-secondary); border-radius: var(--radius-sm); min-height: 42px; display: flex; align-items: center;">—</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Host Capacity Calculator -->
            <div class="card animate-in" style="animation-delay: 0.05s;">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    <h3>Host Capacity Calculator</h3>
                </div>
                <div class="card-body">
                    <div class="input-group" style="margin-bottom: 24px;">
                        <label for="req-hosts">Required Usable Hosts</label>
                        <input type="number" id="req-hosts" placeholder="e.g. 50" min="1">
                        <span class="input-hint">Finds the smallest CIDR block that fits this many hosts.</span>
                    </div>
                    <div id="capacity-result" style="display: none; padding: 16px; background: var(--info-bg); border-radius: var(--radius-sm); border: 1px solid rgba(14, 165, 233, 0.2);">
                        <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 4px;">Recommended Prefix</div>
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="font-size: 24px; font-weight: 700; color: var(--accent-primary); font-family: var(--font-mono);" id="cap-cidr"></div>
                            <div style="text-align: right;">
                                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary);" id="cap-hosts"></div>
                                <div style="font-size: 11px; color: var(--text-muted);">usable hosts</div>
                            </div>
                        </div>
                        <div style="margin-top: 12px; font-size: 13px; color: var(--text-secondary);" id="cap-mask"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Full Cheat Sheet -->
        <div class="card animate-in" style="margin-top: 24px; animation-delay: 0.1s;">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <h3>CIDR Reference Cheat Sheet</h3>
            </div>
            <div class="card-body" style="padding: 0; max-height: 600px; overflow-y: auto;">
                <table class="data-table">
                    <thead style="position: sticky; top: 0; background: var(--bg-card); z-index: 10;">
                        <tr>
                            <th>CIDR</th>
                            <th>Subnet Mask</th>
                            <th>Wildcard</th>
                            <th>Usable Hosts</th>
                            <th>Common Usage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${CIDR_CHEAT_SHEET.map(row => `
                            <tr>
                                <td style="color: var(--accent-primary); font-weight: 700;">${row.cidr}</td>
                                <td>${row.mask}</td>
                                <td style="color: var(--text-secondary);">${row.wildcard}</td>
                                <td style="color: ${row.usableHosts > 0 ? 'var(--success)' : 'var(--text-muted)'}; font-weight: 600;">${uiUtils.formatNumber(row.usableHosts)}</td>
                                <td style="font-family: var(--font-sans); color: var(--text-secondary); font-size: 12px;">${row.usage}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

export function init() {
    const cidrToMaskInput = document.getElementById('cidr-to-mask');
    const maskToCidrInput = document.getElementById('mask-to-cidr');
    const reqHostsInput = document.getElementById('req-hosts');

    // CIDR -> Mask
    cidrToMaskInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        const resEl = document.getElementById('res-mask');
        if (ipUtils.isValidCidr(val)) {
            const mask = ipUtils.intToIp(ipUtils.cidrToMask(val));
            resEl.textContent = mask;
            resEl.style.color = 'var(--text-primary)';
        } else {
            resEl.textContent = 'Invalid CIDR';
            resEl.style.color = 'var(--error)';
        }
    });

    // Mask -> CIDR
    maskToCidrInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        const resEl = document.getElementById('res-cidr');
        if (ipUtils.isValidMask(val)) {
            const cidr = ipUtils.maskStringToCidr(val);
            resEl.textContent = `/${cidr}`;
            resEl.style.color = 'var(--text-primary)';
        } else {
            resEl.textContent = 'Invalid Mask';
            resEl.style.color = 'var(--error)';
        }
    });

    // Capacity Calculator
    reqHostsInput.addEventListener('input', (e) => {
        const hosts = parseInt(e.target.value);
        const resContainer = document.getElementById('capacity-result');
        
        if (isNaN(hosts) || hosts < 1) {
            resContainer.style.display = 'none';
            return;
        }

        if (hosts > Math.pow(2, 32) - 2) {
            uiUtils.showToast('Exceeds IPv4 address space', 'error');
            return;
        }

        // Find smallest CIDR
        const needed = hosts + 2;
        const bits = Math.ceil(Math.log2(needed));
        const cidr = 32 - bits;
        
        // Lookup from cheat sheet
        const details = CIDR_CHEAT_SHEET.find(c => c.cidr === `/${cidr}`);

        document.getElementById('cap-cidr').textContent = `/${cidr}`;
        document.getElementById('cap-hosts').textContent = uiUtils.formatNumber(details.usableHosts);
        document.getElementById('cap-mask').textContent = `Mask: ${details.mask} (Uses ${details.hostBits} host bits)`;
        
        resContainer.style.display = 'block';
    });
}
