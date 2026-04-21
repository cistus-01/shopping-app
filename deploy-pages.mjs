import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const TOKEN = process.env.GH_PAT || '';
const REPO = 'cistus-01/shopping-app';
const DIST = '/home/root/shopping-app/dist';
const BRANCH = 'gh-pages';
const API = 'https://api.github.com';

const headers = {
  'Authorization': `token ${TOKEN}`,
  'Content-Type': 'application/json',
  'User-Agent': 'deploy-script',
  'Accept': 'application/vnd.github.v3+json'
};

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

function getAllFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...getAllFiles(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function main() {
  const files = getAllFiles(DIST);
  console.log(`Found ${files.length} files`);

  // Create blobs
  const treeItems = [];
  for (const file of files) {
    const content = readFileSync(file).toString('base64');
    const rel = relative(DIST, file);
    const blob = await api('POST', `/repos/${REPO}/git/blobs`, { content, encoding: 'base64' });
    console.log(`  blob: ${rel} -> ${blob.sha}`);
    treeItems.push({ path: rel, mode: '100644', type: 'blob', sha: blob.sha });
  }

  // Create tree
  const tree = await api('POST', `/repos/${REPO}/git/trees`, { tree: treeItems });
  console.log(`Tree: ${tree.sha}`);

  // Check for existing gh-pages branch
  const ref = await api('GET', `/repos/${REPO}/git/ref/heads/${BRANCH}`);
  const parentSha = ref?.object?.sha;

  // Create commit
  const commitBody = {
    message: 'Deploy shopping app PWA',
    tree: tree.sha,
    parents: parentSha ? [parentSha] : []
  };
  const commit = await api('POST', `/repos/${REPO}/git/commits`, commitBody);
  console.log(`Commit: ${commit.sha}`);

  // Update or create branch
  if (parentSha) {
    await api('PATCH', `/repos/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: true });
    console.log('Updated gh-pages branch');
  } else {
    await api('POST', `/repos/${REPO}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: commit.sha });
    console.log('Created gh-pages branch');
  }

  // Enable Pages
  const pages = await api('POST', `/repos/${REPO}/pages`, { source: { branch: BRANCH, path: '/' } });
  if (pages.html_url) {
    console.log(`Pages enabled: ${pages.html_url}`);
  } else {
    // Pages already enabled, just update
    const pagesUpdate = await api('PUT', `/repos/${REPO}/pages`, { source: { branch: BRANCH, path: '/' } });
    console.log('Pages updated:', pagesUpdate);
  }

  console.log('\n=== Deploy complete! ===');
  console.log('URL: https://cistus-01.github.io/shopping-app/');
}

main().catch(console.error);
