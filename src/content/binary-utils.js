"use strict";
// @ts-nocheck
(function () {
    if (window.__chatgptExporterBinaryUtilsLoaded) {
        return;
    }
    window.__chatgptExporterBinaryUtilsLoaded = true;
    function stringToUtf8Bytes(value) {
        return new TextEncoder().encode(value);
    }
    function binaryStringToUint8Array(binary) {
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
            bytes[index] = binary.charCodeAt(index) & 0xff;
        }
        return bytes;
    }
    function parseDataUrl(dataUrl) {
        const commaIndex = dataUrl.indexOf(",");
        if (!dataUrl.startsWith("data:") || commaIndex === -1) {
            throw new Error("无法解析 data URL。");
        }
        const metadata = dataUrl.slice(5, commaIndex);
        const payload = dataUrl.slice(commaIndex + 1);
        const isBase64 = /;base64/i.test(metadata);
        const mimeType = (metadata.split(";")[0] || "application/octet-stream").trim();
        if (isBase64) {
            return {
                mimeType,
                bytes: binaryStringToUint8Array(atob(payload)),
            };
        }
        return {
            mimeType,
            bytes: stringToUtf8Bytes(decodeURIComponent(payload)),
        };
    }
    function concatBytes(chunks) {
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const output = new Uint8Array(totalLength);
        let offset = 0;
        chunks.forEach((chunk) => {
            output.set(chunk, offset);
            offset += chunk.length;
        });
        return output;
    }
    function uint16Bytes(value) {
        const bytes = new Uint8Array(2);
        new DataView(bytes.buffer).setUint16(0, value & 0xffff, true);
        return bytes;
    }
    function uint32Bytes(value) {
        const bytes = new Uint8Array(4);
        new DataView(bytes.buffer).setUint32(0, value >>> 0, true);
        return bytes;
    }
    function buildCrc32Table() {
        const table = new Uint32Array(256);
        for (let index = 0; index < 256; index += 1) {
            let current = index;
            for (let bit = 0; bit < 8; bit += 1) {
                current = (current & 1) !== 0 ? 0xedb88320 ^ (current >>> 1) : current >>> 1;
            }
            table[index] = current >>> 0;
        }
        return table;
    }
    const CRC32_TABLE = buildCrc32Table();
    function crc32(bytes) {
        let value = 0xffffffff;
        for (let index = 0; index < bytes.length; index += 1) {
            value = CRC32_TABLE[(value ^ bytes[index]) & 0xff] ^ (value >>> 8);
        }
        return (value ^ 0xffffffff) >>> 0;
    }
    function getDosDateTime(date) {
        const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
        const year = Math.max(1980, safeDate.getFullYear());
        const month = safeDate.getMonth() + 1;
        const day = safeDate.getDate();
        const hours = safeDate.getHours();
        const minutes = safeDate.getMinutes();
        const seconds = Math.floor(safeDate.getSeconds() / 2);
        return {
            dosDate: ((year - 1980) << 9) | (month << 5) | day,
            dosTime: (hours << 11) | (minutes << 5) | seconds,
        };
    }
    function buildZip(entries) {
        if (!entries.length) {
            throw new Error("没有可写入 ZIP 的文件。");
        }
        const localParts = [];
        const centralParts = [];
        let offset = 0;
        entries.forEach((entry) => {
            const pathBytes = stringToUtf8Bytes(entry.path);
            const fileBytes = entry.bytes;
            const checksum = crc32(fileBytes);
            const { dosDate, dosTime } = getDosDateTime(entry.modifiedAt);
            const localHeader = new Uint8Array(30 + pathBytes.length);
            const localView = new DataView(localHeader.buffer);
            localView.setUint32(0, 0x04034b50, true);
            localView.setUint16(4, 20, true);
            localView.setUint16(6, 0, true);
            localView.setUint16(8, 0, true);
            localView.setUint16(10, dosTime, true);
            localView.setUint16(12, dosDate, true);
            localView.setUint32(14, checksum, true);
            localView.setUint32(18, fileBytes.length, true);
            localView.setUint32(22, fileBytes.length, true);
            localView.setUint16(26, pathBytes.length, true);
            localView.setUint16(28, 0, true);
            localHeader.set(pathBytes, 30);
            localParts.push(localHeader, fileBytes);
            const centralHeader = new Uint8Array(46 + pathBytes.length);
            const centralView = new DataView(centralHeader.buffer);
            centralView.setUint32(0, 0x02014b50, true);
            centralView.setUint16(4, 20, true);
            centralView.setUint16(6, 20, true);
            centralView.setUint16(8, 0, true);
            centralView.setUint16(10, 0, true);
            centralView.setUint16(12, dosTime, true);
            centralView.setUint16(14, dosDate, true);
            centralView.setUint32(16, checksum, true);
            centralView.setUint32(20, fileBytes.length, true);
            centralView.setUint32(24, fileBytes.length, true);
            centralView.setUint16(28, pathBytes.length, true);
            centralView.setUint16(30, 0, true);
            centralView.setUint16(32, 0, true);
            centralView.setUint16(34, 0, true);
            centralView.setUint16(36, 0, true);
            centralView.setUint32(38, 0, true);
            centralView.setUint32(42, offset, true);
            centralHeader.set(pathBytes, 46);
            centralParts.push(centralHeader);
            offset += localHeader.length + fileBytes.length;
        });
        const centralDirectory = concatBytes(centralParts);
        const localData = concatBytes(localParts);
        const endRecord = concatBytes([
            uint32Bytes(0x06054b50),
            uint16Bytes(0),
            uint16Bytes(0),
            uint16Bytes(entries.length),
            uint16Bytes(entries.length),
            uint32Bytes(centralDirectory.length),
            uint32Bytes(localData.length),
            uint16Bytes(0),
        ]);
        return concatBytes([localData, centralDirectory, endRecord]);
    }
    window.ChatGPTExporterBinaryUtils = {
        stringToUtf8Bytes,
        binaryStringToUint8Array,
        parseDataUrl,
        buildZip,
    };
})();
