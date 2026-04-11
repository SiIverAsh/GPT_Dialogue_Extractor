import type { HistoryLoadResult } from "../../../core/export/types";

export interface HistoryStrategyOption {
  mode: "none" | "scroll-up" | "click-load-more" | "unknown";
  summary: string;
  why: string;
}

export const historyStrategyOptions: HistoryStrategyOption[] = [
  {
    mode: "none",
    summary: "All messages are already present in DOM.",
    why: "Best case. Export can start immediately after message collection.",
  },
  {
    mode: "scroll-up",
    summary: "Older messages appear only when the conversation container is scrolled upward.",
    why: "Most likely if ChatGPT virtualizes or lazily expands long threads.",
  },
  {
    mode: "click-load-more",
    summary: "A dedicated control must be clicked to load older turns.",
    why: "Possible if the UI exposes an explicit pagination or backfill action.",
  },
  {
    mode: "unknown",
    summary: "History behavior is not validated yet.",
    why: "Use this until a real conversation page is inspected.",
  },
];

export class HistoryLoader {
  async load(): Promise<HistoryLoadResult> {
    return {
      strategy: "scroll-up",
      changedDom: false,
      reachedBoundary: false,
      notes: [
        "A live ChatGPT conversation page exposed a dedicated scroll container above the turn list.",
        "The MVP should load older turns by scrolling that container upward and stopping after repeated stable fingerprints.",
      ],
    };
  }
}
