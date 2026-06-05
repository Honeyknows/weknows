#!/bin/bash
# ============================================================
# WeKnows – Cloudflare Pages Build Script
# ============================================================
# Assembles the static site for deployment.
# Each project folder gets its web assets + shared engine.
#
# Deployed URL structure:
#   /                         → landing page (redirects to subnetmaster for now)
#   /subnetmaster/            → redirects to /subnetmaster/web/
#   /subnetmaster/web/        → SubnetMaster web app
#   /subnetmaster/core/       → shared math engine (imported by web modules)
#   /future-project/          → future project (add here later)
# ============================================================

set -e

echo "🔧 Building WeKnows static site..."

# Clean previous build
rm -rf dist

# ── SubnetMaster ──────────────────────────────────────────────
echo "📦 Assembling SubnetMaster..."

mkdir -p dist/subnetmaster

# Copy the web UI (HTML, CSS, JS, PWA assets)
cp -r subnetmaster/web dist/subnetmaster/web

# Copy the core math engine (imported by web modules via relative paths)
cp -r subnetmaster/core dist/subnetmaster/core

# Create a redirect at /subnetmaster/ → /subnetmaster/web/
cat > dist/subnetmaster/index.html << 'REDIRECT'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=web/">
    <title>SubnetMaster – Professional Network Calculator</title>
</head>
<body>
    <p>Redirecting to <a href="web/">SubnetMaster</a>...</p>
</body>
</html>
REDIRECT

# ── Root Landing Page ─────────────────────────────────────────
# For now, redirect to SubnetMaster.
# Replace this with a full landing page when weknows.com is ready.
cat > dist/index.html << 'LANDING'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=subnetmaster/web/">
    <title>WeKnows</title>
</head>
<body>
    <p>Redirecting to <a href="subnetmaster/web/">SubnetMaster</a>...</p>
</body>
</html>
LANDING

echo "✅ Build complete! Output in dist/"
echo "   dist/"
echo "   ├── index.html                (landing page)"
echo "   └── subnetmaster/"
echo "       ├── index.html            (redirect → web/)"
echo "       ├── web/                  (SubnetMaster UI)"
echo "       └── core/                 (math engine)"
