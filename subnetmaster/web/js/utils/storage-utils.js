/**
 * ============================================================
 * SubnetMaster – Storage Utility Functions
 * ============================================================
 * Abstraction layer for LocalStorage operations.
 * Provides typed get/set with JSON serialization, and manages
 * history, favorites, quiz scores, and settings.
 * ============================================================
 */

const STORAGE_KEYS = {
    HISTORY: 'sm_history',
    FAVORITES: 'sm_favorites',
    QUIZ_SCORES: 'sm_quiz_scores',
    SETTINGS: 'sm_settings',
    THEME: 'sm_theme',
    RECENT_CIDRS: 'sm_recent_cidrs'
};

/**
 * Safely retrieves and parses a JSON value from LocalStorage.
 * Returns the default value if the key doesn't exist or parsing fails.
 * @param {string} key - LocalStorage key
 * @param {*} defaultValue - Fallback value
 * @returns {*} Parsed value or default
 */
export function getStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
}

/**
 * Serializes and stores a value in LocalStorage.
 * @param {string} key - LocalStorage key
 * @param {*} value - Value to store (will be JSON-serialized)
 */
export function setStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.warn('LocalStorage write failed:', e);
    }
}

/**
 * Removes a key from LocalStorage.
 * @param {string} key - LocalStorage key to remove
 */
export function removeStorage(key) {
    localStorage.removeItem(key);
}

// ─── History Management ──────────────────────────────────────

/**
 * Retrieves calculation history from storage.
 * @returns {Array} Array of history entries (most recent first)
 */
export function getHistory() {
    return getStorage(STORAGE_KEYS.HISTORY, []);
}

/**
 * Adds a calculation to history. Keeps the most recent 100 entries.
 * @param {Object} entry - History entry object
 * @param {string} entry.type - Type of calculation (e.g., 'subnet', 'vlsm')
 * @param {Object} entry.data - Calculation data
 */
export function addToHistory(entry) {
    const history = getHistory();
    history.unshift({
        ...entry,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString()
    });
    // Cap at 100 entries to prevent unbounded storage growth
    if (history.length > 100) history.length = 100;
    setStorage(STORAGE_KEYS.HISTORY, history);
}

/**
 * Clears all calculation history.
 */
export function clearHistory() {
    setStorage(STORAGE_KEYS.HISTORY, []);
}

/**
 * Deletes a specific history entry by ID.
 * @param {string} id - History entry ID to delete
 */
export function deleteHistoryItem(id) {
    const history = getHistory().filter(h => h.id !== id);
    setStorage(STORAGE_KEYS.HISTORY, history);
}

// ─── Favorites Management ────────────────────────────────────

/**
 * Retrieves saved favorites.
 * @returns {Array} Array of favorite entries
 */
export function getFavorites() {
    return getStorage(STORAGE_KEYS.FAVORITES, []);
}

/**
 * Adds an item to favorites.
 * @param {Object} entry - Favorite entry
 */
export function addToFavorites(entry) {
    const favorites = getFavorites();
    favorites.unshift({
        ...entry,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString()
    });
    if (favorites.length > 50) favorites.length = 50;
    setStorage(STORAGE_KEYS.FAVORITES, favorites);
}

/**
 * Removes a favorite by ID.
 * @param {string} id - Favorite ID
 */
export function removeFavorite(id) {
    const favorites = getFavorites().filter(f => f.id !== id);
    setStorage(STORAGE_KEYS.FAVORITES, favorites);
}

/**
 * Clears all favorites.
 */
export function clearFavorites() {
    setStorage(STORAGE_KEYS.FAVORITES, []);
}

// ─── Quiz Scores ─────────────────────────────────────────────

/**
 * Retrieves quiz score history.
 * @returns {Array} Array of quiz score entries
 */
export function getQuizScores() {
    return getStorage(STORAGE_KEYS.QUIZ_SCORES, []);
}

/**
 * Saves a quiz score.
 * @param {Object} score - Quiz score entry
 */
export function saveQuizScore(score) {
    const scores = getQuizScores();
    scores.unshift({
        ...score,
        id: Date.now().toString(36),
        timestamp: new Date().toISOString()
    });
    if (scores.length > 50) scores.length = 50;
    setStorage(STORAGE_KEYS.QUIZ_SCORES, scores);
}

// ─── Recent CIDRs ────────────────────────────────────────────

/**
 * Tracks recently used CIDR values for the dashboard.
 * @param {number} cidr - CIDR prefix length used
 */
export function trackCidr(cidr) {
    const recent = getStorage(STORAGE_KEYS.RECENT_CIDRS, {});
    recent[cidr] = (recent[cidr] || 0) + 1;
    setStorage(STORAGE_KEYS.RECENT_CIDRS, recent);
}

/**
 * Gets most-used CIDR values, sorted by frequency.
 * @param {number} limit - Number of top CIDRs to return
 * @returns {Array} Sorted array of { cidr, count } objects
 */
export function getTopCidrs(limit = 5) {
    const recent = getStorage(STORAGE_KEYS.RECENT_CIDRS, {});
    return Object.entries(recent)
        .map(([cidr, count]) => ({ cidr: Number(cidr), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

// ─── Theme ───────────────────────────────────────────────────

/**
 * Gets the current theme setting.
 * @returns {string} 'dark' or 'light'
 */
export function getTheme() {
    return getStorage(STORAGE_KEYS.THEME, 'dark');
}

/**
 * Saves the theme setting.
 * @param {string} theme - 'dark' or 'light'
 */
export function setTheme(theme) {
    setStorage(STORAGE_KEYS.THEME, theme);
}

export { STORAGE_KEYS };
