import type { Adapter, PublishableAsset, AdapterResult } from "./types.js";
import { publishToVAEOBlog } from "./vaeo-blog-adapter.js";
import { publishToVMDIBlog } from "./vmdi-blog-adapter.js";

const adapters: Record<string, (asset: PublishableAsset) => Promise<AdapterResult>> = {
  vaeo_blog: publishToVAEOBlog,
  vmdi_blog: publishToVMDIBlog,
};

export function getAdapter(channelType: string): Adapter {
  const publishFn = adapters[channelType];

  if (!publishFn) {
    const available = Object.keys(adapters).join(", ");
    throw new Error(
      `Unknown channel type "${channelType}". Available adapters: ${available}`
    );
  }

  return {
    publish: publishFn,
  };
}
