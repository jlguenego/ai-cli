export type AdapterId = "copilot" | "codex" | "claude";

export type AdapterAvailabilityStatus =
  | "available"
  | "missing"
  | "unauthenticated"
  | "unsupported";

export interface AdapterAvailability {
  status: AdapterAvailabilityStatus;
  details?: string;
}

export interface AdapterRunOnceArgs {
  prompt: string;
  cwd: string;
  env?: Record<string, string | undefined>;
  timeoutMs?: number;
  /** Callback appelé pour chaque chunk reçu en streaming (optionnel) */
  onChunk?: (chunk: string) => void;
}

export interface AdapterRunOnceResult {
  exitCode: number;
  text: string;
  raw?: unknown;
}

export interface Adapter {
  id: AdapterId;

  isAvailable(): Promise<AdapterAvailability>;

  runOnce(args: AdapterRunOnceArgs): Promise<AdapterRunOnceResult>;
}
