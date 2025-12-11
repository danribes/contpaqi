# ContPAQi Website Integration

This directory contains files to automatically synchronize the downloadable installer between the `contpaqi` repository and the `contpaqi-website` repository.

## Overview

When a new version of the ContPAQi AI Bridge installer is built and released, the website is automatically updated with:
- Latest version number
- Download URL
- File checksums (SHA256, MD5)
- File size
- Release notes link

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   contpaqi repo     │         │ contpaqi-website    │
│                     │         │       repo          │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │ Push to main  │  │         │  │ Download Page │  │
│  │ or create tag │  │         │  │ with latest   │  │
│  └───────┬───────┘  │         │  │   version     │  │
│          │          │         │  └───────▲───────┘  │
│          ▼          │         │          │          │
│  ┌───────────────┐  │         │          │          │
│  │ Build Workflow│  │         │          │          │
│  │ - Build app   │  │         │          │          │
│  │ - Create .exe │  │         │          │          │
│  │ - Checksums   │  │         │          │          │
│  └───────┬───────┘  │         │          │          │
│          │          │         │          │          │
│          ▼          │         │          │          │
│  ┌───────────────┐  │         │  ┌───────────────┐  │
│  │Create Release │  │ trigger │  │Update Workflow│  │
│  │ with assets   │──┼────────►│  │ - Fetch info  │  │
│  └───────────────┘  │         │  │ - Update JSON │  │
│                     │         │  │ - Commit/Push │  │
│                     │         │  └───────────────┘  │
└─────────────────────┘         └─────────────────────┘
```

## Setup Instructions

### Step 1: Create Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with these scopes:
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
3. Copy the token

### Step 2: Add Secret to contpaqi Repository

1. Go to `contpaqi` repository → Settings → Secrets and variables → Actions
2. Create a new repository secret:
   - Name: `WEBSITE_REPO_TOKEN`
   - Value: (paste the token from Step 1)

### Step 3: Copy Workflow to contpaqi-website

1. Copy `update-download-workflow.yml` to:
   ```
   contpaqi-website/.github/workflows/update-download.yml
   ```

2. Optionally, add Vercel deploy hook secret if using Vercel:
   - Name: `VERCEL_DEPLOY_HOOK`
   - Value: (your Vercel deploy hook URL)

### Step 4: Add Download Component to Website

Copy the components to your website:

```bash
# From contpaqi-website root
cp /path/to/contpaqi/docs/website-integration/DownloadButton.tsx src/components/
```

### Step 5: Create Initial download-info.json

Create `public/download-info.json` in contpaqi-website:

```json
{
  "version": "1.0.0",
  "downloadUrl": "https://github.com/danribes/contpaqi/releases/download/v1.0.0/ContPAQi-AI-Bridge-Setup-1.0.0.exe",
  "releaseUrl": "https://github.com/danribes/contpaqi/releases/tag/v1.0.0",
  "sha256": "",
  "fileSize": null,
  "updatedAt": "2025-01-01T00:00:00Z",
  "requirements": {
    "os": "Windows 10/11 (64-bit)",
    "docker": "Docker Desktop",
    "dotnet": ".NET 6.0 Runtime"
  }
}
```

## Usage

### Creating a New Release

#### Option 1: Using Git Tags (Recommended)

```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

#### Option 2: Manual Workflow Dispatch

1. Go to Actions → "Build and Release Installer"
2. Click "Run workflow"
3. Enter version number (e.g., `1.0.0`)
4. Check "Create a GitHub release"
5. Click "Run workflow"

### Using Download Components

```tsx
// In your Next.js page
import { DownloadButton, DownloadCard } from '@/components/DownloadButton';

export default function DownloadPage() {
  return (
    <div>
      {/* Simple button */}
      <DownloadButton showDetails showChecksum />

      {/* Full card with requirements */}
      <DownloadCard />
    </div>
  );
}
```

### Using the Hook

```tsx
import { useDownloadInfo } from '@/components/DownloadButton';

function MyComponent() {
  const { downloadInfo, loading, error } = useDownloadInfo();

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <p>Latest version: {downloadInfo?.version}</p>
      <a href={downloadInfo?.downloadUrl}>Download</a>
    </div>
  );
}
```

## Files Included

| File | Description | Destination |
|------|-------------|-------------|
| `update-download-workflow.yml` | GitHub Actions workflow for website | `contpaqi-website/.github/workflows/` |
| `DownloadButton.tsx` | React components for download UI | `contpaqi-website/src/components/` |
| `README.md` | This documentation | Reference only |

## Workflow Details

### build-installer.yml (contpaqi repo)

Triggers on:
- Push to `main` with changes to `installer/`, `desktop-app/`, `windows-bridge/`, or `mcp-container/`
- Push of version tags (`v*`)
- Manual dispatch

Actions:
1. Builds Electron desktop app
2. Builds .NET Windows Bridge
3. Builds Docker image and saves as tar
4. Compiles Inno Setup installer
5. Generates checksums
6. Creates GitHub release
7. Triggers website update

### update-download.yml (contpaqi-website repo)

Triggers on:
- `repository_dispatch` event from contpaqi repo
- Manual dispatch

Actions:
1. Receives version and URL information
2. Fetches checksums from release
3. Updates `public/download-info.json`
4. Commits and pushes changes
5. Optionally triggers Vercel deployment

## Troubleshooting

### Workflow not triggering website update

1. Check that `WEBSITE_REPO_TOKEN` secret is set correctly
2. Verify the token has `repo` and `workflow` scopes
3. Check Actions logs for errors

### Download info not updating

1. Verify `update-download.yml` is in `.github/workflows/`
2. Check that the workflow has permissions to push
3. Look at the workflow run logs

### 404 on download URL

1. Verify the release was created successfully
2. Check that assets were uploaded to the release
3. Ensure the filename matches the expected pattern

## Environment Variables

### contpaqi repo

| Secret | Description |
|--------|-------------|
| `WEBSITE_REPO_TOKEN` | PAT with repo access to contpaqi-website |

### contpaqi-website repo

| Secret | Description |
|--------|-------------|
| `VERCEL_DEPLOY_HOOK` | (Optional) Vercel deploy hook URL |

| Environment Variable | Description |
|---------------------|-------------|
| `NEXT_PUBLIC_APP_VERSION` | Fallback version number |
| `NEXT_PUBLIC_DOWNLOAD_URL` | Fallback download URL |

## Security Considerations

1. **Token Scope**: Use minimal required scopes for the PAT
2. **Token Rotation**: Rotate the PAT periodically
3. **Checksums**: Always display SHA256 for user verification
4. **HTTPS**: All download URLs use HTTPS

## Contributing

To modify the integration:

1. Update workflows in `contpaqi/.github/workflows/`
2. Update components in `docs/website-integration/`
3. Test with manual workflow dispatch
4. Create a PR with changes
