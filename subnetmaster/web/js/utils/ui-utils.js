/**
 * ============================================================
 * SubnetMaster – UI Utility Functions
 * ============================================================
 * Shared UI components: toast notifications, clipboard helpers,
 * animation triggers, modal management, and dynamic element creation.
 * ============================================================
 */

/**
 * Shows a toast notification at the bottom-right of the screen.
 * Auto-dismisses after 3 seconds with a smooth slide animation.
 * @param {string} message - The notification message
 * @param {string} type - Type of toast: 'success', 'error', 'info', 'warning'
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Trigger animation
    requestAnimationFrame(() => toast.classList.add('toast-show'));
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        toast.classList.remove('toast-show');
        toast.classList.add('toast-hide');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Creates the toast notification container if it doesn't exist.
 * @returns {HTMLElement} The toast container element
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

/**
 * Copies text to clipboard and shows a success toast.
 * Falls back to textarea method for older browsers.
 * @param {string} text - Text to copy
 * @param {string} label - Optional label for the toast message
 */
export function copyToClipboard(text, label = 'Value') {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`${label} copied to clipboard`, 'success');
        }).catch(() => {
            fallbackCopy(text, label);
        });
    } else {
        fallbackCopy(text, label);
    }
}

/**
 * Fallback clipboard copy using textarea selection.
 * @param {string} text - Text to copy
 * @param {string} label - Label for toast
 */
function fallbackCopy(text, label) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast(`${label} copied to clipboard`, 'success');
    } catch {
        showToast('Copy failed', 'error');
    }
    document.body.removeChild(textarea);
}

/**
 * Creates a copy button element with a clipboard icon.
 * @param {string} textToCopy - The text to copy when clicked
 * @param {string} label - Label for the toast notification
 * @returns {HTMLElement} The copy button element
 */
export function createCopyButton(textToCopy, label = 'Value') {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.title = `Copy ${label}`;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(textToCopy, label);
    });
    return btn;
}

/**
 * Creates a result row with a label, value, and copy button.
 * This is the primary building block for displaying calculation results.
 * @param {string} label - Label text
 * @param {string} value - Value text
 * @param {boolean} copyable - Whether to show a copy button
 * @returns {HTMLElement} The result row element
 */
export function createResultRow(label, value, copyable = true) {
    const row = document.createElement('div');
    row.className = 'result-row';
    row.innerHTML = `
        <span class="result-label">${label}</span>
        <span class="result-value">${value}</span>
    `;
    if (copyable) {
        row.appendChild(createCopyButton(value, label));
    }
    return row;
}

/**
 * Creates a card component with optional header and content.
 * @param {string} title - Card title
 * @param {string} [icon] - Optional SVG icon HTML
 * @returns {{ card: HTMLElement, body: HTMLElement }} Card container and body elements
 */
export function createCard(title, icon = '') {
    const card = document.createElement('div');
    card.className = 'card animate-in';
    
    const header = document.createElement('div');
    header.className = 'card-header';
    header.innerHTML = `${icon}<h3>${title}</h3>`;
    
    const body = document.createElement('div');
    body.className = 'card-body';
    
    card.appendChild(header);
    card.appendChild(body);
    
    return { card, body };
}

/**
 * Creates a styled input group with label and input element.
 * @param {string} id - Input element ID
 * @param {string} label - Label text
 * @param {string} placeholder - Placeholder text
 * @param {string} type - Input type
 * @returns {HTMLElement} Input group container
 */
export function createInputGroup(id, label, placeholder, type = 'text') {
    const group = document.createElement('div');
    group.className = 'input-group';
    group.innerHTML = `
        <label for="${id}">${label}</label>
        <input type="${type}" id="${id}" placeholder="${placeholder}" autocomplete="off" spellcheck="false">
    `;
    return group;
}

/**
 * Creates a primary action button.
 * @param {string} text - Button text
 * @param {Function} onClick - Click handler
 * @param {string} id - Button ID
 * @returns {HTMLElement} Button element
 */
export function createButton(text, onClick, id = '') {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary';
    btn.textContent = text;
    if (id) btn.id = id;
    btn.addEventListener('click', onClick);
    return btn;
}

/**
 * Creates a badge/tag element.
 * @param {string} text - Badge text
 * @param {string} variant - Badge variant: 'info', 'success', 'warning', 'danger'
 * @returns {HTMLElement} Badge element
 */
export function createBadge(text, variant = 'info') {
    const badge = document.createElement('span');
    badge.className = `badge badge-${variant}`;
    badge.textContent = text;
    return badge;
}

/**
 * Smoothly scrolls to an element with an offset for the fixed header.
 * @param {HTMLElement} element - Target element
 */
export function scrollToElement(element) {
    const yOffset = -80; // Account for fixed header
    const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
    window.scrollTo({ top: y, behavior: 'smooth' });
}

/**
 * Formats large numbers with commas for readability.
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
    return num.toLocaleString();
}

/**
 * Adds staggered entrance animations to child elements.
 * @param {HTMLElement} parent - Parent container
 * @param {string} selector - Child selector
 */
export function animateChildren(parent, selector = '.animate-in') {
    const children = parent.querySelectorAll(selector);
    children.forEach((child, i) => {
        child.style.animationDelay = `${i * 0.05}s`;
    });
}

/**
 * Creates a section divider with a title.
 * @param {string} text - Section title
 * @returns {HTMLElement} Divider element
 */
export function createDivider(text) {
    const div = document.createElement('div');
    div.className = 'section-divider';
    div.innerHTML = `<span>${text}</span>`;
    return div;
}

/**
 * Creates an empty state placeholder with icon and message.
 * @param {string} message - Empty state message
 * @param {string} icon - SVG icon HTML
 * @returns {HTMLElement} Empty state element
 */
export function createEmptyState(message, icon = '') {
    const div = document.createElement('div');
    div.className = 'empty-state';
    div.innerHTML = `
        ${icon || '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>'}
        <p>${message}</p>
    `;
    return div;
}
