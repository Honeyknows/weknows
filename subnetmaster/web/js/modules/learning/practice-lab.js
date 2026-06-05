/**
 * ============================================================
 * SubnetMaster – Practice Lab Module
 * ============================================================
 * Provides an interactive environment where users must
 * manually input subnetting calculations for given scenarios.
 * ============================================================
 */

import { calculateSubnet, intToIp, cidrToMask, maskStringToCidr } from '../../../core/ip-utils.js';
import { showToast } from '../../utils/ui-utils.js';

let currentScenario = null;

export function render(container) {
    container.innerHTML = `
        <div class="card animate-in">
            <div class="card-header">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
                </svg>
                <h3>Subnetting Practice Lab</h3>
                <button class="btn btn-primary btn-sm" id="lab-new" style="margin-left: auto;">New Scenario</button>
            </div>
            <div class="card-body">
                <div style="padding: 16px; background: var(--bg-input); border: 1px solid var(--border-secondary); border-radius: var(--radius-sm); margin-bottom: 24px;">
                    <div style="font-size: 13px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Scenario</div>
                    <div id="lab-scenario" style="font-size: 18px; color: var(--text-primary); line-height: 1.5;">
                        <!-- Scenario injected here -->
                    </div>
                </div>

                <div class="grid-2" style="margin-bottom: 24px;">
                    <div class="input-group">
                        <label for="lab-network">Network Address</label>
                        <input type="text" id="lab-network" placeholder="e.g. 192.168.1.0" autocomplete="off" spellcheck="false">
                    </div>
                    <div class="input-group">
                        <label for="lab-broadcast">Broadcast Address</label>
                        <input type="text" id="lab-broadcast" placeholder="e.g. 192.168.1.255" autocomplete="off" spellcheck="false">
                    </div>
                    <div class="input-group">
                        <label for="lab-first">First Usable Host</label>
                        <input type="text" id="lab-first" placeholder="e.g. 192.168.1.1" autocomplete="off" spellcheck="false">
                    </div>
                    <div class="input-group">
                        <label for="lab-last">Last Usable Host</label>
                        <input type="text" id="lab-last" placeholder="e.g. 192.168.1.254" autocomplete="off" spellcheck="false">
                    </div>
                    <div class="input-group">
                        <label for="lab-mask">Subnet Mask</label>
                        <input type="text" id="lab-mask" placeholder="e.g. 255.255.255.0" autocomplete="off" spellcheck="false">
                    </div>
                </div>

                <div style="display: flex; gap: 12px; align-items: center;">
                    <button class="btn btn-primary" id="lab-check">Check Answers</button>
                    <button class="btn btn-ghost" id="lab-reveal">Reveal Answers</button>
                </div>
            </div>
        </div>
    `;
}

export function init() {
    document.getElementById('lab-new').addEventListener('click', generateScenario);
    document.getElementById('lab-check').addEventListener('click', checkAnswers);
    document.getElementById('lab-reveal').addEventListener('click', revealAnswers);
    
    // Clear styles on input
    ['network', 'broadcast', 'first', 'last', 'mask'].forEach(field => {
        document.getElementById(`lab-${field}`).addEventListener('input', (e) => {
            e.target.style.borderColor = 'var(--border-secondary)';
            e.target.style.backgroundColor = 'var(--bg-input)';
        });
    });

    generateScenario();
}

function generateScenario() {
    // Generate a random IP and CIDR
    const octet1 = Math.floor(Math.random() * 223) + 1; // Class A/B/C
    const octet2 = Math.floor(Math.random() * 256);
    const octet3 = Math.floor(Math.random() * 256);
    const octet4 = Math.floor(Math.random() * 256);
    const ip = `${octet1}.${octet2}.${octet3}.${octet4}`;
    
    const cidr = Math.floor(Math.random() * (30 - 8 + 1)) + 8; // /8 to /30
    
    currentScenario = calculateSubnet(ip, cidr);
    
    const scenarios = [
        `You have been assigned the IP address <strong>${ip}/${cidr}</strong>. Calculate the subnet parameters.`,
        `A host on your network has the IP <strong>${ip}</strong> with a subnet mask of <strong>${intToIp(cidrToMask(cidr))}</strong>. Find the network boundaries.`
    ];
    
    document.getElementById('lab-scenario').innerHTML = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    // Clear inputs
    ['network', 'broadcast', 'first', 'last', 'mask'].forEach(field => {
        const el = document.getElementById(`lab-${field}`);
        el.value = '';
        el.style.borderColor = 'var(--border-secondary)';
        el.style.backgroundColor = 'var(--bg-input)';
    });
}

function checkAnswers() {
    if (!currentScenario) return;

    const fields = [
        { id: 'network', correct: currentScenario.networkAddress },
        { id: 'broadcast', correct: currentScenario.broadcastAddress },
        { id: 'first', correct: currentScenario.firstHost },
        { id: 'last', correct: currentScenario.lastHost },
        { id: 'mask', correct: currentScenario.subnetMask }
    ];

    let allCorrect = true;

    fields.forEach(f => {
        const el = document.getElementById(`lab-${f.id}`);
        const val = el.value.trim();
        
        if (val === f.correct) {
            el.style.borderColor = 'var(--success)';
            el.style.backgroundColor = 'var(--success-bg)';
        } else {
            el.style.borderColor = 'var(--error)';
            el.style.backgroundColor = 'var(--error-bg)';
            allCorrect = false;
        }
    });

    if (allCorrect) {
        showToast('Excellent! All answers are correct.', 'success');
    } else {
        showToast('Some answers are incorrect. Keep trying!', 'warning');
    }
}

function revealAnswers() {
    if (!currentScenario) return;
    
    const fields = [
        { id: 'network', correct: currentScenario.networkAddress },
        { id: 'broadcast', correct: currentScenario.broadcastAddress },
        { id: 'first', correct: currentScenario.firstHost },
        { id: 'last', correct: currentScenario.lastHost },
        { id: 'mask', correct: currentScenario.subnetMask }
    ];

    fields.forEach(f => {
        const el = document.getElementById(`lab-${f.id}`);
        el.value = f.correct;
        el.style.borderColor = 'var(--accent-primary)';
        el.style.backgroundColor = 'rgba(14, 165, 233, 0.1)';
    });
    
    showToast('Answers revealed.', 'info');
}
