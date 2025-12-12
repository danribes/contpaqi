# ContPAQi Website Integration Files

These files should be copied to your `contpaqi-website` repository to enable
automatic download link updates when new installer releases are published.

## Files to Copy

1. `.github/workflows/update-download.yml` - GitHub Actions workflow
2. `src/config/download.json` - Download configuration (auto-updated)
3. `src/components/DownloadButton.tsx` - React component example

## Setup Steps

1. Copy these files to your website repo
2. Create a Personal Access Token (PAT) with `repo` scope
3. Add the PAT as `WEBSITE_REPO_TOKEN` secret in the `contpaqi` repo
4. Push a release tag (e.g., `git tag v1.0.0 && git push origin v1.0.0`)

The workflow will automatically update `download.json` when releases are published.
