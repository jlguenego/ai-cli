import type {
  Adapter,
  AdapterAvailability,
  AdapterId,
  AdapterRunOnceArgs,
  AdapterRunOnceResult,
} from "./types.js";
import { CopilotAdapter } from "./copilot.js";
import { CodexAdapter } from "./codex.js";

const ADAPTER_IDS = [
  "copilot",
  "codex",
  "claude",
] as const satisfies readonly AdapterId[];

function isAdapterId(id: string): id is AdapterId {
  return (ADAPTER_IDS as readonly string[]).includes(id);
}

class UnsupportedClaudeAdapter implements Adapter {
  public readonly id = "claude" as const;

  async isAvailable(): Promise<AdapterAvailability> {
    return { status: "unsupported", details: "Backend claude hors MVP" };
  }

  async runOnce(_args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult> {
    return {
      exitCode: 64,
      text: "Backend claude non supporté (MVP)",
      raw: { kind: "unsupported" },
    };
  }
}

const REGISTRY: ReadonlyMap<AdapterId, Adapter> = new Map<AdapterId, Adapter>([
  ["copilot", new CopilotAdapter()],
  ["codex", new CodexAdapter()],
  ["claude", new UnsupportedClaudeAdapter()],
]);

export function getAdapters(): readonly Adapter[] {
  return Array.from(REGISTRY.values());
}

export function getAdapterById(id: AdapterId): Adapter {
  const adapter = REGISTRY.get(id);
  if (!adapter) {
    // Should be unreachable as AdapterId is a closed union.
    throw new Error(`Unknown adapter id: ${id}`);
  }
  return adapter;
}

export function tryGetAdapterById(id: string): Adapter | null {
  if (!isAdapterId(id)) {
    return null;
  }

  return REGISTRY.get(id) ?? null;
}
