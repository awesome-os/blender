#!/usr/bin/env node
/**
 * @file src/cli.mts
 * @description Zero-installer `blender` CLI:
 *   - Hydrates debloated rolling-latest Blender from `awesome-os/b8g-ghost @ cas-v1`
 *     into `~/.b8g/cas/blender/<sha256>/` if missing.
 *   - Spawns `blender.exe` / `blender` detached with forwarded user arguments.
 *   - `--dry-run`: resolves CAS entries and prints the launch plan JSON without spawning.
 *   - `--version` / `-v`: prints version and platform CAS asset key.
 */

import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ensureBlenderBinary,
  fetchGhostIndex,
  getBlenderAssetKey,
  getBlenderExecutableRelPath,
  getGhostCacheDir,
  tryResolveBlenderEntry,
} from './hydrate.mts';

export interface ParsedCliArgs {
  dryRun: boolean;
  showVersion: boolean;
  showHelp: boolean;
  forwardArgs: string[];
}

export interface LaunchPlan {
  version: string;
  cacheDir: string;
  blender: {
    assetKey: string;
    status: 'resolved' | 'pending-ingest';
    sha256: string | null;
    bytes: number | null;
    blenderVersion: string | null;
    executablePath: string | null;
  };
  forwardArgs: string[];
}

export function getPackageVersion(): string {
  try {
    const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
    return pkg.version ?? '0.1.0';
  } catch {
    return '0.1.0';
  }
}

export function parseCliArgs(argv: readonly string[]): ParsedCliArgs {
  const forwardArgs: string[] = [];
  let dryRun = false;
  let showVersion = false;
  let showHelp = false;
  let passthrough = false;

  for (const arg of argv) {
    if (!passthrough && arg === '--') {
      passthrough = true;
      forwardArgs.push(arg);
      continue;
    }
    if (!passthrough && arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (!passthrough && (arg === '--version' || arg === '-v')) {
      showVersion = true;
      continue;
    }
    if (!passthrough && (arg === '--help' || arg === '-h')) {
      showHelp = true;
      continue;
    }
    if (!passthrough && arg === '--no-splash') {
      continue;
    }
    forwardArgs.push(arg);
  }

  return { dryRun, showVersion, showHelp, forwardArgs };
}

export async function buildLaunchPlan(parsed: ParsedCliArgs): Promise<LaunchPlan> {
  const idx = await fetchGhostIndex();
  const cacheDir = getGhostCacheDir();
  const blenderKey = getBlenderAssetKey();
  const entry = await tryResolveBlenderEntry(blenderKey, idx);
  const executablePath = entry
    ? join(cacheDir, 'blender', entry.sha256, getBlenderExecutableRelPath())
    : null;

  return {
    version: getPackageVersion(),
    cacheDir,
    blender: {
      assetKey: blenderKey,
      status: entry ? 'resolved' : 'pending-ingest',
      sha256: entry?.sha256 ?? null,
      bytes: entry?.bytes ?? null,
      blenderVersion: entry?.version ?? null,
      executablePath,
    },
    forwardArgs: parsed.forwardArgs,
  };
}

export async function runCli(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const parsed = parseCliArgs(argv);

  if (parsed.showVersion) {
    console.log(
      `@awesome-os/blender ${getPackageVersion()} (${process.platform}/${process.arch} | blender=${getBlenderAssetKey()})`,
    );
    return;
  }

  if (parsed.showHelp) {
    console.log(
      [
        `blender ${getPackageVersion()} — Debloated rolling-latest Blender on b8g-ghost CAS`,
        '',
        'Usage: blender [options] [scene.blend / flags...]',
        '',
        'Options:',
        '  --dry-run     Resolve CAS entry and print launch plan JSON without launching',
        '  --no-splash   Skip Lumi Hydration Splash (native launcher)',
        '  -v, --version Print version and platform CAS asset key',
        '  -h, --help    Show this help message',
        '',
        'Environment:',
        '  BLENDER_GHOST_SHA256  Pin to a Keep-Last-5 SHA-256 from b8g-ghost cas-v1',
        '  BLENDER_PROGRESS=1    Emit GHOST_PROGRESS <pct> <msg> lines on stdout',
      ].join('\n'),
    );
    return;
  }

  if (parsed.dryRun) {
    const plan = await buildLaunchPlan(parsed);
    console.log(JSON.stringify(plan, null, 2));
    return;
  }

  const blender = await ensureBlenderBinary();

  if (process.env.BLENDER_VERBOSE === '1') {
    console.error(
      `[awesome-os/blender] executable=${blender.executablePath} (cacheHit=${blender.cacheHit})`,
    );
  }

  const child = spawn(blender.executablePath, parsed.forwardArgs, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
    env: {
      ...process.env,
      B8G_GHOST_CAS_DIR: getGhostCacheDir(),
    },
  });
  child.unref();
}

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  await runCli();
}
