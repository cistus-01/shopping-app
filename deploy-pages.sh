#!/bin/bash
set -e

TOKEN="${GH_PAT}"
REPO="cistus-01/shopping-app"
DIST="/home/root/shopping-app/dist"
BRANCH="gh-pages"
API="https://api.github.com"
AUTH="Authorization: token $TOKEN"

echo "=== Uploading dist/ to gh-pages via GitHub API ==="

# Function to create a blob from a file
create_blob() {
  local file="$1"
  local content=$(base64 -w 0 "$file")
  curl -s -X POST "$API/repos/$REPO/git/blobs" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"content\": \"$content\", \"encoding\": \"base64\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])"
}

# Collect all files
echo "Creating blobs..."
declare -A blobs

for f in $(find "$DIST" -type f); do
  rel="${f#$DIST/}"
  sha=$(create_blob "$f")
  blobs["$rel"]="$sha"
  echo "  $rel -> $sha"
done

# Build tree JSON
echo "Building tree..."
TREE_JSON='{"tree":['
first=1
for rel in "${!blobs[@]}"; do
  sha="${blobs[$rel]}"
  if [ $first -eq 0 ]; then TREE_JSON+=','; fi
  TREE_JSON+="{\"path\":\"$rel\",\"mode\":\"100644\",\"type\":\"blob\",\"sha\":\"$sha\"}"
  first=0
done
TREE_JSON+=']}'

TREE_SHA=$(echo "$TREE_JSON" | curl -s -X POST "$API/repos/$REPO/git/trees" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d @- | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
echo "Tree SHA: $TREE_SHA"

# Check if gh-pages branch exists
PARENT_SHA=$(curl -s "$API/repos/$REPO/git/ref/heads/$BRANCH" \
  -H "$AUTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('object',{}).get('sha',''))")

# Create commit
if [ -n "$PARENT_SHA" ]; then
  COMMIT_SHA=$(curl -s -X POST "$API/repos/$REPO/git/commits" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"message\":\"Deploy shopping app\",\"tree\":\"$TREE_SHA\",\"parents\":[\"$PARENT_SHA\"]}" | \
    python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
else
  COMMIT_SHA=$(curl -s -X POST "$API/repos/$REPO/git/commits" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"message\":\"Deploy shopping app\",\"tree\":\"$TREE_SHA\",\"parents\":[]}" | \
    python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
fi
echo "Commit SHA: $COMMIT_SHA"

# Create or update gh-pages branch
if [ -n "$PARENT_SHA" ]; then
  curl -s -X PATCH "$API/repos/$REPO/git/refs/heads/$BRANCH" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"sha\":\"$COMMIT_SHA\",\"force\":true}" > /dev/null
  echo "Updated gh-pages branch"
else
  curl -s -X POST "$API/repos/$REPO/git/refs" \
    -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"ref\":\"refs/heads/$BRANCH\",\"sha\":\"$COMMIT_SHA\"}" > /dev/null
  echo "Created gh-pages branch"
fi

# Enable GitHub Pages
curl -s -X POST "$API/repos/$REPO/pages" \
  -H "$AUTH" -H "Content-Type: application/json" \
  -d '{"source":{"branch":"gh-pages","path":"/"}}' > /dev/null 2>&1 || true

echo ""
echo "=== Done! ==="
echo "URL: https://cistus-01.github.io/shopping-app/"
echo "(Pages may take 1-2 minutes to activate)"
