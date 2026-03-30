---
name: publish-docker
description: Publish the Docker image
argument-hint: [patch|minor|major]
user_invocable: true
---

# Publish Docker Image

Publish the Deepsel CMS Docker image to GHCR via the GitHub Actions tag-push workflow.

## Arguments

- `$0` — (Optional) Bump level: `patch` (default), `minor`, or `major`.

If no argument is provided, default to `patch`.

## Workflow

### Step 1 — Determine version

1. Find the last `docker-v*` tag:
   ```bash
   git describe --tags --match 'docker-v*' --abbrev=0 2>/dev/null
   ```
2. If the user provided a bump level, apply it to the last version.
3. If no previous tag exists, ask the user for the initial version.

### Step 2 — Confirm with user

Ask: "Publishing **Docker image** v{version} — continue?"

### Step 3 — Create and push tag

```bash
git tag -a docker-v{version} -m "docker v{version}"
git push origin docker-v{version}
```

Do NOT push main — only push the tag.

### Step 4 — Verify

1. Confirm tag was pushed: `git ls-remote --tags origin | grep docker-v{version}`
2. Tell the user:
   - Tag `docker-v{version}` pushed — GitHub Actions will build and push the Docker image to GHCR.
   - Link to CI: `https://github.com/DeepselSystems/deepsel-cms/actions`

## Important

- **Never push main** — only push the tag.
- **Never amend a commit after its tag has been pushed.** If you forgot something, make a new commit with a new version.
- If the tag already exists, ask the user whether to delete and recreate it or pick a different version.
