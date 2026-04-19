(() => {
  if (window.__cgePageHookLoaded) {
    return;
  }

  window.__cgePageHookLoaded = true;

  const MESSAGE_SOURCE = "cge-page-hook";
  const MESSAGE_TYPE = "cge-network-event";
  const FETCH_REQUEST_TYPE = "cge-page-fetch-request";
  const FETCH_RESPONSE_TYPE = "cge-page-fetch-response";
  const MAX_TEXT_LENGTH = 20000;
  const ASSET_PATTERN = /(backend-api|estuary|attachment|download|file[_-]|oaiusercontent|files\.|blob:)/i;
  let recentClickContext = {
    ts: 0,
    fileNames: [],
  };

  function normalizeText(value) {
    return typeof value === "string" ? value.slice(0, MAX_TEXT_LENGTH) : "";
  }

  function extractUrlCandidates(value) {
    if (typeof value !== "string" || !value) {
      return [];
    }

    const normalized = value
      .replace(/&amp;/g, "&")
      .replace(/\\u002F/g, "/")
      .replace(/\\\//g, "/");
    const patterns = [
      /https?:\/\/[^\s"'<>]+/gi,
      /\/backend-api\/estuary\/content\?[^\s"'<>]+/gi,
      /\/backend-api\/files\/[^\s"'<>]+/gi,
    ];
    const results = new Set();

    patterns.forEach((pattern) => {
      const matches = normalized.match(pattern) || [];
      matches.forEach((match) => {
        const trimmed = match.replace(/[),.;]+$/g, "");
        if (trimmed) {
          results.add(trimmed);
        }
      });
    });

    return Array.from(results);
  }

  function extractFileIds(value) {
    if (typeof value !== "string" || !value) {
      return [];
    }

    return Array.from(new Set((value.match(/file[_-][a-z0-9]+/gi) || []).map((match) => match.replace("-", "_"))));
  }

  function extractFileNames(value) {
    if (typeof value !== "string" || !value) {
      return [];
    }

    return Array.from(
      new Set(
        (value.match(/[a-z0-9-]+\.(pdf|docx?|xlsx?|pptx?|csv|txt|md|json|zip|rar|7z|png|jpe?g|webp|gif|svg)/gi) || [])
          .map((match) => match.trim()),
      ),
    );
  }

  function shouldInspect(url, bodyText) {
    return ASSET_PATTERN.test(url || "") || ASSET_PATTERN.test(bodyText || "");
  }

  function rememberClickContext(fileNames) {
    const normalized = Array.isArray(fileNames) ? fileNames.filter(Boolean) : [];
    if (!normalized.length) {
      return;
    }

    recentClickContext = {
      ts: Date.now(),
      fileNames: normalized,
    };
  }

  function postNetworkEvent(reason, url, bodyText) {
    const normalizedUrl = typeof url === "string" ? url : "";
    const normalizedBody = normalizeText(bodyText);
    const urls = Array.from(new Set([normalizedUrl, ...extractUrlCandidates(normalizedBody)])).filter(Boolean);
    const fileIds = extractFileIds(`${normalizedUrl}\n${normalizedBody}`);
    const fileNames = extractFileNames(normalizedBody);
    const allowRecentClickNames =
      reason === "dom-click" ||
      reason === "anchor-click" ||
      reason === "window-open" ||
      reason === "create-object-url" ||
      reason === "fetch-request" ||
      reason === "fetch-response-url" ||
      reason === "xhr-request" ||
      reason === "xhr-response-url";
    const recentFileNames =
      allowRecentClickNames && Date.now() - recentClickContext.ts < 5000 ? recentClickContext.fileNames : [];
    const mergedFileNames = Array.from(new Set([...fileNames, ...recentFileNames])).filter(Boolean);

    if (!urls.length && !fileIds.length && !mergedFileNames.length) {
      return;
    }

    window.postMessage(
      {
        source: MESSAGE_SOURCE,
        type: MESSAGE_TYPE,
        reason,
        url: normalizedUrl,
        urls,
        fileIds,
        fileNames: mergedFileNames,
        ts: Date.now(),
      },
      window.location.origin,
    );
  }

  function bodyToText(body) {
    if (!body) {
      return "";
    }

    if (typeof body === "string") {
      return body;
    }

    if (body instanceof URLSearchParams) {
      return body.toString();
    }

    if (body instanceof FormData) {
      const parts = [];
      body.forEach((value, key) => {
        parts.push(`${key}=${String(value)}`);
      });
      return parts.join("&");
    }

    return "";
  }

  function bytesToBase64(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, Math.min(index + chunkSize, bytes.length));
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  const originalFetch = window.fetch;
  window.fetch = async function patchedFetch(input, init) {
    const requestUrl =
      typeof input === "string"
        ? input
        : input && typeof input.url === "string"
          ? input.url
          : "";
    const bodyText = bodyToText(init && init.body);

    if (shouldInspect(requestUrl, bodyText)) {
      postNetworkEvent("fetch-request", requestUrl, bodyText);
    }

    const response = await originalFetch.apply(this, arguments);
    const responseUrl = response && typeof response.url === "string" ? response.url : requestUrl;

    if (shouldInspect(responseUrl, bodyText)) {
      postNetworkEvent("fetch-response-url", responseUrl, bodyText);
    }

    try {
      const contentType = response.headers.get("content-type") || "";
      if (/(json|text|javascript)/i.test(contentType) && shouldInspect(responseUrl, bodyText)) {
        const cloned = response.clone();
        const text = await cloned.text();
        postNetworkEvent("fetch-response-body", responseUrl, text);
      }
    } catch {
      // Ignore unreadable response bodies.
    }

    return response;
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function patchedOpen(method, url) {
    this.__cgeMethod = method;
    this.__cgeUrl = typeof url === "string" ? url : "";
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function patchedSend(body) {
    const bodyText = bodyToText(body);
    if (shouldInspect(this.__cgeUrl, bodyText)) {
      postNetworkEvent("xhr-request", this.__cgeUrl, bodyText);
    }

    this.addEventListener(
      "load",
      () => {
        const responseUrl = typeof this.responseURL === "string" ? this.responseURL : this.__cgeUrl;
        if (shouldInspect(responseUrl, bodyText)) {
          postNetworkEvent("xhr-response-url", responseUrl, bodyText);
        }

        try {
          const contentType = this.getResponseHeader("content-type") || "";
          if (/(json|text|javascript)/i.test(contentType) && typeof this.responseText === "string") {
            postNetworkEvent("xhr-response-body", responseUrl, this.responseText);
          }
        } catch {
          // Ignore unreadable xhr bodies.
        }
      },
      { once: true },
    );

    return originalSend.apply(this, arguments);
  };

  const originalCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = function patchedCreateObjectURL(object) {
    const objectUrl = originalCreateObjectURL(object);
    const parts = [];

    if (object && typeof object.type === "string" && object.type) {
      parts.push(`type=${object.type}`);
    }

    if (object && typeof object.name === "string" && object.name) {
      parts.push(`name=${object.name}`);
    }

    if (object && typeof object.size === "number") {
      parts.push(`size=${object.size}`);
    }

    postNetworkEvent("create-object-url", objectUrl, parts.join("&"));
    return objectUrl;
  };

  const originalAnchorClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function patchedAnchorClick() {
    const parts = [
      this.getAttribute("download") || "",
      this.getAttribute("aria-label") || "",
      this.getAttribute("title") || "",
      this.textContent || "",
    ].filter(Boolean);
    postNetworkEvent("anchor-click", this.href || "", parts.join("\n"));
    return originalAnchorClick.apply(this, arguments);
  };

  const originalWindowOpen = window.open;
  window.open = function patchedWindowOpen(url) {
    postNetworkEvent("window-open", typeof url === "string" ? url : "", "");
    return originalWindowOpen.apply(this, arguments);
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest("button, a, [role='button'], [aria-label], [title]") : null;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const parts = [
        target.getAttribute("aria-label") || "",
        target.getAttribute("title") || "",
        target.textContent || "",
      ].filter(Boolean);
      const fileNames = extractFileNames(parts.join("\n"));
      rememberClickContext(fileNames);
      if (fileNames.length) {
        postNetworkEvent("dom-click", "", parts.join("\n"));
      }
    },
    true,
  );

  window.addEventListener("message", async (event) => {
    if (event.source !== window || event.origin !== window.location.origin) {
      return;
    }

    const data = event.data;
    if (!data || data.source !== "cge-content-script" || data.type !== FETCH_REQUEST_TYPE) {
      return;
    }

    const requestId = typeof data.requestId === "string" ? data.requestId : "";
    const url = typeof data.url === "string" ? data.url : "";

    if (!requestId || !url) {
      return;
    }

    try {
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        window.postMessage(
          {
            source: MESSAGE_SOURCE,
            type: FETCH_RESPONSE_TYPE,
            requestId,
            ok: false,
            status: response.status,
            error: `HTTP ${response.status}`,
          },
          window.location.origin,
        );
        return;
      }

      const bytes = new Uint8Array(await response.arrayBuffer());
      window.postMessage(
        {
          source: MESSAGE_SOURCE,
          type: FETCH_RESPONSE_TYPE,
          requestId,
          ok: true,
          url: response.url || url,
          mimeType: (response.headers.get("content-type") || "").split(";")[0].trim(),
          contentDisposition: response.headers.get("content-disposition") || "",
          base64: bytesToBase64(bytes),
        },
        window.location.origin,
      );
    } catch (error) {
      window.postMessage(
        {
          source: MESSAGE_SOURCE,
          type: FETCH_RESPONSE_TYPE,
          requestId,
          ok: false,
          error: error instanceof Error ? error.message : "Page fetch failed.",
        },
        window.location.origin,
      );
    }
  });
})();
