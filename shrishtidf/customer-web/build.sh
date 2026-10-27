#!/bin/sh
# Builds the Flutter customer app for the browser into customer-web/html (served at /app/).
# Run from anywhere: sh shrishtidf/customer-web/build.sh
set -e
here="$(cd "$(dirname "$0")" && pwd)"
cd "$here/../.."
MSYS_NO_PATHCONV=1 flutter build web --release --base-href /app/
rm -rf "$here/html"
mkdir -p "$here/html"
cp -r build/web/. "$here/html/"
# CanvasKit is loaded from Google's CDN (gstatic.com), so the 37 MB local copy is not shipped
rm -rf "$here/html/canvaskit"
echo "Built into $here/html"
