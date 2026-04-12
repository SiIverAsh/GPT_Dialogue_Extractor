// @ts-nocheck
(function () {
  if (window.__chatgptExporterLoaded) {
    return;
  }

  window.__chatgptExporterLoaded = true;

  const TURN_SELECTOR = 'section[data-testid^="conversation-turn-"]';
  const HEADER_ACTIONS_SELECTOR = "#conversation-header-actions";
  const USER_ROLE_SELECTOR = '[data-message-author-role="user"]';
  const USER_BODY_SELECTOR = '[data-message-author-role="user"] .whitespace-pre-wrap';
  const ASSISTANT_ROLE_SELECTOR = '[data-message-author-role="assistant"]';
  const ASSISTANT_PRIMARY_SELECTOR =
    '[data-message-author-role="assistant"][data-turn-start-message="true"]';
  const ASSISTANT_BODY_SELECTOR = ".markdown";
  const CODE_CONTENT_SELECTOR = ".cm-content";
  const MATH_ROOT_SELECTOR = [
    ".katex-display",
    ".math-display",
    ".katex",
    "math",
    "mjx-container",
    "[data-latex]",
    "[data-tex]",
    'script[type^="math/tex"]',
  ].join(", ");
  const INLINE_MATH_ROOT_SELECTOR = [
    ".katex",
    "math",
    "mjx-container",
    "[data-latex]",
    "[data-tex]",
    'script[type^="math/tex"]',
  ].join(", ");
  const BLOCK_MATH_ROOT_SELECTOR = [
    ".katex-display",
    ".math-display",
    'mjx-container[display="true"]',
    '[data-tex-display="true"]',
    '[data-latex-display="true"]',
  ].join(", ");
  const WRAPPER_ID = "cge-exporter-toolbar";
  const EXPORT_BUTTON_ID = "cge-exporter-button";
  const PORTAL_ID = "cge-exporter-portal";
  const PANEL_ID = "cge-exporter-panel";
  const BACKDROP_ID = "cge-exporter-backdrop";
  const TIMELINE_PANEL_ID = "cge-timeline-panel";
  const TIMELINE_LIST_ID = "cge-timeline-list";
  const TIMELINE_DIRECTORY_ID = "cge-timeline-directory";
  const TIMELINE_TOGGLE_ID = "cge-timeline-toggle";
  const TIMELINE_TOOLTIP_ID = "cge-timeline-tooltip";
  const STATUS_ID = "cge-exporter-status";
  const SCOPE_ID = "cge-exporter-scope";
  const REFRESH_LIST_ID = "cge-refresh-list";
  const SELECT_ALL_ID = "cge-select-all";
  const CLEAR_ALL_ID = "cge-clear-all";
  const SELECTION_SUMMARY_ID = "cge-selection-summary";
  const MESSAGE_LIST_ID = "cge-message-list";
  const MAX_HISTORY_ITERATIONS = 80;
  const STABLE_HISTORY_ROUNDS = 3;
  const TIMELINE_SCROLL_PADDING = 12;
  const TIMELINE_MIN_TOP_CLEARANCE = 96;
  const TIMELINE_ACTIVE_LOCK_MS = 1200;
  const TIMELINE_CONDENSE_THRESHOLD = 16;
  const TIMELINE_MIN_MARKER_GAP = 8;
  const TIMELINE_MIN_MARKERS = 16;
  const TIMELINE_MAX_MARKERS = 16;
  const TIMELINE_FOCUS_WINDOW = 9;

  let injectTimer = 0;
  let exportInFlight = false;
  let selectionInFlight = false;
  let timelineInFlight = false;
  let latestConversation = null;
  let selectedMessageIds = new Set();
  let selectionLoaded = false;
  let activeTimelineMessageId = "";
  let currentTimelineScroller = null;
  let timelineScrollFrame = 0;
  let timelineRefreshTimer = 0;
  let lastSelectionSignature = "";
  let lastTimelineSignature = "";
  let timelineLockedMessageId = "";
  let timelineLockedUntil = 0;
  let timelineDirectoryExpanded = false;

  function delay(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  function normalizeWhitespace(value) {
    return value.replace(/\r\n/g, "\n").replace(/\u00a0/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }

  function sanitizeFileName(value) {
    const cleaned = value
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return cleaned || "chatgpt-conversation";
  }

  function getConversationSignature(conversation) {
    if (!conversation || !Array.isArray(conversation.messages)) {
      return "";
    }

    return conversation.messages.map((message) => message.id).join("|");
  }

  function cleanConversationTitle() {
    const rawTitle = document.title || "chatgpt-conversation";
    return sanitizeFileName(
      rawTitle
        .replace(/\s*-\s*ChatGPT\s*$/i, "")
        .replace(/\s*\|\s*ChatGPT\s*$/i, "")
        .trim(),
    );
  }

  function createToolbarButton(label, id) {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.className = "cge-toolbar-button";
    button.textContent = label;
    return button;
  }

  function createButton(label, format) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cge-panel-button";
    button.dataset.format = format;
    button.textContent = label;
    button.addEventListener("click", () => {
      void runExport(format);
    });
    return button;
  }

  function createUtilityButton(label, id) {
    const button = document.createElement("button");
    button.type = "button";
    button.id = id;
    button.className = "cge-panel-utility-button";
    button.textContent = label;
    return button;
  }

  function updateSelectionRowState(row, selected) {
    row.classList.toggle("is-selected", selected);
    row.setAttribute("aria-checked", selected ? "true" : "false");
  }

  function toggleMessageSelection(messageId, row) {
    if (row.disabled) {
      return;
    }

    const nextSelected = !selectedMessageIds.has(messageId);
    if (nextSelected) {
      selectedMessageIds.add(messageId);
    } else {
      selectedMessageIds.delete(messageId);
    }

    updateSelectionRowState(row, nextSelected);
    updateSelectionSummary();
  }

  function setStatus(message, tone) {
    const status = document.getElementById(STATUS_ID);
    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.tone = tone || "muted";
    if (tone === "success") {
      status.style.color = "#0f766e";
      return;
    }

    if (tone === "error") {
      status.style.color = "#b91c1c";
      return;
    }

    status.style.color = "#6b7280";
  }

  function setExportButtonsDisabled(disabled) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) {
      return;
    }

    const buttons = panel.querySelectorAll("button[data-format]");
    buttons.forEach((button) => {
      button.disabled = disabled;
      button.style.opacity = disabled ? "0.55" : "1";
      button.style.cursor = disabled ? "wait" : "pointer";
    });
  }

  function setSelectionButtonsDisabled(disabled) {
    [REFRESH_LIST_ID, SELECT_ALL_ID, CLEAR_ALL_ID].forEach((id) => {
      const button = document.getElementById(id);
      if (!(button instanceof HTMLButtonElement)) {
        return;
      }

      button.disabled = disabled;
      button.style.opacity = disabled ? "0.55" : "1";
      button.style.cursor = disabled ? "wait" : "pointer";
    });

    const toggles = document.querySelectorAll(`#${MESSAGE_LIST_ID} button[data-message-toggle="true"]`);
    toggles.forEach((toggle) => {
      if (toggle instanceof HTMLButtonElement) {
        toggle.disabled = disabled;
      }
    });
  }

  function updateSelectionSummary() {
    const summary = document.getElementById(SELECTION_SUMMARY_ID);
    if (!summary) {
      return;
    }

    if (!latestConversation || !latestConversation.messages.length) {
      summary.textContent = "还没有读取到可选择的消息。";
      return;
    }

    const selectedCount = latestConversation.messages.filter((message) => selectedMessageIds.has(message.id)).length;
    summary.textContent = `已选择 ${selectedCount} / ${latestConversation.messages.length} 条消息。`;
  }

  function renderSelectionList(conversation) {
    const list = document.getElementById(MESSAGE_LIST_ID);
    if (!list) {
      return;
    }

    list.innerHTML = "";

    conversation.messages.forEach((message, index) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "cge-message-row";
      row.dataset.messageId = message.id;
      row.dataset.messageToggle = "true";
      row.setAttribute("role", "checkbox");
      if (index === 0) {
        row.style.borderTop = "0";
      }
      row.setAttribute(
        "aria-label",
        `选择${message.role === "user" ? "用户" : "助手"}消息 ${index + 1}`,
      );

      const check = document.createElement("span");
      check.className = "cge-message-check";

      const indicator = document.createElement("span");
      indicator.className = "cge-message-check-indicator";
      check.append(indicator);

      const content = document.createElement("div");

      const title = document.createElement("div");
      title.className = "cge-message-title";
      title.textContent = `${message.role === "user" ? "用户" : "助手"} ${index + 1}`;

      const preview = document.createElement("div");
      preview.className = "cge-message-preview";
      preview.textContent = message.text.slice(0, 120) || "(空消息)";

      content.append(title, preview);
      row.append(check, content);
      updateSelectionRowState(row, selectedMessageIds.has(message.id));
      row.addEventListener("click", () => {
        toggleMessageSelection(message.id, row);
      });
      list.append(row);
    });

    updateSelectionSummary();
  }

  function getTimelineMessages() {
    if (!latestConversation) {
      return [];
    }

    const userMessages = latestConversation.messages.filter((message) => message.role === "user");
    return userMessages;
  }

  function getTimelineMarkerCapacity(listHeight) {
    if (listHeight <= 0) {
      return TIMELINE_CONDENSE_THRESHOLD;
    }

    const usableHeight = Math.max(listHeight - 20, 24);
    return Math.max(
      TIMELINE_MIN_MARKERS,
      Math.min(TIMELINE_MAX_MARKERS, Math.floor(usableHeight / TIMELINE_MIN_MARKER_GAP)),
    );
  }

  function isTimelineCondensed(messages, listHeight) {
    return messages.length > Math.min(TIMELINE_CONDENSE_THRESHOLD, getTimelineMarkerCapacity(listHeight));
  }

  function buildTimelineRenderMessages(messages, listHeight) {
    const maxMarkers = getTimelineMarkerCapacity(listHeight);
    if (messages.length <= TIMELINE_CONDENSE_THRESHOLD) {
      return messages;
    }

    const messageIndexById = new Map(messages.map((message, index) => [message.id, index]));
    const selectedIndices = new Set([0, messages.length - 1]);
    const focusIds = [timelineLockedMessageId, activeTimelineMessageId].filter(Boolean);

    focusIds.forEach((messageId) => {
      const index = messageIndexById.get(messageId);
      if (typeof index !== "number") {
        return;
      }

      const halfWindow = Math.floor(TIMELINE_FOCUS_WINDOW / 2);
      const start = Math.max(0, index - halfWindow);
      const end = Math.min(messages.length - 1, index + halfWindow);
      for (let current = start; current <= end; current += 1) {
        selectedIndices.add(current);
      }
    });

    const remainingSlots = Math.max(maxMarkers - selectedIndices.size, 0);
    if (remainingSlots > 0) {
      const sampleCount = Math.min(messages.length, remainingSlots);
      const denominator = Math.max(sampleCount - 1, 1);
      for (let step = 0; step < sampleCount; step += 1) {
        const ratio = sampleCount === 1 ? 0.5 : step / denominator;
        selectedIndices.add(Math.round(ratio * (messages.length - 1)));
      }
    }

    return Array.from(selectedIndices)
      .sort((left, right) => left - right)
      .slice(0, maxMarkers)
      .map((index) => messages[index]);
  }

  function scrollElementToTop(target, scrollContainer, offset = 0) {
    const containerTop =
      scrollContainer === document.scrollingElement ? 0 : scrollContainer.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    const nextTop = scrollContainer.scrollTop + targetTop - containerTop - offset;

    scrollContainer.scrollTo({
      top: Math.max(0, nextTop),
      behavior: "smooth",
    });
  }

  function resolveTimelineTurn(message) {
    if (!message || typeof message.turnId !== "string") {
      return null;
    }

    const turn = document.querySelector(`section[data-testid="${message.turnId}"]`);
    if (!(turn instanceof HTMLElement)) {
      return null;
    }

    return turn;
  }

  function resolveTimelineTargetElement(message) {
    const turn = resolveTimelineTurn(message);
    if (!(turn instanceof HTMLElement)) {
      return null;
    }

    const userBody = resolveUserBody(turn);
    return userBody instanceof HTMLElement ? userBody : turn;
  }

  function resolveTimelineTopOffset(scrollContainer, target) {
    const containerTop =
      scrollContainer === document.scrollingElement ? 0 : scrollContainer.getBoundingClientRect().top;
    const targetRect = target.getBoundingClientRect();
    const probeX = Math.max(
      8,
      Math.min(window.innerWidth - 8, Math.round(targetRect.left + Math.min(targetRect.width / 2, 24))),
    );
    const probeY = Math.max(0, Math.min(window.innerHeight - 1, Math.round(containerTop + 8)));
    const elements = document.elementsFromPoint(probeX, probeY);

    let obstructionBottom = containerTop;
    elements.forEach((element) => {
      if (!(element instanceof HTMLElement) || element === target || target.contains(element)) {
        return;
      }

      const style = window.getComputedStyle(element);
      if (style.position !== "fixed" && style.position !== "sticky") {
        return;
      }

      if (
        scrollContainer !== document.scrollingElement &&
        style.position === "sticky" &&
        !scrollContainer.contains(element)
      ) {
        return;
      }

      const rect = element.getBoundingClientRect();
      if (rect.height > window.innerHeight * 0.5 || rect.bottom <= containerTop || rect.top > probeY) {
        return;
      }

      obstructionBottom = Math.max(obstructionBottom, rect.bottom);
    });

    return Math.max(
      TIMELINE_MIN_TOP_CLEARANCE,
      obstructionBottom - containerTop + TIMELINE_SCROLL_PADDING,
    );
  }

  function correctTimelineTargetVisibility(scrollContainer, target) {
    const containerTop =
      scrollContainer === document.scrollingElement ? 0 : scrollContainer.getBoundingClientRect().top;
    const safeTop = containerTop + resolveTimelineTopOffset(scrollContainer, target);
    const currentTop = target.getBoundingClientRect().top;
    const delta = currentTop - safeTop;

    if (delta >= 0) {
      return;
    }

    scrollContainer.scrollTo({
      top: Math.max(0, scrollContainer.scrollTop + delta - TIMELINE_SCROLL_PADDING),
      behavior: "auto",
    });
  }

  function scrollToMessage(message) {
    const target = resolveTimelineTargetElement(message);
    const turn = resolveTimelineTurn(message);
    if (!(target instanceof HTMLElement) || !(turn instanceof HTMLElement)) {
      return;
    }

    const scrollContainer = resolveScrollContainer();
    if (scrollContainer) {
      scrollElementToTop(target, scrollContainer, resolveTimelineTopOffset(scrollContainer, target));
      [180, 420, 760].forEach((delayMs) => {
        window.setTimeout(() => {
          correctTimelineTargetVisibility(scrollContainer, target);
        }, delayMs);
      });
    } else {
      target.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }

    activeTimelineMessageId = message.id;
    timelineLockedMessageId = message.id;
    timelineLockedUntil = Date.now() + TIMELINE_ACTIVE_LOCK_MS;
    updateTimelineActiveStyles();

    const previousTransition = turn.style.transition;
    const previousBoxShadow = turn.style.boxShadow;
    turn.style.transition = "box-shadow 160ms ease";
    turn.style.boxShadow = "0 0 0 3px rgba(37, 99, 235, 0.35)";

    window.setTimeout(() => {
      turn.style.boxShadow = previousBoxShadow;
      turn.style.transition = previousTransition;
    }, 1400);
  }

  function updateTimelineActiveStyles() {
    const list = document.getElementById(TIMELINE_LIST_ID);
    if (!(list instanceof HTMLElement)) {
      return;
    }

    const items = list.querySelectorAll("button[data-message-id]");
    items.forEach((item) => {
      const isActive = item.getAttribute("data-message-id") === activeTimelineMessageId;
      item.style.borderColor = isActive ? "rgba(56, 189, 248, 0.95)" : "rgba(100, 116, 139, 0.36)";
      item.style.background = isActive ? "rgba(56, 189, 248, 0.96)" : "rgba(71, 85, 105, 0.2)";
      item.style.boxShadow = isActive
        ? "0 0 0 4px rgba(56, 189, 248, 0.18), 0 8px 20px rgba(2, 6, 23, 0.18)"
        : "none";
      item.style.transform = isActive ? "translate(-50%, -50%) scaleY(1.12)" : "translate(-50%, -50%)";
      item.style.opacity = isActive ? "1" : "0.78";
    });

    updateTimelineDirectoryActiveStyles();
  }

  function updateTimelineDirectoryActiveStyles() {
    const directory = document.getElementById(TIMELINE_DIRECTORY_ID);
    if (!(directory instanceof HTMLElement)) {
      return;
    }

    const rows = directory.querySelectorAll("button[data-message-id]");
    let activeRow = null;

    rows.forEach((row) => {
      const isActive = row.getAttribute("data-message-id") === activeTimelineMessageId;
      row.classList.toggle("is-active", isActive);
      if (isActive) {
        activeRow = row;
      }
    });

    if (timelineDirectoryExpanded && activeRow instanceof HTMLElement) {
      activeRow.scrollIntoView({
        block: "nearest",
        behavior: "auto",
      });
    }
  }

  function updateTimelinePanelState() {
    const panel = document.getElementById(TIMELINE_PANEL_ID);
    const directory = document.getElementById(TIMELINE_DIRECTORY_ID);
    const toggle = document.getElementById(TIMELINE_TOGGLE_ID);
    if (!(panel instanceof HTMLElement) || !(directory instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement)) {
      return;
    }

    panel.dataset.expanded = timelineDirectoryExpanded ? "true" : "false";
    panel.style.width = timelineDirectoryExpanded ? "320px" : "24px";
    panel.style.borderRadius = timelineDirectoryExpanded ? "20px" : "999px";
    panel.style.padding = timelineDirectoryExpanded ? "10px" : "10px 0";
    panel.style.overflow = timelineDirectoryExpanded ? "hidden" : "visible";
    panel.style.background = timelineDirectoryExpanded ? "rgba(15, 23, 42, 0.84)" : "rgba(15, 23, 42, 0.18)";
    panel.style.borderColor = timelineDirectoryExpanded
      ? "rgba(148, 163, 184, 0.28)"
      : "rgba(71, 85, 105, 0.18)";
    panel.style.boxShadow = timelineDirectoryExpanded
      ? "0 18px 42px rgba(2, 6, 23, 0.32)"
      : "0 12px 30px rgba(2, 6, 23, 0.12)";

    directory.hidden = !timelineDirectoryExpanded;
    directory.style.display = timelineDirectoryExpanded ? "block" : "none";

    toggle.textContent = timelineDirectoryExpanded ? "<<" : ">>";
    toggle.title = timelineDirectoryExpanded ? "收起消息目录" : "展开消息目录";
    toggle.setAttribute("aria-label", toggle.title);
    toggle.style.right = timelineDirectoryExpanded ? "8px" : "30px";
  }

  function toggleTimelineDirectory() {
    timelineDirectoryExpanded = !timelineDirectoryExpanded;
    updateTimelinePanelState();
    if (timelineDirectoryExpanded) {
      renderTimelineDirectory();
      updateTimelineDirectoryActiveStyles();
    }
  }

  function collapseTimelineDirectory() {
    if (!timelineDirectoryExpanded) {
      return;
    }

    timelineDirectoryExpanded = false;
    updateTimelinePanelState();
  }

  function handleTimelineOutsidePointerDown(event) {
    if (!timelineDirectoryExpanded) {
      return;
    }

    const panel = document.getElementById(TIMELINE_PANEL_ID);
    if (!(panel instanceof HTMLElement)) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && panel.contains(target)) {
      return;
    }

    collapseTimelineDirectory();
  }

  function renderTimelineDirectory() {
    const directory = document.getElementById(TIMELINE_DIRECTORY_ID);
    if (!(directory instanceof HTMLElement)) {
      return;
    }

    directory.innerHTML = "";
    const messages = getTimelineMessages();

    if (!messages.length) {
      const empty = document.createElement("div");
      empty.className = "cge-timeline-directory-empty";
      empty.textContent = "还没有可定位的用户消息。";
      directory.append(empty);
      return;
    }

    messages.forEach((message) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "cge-timeline-directory-row";
      row.dataset.messageId = message.id;

      const title = document.createElement("div");
      title.className = "cge-timeline-directory-title";
      title.textContent = `用户 ${message.index}`;

      const preview = document.createElement("div");
      preview.className = "cge-timeline-directory-preview";
      preview.textContent = message.text.slice(0, 120) || "(空消息)";

      row.append(title, preview);
      row.addEventListener("click", () => {
        scrollToMessage(message);
      });
      directory.append(row);
    });

    updateTimelineDirectoryActiveStyles();
  }

  function showTimelineTooltip(message, target) {
    const tooltip = document.getElementById(TIMELINE_TOOLTIP_ID);
    if (!(tooltip instanceof HTMLElement) || !(target instanceof HTMLElement)) {
      return;
    }

    tooltip.textContent = message.text.slice(0, 180) || `用户消息 ${message.index}`;
    const rect = target.getBoundingClientRect();
    tooltip.style.display = "block";
    tooltip.style.top = `${Math.max(16, rect.top - 10)}px`;
    tooltip.style.right = "34px";
    tooltip.style.opacity = "1";
    tooltip.style.transform = "translateY(0)";
  }

  function hideTimelineTooltip() {
    const tooltip = document.getElementById(TIMELINE_TOOLTIP_ID);
    if (!(tooltip instanceof HTMLElement)) {
      return;
    }

    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateY(4px)";
    window.setTimeout(() => {
      if (tooltip.style.opacity === "0") {
        tooltip.style.display = "none";
      }
    }, 120);
  }

  function refreshActiveTimelineMessage() {
    if (!latestConversation || !latestConversation.messages.length) {
      return;
    }

    const userMessages = latestConversation.messages.filter((message) => message.role === "user");
    if (!userMessages.length) {
      return;
    }

    const scrollerRect =
      currentTimelineScroller instanceof HTMLElement
        ? currentTimelineScroller.getBoundingClientRect()
        : null;
    const viewportTop = scrollerRect ? scrollerRect.top : 0;
    const referenceLine = viewportTop + TIMELINE_MIN_TOP_CLEARANCE;

    if (timelineLockedMessageId && Date.now() < timelineLockedUntil) {
      const lockedTarget = resolveTimelineTargetElement(
        userMessages.find((message) => message.id === timelineLockedMessageId),
      );
      if (lockedTarget instanceof HTMLElement) {
        const nextActiveId = timelineLockedMessageId;
        if (nextActiveId !== activeTimelineMessageId) {
          activeTimelineMessageId = nextActiveId;
          updateTimelineActiveStyles();
        }
        return;
      }
    } else {
      timelineLockedMessageId = "";
      timelineLockedUntil = 0;
    }

    let bestCandidate = null;

    userMessages.forEach((message) => {
      const target = resolveTimelineTargetElement(message);
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const rect = target.getBoundingClientRect();
      const distance = Math.abs(rect.top - referenceLine);
      if (
        !bestCandidate ||
        distance < bestCandidate.distance ||
        (distance === bestCandidate.distance && rect.top > bestCandidate.top)
      ) {
        bestCandidate = {
          id: message.id,
          top: rect.top,
          distance,
        };
      }
    });

    const nextActiveId = (bestCandidate || {}).id || "";
    if (nextActiveId && nextActiveId !== activeTimelineMessageId) {
      activeTimelineMessageId = nextActiveId;
      const list = document.getElementById(TIMELINE_LIST_ID);
      if (list instanceof HTMLElement && isTimelineCondensed(userMessages, list.clientHeight || 0)) {
        renderTimelineList();
      }
      updateTimelineActiveStyles();
    }
  }

  function scheduleTimelineScrollUpdate() {
    if (timelineScrollFrame) {
      return;
    }

    timelineScrollFrame = window.requestAnimationFrame(() => {
      timelineScrollFrame = 0;
      refreshActiveTimelineMessage();
    });
  }

  function ensureTimelineTracking() {
    const nextScroller = resolveScrollContainer();
    if (currentTimelineScroller === nextScroller) {
      return;
    }

    if (currentTimelineScroller) {
      currentTimelineScroller.removeEventListener("scroll", scheduleTimelineScrollUpdate);
    }

    currentTimelineScroller = nextScroller;
    if (currentTimelineScroller) {
      currentTimelineScroller.addEventListener("scroll", scheduleTimelineScrollUpdate, {
        passive: true,
      });
    }
  }

  function renderTimelineList() {
    const list = document.getElementById(TIMELINE_LIST_ID);
    if (!(list instanceof HTMLElement)) {
      return;
    }

    list.innerHTML = "";
    const messages = getTimelineMessages();
    const renderMessages = buildTimelineRenderMessages(messages, list.clientHeight || 0);

    if (!messages.length) {
      const empty = document.createElement("div");
      empty.style.position = "absolute";
      empty.style.left = "50%";
      empty.style.top = "50%";
      empty.style.width = "4px";
      empty.style.height = "72px";
      empty.style.transform = "translate(-50%, -50%)";
      empty.style.borderRadius = "999px";
      empty.style.background = "linear-gradient(180deg, rgba(71, 85, 105, 0.1), rgba(71, 85, 105, 0.36), rgba(71, 85, 105, 0.1))";
      list.append(empty);
      renderTimelineDirectory();
      return;
    }

    const track = document.createElement("div");
    track.style.position = "absolute";
    track.style.left = "50%";
    track.style.top = "10px";
    track.style.bottom = "10px";
    track.style.width = "4px";
    track.style.transform = "translateX(-50%)";
    track.style.borderRadius = "999px";
    track.style.background = "linear-gradient(180deg, rgba(71, 85, 105, 0.12), rgba(71, 85, 105, 0.42), rgba(71, 85, 105, 0.12))";
    list.append(track);

    const denominator = Math.max(messages.length - 1, 1);
    const usableHeight = Math.max(list.clientHeight - 20, 24);
    const isCondensed = renderMessages.length < messages.length;
    renderMessages.forEach((message) => {
      const messageIndex = messages.findIndex((item) => item.id === message.id);
      const ratio = messages.length === 1 ? 0.5 : Math.max(0, messageIndex) / denominator;
      const item = document.createElement("button");
      item.type = "button";
      item.dataset.messageId = message.id;
      item.title = message.text.slice(0, 160) || `用户消息 ${message.index}`;
      item.style.position = "absolute";
      item.style.left = "50%";
      item.style.top = `${10 + usableHeight * ratio}px`;
      item.style.width = isCondensed ? "10px" : "12px";
      item.style.height = isCondensed ? "14px" : "20px";
      item.style.transform = "translate(-50%, -50%)";
      item.style.border = "1px solid rgba(100, 116, 139, 0.36)";
      item.style.borderRadius = "999px";
      item.style.background = "rgba(71, 85, 105, 0.2)";
      item.style.cursor = "pointer";
      item.style.padding = "0";
      item.style.transition = "transform 160ms ease, box-shadow 160ms ease, background 160ms ease, border-color 160ms ease, opacity 160ms ease";
      item.addEventListener("click", () => {
        scrollToMessage(message);
      });
      item.addEventListener("mouseenter", () => {
        item.style.transform = "translate(-50%, -50%) scaleX(1.12)";
        showTimelineTooltip(message, item);
      });
      item.addEventListener("mouseleave", () => {
        if (item.getAttribute("data-message-id") !== activeTimelineMessageId) {
          item.style.transform = "translate(-50%, -50%)";
        }
        hideTimelineTooltip();
      });
      item.addEventListener("focus", () => {
        item.style.transform = "translate(-50%, -50%) scaleX(1.12)";
        showTimelineTooltip(message, item);
      });
      item.addEventListener("blur", () => {
        if (item.getAttribute("data-message-id") !== activeTimelineMessageId) {
          item.style.transform = "translate(-50%, -50%)";
        }
        hideTimelineTooltip();
      });
      list.append(item);
    });

    renderTimelineDirectory();
    updateTimelineActiveStyles();
  }

  async function prepareSelection(forceReload) {
    if (selectionInFlight) {
      return;
    }

    selectionInFlight = true;
    setSelectionButtonsDisabled(true);

    try {
      setStatus("正在读取当前会话消息列表…", "muted");

      if (forceReload || !latestConversation) {
        await ensureFullHistoryLoaded();
        latestConversation = collectConversation();
      }

      if (!latestConversation || !latestConversation.messages.length) {
        throw new Error("没有读取到可供选择的消息。");
      }

      if (!selectionLoaded) {
        selectedMessageIds = new Set(latestConversation.messages.map((message) => message.id));
      } else {
        selectedMessageIds = new Set(
          latestConversation.messages
            .map((message) => message.id)
            .filter((messageId) => selectedMessageIds.has(messageId)),
        );
      }

      selectionLoaded = true;
      lastSelectionSignature = getConversationSignature(latestConversation);
      renderSelectionList(latestConversation);
      setStatus("消息列表已刷新。", "muted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "读取消息列表失败。";
      setStatus(message, "error");
    } finally {
      setSelectionButtonsDisabled(false);
      selectionInFlight = false;
    }
  }

  function syncLiveConversation() {
    const turns = resolveTurns();
    if (!turns.length) {
      return;
    }

    const nextConversation = collectConversation();
    const nextSignature = getConversationSignature(nextConversation);
    const selectionChanged = nextSignature !== lastSelectionSignature;
    const timelineChanged = nextSignature !== lastTimelineSignature;

    latestConversation = nextConversation;

    if (selectionLoaded) {
      if (selectionChanged) {
        selectedMessageIds = new Set(
          latestConversation.messages
            .map((message) => message.id)
            .filter((messageId) => selectedMessageIds.has(messageId)),
        );
        renderSelectionList(latestConversation);
        lastSelectionSignature = nextSignature;
      }
    }

    if (timelineChanged) {
      renderTimelineList();
      lastTimelineSignature = nextSignature;
    }
    ensureTimelineTracking();
    refreshActiveTimelineMessage();
  }

  function requestTimelineRefresh() {
    if (timelineRefreshTimer) {
      window.clearTimeout(timelineRefreshTimer);
    }

    timelineRefreshTimer = window.setTimeout(() => {
      timelineRefreshTimer = 0;
      syncLiveConversation();
    }, 180);
  }

  async function prepareTimeline(forceReload) {
    if (timelineInFlight) {
      return;
    }

    timelineInFlight = true;
    try {
      if (forceReload || !latestConversation) {
        await ensureFullHistoryLoaded();
        latestConversation = collectConversation();
      }

      if (!latestConversation || !latestConversation.messages.length) {
        throw new Error("没有读取到可供定位的消息。");
      }

      renderTimelineList();
      lastTimelineSignature = getConversationSignature(latestConversation);
      ensureTimelineTracking();
      refreshActiveTimelineMessage();
    } catch (error) {
      void error;
    } finally {
      timelineInFlight = false;
    }
  }

  function ensureToolbar() {
    const headerActions = document.querySelector(HEADER_ACTIONS_SELECTOR);
    if (!headerActions) {
      return;
    }

    if (document.getElementById(WRAPPER_ID)) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.id = WRAPPER_ID;
    wrapper.className = "cge-toolbar";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px";

    const exportButton = createToolbarButton("导出", EXPORT_BUTTON_ID);
    exportButton.addEventListener("click", (event) => {
      event.stopPropagation();
      togglePanel();
    });

    wrapper.append(exportButton);
    headerActions.prepend(wrapper);

    ensurePanel();
    ensureTimelinePanel();
  }

  function togglePanel() {
    const backdrop = document.getElementById(BACKDROP_ID);
    if (!backdrop) {
      return;
    }

    backdrop.hidden = !backdrop.hidden;
    backdrop.style.display = backdrop.hidden ? "none" : "flex";

    if (!backdrop.hidden && !latestConversation) {
      void prepareSelection(true);
    }
  }

  function closePanel() {
    const backdrop = document.getElementById(BACKDROP_ID);
    if (!backdrop) {
      return;
    }

    backdrop.hidden = true;
    backdrop.style.display = "none";
  }

  function ensurePanel() {
    if (document.getElementById(PORTAL_ID)) {
      return;
    }

    const portal = document.createElement("div");
    portal.id = PORTAL_ID;
    portal.style.position = "fixed";
    portal.style.inset = "0";
    portal.style.zIndex = "2147483647";
    portal.style.pointerEvents = "none";
    document.documentElement.append(portal);

    const backdrop = document.createElement("div");
    backdrop.id = BACKDROP_ID;
    backdrop.className = "cge-backdrop";
    backdrop.hidden = true;
    backdrop.style.position = "fixed";
    backdrop.style.inset = "0";
    backdrop.style.zIndex = "2147483647";
    backdrop.style.display = "none";
    backdrop.style.alignItems = "center";
    backdrop.style.justifyContent = "center";
    backdrop.style.padding = "16px";
    backdrop.style.background = "rgba(15, 23, 42, 0.2)";
    backdrop.style.backdropFilter = "blur(4px)";
    backdrop.style.pointerEvents = "auto";
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) {
        closePanel();
      }
    });

    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.className = "cge-panel";
    panel.style.width = "min(420px, calc(100vw - 32px))";
    panel.style.maxHeight = "min(80vh, 720px)";
    panel.style.overflow = "auto";
    panel.style.border = "1px solid rgba(0, 0, 0, 0.1)";
    panel.style.borderRadius = "20px";
    panel.style.background = "#ffffff";
    panel.style.color = "#111111";
    panel.style.padding = "18px";
    panel.style.boxShadow = "0 24px 80px rgba(0, 0, 0, 0.24)";
    panel.style.pointerEvents = "auto";

    const header = document.createElement("div");
    header.className = "cge-panel-header";
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";
    header.style.gap = "12px";

    const title = document.createElement("div");
    title.className = "cge-panel-title";
    title.textContent = "导出当前对话";
    title.style.fontSize = "15px";
    title.style.fontWeight = "700";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "cge-panel-close";
    closeButton.textContent = "关闭";
    closeButton.addEventListener("click", () => {
      closePanel();
    });

    header.append(title, closeButton);

    const description = document.createElement("div");
    description.className = "cge-panel-description";
    description.textContent = "会先向上滚动补齐历史，再下载 JSON 或 Markdown。";
    description.style.marginTop = "6px";
    description.style.fontSize = "12px";
    description.style.lineHeight = "1.5";
    description.style.color = "#4b5563";

    const scope = document.createElement("div");
    scope.id = SCOPE_ID;
    scope.className = "cge-panel-scope";
    scope.textContent = "当前范围：可勾选当前已打开会话中的消息；默认全选。";
    scope.style.marginTop = "12px";
    scope.style.borderRadius = "14px";
    scope.style.background = "#f8fafc";
    scope.style.color = "#334155";
    scope.style.padding = "10px 12px";
    scope.style.fontSize = "12px";
    scope.style.lineHeight = "1.5";

    const actions = document.createElement("div");
    actions.className = "cge-panel-actions";
    actions.style.display = "grid";
    actions.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
    actions.style.gap = "8px";
    actions.style.marginTop = "14px";
    actions.append(createButton("导出 JSON", "json"));
    actions.append(createButton("导出 Markdown", "markdown"));
    actions.append(createButton("导出 PDF", "pdf"));

    const selectionHeader = document.createElement("div");
    selectionHeader.style.display = "flex";
    selectionHeader.style.alignItems = "center";
    selectionHeader.style.justifyContent = "space-between";
    selectionHeader.style.gap = "8px";
    selectionHeader.style.marginTop = "16px";

    const selectionTitle = document.createElement("div");
    selectionTitle.textContent = "选择导出消息";
    selectionTitle.style.fontSize = "13px";
    selectionTitle.style.fontWeight = "700";
    selectionTitle.style.color = "#0f172a";

    const selectionTools = document.createElement("div");
    selectionTools.style.display = "flex";
    selectionTools.style.gap = "6px";

    const refreshButton = createUtilityButton("刷新列表", REFRESH_LIST_ID);
    refreshButton.addEventListener("click", () => {
      void prepareSelection(true);
    });

    const selectAllButton = createUtilityButton("全选", SELECT_ALL_ID);
    selectAllButton.addEventListener("click", () => {
      if (!latestConversation) {
        return;
      }

      selectedMessageIds = new Set(latestConversation.messages.map((message) => message.id));
      renderSelectionList(latestConversation);
    });

    const clearAllButton = createUtilityButton("清空", CLEAR_ALL_ID);
    clearAllButton.addEventListener("click", () => {
      selectedMessageIds = new Set();
      if (latestConversation) {
        renderSelectionList(latestConversation);
        return;
      }
      updateSelectionSummary();
    });

    selectionTools.append(refreshButton, selectAllButton, clearAllButton);
    selectionHeader.append(selectionTitle, selectionTools);

    const selectionSummary = document.createElement("div");
    selectionSummary.id = SELECTION_SUMMARY_ID;
    selectionSummary.textContent = "还没有读取到可选择的消息。";
    selectionSummary.style.marginTop = "10px";
    selectionSummary.style.fontSize = "12px";
    selectionSummary.style.lineHeight = "1.4";
    selectionSummary.style.color = "#475569";

    const messageList = document.createElement("div");
    messageList.id = MESSAGE_LIST_ID;
    messageList.className = "cge-message-list";

    const status = document.createElement("div");
    status.id = STATUS_ID;
    status.className = "cge-panel-status";
    status.dataset.tone = "muted";
    status.textContent = "等待导出。";
    status.style.marginTop = "12px";
    status.style.fontSize = "12px";
    status.style.lineHeight = "1.5";
    status.style.color = "#6b7280";

    panel.append(
      header,
      description,
      scope,
      actions,
      selectionHeader,
      selectionSummary,
      messageList,
      status,
    );
    backdrop.append(panel);
    portal.append(backdrop);
  }

  function ensureTimelinePanel() {
    if (document.getElementById(TIMELINE_PANEL_ID)) {
      return;
    }

    const portal = document.getElementById(PORTAL_ID);
    if (!(portal instanceof HTMLElement)) {
      return;
    }

    const panel = document.createElement("aside");
    panel.id = TIMELINE_PANEL_ID;
    panel.hidden = false;
    panel.style.position = "fixed";
    panel.style.top = "118px";
    panel.style.right = "12px";
    panel.style.bottom = "92px";
    panel.style.width = "24px";
    panel.style.display = "flex";
    panel.style.alignItems = "stretch";
    panel.style.gap = "10px";
    panel.style.borderRadius = "999px";
    panel.style.background = "rgba(2, 6, 23, 0.08)";
    panel.style.backdropFilter = "blur(10px)";
    panel.style.border = "1px solid rgba(71, 85, 105, 0.14)";
    panel.style.boxShadow = "0 12px 30px rgba(2, 6, 23, 0.12)";
    panel.style.padding = "10px 0";
    panel.style.pointerEvents = "auto";
    panel.style.transition = "width 180ms ease, border-radius 180ms ease, padding 180ms ease";

    const list = document.createElement("div");
    list.id = TIMELINE_LIST_ID;
    list.style.position = "relative";
    list.style.flex = "0 0 24px";
    list.style.width = "24px";
    list.style.height = "100%";
    list.style.padding = "0";
    list.style.overflow = "hidden";

    const directory = document.createElement("div");
    directory.id = TIMELINE_DIRECTORY_ID;
    directory.className = "cge-timeline-directory";
    directory.hidden = true;

    const toggle = document.createElement("button");
    toggle.id = TIMELINE_TOGGLE_ID;
    toggle.type = "button";
    toggle.className = "cge-timeline-toggle";
    toggle.addEventListener("click", () => {
      toggleTimelineDirectory();
    });

    const tooltip = document.createElement("div");
    tooltip.id = TIMELINE_TOOLTIP_ID;
    tooltip.style.position = "fixed";
    tooltip.style.zIndex = "2147483647";
    tooltip.style.display = "none";
    tooltip.style.maxWidth = "260px";
    tooltip.style.borderRadius = "14px";
    tooltip.style.background = "rgba(15, 23, 42, 0.94)";
    tooltip.style.color = "#f8fafc";
    tooltip.style.padding = "10px 12px";
    tooltip.style.fontSize = "12px";
    tooltip.style.lineHeight = "1.45";
    tooltip.style.boxShadow = "0 16px 40px rgba(15, 23, 42, 0.28)";
    tooltip.style.pointerEvents = "none";
    tooltip.style.opacity = "0";
    tooltip.style.transform = "translateY(4px)";
    tooltip.style.transition = "opacity 120ms ease, transform 120ms ease";

    panel.title = "用户消息时间轴";
    panel.append(directory, list, toggle);
    portal.append(panel, tooltip);
    document.addEventListener("pointerdown", handleTimelineOutsidePointerDown, true);
    updateTimelinePanelState();
  }

  function scheduleToolbarInjection() {
    if (injectTimer) {
      window.clearTimeout(injectTimer);
    }

    injectTimer = window.setTimeout(() => {
      injectTimer = 0;
      ensureToolbar();
      requestTimelineRefresh();
    }, 120);
  }

  function installObservers() {
    const observer = new MutationObserver(() => {
      scheduleToolbarInjection();
      requestTimelineRefresh();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePanel();
      }
    });

    window.addEventListener(
      "resize",
      () => {
        requestTimelineRefresh();
      },
      { passive: true },
    );
  }

  function resolveTurns() {
    return Array.from(document.querySelectorAll(TURN_SELECTOR));
  }

  function isScrollable(element) {
    const style = window.getComputedStyle(element);
    return /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight + 32;
  }

  function resolveScrollContainer() {
    const turns = resolveTurns();
    const firstTurn = turns[0];
    if (!firstTurn) {
      return null;
    }

    let current = firstTurn.parentElement;
    while (current && current !== document.body) {
      if (isScrollable(current)) {
        return current;
      }
      current = current.parentElement;
    }

    const scrollingElement = document.scrollingElement;
    return scrollingElement instanceof HTMLElement ? scrollingElement : null;
  }

  function buildHistoryFingerprint() {
    const turns = resolveTurns();
    const firstTurn = turns[0];
    const lastTurn = turns[turns.length - 1];
    const firstText = firstTurn ? normalizeWhitespace(firstTurn.innerText).slice(0, 80) : "";
    const lastText = lastTurn ? normalizeWhitespace(lastTurn.innerText).slice(0, 80) : "";

    return JSON.stringify({
      count: turns.length,
      firstId: firstTurn ? firstTurn.getAttribute("data-testid") : null,
      lastId: lastTurn ? lastTurn.getAttribute("data-testid") : null,
      firstText,
      lastText,
    });
  }

  function restoreScrollViewport(scrollContainer, initialTop, initialHeight) {
    const currentHeight = scrollContainer.scrollHeight;
    const deltaHeight = Math.max(0, currentHeight - initialHeight);
    scrollContainer.scrollTop = Math.max(0, initialTop + deltaHeight);
  }

  async function ensureFullHistoryLoaded() {
    const scrollContainer = resolveScrollContainer();
    if (!scrollContainer) {
      return {
        strategy: "none",
        changedDom: false,
        reachedBoundary: true,
        notes: ["No dedicated scroll container was found. Exporting the currently visible DOM only."],
      };
    }

    const initialTop = scrollContainer.scrollTop;
    const initialHeight = scrollContainer.scrollHeight;
    let lastFingerprint = buildHistoryFingerprint();
    let changedDom = false;
    let stableRounds = 0;

    for (let iteration = 0; iteration < MAX_HISTORY_ITERATIONS; iteration += 1) {
      const previousTop = scrollContainer.scrollTop;
      const nextTop = Math.max(0, previousTop - Math.max(480, Math.floor(scrollContainer.clientHeight * 0.9)));
      scrollContainer.scrollTop = nextTop;

      await delay(450);

      const nextFingerprint = buildHistoryFingerprint();
      const fingerprintChanged = nextFingerprint !== lastFingerprint;

      if (fingerprintChanged) {
        changedDom = true;
        stableRounds = 0;
        lastFingerprint = nextFingerprint;
      } else {
        stableRounds += 1;
      }

      if (scrollContainer.scrollTop === 0 && stableRounds >= STABLE_HISTORY_ROUNDS) {
        restoreScrollViewport(scrollContainer, initialTop, initialHeight);
        return {
          strategy: "scroll-up",
          changedDom,
          reachedBoundary: true,
          notes: [`History loading stopped after ${iteration + 1} scroll attempts.`],
        };
      }

      if (previousTop === nextTop && stableRounds >= STABLE_HISTORY_ROUNDS) {
        restoreScrollViewport(scrollContainer, initialTop, initialHeight);
        return {
          strategy: "scroll-up",
          changedDom,
          reachedBoundary: true,
          notes: ["Scroll position stopped changing before new DOM appeared."],
        };
      }
    }

    restoreScrollViewport(scrollContainer, initialTop, initialHeight);
    return {
      strategy: "scroll-up",
      changedDom,
      reachedBoundary: false,
      notes: [`Stopped after reaching the max scroll budget of ${MAX_HISTORY_ITERATIONS} iterations.`],
    };
  }

  function resolveUserBody(turn) {
    return turn.querySelector(USER_BODY_SELECTOR) || turn.querySelector(USER_ROLE_SELECTOR);
  }

  function resolveAssistantMessageNode(turn) {
    const primary = turn.querySelector(ASSISTANT_PRIMARY_SELECTOR);
    if (primary) {
      return primary;
    }

    const nodes = Array.from(turn.querySelectorAll(ASSISTANT_ROLE_SELECTOR));
    return nodes[nodes.length - 1] || null;
  }

  function resolveCodeLanguage(codeNode) {
    let current = codeNode.parentElement;
    while (current && current !== document.body) {
      const hasCode = current.querySelector(CODE_CONTENT_SELECTOR);
      const copyButton = current.querySelector('button[aria-label="复制"], button[aria-label="Copy"]');
      if (hasCode && copyButton) {
        const candidates = Array.from(current.querySelectorAll("div"))
          .map((element) => normalizeWhitespace(element.textContent || ""))
          .filter((text) => text && text.length <= 32 && !text.includes("\n"))
          .filter((text) => text !== "复制" && text.toLowerCase() !== "copy");

        const language = candidates.find((text) => /^[a-z0-9+#.\- ]+$/i.test(text));
        return normalizeCodeLanguage(language || "");
      }

      current = current.parentElement;
    }

    return "";
  }

  function normalizeCodeLanguage(language) {
    const lower = language.toLowerCase();
    const map = {
      bash: "bash",
      shell: "bash",
      sh: "bash",
      powershell: "powershell",
      javascript: "javascript",
      typescript: "typescript",
      python: "python",
      json: "json",
      html: "html",
      css: "css",
      sql: "sql",
    };

    return map[lower] || lower;
  }

  function readCodeMirrorText(codeNode) {
    const lines = [];
    let currentLine = "";

    Array.from(codeNode.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        currentLine += node.textContent || "";
        return;
      }

      if (!(node instanceof HTMLElement)) {
        return;
      }

      if (node.tagName === "BR") {
        lines.push(currentLine);
        currentLine = "";
        return;
      }

      currentLine += node.innerText;
    });

    lines.push(currentLine);
    return lines.join("\n").replace(/\u00a0/g, " ").replace(/\n+$/g, "");
  }

  function extractMathSource(node) {
    if (!(node instanceof Element)) {
      return "";
    }

    const annotation = node.matches('annotation[encoding="application/x-tex"], annotation[encoding="application/x-tex; mode=display"]')
      ? node
      : node.querySelector('annotation[encoding="application/x-tex"], annotation[encoding="application/x-tex; mode=display"]');
    if (annotation) {
      return normalizeWhitespace(annotation.textContent || "");
    }

    const dataLatex = node.getAttribute("data-latex") || node.getAttribute("data-tex");
    if (dataLatex) {
      return normalizeWhitespace(dataLatex);
    }

    const mathScript = node.matches('script[type^="math/tex"]') ? node : node.querySelector('script[type^="math/tex"]');
    if (mathScript) {
      return normalizeWhitespace(mathScript.textContent || "");
    }

    return "";
  }

  function getTopLevelMathNodes(root) {
    if (!(root instanceof Element)) {
      return [];
    }

    const candidates = [];
    if (root.matches(MATH_ROOT_SELECTOR)) {
      candidates.push(root);
    }

    const all = candidates.concat(Array.from(root.querySelectorAll(MATH_ROOT_SELECTOR)));
    return all.filter((node) => {
      let current = node.parentElement;
      while (current && current !== root) {
        if (current.matches(MATH_ROOT_SELECTOR)) {
          return false;
        }
        current = current.parentElement;
      }
      return true;
    });
  }

  function isMathRootNode(node) {
    return node instanceof Element && node.matches(INLINE_MATH_ROOT_SELECTOR);
  }

  function isMathBlockNode(node) {
    return node instanceof Element && node.matches(BLOCK_MATH_ROOT_SELECTOR);
  }

  function isMathInlineNode(node) {
    return isMathRootNode(node) && !isMathBlockNode(node);
  }

  function serializeMathNode(node, displayMode) {
    const latex = extractMathSource(node);
    if (!latex) {
      return "";
    }

    return displayMode ? `$$\n${latex}\n$$` : `$${latex}$`;
  }

  function replaceMathNodesInClone(root) {
    if (!(root instanceof Element)) {
      return;
    }

    const mathNodes = getTopLevelMathNodes(root);
    mathNodes.forEach((node) => {
      const replacement = serializeMathNode(node, isMathBlockNode(node));
      node.replaceWith(root.ownerDocument.createTextNode(replacement));
    });
  }

  function serializeNodeViaClone(node) {
    if (!(node instanceof Element)) {
      return "";
    }

    const clone = node.cloneNode(true);
    if (!(clone instanceof Element)) {
      return "";
    }

    clone.querySelectorAll(".katex-html[aria-hidden='true']").forEach((noise) => {
      noise.remove();
    });
    replaceMathNodesInClone(clone);

    clone.querySelectorAll("annotation, mjx-assistive-mml, .MJX_Assistive_MathML").forEach((noise) => {
      noise.remove();
    });

    return Array.from(clone.childNodes).map(serializeInline).join("");
  }

  function serializeInline(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }

    if (!(node instanceof HTMLElement)) {
      return "";
    }

    if (isMathInlineNode(node)) {
      return serializeMathNode(node, false);
    }

    if (node.matches('[data-testid="webpage-citation-pill"]')) {
      const anchor = node.querySelector("a[href]");
      if (!anchor) {
        return "";
      }

      const label = normalizeWhitespace(anchor.textContent || "链接");
      const href = anchor.getAttribute("href") || "";
      return href ? ` [${label}](${href})` : ` ${label}`;
    }

    const children = Array.from(node.childNodes).map(serializeInline).join("");

    if (node.tagName === "BR") {
      return "\n";
    }

    if (node.tagName === "STRONG" || node.tagName === "B") {
      return `**${children.trim()}**`;
    }

    if (node.tagName === "EM" || node.tagName === "I") {
      return `*${children.trim()}*`;
    }

    if (node.tagName === "CODE") {
      return `\`${children.replace(/`/g, "\\`")}\``;
    }

    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      const label = children.trim() || href;
      return href ? `[${label}](${href})` : label;
    }

    if (node.matches(MATH_ROOT_SELECTOR) || node.querySelector(MATH_ROOT_SELECTOR)) {
      return serializeNodeViaClone(node);
    }

    return children;
  }

  function serializeList(node, ordered) {
    const items = Array.from(node.children).filter((child) => child.tagName === "LI");
    return items
      .map((item, index) => {
        const prefix = ordered ? `${index + 1}. ` : "- ";
        const text = normalizeWhitespace(Array.from(item.childNodes).map(serializeInline).join(""));
        return `${prefix}${text}`;
      })
      .join("\n");
  }

  function serializeTable(node) {
    const rows = Array.from(node.querySelectorAll("tr"));
    if (!rows.length) {
      return normalizeWhitespace(node.innerText);
    }

    const serializedRows = rows.map((row) =>
      Array.from(row.querySelectorAll("th, td"))
        .map((cell) => normalizeWhitespace(cell.innerText).replace(/\|/g, "\\|"))
        .join(" | "),
    );

    if (serializedRows.length === 1) {
      return `| ${serializedRows[0]} |`;
    }

    const firstRowColumns = serializedRows[0].split(" | ").length;
    const separator = Array.from({ length: firstRowColumns }, () => "---").join(" | ");
    return [`| ${serializedRows[0]} |`, `| ${separator} |`, ...serializedRows.slice(1).map((row) => `| ${row} |`)].join("\n");
  }

  function serializeBlock(node) {
    if (!(node instanceof HTMLElement)) {
      return "";
    }

    if (isMathBlockNode(node)) {
      return serializeMathNode(node, true);
    }

    if (isMathInlineNode(node)) {
      return serializeMathNode(node, false);
    }

    if (node.matches(CODE_CONTENT_SELECTOR)) {
      const code = readCodeMirrorText(node);
      const language = resolveCodeLanguage(node);
      return `\`\`\`${language}\n${code}\n\`\`\``;
    }

    const nestedCode = node.querySelector(CODE_CONTENT_SELECTOR);
    if (nestedCode) {
      return serializeBlock(nestedCode);
    }

    const tagName = node.tagName;
    if (tagName === "P") {
      return normalizeWhitespace(Array.from(node.childNodes).map(serializeInline).join(""));
    }

    if (tagName === "UL") {
      return serializeList(node, false);
    }

    if (tagName === "OL") {
      return serializeList(node, true);
    }

    if (tagName === "BLOCKQUOTE") {
      return normalizeWhitespace(node.innerText)
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    }

    if (/^H[1-6]$/.test(tagName)) {
      const depth = Number(tagName[1]);
      return `${"#".repeat(depth)} ${normalizeWhitespace(node.innerText)}`;
    }

    if (tagName === "TABLE") {
      return serializeTable(node);
    }

    if (tagName === "PRE") {
      return `\`\`\`\n${node.innerText.replace(/\n+$/g, "")}\n\`\`\``;
    }

    if (tagName === "HR") {
      return "---";
    }

    const childBlocks = Array.from(node.children).map(serializeBlock).filter(Boolean);
    if (childBlocks.length) {
      return childBlocks.join("\n\n");
    }

    return normalizeWhitespace(node.innerText);
  }

  function serializeAssistantMarkdown(bodyNode) {
    if (!(bodyNode instanceof HTMLElement)) {
      return "";
    }

    const blocks = Array.from(bodyNode.childNodes)
      .map((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return normalizeWhitespace(node.textContent || "");
        }

        if (!(node instanceof HTMLElement)) {
          return "";
        }

        return serializeBlock(node);
      })
      .filter(Boolean);

    return normalizeWhitespace(blocks.join("\n\n"));
  }

  function collectConversation() {
    const turns = resolveTurns();
    const messages = [];

    turns.forEach((turn, index) => {
      const turnId = turn.getAttribute("data-testid") || `conversation-turn-${index + 1}`;
      const userBody = resolveUserBody(turn);
      if (userBody instanceof HTMLElement) {
        const text = normalizeWhitespace(userBody.innerText);
        if (text) {
          messages.push({
            id: `${turnId}:user`,
            turnId,
            index: messages.length + 1,
            role: "user",
            text,
            markdown: text,
            html: userBody.innerHTML,
          });
        }
        return;
      }

      const assistantNode = resolveAssistantMessageNode(turn);
      if (!(assistantNode instanceof HTMLElement)) {
        return;
      }

      const assistantBody = assistantNode.querySelector(ASSISTANT_BODY_SELECTOR) || assistantNode;
      if (!(assistantBody instanceof HTMLElement)) {
        return;
      }

      const markdown = serializeAssistantMarkdown(assistantBody);
      const text = normalizeWhitespace(assistantBody.innerText || markdown);
      if (!text && !markdown) {
        return;
      }

      messages.push({
        id: `${turnId}:assistant`,
        turnId,
        index: messages.length + 1,
        role: "assistant",
        text,
        markdown: markdown || text,
        html: assistantBody.innerHTML,
      });
    });

    return {
      metadata: {
        title: cleanConversationTitle(),
        url: window.location.href,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
      },
      messages,
    };
  }

  function applySelection(conversation) {
    if (!selectionLoaded) {
      return conversation;
    }

    const messages = conversation.messages.filter((message) => selectedMessageIds.has(message.id));
    return {
      metadata: {
        ...conversation.metadata,
        messageCount: messages.length,
      },
      messages,
    };
  }

  function toJson(conversation) {
    return JSON.stringify(conversation, null, 2);
  }

  function toMarkdown(conversation) {
    const lines = [
      `# ${conversation.metadata.title}`,
      "",
      `- Exported At: ${conversation.metadata.exportedAt}`,
      `- Source: ${conversation.metadata.url}`,
      `- Message Count: ${conversation.metadata.messageCount}`,
      "",
    ];

    conversation.messages.forEach((message) => {
      const heading = message.role === "user" ? "User" : "Assistant";
      lines.push(`## ${heading}`);
      lines.push("");
      lines.push(message.role === "assistant" ? message.markdown : message.text);
      lines.push("");
    });

    return lines.join("\n").trimEnd() + "\n";
  }

  function buildDataUrl(content, mimeType) {
    return `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`;
  }

  function bytesToBinaryString(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    return binary;
  }

  function binaryStringToUint8Array(binary) {
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index) & 0xff;
    }
    return bytes;
  }

  function bytesToBase64(bytes) {
    return btoa(bytesToBinaryString(bytes));
  }

  function dataUrlToBytes(dataUrl) {
    const base64Marker = "base64,";
    const markerIndex = dataUrl.indexOf(base64Marker);
    if (markerIndex === -1) {
      throw new Error("无法读取页面图像数据。");
    }

    const base64 = dataUrl.slice(markerIndex + base64Marker.length);
    const binary = atob(base64);
    return binaryStringToUint8Array(binary);
  }

  function wrapCanvasText(context, text, maxWidth) {
    if (!text) {
      return [""];
    }

    const lines = [];
    let current = "";
    for (const char of text) {
      const next = current + char;
      if (current && context.measureText(next).width > maxWidth) {
        lines.push(current);
        current = char;
      } else {
        current = next;
      }
    }

    if (current || !lines.length) {
      lines.push(current);
    }

    return lines;
  }

  function toRenderableBlocks(body) {
    const source = normalizeWhitespace(body || "").replace(/\r\n/g, "\n");
    const lines = source.split("\n");
    const blocks = [];
    let inCode = false;
    let buffer = [];

    const pushText = () => {
      if (!buffer.length) {
        return;
      }
      blocks.push({
        type: "text",
        lines: buffer.slice(),
      });
      buffer = [];
    };

    const pushCode = () => {
      blocks.push({
        type: "code",
        lines: buffer.slice(),
      });
      buffer = [];
    };

    lines.forEach((line) => {
      if (/^```/.test(line.trim())) {
        if (inCode) {
          pushCode();
          inCode = false;
          return;
        }

        pushText();
        inCode = true;
        buffer = [];
        return;
      }

      buffer.push(line);
    });

    if (buffer.length) {
      if (inCode) {
        pushCode();
      } else {
        pushText();
      }
    }

    if (!blocks.length) {
      blocks.push({
        type: "text",
        lines: [source],
      });
    }

    return blocks;
  }

  function renderConversationPdfPages(conversation) {
    const pageWidth = 1240;
    const pageHeight = 1754;
    const marginX = 84;
    const marginTop = 92;
    const marginBottom = 92;
    const contentWidth = pageWidth - marginX * 2;
    const pages = [];
    let canvas = null;
    let context = null;
    let y = marginTop;

    const startPage = () => {
      canvas = document.createElement("canvas");
      canvas.width = pageWidth;
      canvas.height = pageHeight;
      context = canvas.getContext("2d");
      if (!context) {
        throw new Error("无法创建 PDF 画布。");
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, pageWidth, pageHeight);
      context.textBaseline = "top";
      y = marginTop;
      pages.push(canvas);
    };

    const ensureSpace = (height) => {
      if (!canvas || !context) {
        startPage();
      }

      if (y + height <= pageHeight - marginBottom) {
        return;
      }

      startPage();
    };

    const drawWrappedLines = (lines, options) => {
      const font = options.font;
      const lineHeight = options.lineHeight;
      const color = options.color;
      const background = options.background || "";
      const insetX = options.insetX || 0;
      const radius = options.radius || 0;

      context.font = font;
      context.fillStyle = color;

      lines.forEach((line) => {
        const wrapped = wrapCanvasText(context, line || " ", contentWidth - insetX * 2);
        wrapped.forEach((wrappedLine) => {
          ensureSpace(lineHeight + (background ? 8 : 0));
          if (background) {
            context.fillStyle = background;
            if (radius > 0 && typeof context.roundRect === "function") {
              context.beginPath();
              context.roundRect(marginX, y - 2, contentWidth, lineHeight + 8, radius);
              context.fill();
            } else {
              context.fillRect(marginX, y - 2, contentWidth, lineHeight + 8);
            }
            context.fillStyle = color;
          }

          context.fillText(wrappedLine, marginX + insetX, y + (background ? 2 : 0));
          y += lineHeight + (background ? 8 : 0);
        });
      });
    };

    startPage();

    context.font = '700 30px "Segoe UI", "Microsoft YaHei", sans-serif';
    context.fillStyle = "#0f172a";
    drawWrappedLines([conversation.metadata.title], {
      font: '700 30px "Segoe UI", "Microsoft YaHei", sans-serif',
      lineHeight: 42,
      color: "#0f172a",
    });
    y += 10;

    drawWrappedLines(
      [
        `Exported At: ${conversation.metadata.exportedAt}`,
        `Source: ${conversation.metadata.url}`,
        `Message Count: ${conversation.metadata.messageCount}`,
      ],
      {
        font: '400 18px "Segoe UI", "Microsoft YaHei", sans-serif',
        lineHeight: 28,
        color: "#475569",
      },
    );

    y += 16;

    conversation.messages.forEach((message) => {
      ensureSpace(54);
      context.font = '700 20px "Segoe UI", "Microsoft YaHei", sans-serif';
      context.fillStyle = message.role === "user" ? "#2563eb" : "#0f172a";
      context.fillText(message.role === "user" ? "用户" : "助手", marginX, y);
      y += 32;

      const blocks = toRenderableBlocks(message.role === "assistant" ? message.markdown : message.text);
      blocks.forEach((block, blockIndex) => {
        if (block.type === "code") {
          drawWrappedLines(block.lines.length ? block.lines : [""], {
            font: '400 18px "Cascadia Code", "Consolas", monospace',
            lineHeight: 24,
            color: "#0f172a",
            background: "#f8fafc",
            insetX: 14,
            radius: 14,
          });
        } else {
          block.lines.forEach((line, lineIndex) => {
            if (!line.trim()) {
              y += 12;
              return;
            }

            drawWrappedLines([line], {
              font: '400 20px "Segoe UI", "Microsoft YaHei", sans-serif',
              lineHeight: 30,
              color: "#111827",
            });

            if (lineIndex < block.lines.length - 1) {
              y += 2;
            }
          });
        }

        if (blockIndex < blocks.length - 1) {
          y += 10;
        }
      });

      y += 24;
    });

    return pages.map((pageCanvas) => ({
      width: pageCanvas.width,
      height: pageCanvas.height,
      bytes: dataUrlToBytes(pageCanvas.toDataURL("image/jpeg", 0.9)),
    }));
  }

  function buildPdfFromImages(images) {
    if (!images.length) {
      throw new Error("没有可写入 PDF 的页面。");
    }

    const objects = [null, null];
    const pageIds = [];

    images.forEach((image, index) => {
      const imageBinary = bytesToBinaryString(image.bytes);
      const imageObjectId = objects.push(
        `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n${imageBinary}\nendstream`,
      );

      const imageName = `Im${index + 1}`;
      const contentStream = `q\n${image.width} 0 0 ${image.height} 0 0 cm\n/${imageName} Do\nQ\n`;
      const contentObjectId = objects.push(
        `<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream`,
      );

      const pageObjectId = objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${image.width} ${image.height}] /Resources << /XObject << /${imageName} ${imageObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
      );

      pageIds.push(pageObjectId);
    });

    objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
    objects[1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] >>`;

    let output = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
    const offsets = [0];

    objects.forEach((body, index) => {
      offsets[index + 1] = output.length;
      output += `${index + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefOffset = output.length;
    output += `xref\n0 ${objects.length + 1}\n`;
    output += "0000000000 65535 f \n";

    for (let index = 1; index <= objects.length; index += 1) {
      output += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
    }

    output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return binaryStringToUint8Array(output);
  }

  function buildConversationPdfDataUrl(conversation) {
    const pages = renderConversationPdfPages(conversation);
    const pdfBytes = buildPdfFromImages(pages);
    return `data:application/pdf;base64,${bytesToBase64(pdfBytes)}`;
  }

  function requestBrowserDownloadUrl(filename, url) {
    const runtime = typeof chrome !== "undefined" ? chrome.runtime : null;
    if (!runtime || typeof runtime.sendMessage !== "function") {
      throw new Error("扩展运行时不可用，无法触发浏览器下载。");
    }

    return new Promise((resolve, reject) => {
      runtime.sendMessage(
        {
          type: "cge-download",
          filename,
          url,
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message || "下载请求失败。"));
            return;
          }

          if (!response || response.ok !== true) {
            reject(new Error((response && response.error) || "下载请求失败。"));
            return;
          }

          resolve(response);
        },
      );
    });
  }

  function requestBrowserDownload(filename, content, mimeType) {
    return requestBrowserDownloadUrl(filename, buildDataUrl(content, mimeType));
  }

  async function runExport(format) {
    if (exportInFlight) {
      return;
    }

    exportInFlight = true;
    setExportButtonsDisabled(true);
    setStatus("正在向上滚动补齐历史…", "muted");

    try {
      const historyResult = await ensureFullHistoryLoaded();
      latestConversation = collectConversation();
      const conversation = applySelection(latestConversation);

      if (!conversation.messages.length) {
        throw new Error("当前没有可导出的消息。请先刷新消息列表并至少勾选一条消息。");
      }

      renderSelectionList(latestConversation);
      renderTimelineList();

      if (format === "pdf") {
        const filename = `${cleanConversationTitle()}.pdf`;
        setStatus("正在生成 PDF…", "muted");
        const pdfUrl = buildConversationPdfDataUrl(conversation);
        setStatus("正在请求浏览器保存 PDF…", "muted");
        await requestBrowserDownloadUrl(filename, pdfUrl);
        const note = historyResult.strategy === "scroll-up" ? "，已尝试补齐历史" : "";
        setStatus(`导出完成：${filename}${note}`, "success");
        return;
      }

      const extension = format === "json" ? "json" : "md";
      const content = format === "json" ? toJson(conversation) : toMarkdown(conversation);
      const mimeType = format === "json" ? "application/json" : "text/markdown";
      const filename = `${cleanConversationTitle()}.${extension}`;

      setStatus("正在请求浏览器保存文件…", "muted");
      await requestBrowserDownload(filename, content, mimeType);

      const note = historyResult.strategy === "scroll-up" ? "，已尝试补齐历史" : "";
      setStatus(`导出完成：${filename}${note}`, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "导出失败。";
      setStatus(message, "error");
    } finally {
      setExportButtonsDisabled(false);
      exportInFlight = false;
    }
  }

  function start() {
    ensurePanel();
    ensureToolbar();
    ensureTimelinePanel();
    installObservers();
    void prepareTimeline(true);
    requestTimelineRefresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
