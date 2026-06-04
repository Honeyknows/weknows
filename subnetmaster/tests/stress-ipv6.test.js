import { jest } from '@jest/globals';
import { expandIPv6, ipv6TotalAddresses } from '../core/ipv6-utils.js';

describe('Extreme Stress Testing: IPv6 Utils', () => {

    test('Massive BigInt Math: 100,000 Prefix Calculations', () => {
        // Calculate the total addresses for random prefix lengths 100,000 times.
        // This stresses V8's BigInt allocation memory profile.
        let sum = 0n;
        for (let i = 0; i < 100000; i++) {
            const randomPrefix = Math.floor(Math.random() * 129); // 0 to 128
            sum += ipv6TotalAddresses(randomPrefix);
        }
        
        // Ensure the sum is a valid BigInt greater than 0
        expect(sum > 0n).toBe(true);
    });

    test('Regex & Parser Fuzzing: 10,000 Chaotic IPv6 Formats', () => {
        // Generate strings that are intentionally borderline valid/invalid to stress
        // the split('::') and regex matchers.
        const chaoticStrings = [];
        for (let i = 0; i < 10000; i++) {
            let s = '';
            const type = i % 4;
            if (type === 0) s = `2001:db8::${Math.floor(Math.random()*9999)}:xyz`; // Invalid hex
            else if (type === 1) s = `::${Math.floor(Math.random()*9999)}::`; // Double ::
            else if (type === 2) s = `000:00:0:0000:0:0:0:1`; // Variable padding
            else s = `2001:0DB8:AAAA:BBBB:CCCC:DDDD:EEEE:FFFF`.toLowerCase(); // Valid, mixed case

            chaoticStrings.push(s);
        }

        let validCount = 0;
        let nullCount = 0;

        const start = performance.now();
        for (const str of chaoticStrings) {
            const res = expandIPv6(str);
            if (res === null) nullCount++;
            else validCount++;
        }
        const end = performance.now();

        // 10,000 regex operations should process very quickly
        expect(end - start).toBeLessThan(1500);
        expect(nullCount).toBeGreaterThan(0);
        expect(validCount).toBeGreaterThan(0);
    });

});
