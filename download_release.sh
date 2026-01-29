#!/bin/bash

# Ensure we are in the git repo
if [ ! -d ".git" ]; then
    echo "Error: Not in a git repository. Please run this from the project root."
    exit 1
fi

echo "🔍 Checking for latest tag..."
LATEST_TAG=$(git describe --tags --abbrev=0)
echo "   Target Version: $LATEST_TAG"

echo "⏳ Waiting for workflow to appear for $LATEST_TAG..."

# Retry loop: Wait up to 60 seconds for the workflow to start
MAX_RETRIES=12
for ((i=1; i<=MAX_RETRIES; i++)); do
    # Try to find a run specifically triggered by this tag
    RUN_ID=$(gh run list --workflow release.yml --branch "$LATEST_TAG" --limit 1 --json databaseId --jq '.[0].databaseId')
    
    if [ -n "$RUN_ID" ]; then
        echo "   Found Run ID: $RUN_ID"
        break
    fi
    
    echo "   ... run not found yet, retrying in 5s ($i/$MAX_RETRIES)..."
    sleep 5
done

if [ -z "$RUN_ID" ]; then
    echo "❌ Timeout: Could not find a workflow run for tag $LATEST_TAG after 60 seconds."
    echo "   Please check GitHub Actions tab manually."
    exit 1
fi

echo "👀 Watching build process (Run ID: $RUN_ID)..."
gh run watch "$RUN_ID" --exit-status

if [ $? -eq 0 ]; then
    echo "✅ Build Successful!"
    echo "⬇️  Downloading Portable executable..."
    
    # Create dist folder if not exists
    mkdir -p dist_release
    
    # Download the specific portable asset
    # Note: Matches the artifact name from release.yml: LiuMo_*_portable.exe
    gh release download "$LATEST_TAG" --pattern "*portable.exe" --dir dist_release --clobber
    
    echo "🎉 Download complete! Check 'dist_release' folder."
    ls -lh dist_release
else
    echo "❌ Build Failed. Check GitHub Actions logs."
    exit 1
fi
