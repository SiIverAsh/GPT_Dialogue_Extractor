"use strict";
// @ts-nocheck
(function () {
    if (window.__chatgptExporterDownloadBridgeLoaded) {
        return;
    }
    window.__chatgptExporterDownloadBridgeLoaded = true;
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
    function buildBinaryDataUrl(bytes, mimeType) {
        return `data:${mimeType};base64,${btoa(bytesToBinaryString(bytes))}`;
    }
    function requestBrowserDownloadUrl(filename, url, options) {
        const runtime = typeof chrome !== "undefined" ? chrome.runtime : null;
        if (!runtime || typeof runtime.sendMessage !== "function") {
            throw new Error("扩展运行时不可用，无法触发浏览器下载。");
        }
        return new Promise((resolve, reject) => {
            runtime.sendMessage({
                type: "cge-download",
                filename,
                url,
                saveAs: options && typeof options.saveAs === "boolean" ? options.saveAs : true,
                conflictAction: options && typeof options.conflictAction === "string" ? options.conflictAction : "uniquify",
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message || "下载请求失败。"));
                    return;
                }
                if (!response || response.ok !== true) {
                    reject(new Error((response && response.error) || "下载请求失败。"));
                    return;
                }
                resolve(response);
            });
        });
    }
    function requestBrowserDownload(filename, content, mimeType) {
        return requestBrowserDownloadUrl(filename, buildDataUrl(content, mimeType));
    }
    function requestBrowserDownloadBytes(filename, bytes, mimeType) {
        return requestBrowserDownloadUrl(filename, buildBinaryDataUrl(bytes, mimeType));
    }
    window.ChatGPTExporterDownloadBridge = {
        buildDataUrl,
        buildBinaryDataUrl,
        requestBrowserDownloadUrl,
        requestBrowserDownload,
        requestBrowserDownloadBytes,
    };
})();
