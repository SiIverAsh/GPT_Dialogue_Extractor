import type {
  CollectedConversation,
  ConversationMetadata,
  ExportEntryPoint,
  ExportRequest,
  HistoryLoadResult,
  ValidationIssue,
} from "../../core/export/types";
import type { LocationLike } from "../../core/export/ExporterCore";
import type { PlatformAdapter } from "../shared/PlatformAdapter";
import { describeSelectorGroups } from "./ChatGPTSelectors";
import { HistoryLoader } from "./history/HistoryLoader";

export class ChatGPTAdapter implements PlatformAdapter {
  readonly platform = "chatgpt";

  matches(location: LocationLike): boolean {
    return location.hostname === "chatgpt.com" || location.hostname === "chat.openai.com";
  }

  resolveEntryPoints(_doc: Document): ExportEntryPoint[] {
    return [
      {
        kind: "global-button",
        selector: "#conversation-header-actions",
        confidence: "high",
      },
      {
        kind: "toolbar-button",
        selector: "button[data-testid='share-chat-button']",
        confidence: "high",
      },
    ];
  }

  async ensureHistoryLoaded(_doc: Document, _win: Window): Promise<HistoryLoadResult> {
    const loader = new HistoryLoader();
    return await loader.load();
  }

  collectConversation(
    _doc: Document,
    location: LocationLike,
    _request: ExportRequest,
  ): CollectedConversation | null {
    const metadata: ConversationMetadata = {
      title: "ChatGPT Conversation",
      url: location.href,
      exportedAt: new Date().toISOString(),
      messageCount: 0,
    };

    return {
      metadata,
      messages: [],
    };
  }

  describeOpenQuestions(): ValidationIssue[] {
    const selectorSummary = describeSelectorGroups().join("; ");
    return [
      {
        area: "history-loading",
        severity: "warning",
        summary:
          "The MVP should use upward scrolling on the conversation container. Load-more button behavior is still unverified.",
      },
      {
        area: "entry-points",
        severity: "info",
        summary:
          "Global export injection is validated on #conversation-header-actions. Message-level export should remain a follow-up.",
      },
      {
        area: "rich-content",
        severity: "warning",
        summary:
          `Validated selector groups: ${selectorSummary}. Code blocks now have a confirmed .cm-content path, but tables, formulas, and reasoning UI still need refinement.`,
      },
    ];
  }
}
