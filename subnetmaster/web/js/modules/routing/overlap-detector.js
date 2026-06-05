/**
 * ============================================================
 * SubnetMaster – Overlapping Subnet Detector Module
 * ============================================================
 * Scans a list of subnets and detects any overlaps or conflicts.
 * ============================================================
 */

import { detectOverlaps, parseCidr } from '../../../core/ip-utils.js';
import { showToast } from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <h3>Overlapping Subnet Detector</h3>
            </div>
            <div class="card-body">
                <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                    Paste a list of subnets (one per line) to check for overlaps or IP space conflicts.
                </p>
                <div class="input-group" style="margin-bottom: 24px;">
                    <textarea id="overlap-input" rows="6" placeholder="192.168.1.0/24\n192.168.1.128/25\n10.0.0.0/8"></textarea>
                </div>
                <button class="btn btn-primary" id="overlap-submit">Detect Overlaps</button>
            </div>
        </div>
        <div id="overlap-results" style="margin-top: 24px;"></div>
    `;
}

export function init() {
    document.getElementById('overlap-submit').addEventListener('click', analyzeOverlaps);
}

function analyzeOverlaps() {
    const inputLines = document.getElementById('overlap-input').value.split('\n');
    const subnets = [];
    const validLines = [];

    for (const line of inputLines) {
        const t = line.trim();
        if (!t) continue;
        const parsed = parseCidr(t);
        if (!parsed) {
            showToast(`Invalid format ignored: ${t}`, 'warning');
            continue;
        }
        subnets.push(parsed);
        validLines.push(t);
    }

    if (subnets.length < 2) {
        showToast('Please enter at least 2 valid subnets to check for overlaps', 'warning');
        return;
    }

    const conflicts = detectOverlaps(subnets);
    const resultsDiv = document.getElementById('overlap-results');

    if (conflicts.length === 0) {
        resultsDiv.innerHTML = `
            <div class="card animate-in">
                <div class="card-body" style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--success-bg); color: var(--success); display: flex; align-items: center; justify-content: center;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <div>
                        <h4 style="font-size: 16px; color: var(--success); font-weight: 600; margin-bottom: 4px;">No Overlaps Detected</h4>
                        <p style="font-size: 13px; color: var(--text-secondary);">All ${subnets.length} subnets are completely distinct and do not conflict.</p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    resultsDiv.innerHTML = `
        <div class="card animate-in" style="border-color: var(--error);">
            <div class="card-header" style="background: var(--error-bg);">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                <h3 style="color: var(--error);">Conflicts Detected (${conflicts.length})</h3>
            </div>
            <div class="card-body" style="padding: 0;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Subnet A</th>
                            <th>Subnet B</th>
                            <th>Conflict Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${conflicts.map(c => {
                            let typeBadge = '';
                            if (c.type === 'identical') typeBadge = '<span class="badge badge-danger">Identical</span>';
                            else if (c.type === 'contains' || c.type === 'contained_by') typeBadge = '<span class="badge badge-warning">Subset / Contains</span>';
                            else typeBadge = '<span class="badge badge-info">Partial Overlap</span>';
                            
                            return `
                                <tr>
                                    <td style="font-family: var(--font-mono); font-weight: 600;">${c.subnetA}</td>
                                    <td style="font-family: var(--font-mono); font-weight: 600;">${c.subnetB}</td>
                                    <td>${typeBadge}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}
