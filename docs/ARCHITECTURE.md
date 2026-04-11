# Architecture

## Design intent

This scaffold copies the shape of Voyager's export feature, but not its Gemini-specific implementation.

Voyager's export system has two very different layers:

1. Platform-specific DOM logic
2. Platform-agnostic export logic

In Gemini Voyager, those two layers are still partially mixed inside one large content-script file.

For ChatGPT, this scaffold separates them from the start.

## Layers

### `src/core/export`

This is the platform-agnostic core.

It knows:

- what an exported conversation looks like
- what an export request looks like
- how an adapter should feed data into the exporter
- how to describe an export plan

It does not know:

- ChatGPT selectors
- Gemini selectors
- where a menu is
- how older messages are loaded

### `src/platforms/shared`

This contains the adapter contract.

The adapter is responsible for all site-specific behavior:

- detecting whether the current page is supported
- resolving export entry points
- collecting conversation messages from DOM
- loading older history if needed
- exposing unresolved assumptions that still need validation

### `src/platforms/chatgpt`

This contains the ChatGPT-specific scaffold.

It is split into:

- `ChatGPTAdapter.ts`: top-level adapter skeleton
- `ChatGPTSelectors.ts`: candidate selectors and unresolved selector groups
- `history/HistoryLoader.ts`: strategy options for loading older messages

## Why this split matters

If we skip the adapter boundary, the first implementation will work only for one DOM revision and will be expensive to maintain.

If we keep the boundary clean:

- selector changes stay local
- export formats stay reusable
- history-loading experiments stay isolated
- debugging gets easier because failures become classifiable

## Runtime flow we want

1. Entry point asks the adapter whether the current page is supported.
2. Adapter resolves a stable export trigger.
3. Export core asks adapter to ensure history is fully loaded.
4. Adapter collects DOM-backed conversation messages.
5. Export core transforms the collected data into one or more output formats.

## What is intentionally missing

The scaffold does not yet generate files.

That is on purpose: the current unknowns are DOM and history behavior, not serialization.
