export interface SelectorCandidateGroup {
  name: string;
  purpose: string;
  candidates: string[];
  validationRequired: boolean;
}

export const chatGPTSelectorGroups: SelectorCandidateGroup[] = [
  {
    name: "conversationRoot",
    purpose: "Root node or scroll container that owns the visible conversation thread.",
    candidates: [
      "section[data-testid^='conversation-turn-']",
      "nearest scrollable ancestor of the first conversation turn",
    ],
    validationRequired: false,
  },
  {
    name: "userTurns",
    purpose: "Top-level DOM hosts for user-authored messages.",
    candidates: [
      "section[data-testid^='conversation-turn-'] [data-message-author-role='user']",
      "section[data-testid^='conversation-turn-'] [data-message-author-role='user'] .whitespace-pre-wrap",
    ],
    validationRequired: false,
  },
  {
    name: "assistantTurns",
    purpose: "Top-level DOM hosts for assistant-authored messages.",
    candidates: [
      "section[data-testid^='conversation-turn-'] [data-message-author-role='assistant'][data-turn-start-message='true']",
      "section[data-testid^='conversation-turn-'] [data-message-author-role='assistant']",
    ],
    validationRequired: false,
  },
  {
    name: "messageBody",
    purpose: "Main rich-text body inside a single turn.",
    candidates: [
      "[data-message-author-role='assistant'][data-turn-start-message='true'] .markdown",
      "[data-message-author-role='user'] .whitespace-pre-wrap",
      ".cm-content",
    ],
    validationRequired: false,
  },
  {
    name: "globalEntryPoint",
    purpose: "Stable top-level place to inject a global export button.",
    candidates: [
      "#conversation-header-actions",
      "button[data-testid='share-chat-button']",
      "button[data-testid='conversation-options-button']",
    ],
    validationRequired: false,
  },
  {
    name: "messageMenuEntryPoint",
    purpose: "Optional message-level menu or action area for single-message export.",
    candidates: [
      "button[data-testid='copy-turn-action-button']",
      "button[aria-label='更多操作']",
      "div[aria-label='回复操作']",
    ],
    validationRequired: true,
  },
];

export function describeSelectorGroups(): string[] {
  return chatGPTSelectorGroups.map(
    (group) => `${group.name}: ${group.candidates.join(" | ")}`,
  );
}
