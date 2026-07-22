import fs from 'fs';
import path from 'path';
import os from 'os';

const STORAGE_FILE = path.join(os.homedir(), '.subnetmaster.json');

function initStorage() {
    if (!fs.existsSync(STORAGE_FILE)) {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify({ history: [], favorites: [] }, null, 2));
    }
}

function readStorage() {
    initStorage();
    try {
        const data = fs.readFileSync(STORAGE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { history: [], favorites: [] };
    }
}

function writeStorage(data) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
}

// History
export function getHistory() {
    return readStorage().history;
}

export function addToHistory(item) {
    const data = readStorage();
    item.id = Date.now().toString();
    item.timestamp = new Date().toISOString();
    data.history.unshift(item); // Add to beginning
    if (data.history.length > 50) data.history.pop(); // keep last 50
    writeStorage(data);
}

export function clearHistory() {
    const data = readStorage();
    data.history = [];
    writeStorage(data);
}

// Favorites
export function getFavorites() {
    return readStorage().favorites;
}

export function addToFavorites(item) {
    const data = readStorage();
    item.id = Date.now().toString();
    item.timestamp = new Date().toISOString();
    data.favorites.push(item);
    writeStorage(data);
}

export function removeFavorite(id) {
    const data = readStorage();
    data.favorites = data.favorites.filter(f => f.id !== id);
    writeStorage(data);
}

export function clearFavorites() {
    const data = readStorage();
    data.favorites = [];
    writeStorage(data);
}
