import { ExporterCore } from "./core/export/ExporterCore";
import { ChatGPTAdapter } from "./platforms/chatgpt/ChatGPTAdapter";

const adapter = new ChatGPTAdapter();
const exporter = new ExporterCore(adapter);

export { adapter, exporter };
