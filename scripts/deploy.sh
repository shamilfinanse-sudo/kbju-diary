#!/bin/sh
# Тесты, сборка и выкладка сайта на GitHub Pages (ветка gh-pages).
set -e
cd "$(dirname "$0")/.."
npm test
npm run build
TMP=$(mktemp -d)
cp -r dist/. "$TMP"
touch "$TMP/.nojekyll"
cd "$TMP"
git init -q -b gh-pages
git add -A
git commit -qm "deploy $(date +%F)"
git push -f https://github.com/shamilfinanse-sudo/kbju-diary.git gh-pages
