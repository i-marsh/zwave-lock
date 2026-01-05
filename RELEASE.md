# Release Process

This document describes how to create a new release with binary distributions for all supported platforms.

## Supported Platforms

The release workflow automatically builds binary distributions for:
- **Linux x64** - Ubuntu, Debian, Fedora, CentOS, etc.
- **Linux ARM64** - Raspberry Pi, ARM servers
- **macOS x64** - Intel-based Macs
- **macOS ARM64** - Apple Silicon Macs (M1, M2, M3)
- **Windows x64** - Windows 10/11

## Prerequisites

- Write access to the repository
- All changes committed and pushed to main branch
- Tests passing on CI

## Creating a Release

### 1. Update Version

Update the version in `package.json`:
```json
{
  "version": "1.1.0"
}
```

### 2. Update CHANGELOG.md

Add a new section for the release with all changes since the last release.

### 3. Commit Version Changes

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 1.1.0"
git push origin main
```

### 4. Create and Push Tag

```bash
# Create annotated tag
git tag -a v1.1.0 -m "Release v1.1.0"

# Push tag to trigger release workflow
git push origin v1.1.0
```

### 5. Monitor Release Workflow

1. Go to [Actions tab](https://github.com/i-marsh/zwave-lock/actions)
2. Watch the "Release" workflow
3. The workflow will:
   - Build binaries for all platforms (in parallel)
   - Create a GitHub release
   - Upload all binary distributions as release assets

### 6. Verify Release

1. Go to [Releases page](https://github.com/i-marsh/zwave-lock/releases)
2. Verify all 5 binary distributions are attached:
   - `zwave-lock-controller-linux-x64.tar.gz`
   - `zwave-lock-controller-linux-arm64.tar.gz`
   - `zwave-lock-controller-macos-x64.tar.gz`
   - `zwave-lock-controller-macos-arm64.tar.gz`
   - `zwave-lock-controller-win-x64.zip`
3. Download and test at least one binary for your platform

## Manual Testing

To test a binary distribution locally:

```bash
# Download the appropriate binary for your platform
wget https://github.com/i-marsh/zwave-lock/releases/download/v1.1.0/zwave-lock-controller-linux-x64.tar.gz

# Extract
tar -xzf zwave-lock-controller-linux-x64.tar.gz
cd zwave-lock-controller

# Test
./zwave-lock --help
./zwave-lock --version
```

## Troubleshooting

### Release workflow fails

1. Check the workflow logs in the Actions tab
2. Common issues:
   - Build errors: Fix in code and create a new tag
   - Permission errors: Verify GITHUB_TOKEN permissions
   - Platform-specific failures: Check matrix configuration

### Missing binaries in release

1. Check if all build jobs completed successfully
2. Verify artifact upload step completed
3. Check release creation step for errors

### Binary doesn't work

1. Verify Node.js is installed on the target system (`node --version`)
2. Check if all dependencies are included in the archive
3. Verify wrapper scripts have execute permissions (Unix/macOS)

## Manual Release (Fallback)

If the automated workflow fails, you can create a release manually:

### 1. Build Locally

```bash
# Install dependencies
npm ci

# Build TypeScript
npm run build

# Create distribution
mkdir -p dist-release/zwave-lock-controller
cp -r dist node_modules public package.json package-lock.json README.md LICENSE config.example.json dist-release/zwave-lock-controller/

# Create wrapper scripts
cat > dist-release/zwave-lock-controller/zwave-lock << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/dist/index.js" "$@"
EOF
chmod +x dist-release/zwave-lock-controller/zwave-lock

cat > dist-release/zwave-lock-controller/zwave-lock-api << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/dist/api.js" "$@"
EOF
chmod +x dist-release/zwave-lock-controller/zwave-lock-api

# Create archive
cd dist-release
tar -czf zwave-lock-controller-linux-x64.tar.gz zwave-lock-controller
```

### 2. Create Release on GitHub

1. Go to [Releases page](https://github.com/i-marsh/zwave-lock/releases)
2. Click "Draft a new release"
3. Choose your tag
4. Add release notes
5. Upload the binary archives
6. Publish release

## Release Checklist

- [ ] Version updated in package.json
- [ ] CHANGELOG.md updated
- [ ] All tests passing
- [ ] Tag created and pushed
- [ ] Release workflow completed successfully
- [ ] All 5 binaries attached to release
- [ ] Release notes are clear and helpful
- [ ] At least one binary tested locally
- [ ] Release published (not draft)

## Notes

- The release workflow is triggered by any tag matching `v*` (e.g., v1.0.0, v1.1.0, v2.0.0-beta)
- Binary distributions include all npm dependencies but require Node.js to be installed on the target system
- Each platform builds on its native runner for best compatibility
- Linux ARM64 builds on ubuntu-latest (cross-platform)
