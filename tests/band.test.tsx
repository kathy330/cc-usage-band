import { describe, expect, mock, test } from 'claude-code/testing'

import { elapsedPct, filled, fmtLeft, fmtTokens, hitRate, hitTone, paceTone, tone } from '../hooks/register'

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

describe('pace', () => {
  test('colour follows where usage lands at reset', async () => {
    const now = Date.parse('2026-10-12T17:12:00+11:00')
    const RED = paceTone(100, 100), AMBER = paceTone(60, 100), GREEN = paceTone(10, 100)
    expect(new Set([RED, AMBER, GREEN]).size).toBe(3)
    // 5h window resetting 20:30, 33% used about a third of the way in: on pace to ~97% → red
    const e5 = elapsedPct('five_hour', '2026-10-12T20:30:00+11:00', now)!
    expect(paceTone(33, e5)).toBe(RED)
    expect(paceTone(20, e5)).toBe(AMBER) // ~60% at reset
    expect(paceTone(12, e5)).toBe(GREEN) // ~35% at reset
    // weekly window with 2h left: 72% used lands at ~73% → amber
    const e7 = elapsedPct('seven_day', '2026-10-12T19:00:00+11:00', now)!
    expect(paceTone(72, e7)).toBe(AMBER)
    // unknown window or the first 10% of it: the share used, same cut-offs
    expect(elapsedPct('spend_limit', '2026-10-12T19:00:00Z', now)).toBe(null)
    expect(paceTone(30, null)).toBe(GREEN)
    expect(paceTone(30, 5)).toBe(GREEN)
    expect(paceTone(86, null)).toBe(RED)
  })
})

describe('formatting', () => {
  test('tokens, countdown, bar, hit rate', async () => {
    expect(fmtTokens(564_000)).toBe('564K')
    expect(fmtTokens(63_300)).toBe('63.3K')
    expect(fmtTokens(1_000_000)).toBe('1M')
    const now = Date.parse('2026-10-08T10:00:00Z')
    expect(fmtLeft('2026-10-08T11:12:00Z', now)).toBe('1h12m')
    expect(fmtLeft('2026-10-13T10:00:00Z', now)).toBe('5d0h')
    expect(fmtLeft(undefined, now)).toBe('')
    expect(filled(96, 8)).toBe(8)
    expect(filled(13, 8)).toBe(1)
    expect(tone(96)).not.toBe(tone(13))
    expect(hitTone(7)).not.toBe(hitTone(100))
    expect(hitRate({ read: 99, total: 100 })).toBe(99)
    expect(hitRate(null)).toBe(null)
  })
})

test('band shows limits, context and cache on terminal and desktop', async ($, on) => {
  mock.clock(on, { now: Date.parse('2026-10-08T10:00:00Z') })
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('turn.complete', ($, e) => ({ text: e.answer }))
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text key="engine">engine</Text> })
  await $.session.measure({
    context: { tokens: 63_300, window: 1_000_000, percent: 6 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 15, resetsAt: '2099-01-01T00:00:00Z' },
      { kind: 'seven_day', percentUsed: 13, resetsAt: '2099-01-02T00:00:00Z' },
    ],
    changed: ['context', 'rateLimits'],
  })
  await $.turn.complete({
    answer: 'ok',
    durationMs: 10,
    isAborted: false,
    turnId: 't1',
    reason: 'end_turn',
    usage: { model: 'm', input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 990, cache_creation_input_tokens: 0 },
  } as never)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'cc-usage-band', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /5h/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /7d/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /63\.3K\/1M/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /99%/ })).toBeDefined()
    await ui.unmount()
  }
})

test('band stays empty before any measurement', async ($, on) => {
  mock.clock(on, { now: 0 })
  on('ui.render', ($, e) => { const { Text } = $.ui.resolve(e); return <Text key="engine">engine</Text> })
  const ui = await $.ui.mount({ plugin: 'cc-usage-band', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /5h/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /engine/ })).toBeDefined()
  await ui.unmount()
})
