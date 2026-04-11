import type {
  CollectedConversation,
  ExportEntryPoint,
  ExportRequest,
  HistoryLoadResult,
  ValidationIssue,
} from "../../core/export/types";
import type { LocationLike } from "../../core/export/ExporterCore";

export interface PlatformAdapter {
  readonly platform: string;

  matches(location: LocationLike): boolean;

  resolveEntryPoints(doc: Document): ExportEntryPoint[];

  ensureHistoryLoaded(doc: Document, win: Window): Promise<HistoryLoadResult>;

  collectConversation(
    doc: Document,
    location: LocationLike,
    request: ExportRequest,
  ): CollectedConversation | null;

  describeOpenQuestions(): ValidationIssue[];
}
