/**
 * ============================================================
 * SubnetMaster – IP Analysis Module
 * ============================================================
 * Analyzes an IPv4 address to determine its class, type,
 * reserved status, and relevant RFC references.
 * ============================================================
 */

import { isValidIp, getIpClass, getIpType } from '../../../core/ip-utils.js';
import { lookupReservedNetwork, getRFC, RESERVED_NETWORKS } from '../../../core/rfc-data.js';
import { addToHistory } from '../../utils/storage-utils.js';
import { showToast, createCopyButton } from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="grid-2">
            <!-- Input -->
            <div class="card animate-in">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                    </svg>
                    <h3>IP Address Analysis</h3>
                </div>
                <div class="card-body">
                    <div class="input-group" style="margin-bottom: 16px;">
                        <label for="analysis-ip">IPv4 Address</label>
                        <input type="text" id="analysis-ip" placeholder="e.g. 192.168.1.100" autocomplete="off" spellcheck="false">
                    </div>
                    <button class="btn btn-primary" id="analysis-submit">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Analyze
                    </button>
                </div>
            </div>

            <!-- Reserved Network Reference -->
            <div class="card animate-in" style="animation-delay: 0.05s;">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                    </svg>
                    <h3>Reserved Network Reference</h3>
                </div>
                <div class="card-body" style="max-height: 320px; overflow-y: auto;">
                    <table class="data-table">
                        <thead><tr><th>Range</th><th>Name</th><th>RFC</th></tr></thead>
                        <tbody>
                            ${RESERVED_NETWORKS.map(net => `
                                <tr class="rfc-ref-row" data-rfc="${net.rfc}" style="cursor: pointer;">
                                    <td style="font-size: 12px;">${net.range}</td>
                                    <td style="font-family: var(--font-sans); font-size: 12px;">${net.name}</td>
                                    <td><span class="badge badge-info" style="cursor: pointer;">${net.rfc}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Results -->
        <div id="analysis-results" style="margin-top: 24px;"></div>
    `;
}

export function init() {
    const ipInput = document.getElementById('analysis-ip');
    const submitBtn = document.getElementById('analysis-submit');

    submitBtn.addEventListener('click', analyze);
    ipInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') analyze(); });

    // RFC reference click handlers
    document.querySelectorAll('.rfc-ref-row').forEach(row => {
        row.addEventListener('click', () => {
            showRfcModal(row.dataset.rfc);
        });
    });
}

function analyze() {
    const ip = document.getElementById('analysis-ip').value.trim();
    const resultsDiv = document.getElementById('analysis-results');

    if (!isValidIp(ip)) {
        showToast('Please enter a valid IPv4 address', 'error');
        return;
    }

    const ipClass = getIpClass(ip);
    const ipType = getIpType(ip);
    const reservedNets = lookupReservedNetwork(ip);

    addToHistory({
        type: 'analysis',
        input: ip,
        result: `Class ${ipClass}`
    });

    // Build type badges
    const types = [];
    if (ipType.isPrivate) types.push({ label: 'Private IP', variant: 'warning', desc: 'This address is in a private (RFC 1918) range and is not routable on the Internet.' });
    if (ipType.isPublic) types.push({ label: 'Public IP', variant: 'success', desc: 'This address is publicly routable on the Internet.' });
    if (ipType.isLoopback) types.push({ label: 'Loopback', variant: 'info', desc: 'Loopback address (127.0.0.0/8). Traffic never leaves the host.' });
    if (ipType.isMulticast) types.push({ label: 'Multicast', variant: 'danger', desc: 'Multicast address (224.0.0.0/4, Class D). Used for one-to-many communication.' });
    if (ipType.isLinkLocal) types.push({ label: 'Link-Local', variant: 'warning', desc: 'Link-local / APIPA address (169.254.0.0/16). Auto-assigned when DHCP is unavailable.' });
    if (ipType.isAPIPA) types.push({ label: 'APIPA', variant: 'warning', desc: 'Automatic Private IP Addressing. Fallback when no DHCP server responds.' });
    if (ipType.isReserved) types.push({ label: 'Reserved', variant: 'danger', desc: 'Reserved address space. Not available for normal use.' });
    if (ipType.isBroadcast) types.push({ label: 'Broadcast', variant: 'danger', desc: 'Limited broadcast address. Packets are sent to all hosts on the local network.' });
    if (ipType.isDocumentation) types.push({ label: 'Documentation', variant: 'info', desc: 'Reserved for use in documentation and examples (RFC 5737).' });

    resultsDiv.innerHTML = `
        <div class="grid-2">
            <!-- Classification -->
            <div class="card animate-in">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <h3>Classification</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                        <div style="width: 56px; height: 56px; background: var(--accent-gradient); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: white; flex-shrink: 0;">${ipClass}</div>
                        <div>
                            <div style="font-size: 20px; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary);">${ip}</div>
                            <div style="font-size: 13px; color: var(--text-muted);">Class ${ipClass} Address</div>
                        </div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px;">
                        ${types.map(t => `<span class="badge badge-${t.variant}">${t.label}</span>`).join('')}
                    </div>
                    ${types.map(t => `
                        <div style="padding: 10px 0; border-bottom: 1px solid var(--border-secondary);">
                            <div style="font-size: 13px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px;">${t.label}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.6;">${t.desc}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- RFC References -->
            <div class="card animate-in" style="animation-delay: 0.05s;">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    <h3>Applicable RFCs</h3>
                </div>
                <div class="card-body">
                    ${reservedNets.length > 0 ? reservedNets.map(net => `
                        <div class="rfc-card" style="margin-bottom: 12px;" onclick="document.dispatchEvent(new CustomEvent('show-rfc', {detail: '${net.rfc}'}))">
                            <div class="rfc-id">${net.rfc}</div>
                            <div class="rfc-title">${net.name}</div>
                            <div class="rfc-ranges">${net.range}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; line-height: 1.5;">${net.description}</div>
                        </div>
                    `).join('') : `
                        <div class="empty-state">
                            <p>No specific RFC references for this address.</p>
                        </div>
                    `}
                </div>
            </div>
        </div>
    `;

    // Add RFC click handlers for dynamically created cards
    document.addEventListener('show-rfc', (e) => {
        showRfcModal(e.detail);
    }, { once: false });
}

/**
 * Displays a modal with detailed RFC information.
 * @param {string} rfcId - RFC identifier (e.g., "RFC 1918")
 */
function showRfcModal(rfcId) {
    const rfc = getRFC(rfcId);
    if (!rfc) {
        showToast(`No detailed info available for ${rfcId}`, 'info');
        return;
    }

    // Remove existing modals
    document.querySelector('.modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });

    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>${rfcId}: ${rfc.title}</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
                    <span class="badge badge-info">Year: ${rfc.year}</span>
                    ${rfc.ranges.map(r => `<span class="badge badge-accent" style="font-family: var(--font-mono);">${r}</span>`).join('')}
                </div>
                <p class="rfc-description">${rfc.description}</p>
                <div style="margin-bottom: 12px;">
                    <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Common Usage</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">${rfc.usage}</div>
                </div>
                <div style="font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Key Points</div>
                <ul class="key-points">
                    ${rfc.keyPoints.map(p => `<li>${p}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}
