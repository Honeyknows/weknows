/**
 * ============================================================
 * SubnetMaster – RFC & Reserved Network Reference Data
 * ============================================================
 * Comprehensive reference data for RFC standards and reserved
 * network ranges. Used by IP Analysis and Educational modules.
 * ============================================================
 */

/**
 * RFC reference database with descriptions and use cases.
 * Each RFC entry includes the relevant address range and summary.
 */
export const RFC_DATABASE = {
    'RFC 1918': {
        title: 'Address Allocation for Private Internets',
        year: 1996,
        ranges: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
        description: 'Defines three blocks of IPv4 address space reserved for private internets. These addresses are not routable on the public Internet and can be freely used within organizations.',
        usage: 'Internal LANs, home networks, enterprise networks, VPN tunnels',
        keyPoints: [
            '10.0.0.0/8 — 16,777,216 addresses (Class A)',
            '172.16.0.0/12 — 1,048,576 addresses (Class B range)',
            '192.168.0.0/16 — 65,536 addresses (Class C range)',
            'Routers should NOT forward packets with these addresses to the Internet',
            'NAT (Network Address Translation) is typically used to map private to public'
        ]
    },
    'RFC 1122': {
        title: 'Requirements for Internet Hosts',
        year: 1989,
        ranges: ['0.0.0.0/8'],
        description: 'Specifies requirements for host software. Defines 0.0.0.0/8 as "This host on this network" addresses.',
        usage: 'DHCP discovery, default routes, server binding',
        keyPoints: [
            '0.0.0.0 — Used when a host does not know its own address',
            'Used in DHCP DISCOVER messages',
            'Servers bind to 0.0.0.0 to listen on all interfaces'
        ]
    },
    'RFC 1700': {
        title: 'Assigned Numbers',
        year: 1994,
        ranges: ['127.0.0.0/8'],
        description: 'Assigns the entire 127.0.0.0/8 block for loopback. Only 127.0.0.1 is commonly used, but the entire /8 is reserved.',
        usage: 'Testing, diagnostics, inter-process communication on localhost',
        keyPoints: [
            '127.0.0.1 — Standard loopback address (localhost)',
            'Entire 127.0.0.0/8 is reserved (16M+ addresses)',
            'Traffic never leaves the host',
            'Used for testing network applications locally'
        ]
    },
    'RFC 3171': {
        title: 'IANA Guidelines for IPv4 Multicast Address Assignments',
        year: 2001,
        ranges: ['224.0.0.0/4'],
        description: 'Defines the IPv4 multicast address range (224.0.0.0 – 239.255.255.255, Class D).',
        usage: 'OSPF, EIGRP, RIP, streaming, mDNS, IGMP',
        keyPoints: [
            '224.0.0.0/24 — Local network control (OSPF: 224.0.0.5/6, RIP: 224.0.0.9)',
            '224.0.1.0/24 — Internetwork control',
            '239.0.0.0/8 — Administratively scoped (private multicast)',
            'Multicast uses IGMP for group management'
        ]
    },
    'RFC 3927': {
        title: 'Dynamic Configuration of IPv4 Link-Local Addresses',
        year: 2005,
        ranges: ['169.254.0.0/16'],
        description: 'Defines Automatic Private IP Addressing (APIPA). When DHCP is unavailable, hosts auto-assign addresses from this range.',
        usage: 'Fallback addressing, zero-configuration networking, printer discovery',
        keyPoints: [
            'Automatically assigned when DHCP fails',
            '169.254.1.0 – 169.254.254.255 usable range',
            '169.254.0.0/24 and 169.254.255.0/24 are reserved',
            'Non-routable — only valid on the local link',
            'Also known as APIPA (Automatic Private IP Addressing)'
        ]
    },
    'RFC 6598': {
        title: 'IANA-Reserved IPv4 Prefix for Shared Address Space',
        year: 2012,
        ranges: ['100.64.0.0/10'],
        description: 'Defines Carrier-Grade NAT (CGNAT) shared address space. Used by ISPs for NAT between their network and customer premises.',
        usage: 'ISP CGNAT, dual-stack lite, MAP-E, 464XLAT',
        keyPoints: [
            '100.64.0.0 – 100.127.255.255 (4,194,304 addresses)',
            'Used between ISP and customer CPE',
            'Should NOT be used on the public Internet',
            'Similar to RFC 1918 but for ISP infrastructure',
            'Helps extend IPv4 lifetime during IPv6 transition'
        ]
    },
    'RFC 5737': {
        title: 'IPv4 Address Blocks Reserved for Documentation',
        year: 2010,
        ranges: ['192.0.2.0/24', '198.51.100.0/24', '203.0.113.0/24'],
        description: 'Three address blocks reserved for use in documentation and examples. Equivalent to example.com for IP addresses.',
        usage: 'Textbooks, tutorials, documentation, RFCs',
        keyPoints: [
            '192.0.2.0/24 — TEST-NET-1',
            '198.51.100.0/24 — TEST-NET-2',
            '203.0.113.0/24 — TEST-NET-3',
            'Should never appear on the public Internet',
            'Safe to use in documentation without risk of conflicts'
        ]
    },
    'RFC 6890': {
        title: 'Special-Purpose IP Address Registries',
        year: 2013,
        ranges: ['various'],
        description: 'Consolidates and updates all special-purpose IPv4 and IPv6 address registries into a single reference.',
        usage: 'Reference standard for all special-purpose addresses',
        keyPoints: [
            'Supersedes many earlier RFCs for special addresses',
            'Maintains IANA special-purpose registries',
            'Covers both IPv4 and IPv6 special addresses',
            'Defines attributes: forwardable, globally reachable, etc.'
        ]
    },
    'RFC 4291': {
        title: 'IP Version 6 Addressing Architecture',
        year: 2006,
        ranges: ['::1/128', '::/128', 'fe80::/10', 'ff00::/8'],
        description: 'Defines the IPv6 addressing architecture including address types, formats, and scopes.',
        usage: 'IPv6 address planning, network design',
        keyPoints: [
            '::1 — Loopback address',
            ':: — Unspecified address',
            'fe80::/10 — Link-local addresses',
            'ff00::/8 — Multicast addresses',
            '2000::/3 — Global unicast addresses'
        ]
    },
    'RFC 4193': {
        title: 'Unique Local IPv6 Unicast Addresses',
        year: 2005,
        ranges: ['fc00::/7'],
        description: 'Defines Unique Local Addresses (ULA) for IPv6, analogous to RFC 1918 private addresses in IPv4.',
        usage: 'Internal IPv6 networks, site-local communication',
        keyPoints: [
            'fc00::/7 prefix (fd00::/8 commonly used)',
            'Not routable on the global Internet',
            'Includes a 40-bit random Global ID for uniqueness',
            'Replacement for deprecated site-local addresses'
        ]
    }
};

