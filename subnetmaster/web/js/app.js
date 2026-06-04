/**
 * ============================================================
 * SubnetMaster – Application Bootstrap & Router
 * ============================================================
 * Initializes the SPA, manages hash-based routing, handles
 * theme switching, keyboard shortcuts, and module loading.
 * ============================================================
 */

import { getTheme, setTheme } from './utils/storage-utils.js';

// ─── Module Registry ──────────────────────────────────────────
// Lazy-load modules on first navigation. Each entry maps a route
// to its module file path and display title.
const MODULE_REGISTRY = {
    'dashboard':         { path: './modules/dashboard.js',                    title: 'Dashboard',              icon: 'grid' },
    'subnet-calculator': { path: './modules/core/subnet-calculator.js',       title: 'IPv4 Subnet Calculator', icon: 'calculator' },
    'ip-analysis':       { path: './modules/core/ip-analysis.js',             title: 'IP Analysis',            icon: 'info' },
    'binary-viz':        { path: './modules/core/binary-viz.js',              title: 'Binary Visualizer',      icon: 'activity' },
    'cidr-toolkit':      { path: './modules/core/cidr-toolkit.js',            title: 'CIDR Toolkit',           icon: 'tool' },
    'ipv6-toolkit':      { path: './modules/ipv6/ipv6-toolkit.js',            title: 'IPv6 Toolkit',           icon: 'hexagon' },
    'subnet-splitting':  { path: './modules/planning/subnet-splitting.js',    title: 'Subnet Splitting',       icon: 'split' },
    'vlsm':              { path: './modules/planning/vlsm.js',                title: 'VLSM Planner',           icon: 'upload' },
    'growth-planner':    { path: './modules/planning/growth-planner.js',      title: 'Network Growth Planner', icon: 'trending-up' },
    'supernetting':      { path: './modules/routing/supernetting.js',         title: 'Supernetting',           icon: 'layers' },
    'route-summary':     { path: './modules/routing/route-summary.js',        title: 'Route Summarization',    icon: 'git-merge' },
    'overlap-detector':  { path: './modules/routing/overlap-detector.js',     title: 'Overlap Detector',       icon: 'alert-triangle' },
    'subnet-tree':       { path: './modules/visualization/subnet-tree.js',    title: 'Visual Subnet Tree',     icon: 'tree' },
    'educational':       { path: './modules/learning/educational.js',         title: 'Educational Mode',       icon: 'book-open' },
    'quiz':              { path: './modules/learning/quiz.js',                title: 'Subnetting Quiz',        icon: 'help-circle' },
    'practice-lab':      { path: './modules/learning/practice-lab.js',        title: 'Practice Lab',           icon: 'layout' },
    'history':           { path: './modules/data/history.js',                 title: 'History',                icon: 'clock' },
    'favorites':         { path: './modules/data/favorites.js',              title: 'Favorites',              icon: 'star' },
    'export-center':     { path: './modules/data/export-center.js',          title: 'Export Center',          icon: 'download' },
};

// Cache loaded modules so we don't re-import them
const moduleCache = {};

// Current active module
let currentModule = null;

// ─── Theme Management ─────────────────────────────────────────

/**
 * Initializes the theme from stored preference.
 * Updates the HTML data-theme attribute and icon visibility.
 */
function initTheme() {
    const theme = getTheme();
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcons(theme);
}

/**
 * Toggles between dark and light themes.
 */
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setTheme(next);
    updateThemeIcons(next);
}

/**
 * Updates theme toggle button icons based on current theme.
 * @param {string} theme - 'dark' or 'light'
 */
function updateThemeIcons(theme) {
    const darkIcon = document.getElementById('theme-icon-dark');
    const lightIcon = document.getElementById('theme-icon-light');
    if (darkIcon && lightIcon) {
        darkIcon.style.display = theme === 'dark' ? 'block' : 'none';
        lightIcon.style.display = theme === 'light' ? 'block' : 'none';
    }
}

// ─── Router ───────────────────────────────────────────────────

/**
 * Navigates to a module by its route key.
 * Updates the URL hash, sidebar active state, and renders the module.
 * @param {string} moduleName - Module route key from MODULE_REGISTRY
 */
