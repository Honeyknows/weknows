/**
 * ============================================================
 * SubnetMaster – Network Growth Planner Module
 * ============================================================
 * Projects future address requirements and recommends CIDR
 * sizes based on current usage and anticipated growth rate.
 * ============================================================
 */

import { planGrowth } from '../../../core/ip-utils.js';
import { addToHistory } from '../../utils/storage-utils.js';
import { formatNumber } from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                </svg>
                <h3>Network Growth Planner</h3>
            </div>
            <div class="card-body">
                <div class="grid-3" style="margin-bottom: 24px;">
                    <div class="input-group">
                        <label for="growth-current">Current Active Hosts</label>
                        <input type="number" id="growth-current" placeholder="e.g. 150" min="1" value="150">
                    </div>
                    <div class="input-group">
                        <label for="growth-percent">Expected Annual Growth (%)</label>
                        <input type="number" id="growth-percent" placeholder="20" min="0" value="20">
                    </div>
                    <div class="input-group">
                        <label for="growth-years">Years to Plan For</label>
                        <select id="growth-years">
                            <option value="1">1 Year</option>
                            <option value="3" selected>3 Years</option>
                            <option value="5">5 Years</option>
                            <option value="10">10 Years</option>
                        </select>
                    </div>
                </div>

                <button class="btn btn-primary" id="growth-submit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    Project Growth
                </button>
            </div>
        </div>

        <div id="growth-results" style="margin-top: 24px;"></div>
    `;
}

export function init() {
    document.getElementById('growth-submit').addEventListener('click', calculateGrowth);
}

function calculateGrowth() {
    const current = parseInt(document.getElementById('growth-current').value);
    const percent = parseFloat(document.getElementById('growth-percent').value);
    const years = parseInt(document.getElementById('growth-years').value);

    if (isNaN(current) || current < 1) return;
    if (isNaN(percent) || percent < 0) return;

    const result = planGrowth(current, percent, years);

    addToHistory({
        type: 'growth',
        input: `${current} hosts, +${percent}%/yr`,
        result: `Need ${result.recommendedCidr}`
    });

    document.getElementById('growth-results').innerHTML = `
        <div class="grid-2">
            <!-- Recommendation -->
            <div class="card animate-in">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <h3>Recommendation</h3>
                </div>
                <div class="card-body">
                    <div style="margin-bottom: 24px;">
                        <div style="font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Target CIDR Block</div>
                        <div style="display: flex; align-items: baseline; gap: 12px;">
                            <span style="font-size: 32px; font-weight: 700; color: var(--accent-primary); font-family: var(--font-mono);">${result.recommendedCidr}</span>
                            <span style="color: var(--text-secondary);">(${formatNumber(result.recommendedCapacity)} capacity)</span>
                        </div>
                    </div>
                    <div>
                        <div style="font-size: 13px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Safe Buffer (One Size Up)</div>
                        <div style="display: flex; align-items: baseline; gap: 12px;">
                            <span style="font-size: 24px; font-weight: 600; color: var(--success); font-family: var(--font-mono);">${result.safeRecommendation}</span>
                            <span style="color: var(--text-secondary);">(${formatNumber(result.safeCapacity)} capacity)</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Projection Table -->
            <div class="card animate-in" style="animation-delay: 0.05s;">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    <h3>Yearly Projection</h3>
                </div>
                <div class="card-body" style="padding: 0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Timeline</th>
                                <th>Projected Hosts</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="color: var(--text-muted);">Current</td>
                                <td>${formatNumber(current)}</td>
                            </tr>
                            ${result.yearlyProjections.map(p => `
                                <tr>
                                    <td>Year ${p.year}</td>
                                    <td style="font-weight: ${p.year === years ? '600' : '400'}; color: ${p.year === years ? 'var(--accent-primary)' : 'inherit'};">${formatNumber(p.hosts)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}
