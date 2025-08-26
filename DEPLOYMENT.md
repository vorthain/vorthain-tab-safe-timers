# Deployment & Auto-Versioning Guide for @vorthain/tab-safe-timers

This project uses **automatic versioning and publishing** based on commit messages. Here's how it works:

## Commit Message Rules

Your commit message determines what happens:

### Patch Version (1.0.0 → 1.0.1)

```bash
git commit -m "fix: memory leak in timer cleanup"
git commit -m "bug: handle edge case when worker fails"
git commit -m "patch: improve delay sanitization"
```

### Minor Version (1.0.0 → 1.1.0)

```bash
git commit -m "feat: add worker health monitoring"
git commit -m "feature: support for batch timer ticks"
```

### Major Version (1.0.0 → 2.0.0)

```bash
git commit -m "BREAKING: remove string callback support"
git commit -m "breaking: change initialization API"
git commit -m "feat: new timer API [breaking]"
```

### Skip Publishing (no version change)

```bash
git commit -m "docs: update README [skip]"
git commit -m "style: fix formatting"
git commit -m "refactor: clean up TabSafeTimers class"
git commit -m "test: add more coverage"
git commit -m "chore: update dependencies"
```

## Auto-Publishing Workflow

### For All Pushes & Pull Requests:

1. **Tests run with coverage** (`npm run test:ci`)
2. Verifies coverage meets thresholds:
   - 60% branch coverage
   - 75% function coverage  
   - 75% line coverage
   - 75% statement coverage

### For Pushes to Main Branch Only:

2. **After tests pass, Publishing runs:**
   - Analyzes commit message
   - Auto-bumps version in package.json
   - Creates git tag (e.g., v1.2.3)
   - Publishes to npm

## Testing & Coverage

### Local Development

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Open coverage report in browser
open coverage/lcov-report/index.html
```

### Coverage Requirements

Your tests must maintain:
- **60%** branch coverage
- **75%** function coverage
- **75%** line coverage
- **75%** statement coverage

**If coverage drops below these thresholds, publishing will fail!**

## Examples

### Publishing a Bug Fix

```bash
git add .
git commit -m "fix: prevent memory leak when destroying timers"
git push origin main
# → Runs tests → If pass → Publishes v0.1.1 automatically
```

### Adding a New Feature

```bash
git add .
git commit -m "feat: add debug mode for timer tracking"
git push origin main
# → Runs tests → If pass → Publishes v0.2.0 automatically
```

### Breaking Changes

```bash
git add .
git commit -m "BREAKING: remove deprecated string callback support"
git push origin main
# → Runs tests → If pass → Publishes v1.0.0 automatically
```

### Documentation Changes (No Publish)

```bash
git add .
git commit -m "docs: improve JSDoc comments [skip]"
git push origin main
# → Runs tests only, no version bump, no publish
```

## Setup Requirements

### 1. GitHub Secrets needed:

Go to your repo → Settings → Secrets and variables → Actions → New repository secret:

- **Name**: `NPM_TOKEN`
- **Value**: Your npm automation token

### 2. Get NPM Token:

```bash
# Login to npm
npm login

# Create automation token
npm token create --type=automation
# Copy the token and add it to GitHub secrets
```

### 3. File structure:

```
.
├── src/
│   ├── index.js         # Main source file
│   └── index.test.js     # Test file
├── .github/
│   └── workflows/
│       └── publish.yml   # CI/CD workflow
├── package.json
├── jest.config.cjs
├── jest.setup.cjs
├── babel.config.cjs
├── README.md
└── LICENSE
```

## What Gets Published

Since this is a **pure JavaScript library**, we publish the source files directly:

- ✅ `src/` folder (all source files)
- ✅ `README.md`
- ✅ `LICENSE`
- ❌ Tests (`src/**/*.test.js`)
- ❌ Config files
- ❌ Coverage reports
- ❌ `node_modules/`

## Important Notes

- **Only pushes to `main` branch trigger publishing**
- **Pull requests only run tests** (no publishing)
- **Failed tests = no publishing**
- **Low coverage = no publishing**
- **Each push can only publish once** (no duplicate versions)
- **Pure JS means no build step** - source files are published directly

## Best Practices

1. **Write tests for new features** - Coverage requirements enforced!
2. **Use descriptive commit messages**
3. **Test locally before pushing** (`npm run test:coverage`)
4. **Use `[skip]` for non-code changes**
5. **Check the Actions tab** to see publish status
6. **Keep coverage above thresholds**

## Library-Specific Testing

```bash
# Test the library
npm test

# Test with coverage
npm run test:coverage

# Manual browser testing (create test.html):
```

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Tab Safe Timers</title>
</head>
<body>
  <div id="counter">0</div>
  <script type="module">
    import { initTabSafeTimers } from './src/index.js';
    
    initTabSafeTimers();
    
    let count = 0;
    setInterval(() => {
      document.getElementById('counter').textContent = ++count;
      console.log('Timer tick:', count);
    }, 1000);
  </script>
</body>
</html>
```

## Troubleshooting

### Tests Failing?

```bash
# Run locally to debug
npm run test:coverage
# Check mocked Worker implementation
```

### Coverage Too Low?

```bash
# See detailed coverage report
npm run test:coverage
open coverage/lcov-report/index.html
# Add tests for uncovered functions
```

### NPM Token Issues?

```bash
# Verify token has correct permissions
npm whoami
# Should show your npm username

# Check if token is automation type
# Automation tokens can publish from CI/CD
```

---

**Need help?** Check the GitHub Actions logs in the "Actions" tab of your repo.

**First time setup checklist:**

- [ ] Add `NPM_TOKEN` to GitHub repository secrets
- [ ] Verify you're a maintainer of the `@vorthain/tab-safe-timers` package on npm
- [ ] Test locally with `npm run test:coverage`
- [ ] Push with a commit message like `feat: initial release` to test workflow