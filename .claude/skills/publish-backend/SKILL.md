---
name: publish-backend
description: Publish the backend (deepsel-cms) package to PyPI by bumping version, committing, tagging, and pushing
argument-hint: [patch|minor|major]
user_invocable: true
---

# Publish Backend Package

Publish deepsel-cms to PyPI via the GitHub Actions tag-push workflow.

## Arguments

- `$0` — (Optional) Bump level: `patch` (default), `minor`, or `major`.

If no argument is provided, default to `patch`.

## Workflow

### Step 1 — Run prepush checks

Run all checks from the `backend/` directory:

```bash
cd backend && make prepush
```

If any check fails, fix the errors and re-run. Do NOT proceed until all checks pass.

### Step 2 — Check dist builds

```bash
cd backend && make check-dist
```

This builds the distribution and validates it with twine. Fix any errors before proceeding.

### Step 3 — Determine bump level

1. If the user provided a bump level argument, use it.
2. Otherwise, look at changes since the last `backend-v*` tag:
   ```bash
   git log --oneline $(git describe --tags --match 'backend-v*' --abbrev=0 2>/dev/null || echo HEAD~10)..HEAD -- backend/
   ```
   - **major** — breaking API changes (removed models, renamed public interfaces, changed schemas)
   - **minor** — new features (new models, new routers, new utilities)
   - **patch** — bug fixes, internal refactors, docs
   Default to `patch` if uncertain.

### Step 4 — Bump version

```bash
cd backend && make bump-{level}
```

Read the new version:

```bash
grep '^version = ' backend/pyproject.toml
```

### Step 5 — Check if version is already published

```bash
pip index versions deepsel-cms 2>/dev/null | head -5
```

If the new version is already on PyPI, bump again or ask the user.

### Step 6 — Confirm with user

Ask: "Publishing **deepsel-cms** v{version} — continue?"

### Step 7 — Stage and commit

```bash
git add backend/pyproject.toml
git commit -m "bump backend v{version}"
```

### Step 8 — Create and push tag

```bash
git tag -a backend-v{version} -m "deepsel-cms v{version}"
git push origin backend-v{version}
```

Do NOT push main — only push the tag.

### Step 9 — Verify

1. Confirm tag was pushed: `git ls-remote --tags origin | grep backend-v{version}`
2. Tell the user:
   - Tag `backend-v{version}` pushed — GitHub Actions will publish to PyPI.
   - Remind them to push main: `git push origin main`
   - Link to CI: `https://github.com/DeepselSystems/deepsel-cms/actions`

## Important

- **Never push main** — only push the tag.
- **Never skip prepush or check-dist** — the same checks run in CI.
- **Never use `--no-verify`** when committing.
- **Never amend a commit after its tag has been pushed.** If you forgot something, make a new commit with a new version.
- If the tag already exists, ask the user whether to delete and recreate it or pick a different version.
