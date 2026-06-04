/**
 * ============================================================
 * SubnetMaster – IP Utility Functions
 * ============================================================
 * Core mathematical functions for IPv4 subnet calculations.
 * All IP addresses are internally represented as 32-bit unsigned integers
 * for efficient bitwise operations.
 * ============================================================
 */

/**
 * Converts a dotted-decimal IP string (e.g., "192.168.1.0") to a 32-bit unsigned integer.
 * Uses unsigned right shift (>>> 0) to ensure the result is always positive.
 * @param {string} ip - The IP address in dotted-decimal notation
 * @returns {number} The IP as a 32-bit unsigned integer
 */
export function ipToInt(ip) {
    const parts = ip.split('.').map(Number);
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Converts a 32-bit unsigned integer back to dotted-decimal notation.
 * @param {number} int32 - The IP as a 32-bit unsigned integer
 * @returns {string} The IP in dotted-decimal notation
 */
export function intToIp(int32) {
    return [
        (int32 >>> 24) & 255,
        (int32 >>> 16) & 255,
        (int32 >>> 8) & 255,
        int32 & 255
    ].join('.');
}

/**
 * Converts a CIDR prefix length (0-32) to a subnet mask as a 32-bit integer.
 * For example: /24 → 0xFFFFFF00 → 255.255.255.0
 * @param {number} cidr - CIDR prefix length (0-32)
 * @returns {number} Subnet mask as 32-bit unsigned integer
 */
export function cidrToMask(cidr) {
    if (cidr === 0) return 0;
    return (0xFFFFFFFF << (32 - cidr)) >>> 0;
}

/**
 * Converts a subnet mask (as integer) to its CIDR prefix length.
 * Counts the number of consecutive 1-bits from the left.
 * @param {number} mask - Subnet mask as 32-bit unsigned integer
 * @returns {number} CIDR prefix length (0-32)
 */
export function maskToCidr(mask) {
    let cidr = 0;
    let m = mask >>> 0;
    while (m & 0x80000000) {
        cidr++;
        m = (m << 1) >>> 0;
    }
    return cidr;
}

/**
 * Converts a dotted-decimal subnet mask to its CIDR prefix.
 * @param {string} maskStr - Subnet mask in dotted-decimal
 * @returns {number} CIDR prefix length
 */
export function maskStringToCidr(maskStr) {
    return maskToCidr(ipToInt(maskStr));
}

/**
 * Calculates the wildcard mask (inverse of subnet mask).
 * Wildcard = NOT(subnet mask). Used in ACLs and OSPF configurations.
 * @param {number} cidr - CIDR prefix length
 * @returns {number} Wildcard mask as 32-bit unsigned integer
 */
export function wildcardMask(cidr) {
    return (~cidrToMask(cidr)) >>> 0;
}

/**
 * Performs a comprehensive subnet calculation given an IP and CIDR prefix.
 * This is the core function used by the Subnet Calculator module.
 * 
 * @param {string} ip - IPv4 address in dotted-decimal
 * @param {number} cidr - CIDR prefix length (0-32)
 * @returns {Object} Complete subnet information
 */
export function calculateSubnet(ip, cidr) {
    const ipInt = ipToInt(ip);
    const mask = cidrToMask(cidr);
    const wildcard = wildcardMask(cidr);
    
    // Network address = IP AND mask (zeroes out host bits)
    const network = (ipInt & mask) >>> 0;
    
    // Broadcast address = network OR wildcard (sets all host bits to 1)
    const broadcast = (network | wildcard) >>> 0;
    
    // Total addresses in this subnet = 2^(32 - cidr)
    const totalAddresses = Math.pow(2, 32 - cidr);
    
    // Usable hosts = total - 2 (subtract network and broadcast addresses)
    // Special case: /31 has 2 usable (point-to-point), /32 has 1 usable (host route)
    const usableHosts = cidr >= 31 ? (cidr === 32 ? 1 : 2) : totalAddresses - 2;
    
    // First usable host = network + 1 (the address right after the network address)
    const firstHost = cidr >= 31 ? network : (network + 1) >>> 0;
    
    // Last usable host = broadcast - 1 (the address right before the broadcast)
    const lastHost = cidr >= 31 ? broadcast : (broadcast - 1) >>> 0;

    return {
        ip: ip,
        cidr: cidr,
        networkAddress: intToIp(network),
        broadcastAddress: intToIp(broadcast),
        firstHost: intToIp(firstHost),
        lastHost: intToIp(lastHost),
        subnetMask: intToIp(mask),
        wildcardMask: intToIp(wildcard),
        totalAddresses: totalAddresses,
        usableHosts: usableHosts,
        networkInt: network,
        broadcastInt: broadcast,
        binaryIp: intToBinary(ipInt),
        binaryMask: intToBinary(mask),
        binaryNetwork: intToBinary(network),
        binaryBroadcast: intToBinary(broadcast),
        ipClass: getIpClass(ip),
        ipType: getIpType(ip)
    };
}

/**
 * Converts a 32-bit integer to its binary string representation.
 * Pads to 32 bits with leading zeros and groups into octets.
 * @param {number} int32 - 32-bit unsigned integer
 * @returns {string} 32-bit binary string with dots separating octets
 */
export function intToBinary(int32) {
    return [
        ((int32 >>> 24) & 255).toString(2).padStart(8, '0'),
        ((int32 >>> 16) & 255).toString(2).padStart(8, '0'),
        ((int32 >>> 8) & 255).toString(2).padStart(8, '0'),
        (int32 & 255).toString(2).padStart(8, '0')
    ].join('.');
}

/**
 * Converts a binary string (with dots) back to dotted-decimal.
 * @param {string} binary - Binary string with dots separating octets
 * @returns {string} Dotted-decimal IP address
 */
export function binaryToIp(binary) {
    return binary.split('.').map(b => parseInt(b, 2)).join('.');
}

/**
 * Determines the traditional classful address class (A-E) for an IP.
 * Based on the first octet:
 *   A: 0-127, B: 128-191, C: 192-223, D: 224-239, E: 240-255
 * @param {string} ip - IPv4 address in dotted-decimal
 * @returns {string} Class letter (A, B, C, D, or E)
 */
export function getIpClass(ip) {
    const firstOctet = parseInt(ip.split('.')[0]);
    if (firstOctet < 128) return 'A';
    if (firstOctet < 192) return 'B';
    if (firstOctet < 224) return 'C';
    if (firstOctet < 240) return 'D';
    return 'E';
}

/**
 * Analyzes the IP address type (private, public, loopback, etc.).
 * Returns an object with boolean flags for each type.
 * @param {string} ip - IPv4 address in dotted-decimal
 * @returns {Object} IP type classification
 */
export function getIpType(ip) {
    const parts = ip.split('.').map(Number);
    const [a, b, c, d] = parts;

    return {
        isPrivate: (a === 10) ||
                   (a === 172 && b >= 16 && b <= 31) ||
                   (a === 192 && b === 168),
        isPublic: !(
            (a === 10) ||
            (a === 172 && b >= 16 && b <= 31) ||
            (a === 192 && b === 168) ||
            (a === 127) ||
            (a >= 224) ||
            (a === 169 && b === 254) ||
            (a === 0)
        ),
        isLoopback: a === 127,
        isMulticast: a >= 224 && a <= 239,
        isLinkLocal: a === 169 && b === 254,
        isReserved: (a === 0) || (a >= 240),
        isAPIPA: a === 169 && b === 254,
        isBroadcast: a === 255 && b === 255 && c === 255 && d === 255,
        isDocumentation: (a === 192 && b === 0 && c === 2) ||
                         (a === 198 && b === 51 && c === 100) ||
                         (a === 203 && b === 0 && c === 113)
    };
}

/**
 * Validates if a string is a valid IPv4 address.
 * Checks format, octet count, and octet range (0-255).
 * @param {string} ip - String to validate
 * @returns {boolean} True if valid IPv4 address
 */
export function isValidIp(ip) {
    if (!ip || typeof ip !== 'string') return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
        const num = Number(part);
        return !isNaN(num) && num >= 0 && num <= 255 && part === String(num);
    });
}