/**
 * Reserved IPv4 network ranges with descriptions.
 * Used for quick reference and IP analysis classification.
 */
export const RESERVED_NETWORKS = [
    { range: '0.0.0.0/8', name: 'Current Network', rfc: 'RFC 1122', type: 'reserved', description: '"This" network. Used for DHCP and default routes.' },
    { range: '10.0.0.0/8', name: 'Private (Class A)', rfc: 'RFC 1918', type: 'private', description: 'Private network. 16M+ addresses for large organizations.' },
    { range: '100.64.0.0/10', name: 'CGNAT / Shared', rfc: 'RFC 6598', type: 'cgnat', description: 'Carrier-Grade NAT shared address space.' },
    { range: '127.0.0.0/8', name: 'Loopback', rfc: 'RFC 1700', type: 'loopback', description: 'Loopback addresses. Traffic stays on the local host.' },
    { range: '169.254.0.0/16', name: 'Link-Local / APIPA', rfc: 'RFC 3927', type: 'link-local', description: 'Auto-assigned when DHCP is unavailable.' },
    { range: '172.16.0.0/12', name: 'Private (Class B)', rfc: 'RFC 1918', type: 'private', description: 'Private network. ~1M addresses for mid-size orgs.' },
    { range: '192.0.2.0/24', name: 'TEST-NET-1', rfc: 'RFC 5737', type: 'documentation', description: 'Reserved for documentation and examples.' },
    { range: '192.168.0.0/16', name: 'Private (Class C)', rfc: 'RFC 1918', type: 'private', description: 'Private network. 65K addresses for small networks.' },
    { range: '198.51.100.0/24', name: 'TEST-NET-2', rfc: 'RFC 5737', type: 'documentation', description: 'Reserved for documentation and examples.' },
    { range: '203.0.113.0/24', name: 'TEST-NET-3', rfc: 'RFC 5737', type: 'documentation', description: 'Reserved for documentation and examples.' },
    { range: '224.0.0.0/4', name: 'Multicast', rfc: 'RFC 3171', type: 'multicast', description: 'Class D multicast address range.' },
    { range: '240.0.0.0/4', name: 'Reserved (Class E)', rfc: 'RFC 1112', type: 'reserved', description: 'Reserved for future use. Historically experimental.' },
    { range: '255.255.255.255/32', name: 'Limited Broadcast', rfc: 'RFC 919', type: 'broadcast', description: 'Limited broadcast address for the local network.' }
];

