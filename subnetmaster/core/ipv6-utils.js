/**
 * ============================================================
 * SubnetMaster – IPv6 Utility Functions
 * ============================================================
 * Core functions for IPv6 address parsing, validation,
 * compression, expansion, and type identification.
 * ============================================================
 */

/**
 * Expands a compressed IPv6 address to its full 8-group form.
 * Handles :: notation and partial groups.
 * Example: "2001:db8::1" → "2001:0db8:0000:0000:0000:0000:0000:0001"
 * @param {string} ip - IPv6 address (possibly compressed)
 * @returns {string|null} Fully expanded IPv6 address, or null if invalid
 */
export function expandIPv6(ip) {
    if (!ip || typeof ip !== 'string') return null;
    ip = ip.trim().toLowerCase();

    // Handle ::
    if (ip === '::') return '0000:0000:0000:0000:0000:0000:0000:0000';

    let groups;
    if (ip.includes('::')) {
        const parts = ip.split('::');
        if (parts.length > 2) return null; // Only one :: allowed
        const left = parts[0] ? parts[0].split(':') : [];
        const right = parts[1] ? parts[1].split(':') : [];
        const missing = 8 - left.length - right.length;
        if (missing < 0) return null;
        groups = [...left, ...Array(missing).fill('0'), ...right];
    } else {
        groups = ip.split(':');
    }

    if (groups.length !== 8) return null;

    // Pad each group to 4 hex digits and validate
    const expanded = groups.map(g => {
        if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
        return g.padStart(4, '0');
    });

    if (expanded.includes(null)) return null;
    return expanded.join(':');
}

/**
 * Compresses a full IPv6 address using :: notation.
 * Finds the longest run of consecutive all-zero groups.
 * Example: "2001:0db8:0000:0000:0000:0000:0000:0001" → "2001:db8::1"
 * @param {string} ip - Full or partial IPv6 address
 * @returns {string|null} Compressed IPv6, or null if invalid
 */
export function compressIPv6(ip) {
    const expanded = expandIPv6(ip);
    if (!expanded) return null;

    const groups = expanded.split(':');

    // Remove leading zeros from each group
    const stripped = groups.map(g => g.replace(/^0+/, '') || '0');

    // Find the longest consecutive run of '0' groups
    let bestStart = -1, bestLen = 0;
    let curStart = -1, curLen = 0;

    for (let i = 0; i < 8; i++) {
        if (stripped[i] === '0') {
            if (curStart === -1) curStart = i;
            curLen++;
            if (curLen > bestLen) {
                bestStart = curStart;
                bestLen = curLen;
            }
        } else {
            curStart = -1;
            curLen = 0;
        }
    }

    // Only use :: if there are at least 2 consecutive zero groups
    if (bestLen < 2) return stripped.join(':');

    const left = stripped.slice(0, bestStart).join(':');
    const right = stripped.slice(bestStart + bestLen).join(':');

    if (!left && !right) return '::';
    if (!left) return '::' + right;
    if (!right) return left + '::';
    return left + '::' + right;
}

/**
 * Validates an IPv6 address string.
 * @param {string} ip - String to validate
 * @returns {boolean} True if valid IPv6 address
 */
export function isValidIPv6(ip) {
    return expandIPv6(ip) !== null;
}

/**
 * Converts an IPv6 address to its binary representation (128 bits).
 * @param {string} ip - IPv6 address
 * @returns {string|null} 128-bit binary string with colons separating groups
 */
export function ipv6ToBinary(ip) {
    const expanded = expandIPv6(ip);
    if (!expanded) return null;
    return expanded.split(':')
        .map(g => parseInt(g, 16).toString(2).padStart(16, '0'))
        .join(':');
}

/**
 * Calculates the network prefix for an IPv6 address with a given prefix length.
 * @param {string} ip - IPv6 address
 * @param {number} prefixLen - Prefix length (0-128)
 * @returns {string|null} Network prefix address
 */
export function ipv6NetworkPrefix(ip, prefixLen) {
    const expanded = expandIPv6(ip);
    if (!expanded || prefixLen < 0 || prefixLen > 128) return null;

    // Convert to full binary string (no separators)
    const binary = expanded.split(':')
        .map(g => parseInt(g, 16).toString(2).padStart(16, '0'))
        .join('');

    // Zero out host bits
    const networkBits = binary.substring(0, prefixLen).padEnd(128, '0');

    // Convert back to hex groups
    const groups = [];
    for (let i = 0; i < 128; i += 16) {
        groups.push(parseInt(networkBits.substring(i, i + 16), 2).toString(16).padStart(4, '0'));
    }

    return groups.join(':');
}

/**
 * Calculates the last address in an IPv6 prefix (analogous to broadcast in IPv4).
 * @param {string} ip - IPv6 address
 * @param {number} prefixLen - Prefix length
 * @returns {string|null} Last address in the prefix
 */
export function ipv6LastAddress(ip, prefixLen) {
    const expanded = expandIPv6(ip);
    if (!expanded || prefixLen < 0 || prefixLen > 128) return null;

    const binary = expanded.split(':')
        .map(g => parseInt(g, 16).toString(2).padStart(16, '0'))
        .join('');

    const lastBits = binary.substring(0, prefixLen).padEnd(128, '1');

    const groups = [];
    for (let i = 0; i < 128; i += 16) {
        groups.push(parseInt(lastBits.substring(i, i + 16), 2).toString(16).padStart(4, '0'));
    }

    return groups.join(':');
}

