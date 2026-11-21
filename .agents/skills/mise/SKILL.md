---
name: mise
description: How to prepare the marc-mrt.github.io worktree and what proves a change in it.
---

## Install
`mise trust && mise install` (Hugo 0.152.2; no package dependencies).

## Services
None.

## Check
CI runs `hugo --minify` from `.github/workflows/main.yml`.

Browser behavior suite: `CHROME_BIN=/path/to/chromium node --test tests/theme.test.mjs`.
One test: `CHROME_BIN=/path/to/chromium node --test --test-name-pattern 'dark preference' tests/theme.test.mjs`.

## Gate
`hugo --minify` and `CHROME_BIN=/path/to/chromium node --test tests/theme.test.mjs`.

## Standards
`README.md` — project overview; no additional coding standards documented.