export function isValidCidr(cidr) {
    if (cidr === null || cidr === undefined || typeof cidr === 'boolean') return false;
    if (typeof cidr === 'string' && cidr.trim() === '') return false;
    const num = Number(cidr);
    return !isNaN(num) && Number.isInteger(num) && num >= 0 && num <= 32;
}

/**
 * Validates a subnet mask in dotted-decimal notation.
 * A valid mask must have contiguous 1-bits followed by contiguous 0-bits.
 * @param {string} mask - Subnet mask in dotted-decimal
 * @returns {boolean} True if valid subnet mask
 */
export function isValidMask(mask) {
    if (!isValidIp(mask)) return false;
    const maskInt = ipToInt(mask);
    // A valid mask in binary is all 1s followed by all 0s
    // Inverting it should give all 0s followed by all 1s
    // Adding 1 to the inverted mask should be a power of 2
    const inverted = (~maskInt) >>> 0;
    return (inverted & (inverted + 1)) === 0;
}

/**
 * Splits a network into equal-sized subnets.
 * @param {string} network - Network address in dotted-decimal
 * @param {number} cidr - Original CIDR prefix length
 * @param {number} numSubnets - Number of subnets to create (must be power of 2)
 * @returns {Array} Array of subnet objects
 */
export function splitSubnet(network, cidr, numSubnets) {
    // Calculate how many additional bits we need to borrow
    const bitsNeeded = Math.ceil(Math.log2(numSubnets));
    const newCidr = cidr + bitsNeeded;
    
    if (newCidr > 32) return [];
    
    const actualSubnets = Math.pow(2, bitsNeeded);
    const subnets = [];
    const networkInt = (ipToInt(network) & cidrToMask(cidr)) >>> 0; // Ensure network alignment
    const subnetSize = Math.pow(2, 32 - newCidr);
    
    for (let i = 0; i < actualSubnets; i++) {
        const subnetNetwork = (networkInt + (i * subnetSize)) >>> 0;
        subnets.push(calculateSubnet(intToIp(subnetNetwork), newCidr));
    }
    
    return subnets;
}

