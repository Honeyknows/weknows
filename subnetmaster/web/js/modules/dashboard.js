/**
 * ============================================================
 * SubnetMaster – Dashboard Module
 * ============================================================
 * Analytics dashboard showing recent calculations, quiz stats,
 * most-used CIDRs, saved networks, and quick-access tools.
 * ============================================================
 */

import { getHistory, getFavorites, getQuizScores, getTopCidrs } from '../utils/storage-utils.js';
import { formatNumber } from '../utils/ui-utils.js';

/**
 * Renders the dashboard into the given container.
 * @param {HTMLElement} container - The page content container
 */
export function render(container) {
    const history = getHistory();
    const favorites = getFavorites();
    const quizScores = getQuizScores();
    const topCidrs = getTopCidrs(5);
    
    // Calculate analytics
    const totalCalcs = history.length;
    const avgQuizScore = quizScores.length > 0 
        ? Math.round(quizScores.reduce((sum, s) => sum + (s.score || 0), 0) / quizScores.length) 
        : 0;
    const savedNetworks = favorites.length;
    const recentActivity = history.slice(0, 5);

    container.innerHTML = `
        <!-- Stats Row -->
        <div class="grid-4" style="margin-bottom: 24px;">
            <div class="stat-card animate-in">
                <div class="stat-icon blue">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="4" y="4" width="16" height="16" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/>
                        <line x1="10" y1="4" x2="10" y2="20"/>
                    </svg>
                </div>
                <div class="stat-info">
                    <h4>Total Calculations</h4>
                    <div class="stat-value">${formatNumber(totalCalcs)}</div>
                    <div class="stat-sub">All-time</div>
                </div>
            </div>
            <div class="stat-card animate-in" style="animation-delay: 0.05s;">
                <div class="stat-icon green">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                </div>
                <div class="stat-info">
                    <h4>Saved Networks</h4>
                    <div class="stat-value">${savedNetworks}</div>
                    <div class="stat-sub">Bookmarked</div>
                </div>
            </div>
            <div class="stat-card animate-in" style="animation-delay: 0.1s;">
                <div class="stat-icon purple">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                </div>
                <div class="stat-info">
                    <h4>Quiz Avg Score</h4>
                    <div class="stat-value">${avgQuizScore}%</div>
                    <div class="stat-sub">${quizScores.length} quizzes taken</div>
                </div>
            </div>
            <div class="stat-card animate-in" style="animation-delay: 0.15s;">
                <div class="stat-icon yellow">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
                    </svg>
                </div>
                <div class="stat-info">
                    <h4>Top CIDR</h4>
                    <div class="stat-value">${topCidrs.length > 0 ? '/' + topCidrs[0].cidr : '—'}</div>
                    <div class="stat-sub">${topCidrs.length > 0 ? topCidrs[0].count + ' uses' : 'No data yet'}</div>
                </div>
            </div>
        </div>

        <div class="grid-2">
            <!-- Quick Tools -->
            <div class="card animate-in" style="animation-delay: 0.2s;">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    <h3>Quick Tools</h3>
                </div>
                <div class="card-body">
                    <div class="grid-2" style="gap: 10px;">
                        ${renderQuickTool('Subnet Calculator', 'subnet-calculator', '#0ea5e9')}
                        ${renderQuickTool('VLSM Planner', 'vlsm', '#6366f1')}
                        ${renderQuickTool('IP Analysis', 'ip-analysis', '#10b981')}
                        ${renderQuickTool('CIDR Toolkit', 'cidr-toolkit', '#f59e0b')}
                        ${renderQuickTool('IPv6 Toolkit', 'ipv6-toolkit', '#ec4899')}
                        ${renderQuickTool('Subnet Tree', 'subnet-tree', '#8b5cf6')}
                        ${renderQuickTool('Quiz', 'quiz', '#14b8a6')}
                        ${renderQuickTool('Overlap Detector', 'overlap-detector', '#ef4444')}
                    </div>
                </div>
            </div>

            <!-- Most Used CIDRs -->
            <div class="card animate-in" style="animation-delay: 0.25s;">
                <div class="card-header">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    <h3>Most Used CIDRs</h3>
                </div>
                <div class="card-body" id="dashboard-cidrs">
                    ${topCidrs.length > 0 ? renderCidrChart(topCidrs) : '<div class="empty-state"><p>Start calculating to see your most-used CIDR values here.</p></div>'}
                </div>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="card animate-in" style="margin-top: 24px; animation-delay: 0.3s;">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <h3>Recent Activity</h3>
                ${history.length > 0 ? '<a href="#history" style="margin-left: auto; font-size: 12px;">View All →</a>' : ''}
            </div>
            <div class="card-body">
                ${recentActivity.length > 0 ? renderRecentActivity(recentActivity) : '<div class="empty-state"><p>No calculations yet. Try the Subnet Calculator to get started!</p></div>'}
            </div>
        </div>
    `;
}

/**
 * Renders a quick-tool card button.
 */
function renderQuickTool(name, module, color) {
    return `
        <a href="#${module}" style="text-decoration: none;">
            <div style="padding: 14px; background: var(--bg-input); border: 1px solid var(--border-secondary); border-radius: var(--radius-sm); cursor: pointer; transition: all 0.15s ease; border-left: 3px solid ${color};" 
                 onmouseover="this.style.borderColor='${color}'; this.style.transform='translateY(-1px)';" 
                 onmouseout="this.style.borderColor='var(--border-secondary)'; this.style.borderLeftColor='${color}'; this.style.transform='none';">
                <div style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${name}</div>
            </div>
        </a>
    `;
}

/**
 * Renders the CIDR usage bar chart using inline divs.
 */
function renderCidrChart(cidrs) {
    const max = cidrs[0]?.count || 1;
    return `
        <div style="display: flex; flex-direction: column; gap: 12px;">
            ${cidrs.map((c, i) => {
                const pct = Math.max(10, (c.count / max) * 100);
                const colors = ['#0ea5e9', '#6366f1', '#10b981', '#f59e0b', '#ec4899'];
                return `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-family: var(--font-mono); font-size: 14px; font-weight: 600; min-width: 36px; color: var(--text-primary);">/${c.cidr}</span>
                        <div style="flex: 1; height: 8px; background: var(--border-secondary); border-radius: 4px; overflow: hidden;">
                            <div style="width: ${pct}%; height: 100%; background: ${colors[i % colors.length]}; border-radius: 4px; transition: width 0.5s ease;"></div>
                        </div>
                        <span style="font-size: 12px; color: var(--text-muted); min-width: 32px; text-align: right;">${c.count}×</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

/**
 * Renders the recent activity list.
 */
function renderRecentActivity(items) {
    return `
        <div style="width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table class="data-table">
                <thead><tr><th>Type</th><th>Input</th><th>Result</th><th>Time</th></tr></thead>
                <tbody>
                    ${items.map(item => {
                        const time = new Date(item.timestamp);
                        const timeStr = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return `
                            <tr>
                                <td><span class="badge badge-info">${item.type || 'calc'}</span></td>
                                <td>${item.input || '—'}</td>
                                <td>${item.result || '—'}</td>
                                <td style="color: var(--text-muted); font-family: var(--font-sans); font-size: 12px; white-space: nowrap;">${timeStr}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

export function init() {
    // Dashboard chart rendering using Chart.js could be added here
    // for more sophisticated visualizations
}
