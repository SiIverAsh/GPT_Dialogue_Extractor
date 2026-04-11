chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "cge-download") {
    return false;
  }

  const filename = typeof message.filename === "string" ? message.filename : "chatgpt-conversation.txt";
  const url = typeof message.url === "string" ? message.url : "";

  if (!url) {
    sendResponse({
      ok: false,
      error: "Missing download URL.",
    });
    return false;
  }

  chrome.downloads.download(
    {
      url,
      filename,
      saveAs: true,
      conflictAction: "uniquify",
    },
    (downloadId) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          ok: false,
          error: chrome.runtime.lastError.message || "Download failed.",
        });
        return;
      }

      sendResponse({
        ok: true,
        downloadId: downloadId || null,
      });
    },
  );

  return true;
});