/**
 * Performs VLSM (Variable Length Subnet Masking) allocation.
 * Allocates subnets from largest to smallest requirement to optimize space usage.
 * 
 * @param {string} network - Network address in dotted-decimal
 * @param {number} cidr - Original CIDR prefix length
 * @param {Array<{name: string, hosts: number}>} departments - Array of department requirements
 * @returns {Object} VLSM allocation result
 */
export function vlsmAllocate(network, cidr, departments) {
    if (departments.some(d => d.hosts < 1)) {
        return { success: false, error: 'Host requirements must be at least 1' };
    }
    
    // Sort departments by host requirement (largest first) for optimal allocation
    const sorted = [...departments].sort((a, b) => b.hosts - a.hosts);
    
    const networkInt = (ipToInt(network) & cidrToMask(cidr)) >>> 0;
    const totalAddresses = Math.pow(2, 32 - cidr);
    let currentAddress = networkInt;
    const allocations = [];
    let totalUsed = 0;
    
    for (const dept of sorted) {
        // Calculate minimum CIDR that can accommodate the required hosts
        // We need hosts + 2 addresses (network + broadcast)
        const neededAddresses = dept.hosts + 2;
        const hostBits = Math.ceil(Math.log2(neededAddresses));
        const subnetCidr = 32 - hostBits;
        const subnetSize = Math.pow(2, hostBits);
        
        // Align current address to subnet boundary
        const alignment = subnetSize;
        if (currentAddress % alignment !== 0) {
            currentAddress = (Math.ceil(currentAddress / alignment) * alignment) >>> 0;
        }
        
        // Check if we exceed the original network
        if ((currentAddress + subnetSize) > (networkInt + totalAddresses)) {
            return {
                success: false,
                error: `Not enough address space for ${dept.name} (needs ${dept.hosts} hosts)`,
                allocations,
                totalUsed,
                totalAvailable: totalAddresses,
                remaining: totalAddresses - totalUsed
            };
        }
        
        const subnet = calculateSubnet(intToIp(currentAddress), subnetCidr);
        allocations.push({
            name: dept.name,
            requestedHosts: dept.hosts,
            ...subnet
        });
        
        totalUsed += subnetSize;
        currentAddress = (currentAddress + subnetSize) >>> 0;
    }
    
    return {
        success: true,
        allocations,
        totalUsed,
        totalAvailable: totalAddresses,
        remaining: totalAddresses - totalUsed,
        utilizationPercent: ((totalUsed / totalAddresses) * 100).toFixed(1)
    };
}

/**
 * Performs supernetting (route aggregation) on an array of networks.
 * Finds the smallest CIDR block that contains all the given networks.
 * 
 * @param {Array<{ip: string, cidr: number}>} networks - Array of networks
 * @returns {Object} Supernet result
 */
