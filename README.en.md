# ChatGPT Exporter

[中文](./README.md) | [English](./README.en.md)

A browser extension for exporting the current ChatGPT conversation.

This project reads the rendered conversation directly from the live `chatgpt.com` page and exports it to local files. It does not rely on private API scraping.

## Main Features

- Export the current conversation as `JSON`
- Export the current conversation as `Markdown`
- Export the current conversation as `PDF`
- Choose a custom save location
- Select which messages to export
- Load older history before export
- Restore the reading position after export preparation
- Export code blocks
- Export common formulas
- Right-side user-message timeline with hover preview and jump navigation

## Installation

### Edge

1. Open `edge://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the project folder:
   the repository root that contains `manifest.json`

### Chrome

1. Open `chrome://extensions/`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the project folder:
   the repository root that contains `manifest.json`

## How To Use

### 1. Open a conversation page

Open any ChatGPT conversation page:

- `https://chatgpt.com/*`
- `https://chat.openai.com/*`

The extension injects itself automatically.

### 2. Open the export panel

Click the `导出` button in the top action area of the page.

This opens the export panel.

### 3. Choose the export scope

The panel shows the messages from the current conversation.

You can:

- keep the default full selection
- select only part of the conversation
- click `刷新列表`
- click `全选`
- click `清空`

If no message is selected, export will fail.

### 4. Choose an export format

The panel provides three formats:

- `导出 JSON`
- `导出 Markdown`
- `导出 PDF`

#### JSON

Best for structured archiving and post-processing.

#### Markdown

Best for editing in Obsidian, Typora, VS Code, or a knowledge base.

#### PDF

Best for saving and sharing.

The current PDF export does not use the browser print dialog. The extension generates the PDF directly and downloads it, which makes it less likely to be affected by print-blocking extensions.

### 5. Save the file

After clicking export, the browser opens a save dialog.

You can:

- choose the destination folder
- rename the file
- confirm the download

### 6. History loading behavior

If older messages have not been fully loaded in the page yet, the extension will load them before export.

After that, it tries to restore your previous reading position instead of leaving the page at the top.

### 7. Use the timeline

The right side of the page shows a user-message timeline.

Usage:

- each marker represents one user message
- hover on a marker to preview that message
- click a marker to jump to that message
- the currently active user message is highlighted while scrolling

## Refresh During Development

If you change the extension code, refresh both:

1. the extension in the extensions page
2. the ChatGPT tab itself

Otherwise the browser may still be running an older content script.

## Current Limitations

- Only the currently opened conversation can be exported
- No batch export for multiple conversations
- Table export is not yet high fidelity
- PDF currently prioritizes reliable export over exact visual reproduction

If your goal is to reliably export the current ChatGPT conversation to local files, this version is already usable.