/**
 * Calculates the total number of addresses in an IPv6 prefix.
 * Returns as a BigInt for prefixes larger than /64.
 * @param {number} prefixLen - Prefix length
 * @returns {BigInt} Total addresses
 */
export function ipv6TotalAddresses(prefixLen) {
    return BigInt(2) ** BigInt(128 - prefixLen);
}

/**
 * Identifies the type of an IPv6 address.
 * @param {string} ip - IPv6 address
 * @returns {Object} Type classification flags
 */
export function getIPv6Type(ip) {
    const expanded = expandIPv6(ip);
    if (!expanded) return {};

    const groups = expanded.split(':');
    const firstGroup = parseInt(groups[0], 16);

    const isAllZeros = groups.every(g => g === '0000');
    const isLoopback = groups.slice(0, 7).every(g => g === '0000') && groups[7] === '0001';

    return {
        isGlobalUnicast: (firstGroup & 0xE000) === 0x2000, // 2000::/3
        isLinkLocal: (firstGroup & 0xFFC0) === 0xFE80,      // fe80::/10
        isSiteLocal: (firstGroup & 0xFFC0) === 0xFEC0,      // fec0::/10 (deprecated)
        isMulticast: (firstGroup & 0xFF00) === 0xFF00,       // ff00::/8
        isUniqueLocal: (firstGroup & 0xFE00) === 0xFC00,     // fc00::/7
        isLoopback: isLoopback,                               // ::1
        isUnspecified: isAllZeros,                             // ::
        is6to4: (firstGroup === 0x2002),                      // 2002::/16
        isTeredo: (firstGroup === 0x2001 && parseInt(groups[1], 16) === 0x0000), // 2001:0000::/32
        isDocumentation: (firstGroup === 0x2001 && parseInt(groups[1], 16) === 0x0DB8), // 2001:db8::/32
        isV4Mapped: groups.slice(0, 5).every(g => g === '0000') && groups[5] === 'ffff', // ::ffff:0:0/96
    };
}

/**
 * Gets a human-readable description of the IPv6 address type.
 * @param {string} ip - IPv6 address
 * @returns {Array<{type: string, description: string, rfc: string}>} Array of matching types
 */
export function getIPv6TypeDescription(ip) {
    const types = getIPv6Type(ip);
    const descriptions = [];

    if (types.isLoopback) descriptions.push({ type: 'Loopback', description: 'Loopback address, equivalent to IPv4 127.0.0.1', rfc: 'RFC 4291' });
    if (types.isUnspecified) descriptions.push({ type: 'Unspecified', description: 'Unspecified address, equivalent to IPv4 0.0.0.0', rfc: 'RFC 4291' });
    if (types.isLinkLocal) descriptions.push({ type: 'Link-Local', description: 'Link-local unicast, used for single-link communication', rfc: 'RFC 4291' });
    if (types.isMulticast) descriptions.push({ type: 'Multicast', description: 'Multicast address', rfc: 'RFC 4291' });
    if (types.isUniqueLocal) descriptions.push({ type: 'Unique Local', description: 'Unique local address (ULA), similar to IPv4 private addresses', rfc: 'RFC 4193' });
    if (types.isGlobalUnicast) descriptions.push({ type: 'Global Unicast', description: 'Globally routable unicast address', rfc: 'RFC 4291' });
    if (types.isSiteLocal) descriptions.push({ type: 'Site-Local (Deprecated)', description: 'Deprecated site-local address', rfc: 'RFC 3879' });
    if (types.is6to4) descriptions.push({ type: '6to4 Tunnel', description: '6to4 transition mechanism address', rfc: 'RFC 3056' });
    if (types.isTeredo) descriptions.push({ type: 'Teredo', description: 'Teredo tunneling address', rfc: 'RFC 4380' });
    if (types.isDocumentation) descriptions.push({ type: 'Documentation', description: 'Reserved for documentation and examples', rfc: 'RFC 3849' });
    if (types.isV4Mapped) descriptions.push({ type: 'IPv4-Mapped', description: 'IPv4-mapped IPv6 address', rfc: 'RFC 4291' });

    return descriptions;
}

/**
 * Performs a full IPv6 analysis for the toolkit module.
 * @param {string} ip - IPv6 address
 * @param {number} prefixLen - Prefix length (default 64)
 * @returns {Object} Complete IPv6 analysis
 */
export function analyzeIPv6(ip, prefixLen = 64) {
    const expanded = expandIPv6(ip);
    if (!expanded) return null;

    const compressed = compressIPv6(ip);
    const binary = ipv6ToBinary(ip);
    const networkPrefix = ipv6NetworkPrefix(ip, prefixLen);
    const lastAddr = ipv6LastAddress(ip, prefixLen);
    const totalAddresses = ipv6TotalAddresses(prefixLen);
    const types = getIPv6TypeDescription(ip);

    return {
        input: ip,
        expanded,
        compressed,
        binary,
        prefixLength: prefixLen,
        networkPrefix: compressIPv6(networkPrefix),
        networkPrefixFull: networkPrefix,
        lastAddress: compressIPv6(lastAddr),
        lastAddressFull: lastAddr,
        totalAddresses: totalAddresses.toString(),
        types,
        notation: `${compressed}/${prefixLen}`
    };
}
