import { jest } from '@jest/globals';
import { CIDR_CHEAT_SHEET, RESERVED_NETWORKS, lookupReservedNetwork, RFC_DATABASE, getRFC } from '../core/rfc-data.js';

describe('1. CIDR Cheat Sheet Structure & Math', () => {
    test('Contains exactly 33 entries (/0 through /32)', () => {
        expect(Array.isArray(CIDR_CHEAT_SHEET)).toBe(true);
        expect(CIDR_CHEAT_SHEET.length).toBe(33);
    });

    test('All prefix metadata is mathematically sound', () => {
        CIDR_CHEAT_SHEET.forEach((entry, index) => {
            // Verify CIDR
            expect(entry.cidr).toBe(`/${index}`);
            
            // Verify Network / Host bits
            expect(entry.networkBits).toBe(index);
            expect(entry.hostBits).toBe(32 - index);

            // Verify Total Addresses
            const expectedAddresses = Math.pow(2, 32 - index);
            expect(entry.totalAddresses).toBe(expectedAddresses);

            // Verify Usable Hosts
            if (index >= 31) {
                expect(entry.usableHosts).toBe(index === 32 ? 1 : 2);
            } else {
                expect(entry.usableHosts).toBe(expectedAddresses - 2);
            }
        });
    });

    test('Wildcard correctly inverts Subnet Mask', () => {
        CIDR_CHEAT_SHEET.forEach(entry => {
            const maskParts = entry.mask.split('.').map(Number);
            const wildcardParts = entry.wildcard.split('.').map(Number);
            
            expect(maskParts.length).toBe(4);
            expect(wildcardParts.length).toBe(4);

            for (let i = 0; i < 4; i++) {
                expect(maskParts[i] + wildcardParts[i]).toBe(255);
            }
        });
    });
});

describe('2. Reserved Networks Database', () => {
    test('Contains valid range strings', () => {
        RESERVED_NETWORKS.forEach(net => {
            const parts = net.range.split('/');
            expect(parts.length).toBe(2);
            const [ip, cidr] = parts;
            // Basic regex validation for IP
            expect(ip).toMatch(/^\d{1,3}(\.\d{1,3}){3}$/);
            
            // Basic regex validation for CIDR
            const cidrNum = parseInt(cidr);
            expect(cidrNum).toBeGreaterThanOrEqual(0);
            expect(cidrNum).toBeLessThanOrEqual(32);
        });
    });

    test('lookupReservedNetwork exact match boundaries', () => {
        // Find RFC 1918 10.0.0.0/8
        const rfc1918 = lookupReservedNetwork('10.0.0.0');
        expect(rfc1918.length).toBeGreaterThan(0);
        expect(rfc1918[0].name).toBe('Private (Class A)');

        // Upper boundary of 10.0.0.0/8
        const rfc1918_upper = lookupReservedNetwork('10.255.255.255');
        expect(rfc1918_upper.length).toBeGreaterThan(0);
        expect(rfc1918_upper[0].name).toBe('Private (Class A)');

        // Out of bounds
        const rfc1918_out = lookupReservedNetwork('11.0.0.0');
        expect(rfc1918_out.some(n => n.name === 'Private (Class A)')).toBe(false);
    });

    test('lookupReservedNetwork multiple matches', () => {
        // Limited Broadcast (255.255.255.255) might also hit Class E logic depending on overlaps.
        // Actually 255.255.255.255 is 240.0.0.0/4 (Class E reserved) AND Broadcast.
        const matches = lookupReservedNetwork('255.255.255.255');
        expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    test('lookupReservedNetwork no matches for public IPs', () => {
        expect(lookupReservedNetwork('8.8.8.8').length).toBe(0);
        expect(lookupReservedNetwork('1.1.1.1').length).toBe(0);
    });
});

describe('3. RFC Database Lookup', () => {
    test('getRFC returns correct objects', () => {
        const rfc1918 = getRFC('RFC 1918');
        expect(rfc1918).not.toBeNull();
        expect(rfc1918.title).toBe('Address Allocation for Private Internets');

        const rfc6890 = getRFC('RFC 6890');
        expect(rfc6890).not.toBeNull();
    });

    test('getRFC returns null for unknown RFCs', () => {
        expect(getRFC('RFC 9999')).toBeNull();
        expect(getRFC('')).toBeNull();
        expect(getRFC(null)).toBeNull();
    });

    test('RFC_DATABASE schema integrity', () => {
        Object.values(RFC_DATABASE).forEach(rfc => {
            expect(typeof rfc.title).toBe('string');
            expect(typeof rfc.year).toBe('number');
            expect(Array.isArray(rfc.ranges)).toBe(true);
            expect(typeof rfc.description).toBe('string');
            expect(typeof rfc.usage).toBe('string');
            expect(Array.isArray(rfc.keyPoints)).toBe(true);
        });
    });
});
