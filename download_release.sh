#!/bin/bash

# Ensure we are in the git repo
if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository. Please run this from the project root."
    exit 1
fi

echo "🔍 Checking for latest tag..."
LATEST_TAG=$(git describe --tags --abbrev=0)
echo "   Target Version: $LATEST_TAG"

echo "⏳ Finding workflow run for $LATEST_TAG..."
# Get the run ID for the latest release workflow triggered by this tag
RUN_ID=$(gh run list --workflow release.yml --branch "$LATEST_TAG" --limit 1 --json databaseId --jq '.[0].databaseId')

if [ -z "$RUN_ID" ]; then
    echo "   No workflow found specifically for tag $LATEST_TAG yet."
    echo "   Checking for any recent release run..."
    RUN_ID=$(gh run list --workflow release.yml --limit 1 --json databaseId --jq '.[0].databaseId')
fi

echo "👀 Watching build process (Run ID: $RUN_ID)..."
gh run watch "$RUN_ID" --exit-status

if [ $? -eq 0 ]; then
    echo "✅ Build Successful!"
    echo "⬇️  Downloading Portable executable..."
    
    # Create dist folder if not exists
    mkdir -p dist_release
    
    # Download the specific portable asset
    gh release download "$LATEST_TAG" --pattern "*portable.exe" --dir dist_release --clobber
    
    echo "🎉 Download complete! Check 'dist_release' folder."
    ls -lh dist_release
else
    echo "❌ Build Failed. Check GitHub Actions logs."
    exit 1
fi
