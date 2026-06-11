# EmailTracer

EmailTracer is an enterprise-grade email forensics tool. It extracts sender details, public IPs, domain registration data, authentication signals, and threat intelligence to produce a comprehensive risk report for security operations teams.

## What It Checks

- **Header Summary**: From, Reply-To, Return-Path, Message-ID, date, subject, and likely sending provider.
- **Network Routing**: Extracts public IPs from `Received` headers, geolocates them, and detects proxies/datacenters.
- **Threat Intelligence**: Optional AbuseIPDB reputation checks with a free AbuseIPDB API key.
- **Domain Intelligence**: Sender domain WHOIS data, creation dates, and organization records.
- **Authentication Alignment**: Validates SPF, DKIM, and DMARC DNS records against observed `Authentication-Results`.
- **Phishing Detection**: Highlights lookalike domains, suspicious TLDs, and URL threats extracted from headers.
- **PDF Reporting**: Generates C-suite ready PDF reports and JSON exports for SOC integration.

## Architecture

EmailTracer is built as a stateless, production-ready web application:
- **Backend**: Python + FastAPI
- **Frontend**: Vanilla HTML/CSS/JS (Zero framework dependencies)
- **Deployment**: Railway.app ready (`Procfile` included)

## Local Setup

```powershell
# Clone the repository
cd C:\taniya\HTML\EmailTracer

# Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Then visit `http://localhost:8000` in your browser.

## AbuseIPDB Key

AbuseIPDB is optional but recommended for accurate threat scoring.

1. Create a free account at `https://www.abuseipdb.com/`.
2. Generate an API key in your account settings.
3. Paste it into the EmailTracer analysis form.

## Limitations

- Gmail, Outlook, Yahoo, and other large providers often hide the true original sender IP.
- Privacy-focused services may provide limited routing information.
- Free APIs (like ip-api) may be rate-limited if heavily utilized without a paid key.
