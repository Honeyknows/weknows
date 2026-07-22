#!/bin/bash
# ============================================================
# WeKnows – Cloudflare Pages Build Script
# ============================================================
# Assembles the static site for deployment.
# Each project folder gets its web assets.
#
# Deployed URL structure:
#   /                         → WeKnows Landing Page
#   /subnetmaster/            → SubnetMaster Web App
# ============================================================

set -e

echo "🔧 Building WeKnows static site..."

# Clean previous build
rm -rf dist
mkdir -p dist

# ── Root Landing Page ─────────────────────────────────────────
echo "🏠 Copying main landing page..."
cp index.html dist/index.html

# ── SubnetMaster ──────────────────────────────────────────────
echo "📦 Assembling SubnetMaster..."
mkdir -p dist/subnetmaster

# Copy the web UI (HTML, CSS, JS, PWA assets + nested core engine)
# Using cp -r with trailing dot copies contents instead of the directory itself
cp -R subnetmaster/web/. dist/subnetmaster/

# ── EmailTracer ───────────────────────────────────────────────
echo "📦 Assembling EmailTracer..."
mkdir -p dist/emailtracer
cp -R EmailTracer/static/. dist/emailtracer/

# ── ISHAX EDR Web Platform ────────────────────────────────────
echo "📦 Assembling ISHAX EDR..."
mkdir -p dist/ishax
cp -R ishax/. dist/ishax/

echo "✅ Build complete! Output in dist/"
echo "   dist/"
echo "   ├── index.html                (landing page)"
echo "   ├── subnetmaster/             (SubnetMaster UI + core)"
echo "   ├── emailtracer/              (EmailTracer UI)"
echo "   └── ishax/                    (ISHAX EDR Web Representation)"

