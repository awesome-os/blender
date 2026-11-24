# `@awesome-os/blender`

Debloated rolling-latest **Blender** hydrated on demand from [`awesome-os/b8g-ghost`](https://github.com/awesome-os/b8g-ghost) (`cas-v1`) with a `~118 KB` native C11 **Lumi Hydration Splash** launcher (Keep-Last-5, zero installer).

## Highlights

- **Zero Installer & Zero Bloat:** Hydrates directly into `~/.b8g/cas/blender/<sha256>/` and spawns `blender.exe` / `blender` detached with forwarded user arguments.
- **SHA-256 Verified Ghost CAS (`cas-v1`):** Downloads `blender-win64.tar.zst` / `blender-linux-x64.tar.zst`, verifies SHA-256 before extraction, and supports Keep-Last-5 rollback via `BLENDER_GHOST_SHA256=<sha256>`.
- **Instant `< 15 ms` Lumi Hydration Splash:** Native Win32 GDI / POSIX C11 launcher (`src/blender_launcher.c`) displays the embedded Lumi White Dragon icon and streams live `GHOST_PROGRESS <pct> <msg>` updates during cold CAS hydration.
- **Erasable TypeScript Direct Execution:** Zero build/transpile step (`erasableSyntaxOnly: true`, `noEmit: true`), runs directly on Node 22.18+ / Node 24.

## Usage

### Native Launcher (`blender.exe` / `blender`)

```powershell
# Launch Blender with Lumi Hydration Splash
.\dist\blender.exe scene.blend

# Inspect version & CAS asset key
.\dist\blender.exe --version
```

### Node CLI (`src/cli.mts`)

```powershell
# Print version and platform CAS key
node src/cli.mts --version

# Resolve CAS index and print launch plan JSON without spawning
node src/cli.mts --dry-run scene.blend

# Stream GHOST_PROGRESS lines during hydration
$env:BLENDER_PROGRESS="1"; node src/cli.mts
```

## Environment Variables

| Variable | Description |
| :--- | :--- |
| `BLENDER_GHOST_SHA256` | Pin to a Keep-Last-5 historical SHA-256 from `b8g-ghost @ cas-v1`. |
| `BLENDER_PROGRESS=1` | Emit `GHOST_PROGRESS <pct> <msg>` lines on stdout during hydration. |
| `BLENDER_CLI_PATH` | Override path to `src/cli.mts` for the native C11 launcher. |
| `B8G_GHOST_CACHE_DIR` | Override default `~/.b8g/cas` cache directory. |

## Build & Test

```powershell
# Run CAS & CLI test suite
node --test test/blender-cas.test.mts

# Compile Windows native launcher (~118 KB with embedded Lumi icon)
zig cc -target x86_64-windows-gnu -std=c11 -Os -s -Wl,--subsystem,windows -Wall -Wextra src/blender_launcher.c lumi.res -lgdi32 -luser32 -o dist/blender.exe

# Compile Linux native launcher
gcc -std=c11 -Os -s -Wall -Wextra src/blender_launcher.c -o dist/blender
```

## License

Dual-licensed under **GPL-3.0-or-later OR MIT**.
