/**
 * ============================================================
 * SubnetMaster – Favorites Module
 * ============================================================
 * Manages bookmarked networks, VLSM plans, and other saved items.
 * ============================================================
 */

import { getFavorites, removeFavorite, clearFavorites } from '../../utils/storage-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <h3>Saved Favorites</h3>
                <button class="btn btn-ghost btn-sm" id="fav-clear" style="margin-left: auto; color: var(--error);">
                    Clear All
                </button>
            </div>
            <div class="card-body">
                <div id="fav-container" class="grid-auto">
                    <!-- Favorite cards injected here -->
                </div>
            </div>
        </div>
    `;
}

export function init() {
    document.getElementById('fav-clear').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all favorites?')) {
            clearFavorites();
            renderFavorites();
        }
    });
    
    renderFavorites();
}

function renderFavorites() {
    const favorites = getFavorites();
    const container = document.getElementById('fav-container');

    if (favorites.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <p>No favorites saved yet. Click the star icon on calculators to save items.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = favorites.map(fav => {
        const time = new Date(fav.timestamp).toLocaleDateString();
        
        let icon = '';
        if (fav.type === 'subnet') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--info)" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="10" y1="4" x2="10" y2="20"/></svg>';
        else if (fav.type === 'vlsm') icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
        else icon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';

        return `
            <div class="card" style="border-color: var(--border-focus);">
                <div class="card-header" style="padding: 12px 16px;">
                    ${icon}
                    <h3 style="font-size: 14px;">${fav.label}</h3>
                    <button class="btn btn-ghost btn-icon delete-fav" data-id="${fav.id}" style="margin-left: auto; color: var(--text-muted); padding: 4px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="card-body" style="padding: 16px;">
                    <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">Saved on ${time}</div>
                    <button class="btn btn-secondary btn-sm load-fav" data-type="${fav.type}" style="width: 100%;">
                        Load Item
                    </button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.delete-fav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            removeFavorite(id);
            renderFavorites();
        });
    });

    document.querySelectorAll('.load-fav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.currentTarget.dataset.type;
            if (type === 'subnet') window.location.hash = 'subnet-calculator';
            else if (type === 'vlsm') window.location.hash = 'vlsm';
        });
    });
}
