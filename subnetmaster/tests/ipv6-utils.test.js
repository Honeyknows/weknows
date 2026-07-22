import { jest } from '@jest/globals';
import {
    expandIPv6, compressIPv6, isValidIPv6, ipv6ToBinary,
    ipv6NetworkPrefix, ipv6LastAddress, ipv6TotalAddresses,
    getIPv6Type, getIPv6TypeDescription, analyzeIPv6
} from '../core/ipv6-utils.js';

/**
 * Generates a random valid expanded IPv6 address for property testing.
 */
function randomExpandedIPv6() {
    const groups = [];
    for (let i = 0; i < 8; i++) {
        groups.push(Math.floor(Math.random() * 65536).toString(16).padStart(4, '0'));
    }
    return groups.join(':');
}

describe('1. Property-Based Testing: IPv6 Expansion and Compression', () => {
    test('10,000 Random IPv6 Compress/Expand Cycles', () => {
        // Property: expand(compress(ip)) === ip
        for (let i = 0; i < 10000; i++) {
            const original = randomExpandedIPv6();
            const compressed = compressIPv6(original);
            const expanded = expandIPv6(compressed);
            expect(expanded).toBe(original);
        }
    });

    test('All Zeros Compression Property', () => {
        expect(compressIPv6('0000:0000:0000:0000:0000:0000:0000:0000')).toBe('::');
        expect(expandIPv6('::')).toBe('0000:0000:0000:0000:0000:0000:0000:0000');
    });

    test('Boundary: Leading and Trailing ::', () => {
        expect(expandIPv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
        expect(expandIPv6('2001::')).toBe('2001:0000:0000:0000:0000:0000:0000:0000');
    });
});

describe('2. Negative & Edge Cases', () => {
    test('Invalid IPv6 Formats Rejected', () => {
        const invalid = [
            null, undefined, '', ' ', ':::', '2001::db8::1', // Double ::
            '2001:db8:1:2:3:4:5:6:7', // Too many groups
            '2001:db8:xyz::1', // Invalid characters
            '1.2.3.4' // IPv4
        ];
        invalid.forEach(ip => {
            expect(expandIPv6(ip)).toBeNull();
            expect(compressIPv6(ip)).toBeNull();
            expect(isValidIPv6(ip)).toBe(false);
            expect(ipv6ToBinary(ip)).toBeNull();
            expect(analyzeIPv6(ip)).toBeNull();
        });
    });

    test('Single Zero Group is NOT compressed to :: (RFC 5952)', () => {
        const ip = '2001:0db8:0000:0001:0000:0001:0000:0001';
        expect(compressIPv6(ip)).toBe('2001:db8:0:1:0:1:0:1');
    });
});

describe('3. Networking Math & Prefixes', () => {
    test('ipv6NetworkPrefix across boundaries', () => {
        expect(ipv6NetworkPrefix('2001:db8::1', 0)).toBe('0000:0000:0000:0000:0000:0000:0000:0000');
        expect(ipv6NetworkPrefix('2001:db8::1', 64)).toBe('2001:0db8:0000:0000:0000:0000:0000:0000');
        expect(ipv6NetworkPrefix('2001:db8::1', 128)).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
    });

    test('ipv6NetworkPrefix out of bounds', () => {
        expect(ipv6NetworkPrefix('2001:db8::1', -1)).toBeNull();
        expect(ipv6NetworkPrefix('2001:db8::1', 129)).toBeNull();
    });

    test('ipv6LastAddress sets host bits to 1', () => {
        expect(ipv6LastAddress('2001:db8::', 64)).toBe('2001:0db8:0000:0000:ffff:ffff:ffff:ffff');
        expect(ipv6LastAddress('2001:db8::', 128)).toBe('2001:0db8:0000:0000:0000:0000:0000:0000');
    });

    test('ipv6LastAddress out of bounds', () => {
        expect(ipv6LastAddress('2001:db8::1', -1)).toBeNull();
        expect(ipv6LastAddress('2001:db8::1', 129)).toBeNull();
    });
});

describe('4. IPv6 Typology & Classification', () => {
    test('getIPv6Type exhaustively checks scopes', () => {
        expect(getIPv6Type('::1').isLoopback).toBe(true);
        expect(getIPv6Type('::').isUnspecified).toBe(true);
        expect(getIPv6Type('2000::1').isGlobalUnicast).toBe(true);
        expect(getIPv6Type('fe80::1').isLinkLocal).toBe(true);
        expect(getIPv6Type('fec0::1').isSiteLocal).toBe(true);
        expect(getIPv6Type('ff00::1').isMulticast).toBe(true);
        expect(getIPv6Type('fc00::1').isUniqueLocal).toBe(true);
        expect(getIPv6Type('2002::1').is6to4).toBe(true);
        expect(getIPv6Type('2001:0000::1').isTeredo).toBe(true);
        expect(getIPv6Type('2001:db8::1').isDocumentation).toBe(true);
        expect(getIPv6Type('::ffff:c0a8:0101').isV4Mapped).toBe(true); // Assuming the utility processes it to hex
    });

    test('getIPv6TypeDescription returns RFC metadata', () => {
        const metadata = getIPv6TypeDescription('fe80::1');
        expect(metadata.length).toBeGreaterThan(0);
        expect(metadata[0].rfc).toBe('RFC 4291');
    });

    test('getIPv6Type on invalid IP returns empty', () => {
        expect(Object.keys(getIPv6Type('invalid')).length).toBe(0);
    });
});

describe('5. BigInt Total Addresses Math', () => {
    test('ipv6TotalAddresses powers of 2', () => {
        expect(ipv6TotalAddresses(128)).toBe(1n);
        expect(ipv6TotalAddresses(127)).toBe(2n);
        expect(ipv6TotalAddresses(64)).toBe(18446744073709551616n);
        expect(ipv6TotalAddresses(0).toString()).toBe('340282366920938463463374607431768211456');
    });
});

describe('6. Full Analysis Integration', () => {
    test('analyzeIPv6 returns correct composite object', () => {
        const analysis = analyzeIPv6('2001:db8:aaaa::1', 64);
        expect(analysis.compressed).toBe('2001:db8:aaaa::1');
        expect(analysis.networkPrefix).toBe('2001:db8:aaaa::');
        expect(analysis.lastAddress).toBe('2001:db8:aaaa:0:ffff:ffff:ffff:ffff');
        expect(analysis.totalAddresses).toBe('18446744073709551616');
    });
});
