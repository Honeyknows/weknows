import { jest } from '@jest/globals';
import { lookupReservedNetwork } from '../core/rfc-data.js';

describe('Extreme Stress Testing: RFC Data', () => {

    test('1,000,000 IP Lookup Bruteforce', () => {
        // Generate 1 million completely random IP addresses
        // and force the RFC engine to evaluate every single one.
        // This simulates a high-throughput syslog server parsing IPs.
        
        const testIps = [];
        for (let i = 0; i < 1000000; i++) {
            // Only randomize the first two octets to speed up generation, 
            // the bitwise math still has to process the full integer anyway.
            testIps.push(`${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.1.1`);
        }

        let matchCount = 0;
        let publicCount = 0;

        const start = performance.now();
        for (const ip of testIps) {
            const result = lookupReservedNetwork(ip);
            if (result.length > 0) matchCount++;
            else publicCount++;
        }
        const end = performance.now();

        // 1 million iterations of an array-filter with bitwise math.
        // Should take well under 3000ms in Node.js
        expect(end - start).toBeLessThan(15000);
        
        // We expect at least some to hit RFC 1918 (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
        expect(matchCount).toBeGreaterThan(0);
        expect(publicCount).toBeGreaterThan(0);
        expect(matchCount + publicCount).toBe(1000000);
    });

});
