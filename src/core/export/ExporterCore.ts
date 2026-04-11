import type {
  ExportPreparationResult,
  ExportRequest,
  ValidationIssue,
} from "./types";
import type { PlatformAdapter } from "../../platforms/shared/PlatformAdapter";

export interface LocationLike {
  href: string;
  hostname: string;
  pathname: string;
}

export interface ExportExecutionPlan {
  platform: string;
  request: ExportRequest;
  supported: boolean;
  steps: string[];
  issues: ValidationIssue[];
}

export class ExporterCore {
  constructor(private readonly adapter: PlatformAdapter) {}

  buildPlan(location: LocationLike, request: ExportRequest): ExportExecutionPlan {
    const supported = this.adapter.matches(location);
    const issues = this.adapter.describeOpenQuestions();

    const steps: string[] = [];
    steps.push("Validate that the current page matches the adapter.");
    steps.push("Resolve a stable export entry point for the current platform.");
    if (request.loadFullHistory) {
      steps.push("Attempt to load older conversation history using the platform history strategy.");
    }
    steps.push("Collect DOM-backed conversation messages.");
    steps.push(`Serialize the result as ${request.format}.`);

    return {
      platform: this.adapter.platform,
      request,
      supported,
      steps,
      issues,
    };
  }

  prepare(doc: Document, location: LocationLike, request: ExportRequest): ExportPreparationResult {
    if (!this.adapter.matches(location)) {
      return {
        supported: false,
        conversation: null,
        issues: [
          {
            area: "entry-points",
            severity: "blocking",
            summary: `Adapter ${this.adapter.platform} does not support ${location.hostname}${location.pathname}.`,
          },
        ],
      };
    }

    const conversation = this.adapter.collectConversation(doc, location, request);

    return {
      supported: true,
      conversation,
      issues: this.adapter.describeOpenQuestions(),
    };
  }
}
