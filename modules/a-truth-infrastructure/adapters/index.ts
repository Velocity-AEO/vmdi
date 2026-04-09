export { publishToVAEOBlog } from "./vaeo-blog-adapter.js";
export { publishToVMDIBlog } from "./vmdi-blog-adapter.js";
export { getAdapter } from "./adapter-registry.js";
export { publishAsset } from "./publish-orchestrator.js";

export type {
  PublishableAsset,
  AdapterResult,
  Adapter,
  PublishResult,
} from "./types.js";