export function calculateSupernet(networks) {
    if (networks.length === 0) return null;
    
    // Find the range that covers all networks
    let minIp = 0xFFFFFFFF;
    let maxIp = 0;
    
    for (const net of networks) {
        const netInt = (ipToInt(net.ip) & cidrToMask(net.cidr)) >>> 0;
        const broadcastInt = (netInt | wildcardMask(net.cidr)) >>> 0;
        if (netInt < minIp) minIp = netInt;
        if (broadcastInt > maxIp) maxIp = broadcastInt;
    }
    
    // Find the smallest CIDR that encompasses the entire range
    const range = (maxIp - minIp + 1) >>> 0;
    let superCidr = 32 - Math.ceil(Math.log2(range));
    
    // Ensure the supernet network address aligns properly
    let superNetwork = (minIp & cidrToMask(superCidr)) >>> 0;
    
    // Expand if necessary to cover all networks
    while (superCidr > 0) {
        const superBroadcast = (superNetwork | wildcardMask(superCidr)) >>> 0;
        if (superNetwork <= minIp && superBroadcast >= maxIp) break;
        superCidr--;
        superNetwork = (minIp & cidrToMask(superCidr)) >>> 0;
    }
    
    return {
        supernetAddress: intToIp(superNetwork),
        supernetCidr: superCidr,
        supernetMask: intToIp(cidrToMask(superCidr)),
        totalAddresses: Math.pow(2, 32 - superCidr),
        originalNetworks: networks,
        notation: `${intToIp(superNetwork)}/${superCidr}`
    };
}

/**
 * Detects overlapping subnets from a list of networks.
 * Two subnets overlap if any address belongs to both subnets.
 * 
 * @param {Array<{ip: string, cidr: number}>} subnets - Array of subnets to check
 * @returns {Array} Array of overlap conflict objects
 */
export function detectOverlaps(subnets) {
    const conflicts = [];
    
    for (let i = 0; i < subnets.length; i++) {
        const netA = (ipToInt(subnets[i].ip) & cidrToMask(subnets[i].cidr)) >>> 0;
        const broadA = (netA | wildcardMask(subnets[i].cidr)) >>> 0;
        
        for (let j = i + 1; j < subnets.length; j++) {
            const netB = (ipToInt(subnets[j].ip) & cidrToMask(subnets[j].cidr)) >>> 0;
            const broadB = (netB | wildcardMask(subnets[j].cidr)) >>> 0;
            
            // Two ranges overlap if one starts before the other ends
            if (netA <= broadB && netB <= broadA) {
                conflicts.push({
                    subnetA: `${intToIp(netA)}/${subnets[i].cidr}`,
                    subnetB: `${intToIp(netB)}/${subnets[j].cidr}`,
                    indexA: i,
                    indexB: j,
                    type: netA === netB && broadA === broadB ? 'identical' :
                          (netA <= netB && broadA >= broadB) ? 'contains' :
                          (netB <= netA && broadB >= broadA) ? 'contained_by' : 'partial_overlap'
                });
            }
        }
    }
    
    return conflicts;
}

/**
 * Recommends an appropriate CIDR for future growth.
 * @param {number} currentHosts - Current number of hosts
 * @param {number} growthPercent - Expected growth percentage
 * @param {number} years - Number of years for planning (default 3)
 * @returns {Object} Growth recommendation
 */
export function planGrowth(currentHosts, growthPercent, years = 3) {
    const futureHosts = Math.ceil(currentHosts * Math.pow(1 + growthPercent / 100, years));
    const neededAddresses = futureHosts + 2; // Network + broadcast
    const hostBits = Math.ceil(Math.log2(neededAddresses));
    const recommendedCidr = 32 - hostBits;
    const capacity = Math.pow(2, hostBits) - 2;
    
    // Also recommend one size larger for safety margin
    const safeCidr = Math.max(0, recommendedCidr - 1);
    const safeCapacity = Math.pow(2, 32 - safeCidr) - 2;
    
    return {
        currentHosts,
        growthPercent,
        years,
        projectedHosts: futureHosts,
        recommendedCidr: `/${recommendedCidr}`,
        recommendedCapacity: capacity,
        safeRecommendation: `/${safeCidr}`,
        safeCapacity: safeCapacity,
        yearlyProjections: Array.from({ length: years }, (_, i) => ({
            year: i + 1,
            hosts: Math.ceil(currentHosts * Math.pow(1 + growthPercent / 100, i + 1))
        }))
    };
}

/**
 * Parses CIDR notation (e.g., "192.168.1.0/24") into IP and prefix.
 * @param {string} cidrNotation - CIDR notation string
 * @returns {Object|null} Parsed object with ip and cidr properties, or null if invalid
 */
export function parseCidr(cidrNotation) {
    const match = cidrNotation.trim().match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
    if (!match) return null;
    const ip = match[1];
    const cidr = parseInt(match[2]);
    if (!isValidIp(ip) || !isValidCidr(cidr)) return null;
    return { ip, cidr };
}