/**
 * CIDR cheat sheet data for quick reference.
 * Contains all CIDR prefixes from /0 to /32 with their properties.
 */
export const CIDR_CHEAT_SHEET = Array.from({ length: 33 }, (_, i) => {
    const cidr = i;
    const totalAddresses = Math.pow(2, 32 - cidr);
    const usableHosts = cidr >= 31 ? (cidr === 32 ? 1 : 2) : totalAddresses - 2;
    const maskOctets = [];
    let remaining = cidr;
    for (let j = 0; j < 4; j++) {
        const bits = Math.min(remaining, 8);
        maskOctets.push(256 - Math.pow(2, 8 - bits));
        remaining -= bits;
    }

    return {
        cidr: `/${cidr}`,
        mask: maskOctets.join('.'),
        wildcard: maskOctets.map(o => 255 - o).join('.'),
        totalAddresses: totalAddresses,
        usableHosts: usableHosts,
        networkBits: cidr,
        hostBits: 32 - cidr,
        // Common use classification
        usage: cidr <= 8 ? 'ISP / Large Enterprise' :
               cidr <= 16 ? 'Enterprise / Campus' :
               cidr <= 24 ? 'Branch / Department' :
               cidr <= 28 ? 'Small Network / VLAN' :
               cidr <= 30 ? 'Point-to-Point Link' :
               cidr === 31 ? 'P2P (RFC 3021)' :
               'Host Route'
    };
});

/**
 * Looks up which reserved network(s) an IP belongs to.
 * @param {string} ip - IPv4 address
 * @returns {Array} Matching reserved network entries
 */
export function lookupReservedNetwork(ip) {
    // Lazy import to avoid circular deps
    const parts = ip.split('.').map(Number);
    const ipInt = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    
    return RESERVED_NETWORKS.filter(net => {
        const [netIp, cidr] = net.range.split('/');
        const netParts = netIp.split('.').map(Number);
        const netInt = ((netParts[0] << 24) | (netParts[1] << 16) | (netParts[2] << 8) | netParts[3]) >>> 0;
        const mask = cidr == 0 ? 0 : (0xFFFFFFFF << (32 - parseInt(cidr))) >>> 0;
        return (ipInt & mask) === (netInt & mask);
    });
}

/**
 * Gets the RFC entry for a given RFC identifier.
 * @param {string} rfcId - RFC identifier (e.g., "RFC 1918")
 * @returns {Object|null} RFC entry or null
 */
export function getRFC(rfcId) {
    return RFC_DATABASE[rfcId] || null;
}
