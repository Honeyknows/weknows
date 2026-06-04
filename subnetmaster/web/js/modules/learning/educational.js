/**
 * ============================================================
 * SubnetMaster – Educational Mode Module
 * ============================================================
 * Provides step-by-step explanations of subnetting theory,
 * CIDR, and network math.
 * ============================================================
 */

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                <h3>Networking Fundamentals</h3>
            </div>
            <div class="card-body">
                <div class="tabs">
                    <button class="tab-btn active" data-tab="ip-basics">IP Basics</button>
                    <button class="tab-btn" data-tab="subnetting">Subnetting Math</button>
                    <button class="tab-btn" data-tab="cidr">CIDR</button>
                    <button class="tab-btn" data-tab="vlsm">VLSM</button>
                </div>
                
                <div id="edu-content" style="padding-top: 16px;">
                    <!-- Content injected via JS -->
                </div>
            </div>
        </div>
    `;
}

const EDU_CONTENT = {
    'ip-basics': `
        <h4 style="font-size: 16px; font-weight: 600; color: var(--accent-primary); margin-bottom: 12px;">What is an IPv4 Address?</h4>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
            An IPv4 address is a 32-bit number that uniquely identifies a network interface on a machine. It is typically written in 
            dotted-decimal format (e.g., <span style="font-family: var(--font-mono); color: var(--text-primary);">192.168.1.1</span>), 
            which consists of four 8-bit octets.
        </p>
        
        <div style="background: var(--bg-input); padding: 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-secondary); margin-bottom: 24px;">
            <div style="font-family: var(--font-mono); font-size: 14px; text-align: center; letter-spacing: 1px; color: var(--text-primary);">
                11000000 . 10101000 . 00000001 . 00000001
            </div>
            <div style="font-family: var(--font-mono); font-size: 14px; text-align: center; color: var(--text-muted); margin-top: 4px;">
                192 . 168 . 1 . 1
            </div>
        </div>

        <h4 style="font-size: 16px; font-weight: 600; color: var(--accent-primary); margin-bottom: 12px;">Network and Host Portions</h4>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
            Every IP address is split into two parts: the <strong>Network ID</strong> (which identifies the specific network) 
            and the <strong>Host ID</strong> (which identifies the specific device on that network). The subnet mask determines where this split happens.
        </p>
    `,
    'subnetting': `
        <h4 style="font-size: 16px; font-weight: 600; color: var(--accent-primary); margin-bottom: 12px;">How Subnetting Works</h4>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
            Subnetting is the practice of borrowing bits from the host portion of an IP address to create additional network bits. 
            This divides a large network into smaller, more manageable sub-networks (subnets).
        </p>
        
        <ul style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px; padding-left: 20px;">
            <li style="margin-bottom: 8px;"><strong>Network Address:</strong> The first address in a subnet. Represents the network itself. (All host bits are 0).</li>
            <li style="margin-bottom: 8px;"><strong>Broadcast Address:</strong> The last address in a subnet. Used to send data to all hosts. (All host bits are 1).</li>
            <li style="margin-bottom: 8px;"><strong>Usable Hosts:</strong> The addresses between the Network and Broadcast addresses. Calculated as <code style="font-family: var(--font-mono); background: var(--bg-input); padding: 2px 6px; border-radius: 4px;">2^h - 2</code> (where <em>h</em> is the number of host bits).</li>
        </ul>

        <div style="background: var(--info-bg); border-left: 4px solid var(--info); padding: 16px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0;">
            <h5 style="font-size: 13px; font-weight: 600; color: var(--info); margin-bottom: 8px;">Example: /24 Network (8 host bits)</h5>
            <div style="font-size: 13px; color: var(--text-primary); font-family: var(--font-mono);">
                Total Addresses: 2^8 = 256<br>
                Usable Hosts: 256 - 2 = 254
            </div>
        </div>
    `,
    'cidr': `
        <h4 style="font-size: 16px; font-weight: 600; color: var(--accent-primary); margin-bottom: 12px;">CIDR (Classless Inter-Domain Routing)</h4>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
            CIDR notation is a compact way of representing an IP address and its associated routing prefix. 
            It is written as the IP address followed by a slash and the number of network bits.
        </p>

        <table class="data-table" style="margin-bottom: 24px;">
            <thead>
                <tr><th>CIDR</th><th>Subnet Mask</th><th>Meaning</th></tr>
            </thead>
            <tbody>
                <tr><td>/8</td><td>255.0.0.0</td><td>8 network bits, 24 host bits</td></tr>
                <tr><td>/16</td><td>255.255.0.0</td><td>16 network bits, 16 host bits</td></tr>
                <tr><td>/24</td><td>255.255.255.0</td><td>24 network bits, 8 host bits</td></tr>
            </tbody>
        </table>

        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6;">
            A /32 prefix means all 32 bits are network bits, leaving 0 host bits. This represents a single host route.
            A /0 prefix means 0 network bits, which matches all IP addresses (the default route: 0.0.0.0/0).
        </p>
    `,
    'vlsm': `
        <h4 style="font-size: 16px; font-weight: 600; color: var(--accent-primary); margin-bottom: 12px;">Variable Length Subnet Masking (VLSM)</h4>
        <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px;">
            VLSM allows a network engineer to divide an IP address space into a hierarchy of subnets of different sizes. 
            This prevents IP address waste by tailoring the subnet size to the exact number of hosts required.
        </p>

        <ol style="font-size: 14px; color: var(--text-secondary); line-height: 1.6; padding-left: 20px;">
            <li style="margin-bottom: 8px;">List all departments/subnets needed.</li>
            <li style="margin-bottom: 8px;">Sort them in descending order based on the number of hosts required.</li>
            <li style="margin-bottom: 8px;">Allocate the largest subnet first from the beginning of the available address block.</li>
            <li style="margin-bottom: 8px;">Allocate the next largest subnet from the address immediately following the previous one.</li>
        </ol>
    `
};

export function init() {
    const tabs = document.querySelectorAll('.tab-btn');
    const content = document.getElementById('edu-content');

    function switchTab(tabId) {
        tabs.forEach(t => t.classList.remove('active'));
        const activeTab = Array.from(tabs).find(t => t.dataset.tab === tabId);
        if (activeTab) activeTab.classList.add('active');
        
        content.innerHTML = `<div class="animate-in">${EDU_CONTENT[tabId]}</div>`;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Init first tab
    switchTab('ip-basics');
}