async function navigateTo(moduleName) {
    if (!MODULE_REGISTRY[moduleName]) moduleName = 'dashboard';
    
    // Update URL hash without triggering hashchange (we handle it manually)
    window.location.hash = moduleName;
    
    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.module === moduleName);
    });
    
    // Update page title
    const registry = MODULE_REGISTRY[moduleName];
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
        titleEl.querySelector('span').textContent = registry.title;
    }
    
    // Update document title
    document.title = `${registry.title} – SubnetMaster`;
    
    // Load and render module
    const container = document.getElementById('page-content');
    container.innerHTML = '<div class="empty-state"><div class="pulse" style="color: var(--accent-primary);">Loading...</div></div>';
    
    try {
        // Lazy-load module if not cached
        if (!moduleCache[moduleName]) {
            moduleCache[moduleName] = await import(registry.path);
        }
        
        const mod = moduleCache[moduleName];
        currentModule = moduleName;
        
        // Clear and render
        container.innerHTML = '';
        if (mod.render) {
            mod.render(container);
        }
        if (mod.init) {
            mod.init();
        }
        
        // Scroll to top
        window.scrollTo(0, 0);
        
    } catch (err) {
        console.error(`Failed to load module: ${moduleName}`, err);
        container.innerHTML = `
            <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                <p style="margin-top: 12px; color: var(--error);">Failed to load module</p>
                <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${err.message}</p>
                <button class="btn btn-primary btn-sm" style="margin-top: 16px;" onclick="location.hash='dashboard'">
                    Back to Dashboard
                </button>
            </div>
        `;
    }
    
    // Close mobile sidebar
    closeMobileSidebar();
}

// ─── Sidebar Navigation ──────────────────────────────────────

/**
 * Sets up sidebar navigation click handlers.
 */
function initSidebar() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const moduleName = item.dataset.module;
            if (moduleName) navigateTo(moduleName);
        });
    });
}

/**
 * Initializes mobile sidebar toggle behavior.
 */
function initMobileSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');
    
    toggle?.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    });
    
    overlay?.addEventListener('click', closeMobileSidebar);
}

/**
 * Closes the mobile sidebar.
 */
function closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('show');
}

// ─── Search ───────────────────────────────────────────────────

/**
 * Initializes the sidebar search filtering.
 */
function initSearch() {
    const searchInput = document.getElementById('nav-search');
    searchInput?.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        document.querySelectorAll('.nav-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            const match = !query || text.includes(query);
            item.style.display = match ? '' : 'none';
        });
        
        // Show/hide group titles based on whether they have visible items
        document.querySelectorAll('.nav-group').forEach(group => {
            const visibleItems = group.querySelectorAll('.nav-item:not([style*="display: none"])');
            const title = group.querySelector('.nav-group-title');
            if (title) {
                title.style.display = visibleItems.length > 0 ? '' : 'none';
            }
        });
    });
}

// ─── Keyboard Shortcuts ──────────────────────────────────────

/**
 * Registers global keyboard shortcuts.
 */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+K — Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.getElementById('nav-search')?.focus();
        }
        
        // Ctrl+D — Toggle theme
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            toggleTheme();
        }
        
        // Escape — Close modals, blur search
        if (e.key === 'Escape') {
            document.getElementById('nav-search')?.blur();
            document.querySelector('.modal-overlay')?.remove();
            closeMobileSidebar();
        }
        
        // Ctrl+1-9 — Quick module navigation
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const moduleKeys = Object.keys(MODULE_REGISTRY);
            const idx = parseInt(e.key) - 1;
            if (idx < moduleKeys.length) {
                navigateTo(moduleKeys[idx]);
            }
        }
    });
    
    // Shortcuts modal
    document.getElementById('shortcuts-btn')?.addEventListener('click', showShortcutsModal);
}

/**
 * Shows the keyboard shortcuts reference modal.
 */
function showShortcutsModal() {
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.remove();
    });
    
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h2>Keyboard Shortcuts</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="result-row"><span class="result-label"><span class="kbd">Ctrl</span> + <span class="kbd">K</span></span><span class="result-value" style="font-family: var(--font-sans);">Search modules</span></div>
                <div class="result-row"><span class="result-label"><span class="kbd">Ctrl</span> + <span class="kbd">D</span></span><span class="result-value" style="font-family: var(--font-sans);">Toggle dark/light theme</span></div>
                <div class="result-row"><span class="result-label"><span class="kbd">Ctrl</span> + <span class="kbd">1-9</span></span><span class="result-value" style="font-family: var(--font-sans);">Quick navigate to module</span></div>
                <div class="result-row"><span class="result-label"><span class="kbd">Esc</span></span><span class="result-value" style="font-family: var(--font-sans);">Close modals / blur search</span></div>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

// ─── Hash Change Handler ─────────────────────────────────────

window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'dashboard';
    navigateTo(hash);
});

// ─── Theme Toggle Button ─────────────────────────────────────

document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

// ─── Application Init ────────────────────────────────────────

function init() {
    initTheme();
    initSidebar();
    initMobileSidebar();
    initSearch();
    initKeyboardShortcuts();
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js').then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, (err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }

    // Navigate to initial route
    const initialRoute = window.location.hash.slice(1) || 'dashboard';
    navigateTo(initialRoute);
}

// Start the application
init();
