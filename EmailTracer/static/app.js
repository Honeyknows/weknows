/**
 * EmailTracer Vanilla JS Frontend
 * Startup Enterprise Theme
 */

document.addEventListener('DOMContentLoaded', () => {
    // ── Mobile Menu Toggle ──────────────────────────────────────────────
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    
    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileNav.classList.toggle('open');
        });
        
        // Close menu when a link is clicked
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileNav.classList.remove('open');
            });
        });
    }

    // ── Elements ────────────────────────────────────────────────────────
    const form = document.getElementById('analyze-form');
    const rawHeadersInput = document.getElementById('raw-headers');
    const btnAnalyze = document.getElementById('btn-analyze');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    
    // Views
    const viewAnalyze = document.getElementById('view-analyze');
    const viewResults = document.getElementById('view-results');
    const btnBack = document.getElementById('btn-back');
    
    // Settings
    const abuseKeyInput = document.getElementById('abuse-key');
    const expectedDomainInput = document.getElementById('expected-domain');
    
    // Loading & Results Containers
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultsContainer = document.getElementById('results-container');
    
    // Current analysis state
    let currentAnalysis = null;
    
    // ── View Navigation ──────────────────────────────────────────────────
    if (btnBack) {
        btnBack.addEventListener('click', () => {
            viewResults.classList.remove('active');
            viewAnalyze.classList.add('active');
            form.reset();
            currentAnalysis = null;
            document.getElementById('app-dashboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    
    // ── Form Submission ─────────────────────────────────────────────────
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const headers = rawHeadersInput.value.trim();
            if (!headers) return;
            
            // Reset UI
            errorContainer.classList.add('hidden');
            btnAnalyze.disabled = true;
            btnAnalyze.textContent = 'Processing...';
            
            try {
                const response = await fetch('/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        headers: headers,
                        expected_domain: expectedDomainInput.value.trim(),
                        abuseipdb_key: abuseKeyInput.value.trim()
                    })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.detail || 'Analysis failed on server.');
                }
                if (data.error) {
                    throw new Error(data.error);
                }
                
                currentAnalysis = data;
                
                // Show Loading and Switch View
                viewAnalyze.classList.remove('active');
                viewResults.classList.add('active');
                
                resultsContainer.classList.add('hidden');
                loadingSpinner.classList.remove('hidden');
                
                // Simulate processing time
                setTimeout(() => {
                    loadingSpinner.classList.add('hidden');
                    populateDOM(data);
                    // Smooth scroll down to results slightly if needed
                    document.getElementById('app-dashboard').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 800);
                
            } catch (err) {
                console.error(err);
                errorMessage.textContent = err.message;
                errorContainer.classList.remove('hidden');
            } finally {
                btnAnalyze.disabled = false;
                btnAnalyze.textContent = 'Run Analysis';
            }
        });
    }
    
    // ── Report Export ───────────────────────────────────────────────────
    const btnCopyJson = document.getElementById('btn-copy-json');
    if (btnCopyJson) {
        btnCopyJson.addEventListener('click', async (e) => {
            if (!currentAnalysis) return;
            const btn = e.target;
            const originalText = btn.textContent;
            try {
                const exportData = { ...currentAnalysis };
                if (exportData.header_analysis) delete exportData.header_analysis.all_headers;
                await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = originalText; }, 2000);
            } catch (err) {
                console.error('Failed to copy', err);
            }
        });
    }
    
    const btnExportPdf = document.getElementById('btn-export-pdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', async (e) => {
            if (!currentAnalysis) return;
            const btn = e.target;
            const originalText = btn.textContent;
            btn.textContent = 'Generating PDF...';
            btn.disabled = true;
            
            try {
                const response = await fetch('/export/pdf', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(currentAnalysis)
                });
                
                if (!response.ok) throw new Error('PDF generation failed');
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `EmailTracer_Report_${new Date().getTime()}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } catch (err) {
                console.error(err);
                alert('Failed to generate PDF: ' + err.message);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }
    
    // ── DOM Population Helpers ───────────────────────────────────────────
    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    function getSeverityClass(severity) {
        if (severity === 'CRITICAL') return 'badge-critical';
        if (severity === 'HIGH') return 'badge-high';
        if (severity === 'MEDIUM') return 'badge-medium';
        if (severity === 'LOW') return 'badge-low';
        return 'badge-info';
    }
    
    function populateDOM(data) {
        // Reset visibility
        document.querySelectorAll('.section-block').forEach(el => el.classList.add('hidden'));
        resultsContainer.classList.remove('hidden');
        
        // 1. Executive Summary
        const risk = data.risk_assessment || {};
        const riskBadge = document.getElementById('risk-badge');
        const level = risk.level || 'UNKNOWN';
        riskBadge.textContent = level;
        riskBadge.className = 'risk-level';
        riskBadge.classList.add('level-' + level.toLowerCase());
        
        document.getElementById('risk-score').textContent = risk.score || 0;
        
        const h = data.header_analysis || {};
        document.getElementById('sum-from').textContent = h.from || 'N/A';
        document.getElementById('sum-reply').textContent = h.reply_to || 'Not set';
        document.getElementById('sum-return').textContent = h.return_path || 'Not set';
        document.getElementById('sum-date').textContent = h.date || 'N/A';
        document.getElementById('sum-subject').textContent = h.subject || 'N/A';
        document.getElementById('sum-provider').textContent = h.provider || 'Unknown';
        
        document.getElementById('sec-summary').classList.remove('hidden');
        
        // 2. Risk Flags
        const flagsTbody = document.getElementById('flags-tbody');
        flagsTbody.innerHTML = '';
        const flags = risk.flags || [];
        
        if (flags.length > 0) {
            flags.forEach(f => {
                const tr = document.createElement('tr');
                const badgeClass = getSeverityClass(f.severity);
                
                let evidenceHtml = '';
                if (f.evidence) {
                    evidenceHtml = `<span class="evidence-block">${escapeHtml(f.evidence)}</span>`;
                }
                
                tr.innerHTML = `
                    <td><span class="badge ${badgeClass}">${f.severity}</span></td>
                    <td class="font-semibold">${escapeHtml(f.indicator)}</td>
                    <td>
                        <div>${escapeHtml(f.message)}</div>
                        ${evidenceHtml}
                    </td>
                    <td style="text-align: right;" class="font-semibold text-gray-600">+${f.score}</td>
                `;
                flagsTbody.appendChild(tr);
            });
            document.getElementById('sec-flags').classList.remove('hidden');
        }
        
        // 3. Authentication
        const auth = data.authentication || {};
        const authTbody = document.getElementById('auth-tbody');
        authTbody.innerHTML = '';
        
        if (!auth.error) {
            const passed = auth.passed || {};
            const obs = auth.observed || {};
            
            ['spf', 'dkim', 'dmarc'].forEach(protocol => {
                const tr = document.createElement('tr');
                const p = passed[protocol];
                const o = obs[protocol] || '?';
                const checkData = auth[protocol] || {};
                
                let statusBadge = p ? 'badge-low' : 'badge-high';
                let statusText = p ? 'PASS' : 'FAIL';
                
                if (!checkData.exists && !p && o !== 'fail') {
                    statusBadge = 'badge-gray';
                    statusText = 'NONE';
                }
                
                let dnsEvidence = (checkData.record || checkData.error || 'No record found');
                if (dnsEvidence.length > 80) dnsEvidence = dnsEvidence.substring(0, 80) + '...';
                
                tr.innerHTML = `
                    <td class="font-semibold">${protocol.toUpperCase()}</td>
                    <td><span class="badge ${statusBadge}">${statusText}</span></td>
                    <td class="mono-cell">${escapeHtml(o)}</td>
                    <td class="mono-cell">${escapeHtml(dnsEvidence)}</td>
                `;
                authTbody.appendChild(tr);
            });
            
            document.getElementById('auth-verdict-text').textContent = auth.overall_verdict || 'Unknown';
            document.getElementById('sec-auth').classList.remove('hidden');
        }
        
        // 4. Domain Intel
        const dintel = data.domain_intelligence || {};
        const dTable = document.getElementById('domain-tbody');
        dTable.innerHTML = '';
        
        if (!dintel.error) {
            const whois = dintel.whois || {};
            const rows = [
                ['Domain', dintel.domain || 'N/A'],
                ['Age', whois.age_days !== undefined ? `${whois.age_days} days` : 'N/A'],
                ['Registrar', whois.registrar || 'N/A'],
                ['Created', whois.creation_date || 'N/A'],
                ['Organization', whois.registrant_org || 'N/A'],
                ['Country', whois.registrant_country || 'N/A']
            ];
            
            rows.forEach(([label, val]) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<th style="width: 150px;">${label}</th><td>${escapeHtml(val)}</td>`;
                dTable.appendChild(tr);
            });
            document.getElementById('sec-domain').classList.remove('hidden');
        }
        
        // 5. IP Analysis
        const ipTbody = document.getElementById('ip-tbody');
        ipTbody.innerHTML = '';
        const ipData = data.ip_analysis || {};
        const ipMsg = document.getElementById('ip-message');
        ipMsg.classList.add('hidden');
        
        if (!ipData.error && ipData.ip_details && ipData.ip_details.length > 0) {
            ipData.ip_details.forEach(ip => {
                const geo = ip.geo || {};
                const abuse = ip.abuse || {};
                const tr = document.createElement('tr');
                
                let loc = geo.status === 'success' ? `${geo.city || '?'}, ${geo.country || '?'}` : 'Lookup failed';
                let isp = geo.status === 'success' ? `${geo.isp || '?'} (${geo.asn || '?'})` : '-';
                
                let abuseText = '-';
                if (abuse.status === 'success') {
                    const sc = abuse.abuse_confidence_score || 0;
                    if (sc > 0) {
                        const badgeClass = sc > 50 ? 'badge-high' : 'badge-medium';
                        abuseText = `<span class="badge ${badgeClass}">${sc}/100 Risk</span> (${abuse.total_reports || 0} reports)`;
                    } else {
                        abuseText = '<span class="text-muted">Clean (0/100)</span>';
                    }
                }
                
                tr.innerHTML = `
                    <td class="font-semibold text-primary">${escapeHtml(ip.ip)}<br><span class="text-xs text-muted font-mono">${escapeHtml(ip.source)}</span></td>
                    <td>${escapeHtml(loc)}</td>
                    <td>${escapeHtml(isp)}</td>
                    <td>${ip.is_proxy ? '<span class="badge badge-medium">YES</span>' : '<span class="text-muted">No</span>'}</td>
                    <td>${ip.is_datacenter ? 'Yes' : 'No'}</td>
                    <td>${abuseText}</td>
                `;
                ipTbody.appendChild(tr);
            });
            document.getElementById('sec-ip').classList.remove('hidden');
        } else if (ipData.infrastructure_ips && ipData.infrastructure_ips.length > 0) {
            ipMsg.textContent = 'All detected IPs belong to recognized mail infrastructure (Google, Microsoft, etc). Real sender IP is hidden.';
            ipMsg.classList.remove('hidden');
            document.getElementById('sec-ip').classList.remove('hidden');
        }
        
        // 6. Timeline
        const tlTbody = document.getElementById('timeline-tbody');
        tlTbody.innerHTML = '';
        const timeline = data.timeline || {};
        
        if (!timeline.error && timeline.events && timeline.events.length > 0) {
            timeline.events.forEach(e => {
                const tr = document.createElement('tr');
                
                let warningHtml = '';
                if (e.delay_warning) {
                    warningHtml = `<div class="text-xs text-danger mt-1">⚠ ${escapeHtml(e.delay_warning)}</div>`;
                }
                
                const ts = e.timestamp || e.timestamp_raw || 'Unknown';
                const ip = e.ip || '-';
                
                tr.innerHTML = `
                    <td class="mono-cell">${escapeHtml(ts)}</td>
                    <td class="mono-cell">${escapeHtml(ip)}</td>
                    <td>
                        <div>${escapeHtml(e.description)}</div>
                        ${warningHtml}
                    </td>
                `;
                tlTbody.appendChild(tr);
            });
            document.getElementById('sec-timeline').classList.remove('hidden');
        }
    }
});
