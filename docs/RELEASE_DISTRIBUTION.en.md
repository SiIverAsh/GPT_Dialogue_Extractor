# GitHub Release Distribution Guide

This document is for the repository maintainer.

Goal:

- distribute the extension without using the browser extension store
- package it and let users install it manually

## Recommended distribution method

Use:

1. GitHub Releases
2. upload a zip package
3. let users install it via `Load unpacked`

For the current project, this is the most practical non-store distribution flow.

## Packaging steps

Run this in the repository root:

```powershell
npm run release:prepare
```

This generates:

- `release/edge-store/`
- `release/gpt-dialogue-extractor-edge.zip`

## Recommended release asset

Upload at least:

- `gpt-dialogue-extractor-edge.zip`

You may also include:

- a short installation guide

## Recommended release notes

Your GitHub Release notes should at least mention:

1. this is an unpacked developer-mode extension
2. users must extract and load it manually
3. supported browsers
4. what changed in the current version

## User installation guide

See:

- [INSTALL.en.md](./INSTALL.en.md)

## Pre-release checklist

1. `npm run build`
2. `npm run typecheck`
3. `npm run release:prepare`
4. extract the release package and verify it contains at least:
   - `manifest.json`
   - `src/background/index.js`
   - `src/content/index.js`
   - `src/content/styles.css`
5. load the release folder in Edge or Chrome once
6. test:
   - JSON export
   - Markdown export
   - PDF export
   - timeline jump

## Not recommended

At the current stage, do not rely on:

- asking users to clone the repository
- sending raw source folders without packaging
- `.crx` offline installation as the main path

For this project, GitHub Release + extracted-folder loading is the simplest and most reliable way to distribute it without a store.
