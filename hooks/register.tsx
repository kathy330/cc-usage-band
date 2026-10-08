import { atom, read, update } from 'claude-code'
import type { Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Cache, Snapshot } from '../types'

const snapAtom = atom({ plugin: 'cc-usage-band', key: 'snap' } as const, null)
const cacheAtom = atom({ plugin: 'cc-usage-band', key: 'cache' } as const, null)
const nowAtom = atom({ plugin: 'cc-usage-band', key: 'now' } as const, 0)

const LABEL: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: '$' }

export const toSnap = (context: SessionContextUsage, limits: SessionRateLimit[]): Snapshot => ({
  tokens: context.tokens,
  window: context.window,
  limits: limits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed, resetsAt: l.resetsAt })),
})

export const fmtTokens = (n: number): string =>
  n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : `${n}`

export const fmtLeft = (resetsAt: string | undefined, now: number): string => {
  if (!resetsAt) return ''
  const ms = Date.parse(resetsAt) - now
  if (!(ms > 0)) return '0m'
  const m = Math.floor(ms / 60000)
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  return d > 0 ? `${d}d${h}h` : h > 0 ? `${h}h${m % 60}m` : `${m}m`
}

/** Filled cells of a meter, 0…cells. */
export const filled = (pct: number, cells: number): number =>
  Math.max(0, Math.min(cells, Math.round((pct / 100) * cells)))

// Mid-tone colours that read on light and dark themes (the demo's palette).
const TEAL = '#2fa392'
const AMBER = '#d4893a'
const RED = '#e0585b'
const VIOLET = '#7f7ae0'
const GREEN = '#3daa6e'

/** Usage colour: calm under 50%, amber to 80%, red above. */
export const tone = (pct: number): string => (pct >= 80 ? RED : pct >= 50 ? AMBER : TEAL)

/** Cache hit colour: high is good. */
export const hitTone = (pct: number): string => (pct >= 70 ? GREEN : pct >= 30 ? AMBER : RED)

export const hitRate = (c: Cache | null): number | null =>
  c && c.total > 0 ? Math.round((c.read / c.total) * 100) : null

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const r = await next(e)
    const u = await $.session.usage()
    await update($, snapAtom, () => toSnap(u.context, u.rateLimits))
    const now = await $.clock.now()
    await update($, nowAtom, () => now)
    // redraw once a minute so the reset countdown moves
    $.clock.every(60_000, async () => {
      const t = await $.clock.now()
      await update($, nowAtom, () => t)
    })
    return r
  })

  on('session.measure', async ($, e, next) => {
    await update($, snapAtom, () => toSnap(e.context, e.rateLimits))
    const now = await $.clock.now()
    await update($, nowAtom, () => now)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId && e.usage) {
      const u = e.usage
      const total = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      if (total > 0) {
        await update($, cacheAtom, () => ({ read: u.cache_read_input_tokens, total }))
      }
    }
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const snap = await read($, snapAtom)
    const cache = await read($, cacheAtom)
    const now = (await read($, nowAtom)) || (await $.clock.now())
    if (!snap && !cache) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const parts: unknown[] = []
    const sep = (k: string) => (
      <Text key={k} dimColor>
        {'  │  '}
      </Text>
    )

    for (const l of snap?.limits ?? []) {
      const pct = Math.round(l.percentUsed)
      const n = filled(pct, 8)
      const left = fmtLeft(l.resetsAt, now)
      if (parts.length) parts.push(sep(`s-${l.kind}`))
      parts.push(
        <Text key={l.kind}>
          <Text dimColor>{LABEL[l.kind] ?? l.kind} </Text>
          <Text color={tone(pct)}>{'━'.repeat(n)}</Text>
          <Text dimColor>{'━'.repeat(8 - n)}</Text>
          <Text color={tone(pct)} bold>
            {' '}
            {pct}%
          </Text>
          {left ? <Text dimColor> {left}</Text> : null}
        </Text>,
      )
    }

    // Before the first reply there is no measurement yet: show the section empty rather than leave it out.
    if (snap && snap.window > 0) {
      const pct = snap.tokens !== undefined ? (snap.tokens / snap.window) * 100 : 0
      const n = filled(pct, 8)
      const color = pct >= 80 ? RED : VIOLET
      if (parts.length) parts.push(sep('s-ctx'))
      parts.push(
        <Text key="ctx">
          <Text color={color}>{'≋ '}</Text>
          <Text color={color}>{'⣿'.repeat(n)}</Text>
          <Text dimColor>{'⣿'.repeat(8 - n)}</Text>
          <Text color={color} bold>
            {' '}
            {snap.tokens !== undefined ? fmtTokens(snap.tokens) : '—'}
          </Text>
          <Text dimColor>/{fmtTokens(snap.window)}</Text>
        </Text>,
      )
    }

    const hit = hitRate(cache)
    if (parts.length) parts.push(sep('s-cache'))
    parts.push(
      hit !== null ? (
        <Text key="cache" color={hitTone(hit)}>
          <Text>{'◎ '}</Text>
          <Text bold>{hit}%</Text>
        </Text>
      ) : (
        <Text key="cache" dimColor>
          {'◎ —'}
        </Text>
      ),
    )

    if (parts.length === 0) return next(e)
    return (
      <Box>
        <Text wrap="truncate">{parts}</Text>
      </Box>
    )
  })
}
