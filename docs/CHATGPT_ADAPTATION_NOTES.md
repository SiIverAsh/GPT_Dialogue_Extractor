# ChatGPT Adaptation Notes

## Known direction

This exporter should follow Voyager's DOM-based design.

It should not depend on:

- private ChatGPT APIs
- replaying network requests
- scraping authenticated backend endpoints from outside the page

## What must be validated on a real ChatGPT conversation page

### 1. Conversation root

We need the real scroll container that owns the message list.

Questions:

- Is the message list rooted in `main`, or a nested scroll container?
- Does ChatGPT virtualize turns?
- Do older turns disappear from DOM while scrolling?

### 2. User and assistant message selectors

We need stable selectors for:

- user turns
- assistant turns
- message body content
- message action area

Questions:

- Are there reliable author role attributes?
- Are turns rendered as `article`, `div`, or custom components?
- Is the role encoded in a data attribute, aria attribute, avatar block, or layout pattern?

### 3. Rich content extraction

We must identify:

- markdown container
- code block container
- table container
- formula container
- image / attachment container
- any "thinking" or expandable reasoning container that should be excluded

### 4. Export entry points

We need a stable place to inject:

- a global export button
- optional message-level export button

Questions:

- Is there a stable top toolbar?
- Is there a conversation menu?
- Does hover-only UI make message-level injection too fragile for v1?

### 5. History loading

This is the most important unknown.

Potential modes:

- all history already exists in DOM
- scroll-up lazy loading
- explicit "load more" interaction
- route transition or pagination

The first implementation should assume only "currently loaded DOM" is available.

## Recommended implementation order

1. Global export button
2. Current DOM only export
3. Message pairing validation
4. Markdown export
5. History completion strategy
6. Message-level export
7. Image and PDF polish

## Failure modes to watch

- duplicated turns due to nested containers
- missing turns due to virtualization
- selecting layout wrappers instead of actual content nodes
- exporting reasoning containers that are not part of the visible answer
- title extraction returning generic page text instead of conversation title
