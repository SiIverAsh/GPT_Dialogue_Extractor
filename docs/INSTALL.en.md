# Installation Guide

This document is for end users.

Use it when:

- the extension is distributed through GitHub Releases, cloud storage, or a zip file
- the extension is not installed from the Edge / Chrome extension store

## What you will receive

Usually you will receive a zip file such as:

- `gpt-dialogue-extractor-edge.zip`

Extract it to a local folder first.

Do not use it directly from inside the zip archive.

## Install on Edge

1. Open `edge://extensions/`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the extracted extension folder
5. Open a ChatGPT conversation page and start using it

## Install on Chrome

1. Open `chrome://extensions/`
2. Turn on `Developer mode`
3. Click `Load unpacked`
4. Select the extracted extension folder
5. Open a ChatGPT conversation page and start using it

## How to use

### Export a conversation

1. Open a ChatGPT conversation
2. Click `导出` in the page header
3. Select which messages you want to export
4. Choose a format:
   - `导出 JSON`
   - `导出 Markdown`
   - `导出 PDF`
5. Choose the save location in the browser download dialog

### Use the timeline

The right side of the page shows a user-message timeline.

- hover a marker to preview the message
- click a marker to jump to that user message
- the current reading position is highlighted automatically

## How to update

When a new version is released:

1. Download the new zip package
2. Extract it locally
3. Open the extensions page
4. Refresh the current extension

If the folder layout changed, the safest way is:

1. remove the old extension
2. load the new extracted folder again

## Common issues

### 1. Clicking export does nothing

Try this first:

1. refresh the extension
2. refresh the ChatGPT page

### 2. PDF export fails

The current PDF export is generated directly by the extension and downloaded locally. It does not rely on the browser print dialog.

If it still fails, check:

- whether the browser blocks downloads
- whether another security extension interferes with the save flow

### 3. The old version still appears after updating

This usually means:

- the extension was not refreshed
- the ChatGPT tab was not refreshed

You need to refresh both.
