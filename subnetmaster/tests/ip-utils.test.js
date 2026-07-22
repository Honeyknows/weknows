import { jest } from '@jest/globals';
import {
    ipToInt, intToIp, cidrToMask, maskToCidr, maskStringToCidr, wildcardMask,
    calculateSubnet, intToBinary, binaryToIp, getIpClass, getIpType,
    isValidIp, isValidCidr, isValidMask, splitSubnet, vlsmAllocate,
    calculateSupernet, detectOverlaps, planGrowth, parseCidr
} from '../core/ip-utils.js';

/**
 * Helper to generate a random IPv4 string.
 */
function randomIp() {
    return `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
}

describe('1. Normal & Property-Based Cases: Conversion', () => {
    test('10,000 Random IP Conversions (ipToInt <-> intToIp)', () => {
        for (let i = 0; i < 10000; i++) {
            const ip = randomIp();
            const intVal = ipToInt(ip);
            const reverseIp = intToIp(intVal);
            expect(reverseIp).toBe(ip);
        }
    });

    test('All CIDR Masks (0 to 32)', () => {
        for (let i = 0; i <= 32; i++) {
            const maskInt = cidrToMask(i);
            const reverseCidr = maskToCidr(maskInt);
            expect(reverseCidr).toBe(i);
        }
    });

    test('Wildcard Mask Logic for all CIDRs', () => {
        for (let i = 0; i <= 32; i++) {
            const mask = cidrToMask(i);
            const wildcard = wildcardMask(i);
            expect((mask | wildcard) >>> 0).toBe(4294967295); // Must equal 255.255.255.255
            expect((mask & wildcard) >>> 0).toBe(0); // Must not overlap
        }
    });
});

describe('2. Boundary & Edge Cases', () => {
    test('Boundary: Network Endpoints (0.0.0.0 and 255.255.255.255)', () => {
        expect(ipToInt('0.0.0.0')).toBe(0);
        expect(ipToInt('255.255.255.255')).toBe(4294967295);
        expect(intToIp(0)).toBe('0.0.0.0');
        expect(intToIp(4294967295)).toBe('255.255.255.255');
    });

    test('Boundary: Subnet /0', () => {
        const res = calculateSubnet('123.45.67.89', 0);
        expect(res.networkAddress).toBe('0.0.0.0');
        expect(res.broadcastAddress).toBe('255.255.255.255');
        expect(res.usableHosts).toBe(4294967294);
    });

    test('Boundary: Subnet /31 (Point-to-Point)', () => {
        const res = calculateSubnet('192.168.1.0', 31);
        expect(res.firstHost).toBe('192.168.1.0');
        expect(res.lastHost).toBe('192.168.1.1');
        expect(res.usableHosts).toBe(2);
    });

    test('Boundary: Subnet /32 (Host Route)', () => {
        const res = calculateSubnet('10.10.10.10', 32);
        expect(res.firstHost).toBe('10.10.10.10');
        expect(res.lastHost).toBe('10.10.10.10');
        expect(res.usableHosts).toBe(1);
    });

    test('Edge: maskStringToCidr empty/invalid', () => {
        // Though UI intercepts this, ensure no crash
        expect(typeof maskStringToCidr('0.0.0.0')).toBe('number');
    });
});

describe('3. Negative & Malformed Cases', () => {
    test('isValidIp invalid formats', () => {
        const invalidIps = [
            null, undefined, '', ' ', 'text', '192.168.1', '1.2.3.4.5',
            '256.0.0.0', '192.168.-1.1', '192.168.1.NaN', '010.0.0.1'
        ];
        invalidIps.forEach(ip => {
            expect(isValidIp(ip)).toBe(false);
        });
    });

    test('isValidCidr invalid formats', () => {
        const invalidCidrs = [
            -1, 33, 100, NaN, Infinity, -Infinity, null, undefined, '', 'abc', '24.5'
        ];
        invalidCidrs.forEach(cidr => {
            expect(isValidCidr(cidr)).toBe(false);
        });
    });

    test('isValidMask invalid formats', () => {
        const invalidMasks = [
            '255.255.255.1', '255.0.255.0', '255.255.255', '256.255.255.0', null, undefined
        ];
        invalidMasks.forEach(mask => {
            expect(isValidMask(mask)).toBe(false);
        });
    });

    test('parseCidr invalid formats', () => {
        expect(parseCidr('192.168.1.0')).toBeNull(); // Missing slash
        expect(parseCidr('192.168.1.0/')).toBeNull();
        expect(parseCidr('/24')).toBeNull();
        expect(parseCidr('256.0.0.0/24')).toBeNull();
        expect(parseCidr('192.168.1.0/33')).toBeNull();
    });
});

describe('4. IP Classification & Typing', () => {
    test('getIpClass exhaustively', () => {
        expect(getIpClass('0.0.0.0')).toBe('A');
        expect(getIpClass('127.255.255.255')).toBe('A');
        expect(getIpClass('128.0.0.0')).toBe('B');
        expect(getIpClass('191.255.255.255')).toBe('B');
        expect(getIpClass('192.0.0.0')).toBe('C');
        expect(getIpClass('223.255.255.255')).toBe('C');
        expect(getIpClass('224.0.0.0')).toBe('D');
        expect(getIpClass('239.255.255.255')).toBe('D');
        expect(getIpClass('240.0.0.0')).toBe('E');
        expect(getIpClass('255.255.255.255')).toBe('E');
    });

    test('getIpType specific ranges', () => {
        expect(getIpType('10.255.255.255').isPrivate).toBe(true);
        expect(getIpType('172.31.255.255').isPrivate).toBe(true);
        expect(getIpType('192.168.255.255').isPrivate).toBe(true);
        expect(getIpType('8.8.8.8').isPublic).toBe(true);
        expect(getIpType('127.0.0.1').isLoopback).toBe(true);
        expect(getIpType('224.0.0.1').isMulticast).toBe(true);
        expect(getIpType('169.254.1.1').isLinkLocal).toBe(true);
        expect(getIpType('255.255.255.255').isBroadcast).toBe(true);
        expect(getIpType('192.0.2.1').isDocumentation).toBe(true);
        expect(getIpType('198.51.100.1').isDocumentation).toBe(true);
        expect(getIpType('203.0.113.1').isDocumentation).toBe(true);
        expect(getIpType('0.0.0.0').isReserved).toBe(true);
        expect(getIpType('240.0.0.0').isReserved).toBe(true);
    });
});

describe('5. Binary Conversions', () => {
    test('intToBinary exact string mapping', () => {
        expect(intToBinary(ipToInt('192.168.1.1'))).toBe('11000000.10101000.00000001.00000001');
        expect(intToBinary(0)).toBe('00000000.00000000.00000000.00000000');
        expect(intToBinary(4294967295)).toBe('11111111.11111111.11111111.11111111');
    });
});

describe('6. VLSM Stress and Edge Tests', () => {
    test('VLSM: Rejects negative or zero hosts', () => {
        const res = vlsmAllocate('192.168.1.0', 24, [{ name: 'A', hosts: -5 }]);
        expect(res.success).toBe(false);
    });

    test('VLSM: Insufficient Space', () => {
        const res = vlsmAllocate('192.168.1.0', 24, [{ name: 'A', hosts: 300 }]);
        expect(res.success).toBe(false);
    });

    test('VLSM: 1,000 Random Departments Fit Scenario', () => {
        // Pack into a /8 network. Total addresses = 16.7M.
        // We will generate 1000 departments of size 100 to 1000.
        const depts = [];
        for (let i = 0; i < 1000; i++) {
            depts.push({ name: `Dept-${i}`, hosts: Math.floor(Math.random() * 900) + 100 });
        }
        const res = vlsmAllocate('10.0.0.0', 8, depts);
        expect(res.success).toBe(true);
        expect(res.allocations.length).toBe(1000);
    });

    test('VLSM: Perfect Exact Fit (128 + 64 + 32 + 16 + 8 + 4)', () => {
        // Need to account for +2 (Network & Broadcast) for each.
        // 126+2=128. 62+2=64. 30+2=32. 14+2=16. 6+2=8. 2+2=4. Total = 252.
        // Leaves exactly 4 addresses (1 block of 4) unused in a /24.
        const depts = [
            { name: 'A', hosts: 126 },
            { name: 'B', hosts: 62 },
            { name: 'C', hosts: 30 },
            { name: 'D', hosts: 14 },
            { name: 'E', hosts: 6 },
            { name: 'F', hosts: 2 }
        ];
        const res = vlsmAllocate('192.168.1.0', 24, depts);
        expect(res.success).toBe(true);
        expect(res.remaining).toBe(4); 
    });
});

describe('7. Subnet Splitting', () => {
    test('splitSubnet: Exact sizing', () => {
        const split = splitSubnet('10.0.0.0', 8, 256);
        expect(split.length).toBe(256);
        expect(split[0].cidr).toBe(16);
        expect(split[255].networkAddress).toBe('10.255.0.0');
    });

    test('splitSubnet: Out of bounds (>32)', () => {
        const split = splitSubnet('10.0.0.0', 32, 2);
        expect(split).toEqual([]);
    });
});

describe('8. Supernetting', () => {
    test('calculateSupernet: Empty array', () => {
        expect(calculateSupernet([])).toBeNull();
    });

    test('calculateSupernet: Non-adjacent disjoint networks', () => {
        // 10.0.0.0/24 and 10.0.255.0/24 -> Supernet should be 10.0.0.0/16
        const nets = [
            { ip: '10.0.0.0', cidr: 24 },
            { ip: '10.0.255.0', cidr: 24 }
        ];
        const res = calculateSupernet(nets);
        expect(res.supernetAddress).toBe('10.0.0.0');
        expect(res.supernetCidr).toBe(16);
    });

    test('calculateSupernet: Already superset', () => {
        const nets = [
            { ip: '192.168.0.0', cidr: 16 },
            { ip: '192.168.1.0', cidr: 24 }
        ];
        const res = calculateSupernet(nets);
        expect(res.supernetCidr).toBe(16);
    });
});

describe('9. Overlap Detection Stress', () => {
    test('detectOverlaps: Identical, Contained, Partial', () => {
        const nets = [
            { ip: '10.0.0.0', cidr: 8 },      // Huge
            { ip: '10.1.0.0', cidr: 16 },     // Contained by 8
            { ip: '10.1.0.0', cidr: 16 },     // Identical to 16
            { ip: '192.168.1.0', cidr: 24 }   // No overlap
        ];
        const conflicts = detectOverlaps(nets);
        expect(conflicts.some(c => c.type === 'contains')).toBe(true);
        expect(conflicts.some(c => c.type === 'identical')).toBe(true);
    });

    test('detectOverlaps: 100 Disjoint networks', () => {
        const nets = [];
        for (let i = 0; i < 100; i++) {
            nets.push({ ip: `10.${i}.0.0`, cidr: 16 });
        }
        const conflicts = detectOverlaps(nets);
        expect(conflicts.length).toBe(0);
    });
});

describe('10. Growth Planning', () => {
    test('planGrowth: Standard projection', () => {
        const res = planGrowth(100, 10, 3); // 100 hosts, 10% growth, 3 years
        expect(res.projectedHosts).toBe(134);
        expect(res.recommendedCidr).toBe('/24'); // 254 hosts
        expect(res.safeRecommendation).toBe('/23'); // 510 hosts
    });

    test('planGrowth: Maximum boundaries', () => {
        const res = planGrowth(1000000, 100, 5); // Massive growth
        // 1M * 2^5 = 32M hosts
        expect(res.projectedHosts).toBe(32000000);
        // Needs 32M hosts -> 2^25 = 33M. hostBits = 25. cidr = 32 - 25 = 7.
        expect(res.recommendedCidr).toBe('/7');
    });
});
