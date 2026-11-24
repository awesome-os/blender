import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  applyKeepLast5Pin,
  buildLaunchPlan,
  fetchGhostIndex,
  getBlenderAssetKey,
  getBlenderExecutableRelPath,
  parseCliArgs,
  tryResolveBlenderEntry,
  type GhostCasEntry,
} from '../src/index.mts';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLI_PATH = resolve(REPO_ROOT, 'src', 'cli.mts');

test('fetches live b8g-ghost cas-v1 index and checks blender-* entry gracefully', async () => {
  const index = await fetchGhostIndex(true);
  assert.ok(index.total_entries > 0, 'Expected non-empty cas-v1 index');

  const blenderKey = getBlenderAssetKey();
  const blenderEntry = await tryResolveBlenderEntry(blenderKey, index);

  if (blenderEntry) {
    assert.equal(blenderEntry.filename, blenderKey);
    assert.match(blenderEntry.sha256, /^[a-f0-9]{64}$/);
    assert.ok(blenderEntry.bytes > 10_000_000, 'Expected real Blender archive (>10 MB)');
  } else {
    assert.equal(blenderEntry, null);
  }
});

test('maps platform asset keys and executable paths accurately', () => {
  assert.equal(getBlenderAssetKey('win32', 'x64'), 'blender-win64.tar.zst');
  assert.equal(getBlenderAssetKey('linux', 'x64'), 'blender-linux-x64.tar.zst');
  assert.equal(getBlenderAssetKey('linux', 'arm64'), 'blender-linux-arm64.tar.zst');
  assert.equal(getBlenderAssetKey('darwin', 'arm64'), 'blender-macos-arm64.tar.zst');

  assert.equal(getBlenderExecutableRelPath('win32'), 'blender.exe');
  assert.equal(getBlenderExecutableRelPath('linux'), 'blender');
});

test('applies Keep-Last-5 BLENDER_GHOST_SHA256 pin when present in history', () => {
  const latestSha = 'a'.repeat(64);
  const prevSha = 'b'.repeat(64);
  const entry: GhostCasEntry = {
    filename: 'blender-win64.tar.zst',
    sha256: latestSha,
    bytes: 280_000_000,
    version: '4.4.0',
    download_url: `https://github.com/awesome-os/b8g-ghost/releases/download/cas-v1/${latestSha}`,
    history: [
      {
        sha256: prevSha,
        bytes: 275_000_000,
        version: '4.3.2',
        retired_at: '2026-11-20T00:00:00Z',
      },
    ],
  };

  const pinned = applyKeepLast5Pin(entry, prevSha);
  assert.equal(pinned.sha256, prevSha);
  assert.equal(pinned.bytes, 275_000_000);
  assert.equal(pinned.version, '4.3.2');
  assert.ok(pinned.download_url.endsWith(`/${prevSha}`));

  const unpinned = applyKeepLast5Pin(entry, 'c'.repeat(64));
  assert.equal(unpinned.sha256, latestSha);
});

test('parses CLI flags (--dry-run, --version, --no-splash, passthrough)', () => {
  const parsed = parseCliArgs(['--dry-run', '--no-splash', 'scene.blend', '--', '--version']);
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.showVersion, false);
  assert.deepEqual(parsed.forwardArgs, ['scene.blend', '--', '--version']);

  const ver = parseCliArgs(['-v']);
  assert.equal(ver.showVersion, true);
});

test('CLI --version and --dry-run execute cleanly and resolve CAS launch plan', async () => {
  const versionOut = execFileSync(process.execPath, [CLI_PATH, '--version'], {
    encoding: 'utf8',
  }).trim();
  assert.match(versionOut, /^@awesome-os\/blender 0\.1\.0 /);
  assert.ok(versionOut.includes(getBlenderAssetKey()));

  const dryRunOut = execFileSync(process.execPath, [CLI_PATH, '--dry-run', 'scene.blend'], {
    encoding: 'utf8',
  });
  const plan = JSON.parse(dryRunOut) as Awaited<ReturnType<typeof buildLaunchPlan>>;
  assert.equal(plan.version, '0.1.0');
  assert.equal(plan.blender.assetKey, getBlenderAssetKey());
  assert.ok(plan.blender.status === 'resolved' || plan.blender.status === 'pending-ingest');
  assert.deepEqual(plan.forwardArgs, ['scene.blend']);
});
