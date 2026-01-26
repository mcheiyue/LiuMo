#!/bin/bash
TAG="v1.4.4"
echo "🔍 Force checking for tag: $TAG"

# Wait a moment for GH to catch up
sleep 2

echo "⏳ Finding workflow run..."
RUN_ID=$(gh run list --workflow release.yml --branch "$TAG" --limit 1 --json databaseId --jq '.[0].databaseId')

if [ -z "$RUN_ID" ]; then
    echo "⚠️  Specific tag run not found. Checking latest run on main..."
    RUN_ID=$(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')
fi

echo "👀 Watching build process (Run ID: $RUN_ID)..."
gh run watch "$RUN_ID" --exit-status

if [ $? -eq 0 ]; then
    echo "✅ Build Successful!"
    echo "⬇️  Downloading v1.4.4 Portable executable..."
    
    mkdir -p dist_release
    gh release download "$TAG" --pattern "*portable.exe" --dir dist_release --clobber
    
    echo "🎉 Download complete!"
    ls -lh dist_release
else
    echo "❌ Build Failed."
    exit 1
fi
