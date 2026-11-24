/**
 * @file src/index.mts
 * @description Public API for @awesome-os/blender: CAS hydration and launch helpers.
 */

export {
  applyKeepLast5Pin,
  ensureBlenderBinary,
  fetchGhostIndex,
  GHOST_CAS_BASE_URL,
  GHOST_INDEX_URL,
  getBlenderAssetKey,
  getBlenderExecutableRelPath,
  getGhostCacheDir,
  locateExtractedExecutable,
  resolveBlenderEntry,
  tryResolveBlenderEntry,
  type GhostCasEntry,
  type GhostCasHistoryItem,
  type GhostIndex,
  type HydratedBlenderResult,
} from './hydrate.mts';

export {
  buildLaunchPlan,
  getPackageVersion,
  parseCliArgs,
  runCli,
  type LaunchPlan,
  type ParsedCliArgs,
} from './cli.mts';
