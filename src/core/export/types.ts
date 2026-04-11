export type ExportFormat = "json" | "markdown" | "pdf" | "image";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  text: string;
  html?: string;
  hostSelectorHint?: string;
}

export interface ConversationMetadata {
  title: string;
  url: string;
  exportedAt: string;
  messageCount: number;
}

export interface CollectedConversation {
  metadata: ConversationMetadata;
  messages: ConversationMessage[];
}

export interface ExportRequest {
  format: ExportFormat;
  loadFullHistory: boolean;
}

export interface ValidationIssue {
  area:
    | "conversation-root"
    | "message-selectors"
    | "entry-points"
    | "history-loading"
    | "rich-content";
  severity: "info" | "warning" | "blocking";
  summary: string;
}

export interface ExportPreparationResult {
  supported: boolean;
  conversation: CollectedConversation | null;
  issues: ValidationIssue[];
}

export interface HistoryLoadResult {
  strategy:
    | "none"
    | "scroll-up"
    | "click-load-more"
    | "unknown";
  changedDom: boolean;
  reachedBoundary: boolean;
  notes: string[];
}

export interface ExportEntryPoint {
  kind: "global-button" | "toolbar-button" | "conversation-menu" | "message-menu";
  selector: string;
  confidence: "high" | "medium" | "low";
}
