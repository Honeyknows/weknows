/**
 * ============================================================
 * SubnetMaster – Visual Subnet Tree Module
 * ============================================================
 * Generates an interactive, expandable SVG-based visualization
 * of subnet splits.
 * ============================================================
 */

import { parseCidr, splitSubnet, isValidIp, isValidCidr } from '../../../core/ip-utils.js';
import { showToast } from '../../utils/ui-utils.js';

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="8" y="2" width="8" height="4" rx="1"/><rect x="2" y="18" width="8" height="4" rx="1"/>
                    <rect x="14" y="18" width="8" height="4" rx="1"/>
                    <path d="M12 6v6"/><path d="M6 12h12"/><path d="M6 12v6"/><path d="M18 12v6"/>
                </svg>
                <h3>Interactive Subnet Tree</h3>
            </div>
            <div class="card-body">
                <div class="input-row" style="margin-bottom: 24px;">
                    <div class="input-group" style="flex: 2;">
                        <label>Root Network (e.g. 10.0.0.0/24)</label>
                        <input type="text" id="tree-root" placeholder="10.0.0.0/24" value="10.0.0.0/24">
                    </div>
                    <div class="input-group" style="flex: 1;">
                        <label>Split Depth (Levels)</label>
                        <select id="tree-depth">
                            <option value="1">1 Level (2 subnets)</option>
                            <option value="2" selected>2 Levels (4 subnets)</option>
                            <option value="3">3 Levels (8 subnets)</option>
                            <option value="4">4 Levels (16 subnets)</option>
                        </select>
                    </div>
                    <button class="btn btn-primary" id="tree-submit" style="height: 42px; padding: 0 24px;">Generate Tree</button>
                </div>

                <div id="tree-container" class="tree-container" style="min-height: 400px; background: var(--bg-input); border: 1px solid var(--border-secondary); border-radius: var(--radius-sm); position: relative;">
                    <div class="empty-state">
                        <p>Click Generate to build the subnet tree.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

export function init() {
    document.getElementById('tree-submit').addEventListener('click', generateTree);
    document.getElementById('tree-root').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') generateTree();
    });
}

function generateTree() {
    const rootInput = document.getElementById('tree-root').value.trim();
    const depth = parseInt(document.getElementById('tree-depth').value);
    const container = document.getElementById('tree-container');

    const parsed = parseCidr(rootInput);
    if (!parsed) {
        showToast('Invalid root network', 'error');
        return;
    }
    
    if (parsed.cidr + depth > 32) {
        showToast(`Cannot split /${parsed.cidr} network by ${depth} levels. Exceeds /32.`, 'error');
        return;
    }

    container.innerHTML = '';
    
    // Create SVG element dynamically based on depth
    const nodeWidth = 140;
    const nodeHeight = 40;
    const horizontalSpacing = 60;
    const verticalSpacing = 20;

    const totalLevels = depth + 1;
    // Calculate total leaves to determine SVG height
    const totalLeaves = Math.pow(2, depth);
    const svgHeight = totalLeaves * (nodeHeight + verticalSpacing) + 40;
    const svgWidth = totalLevels * (nodeWidth + horizontalSpacing) + 40;

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width', svgWidth);
    svg.setAttribute('height', svgHeight);
    svg.style.fontFamily = "var(--font-mono)";

    // Defs for gradients/filters
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.2"/>
        </filter>
    `;
    svg.appendChild(defs);

    const gLinks = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const gNodes = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    svg.appendChild(gLinks);
    svg.appendChild(gNodes);

    // Build hierarchical data
    let currentY = 20;

    function drawNode(x, y, text, isRoot = false) {
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute('class', 'tree-node');
        g.setAttribute('transform', `translate(${x}, ${y})`);
        
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute('width', nodeWidth);
        rect.setAttribute('height', nodeHeight);
        rect.setAttribute('rx', 6);
        rect.setAttribute('ry', 6);
        rect.setAttribute('fill', isRoot ? 'var(--accent-primary)' : 'var(--bg-card)');
        rect.setAttribute('stroke', isRoot ? 'var(--accent-primary)' : 'var(--border-primary)');
        rect.setAttribute('stroke-width', 2);
        rect.setAttribute('filter', 'url(#shadow)');

        const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textEl.setAttribute('x', nodeWidth / 2);
        textEl.setAttribute('y', nodeHeight / 2 + 5);
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('fill', isRoot ? '#fff' : 'var(--text-primary)');
        textEl.setAttribute('font-size', '12px');
        textEl.setAttribute('font-weight', isRoot ? 'bold' : 'normal');
        textEl.textContent = text;

        g.appendChild(rect);
        g.appendChild(textEl);
        gNodes.appendChild(g);

        return { x: x + nodeWidth, y: y + nodeHeight / 2, inX: x, inY: y + nodeHeight / 2 };
    }

    function drawLink(x1, y1, x2, y2) {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        // Cubic bezier for smooth curves
        const midX = (x1 + x2) / 2;
        path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'var(--border-primary)');
        path.setAttribute('stroke-width', 1.5);
        gLinks.appendChild(path);
    }

    // Recursive tree builder
    function buildTree(ip, cidr, level, x, startY, endY) {
        const y = (startY + endY) / 2 - (nodeHeight / 2);
        const nodeInfo = drawNode(x, y, `${ip}/${cidr}`, level === 0);

        if (level < depth) {
            const nextCidr = cidr + 1;
            const subnets = splitSubnet(ip, cidr, 2);
            
            const midY = (startY + endY) / 2;
            
            // Top child
            const topChild = buildTree(subnets[0].networkAddress, nextCidr, level + 1, nodeInfo.x + horizontalSpacing, startY, midY);
            drawLink(nodeInfo.x, nodeInfo.y, topChild.inX, topChild.inY);
            
            // Bottom child
            const bottomChild = buildTree(subnets[1].networkAddress, nextCidr, level + 1, nodeInfo.x + horizontalSpacing, midY, endY);
            drawLink(nodeInfo.x, nodeInfo.y, bottomChild.inX, bottomChild.inY);
        }
        
        return nodeInfo;
    }

    buildTree(parsed.ip, parsed.cidr, 0, 20, 20, svgHeight - 20);

    container.appendChild(svg);
}
