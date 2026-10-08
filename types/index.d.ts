export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Snapshot = { tokens?: number; window: number; limits: Limit[] }
export type Cache = { read: number; total: number }

declare module 'claude-code' {
  interface PluginState {
    'cc-usage-band': { snap: Snapshot | null; cache: Cache | null; now: number }
  }
}
