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
    const now = Date.parse('2026-10-12T17:07:00+11:00')
    // 5h window resetting 20:30: 1h37m in, about 32% through
    const e5 = elapsedPct('five_hour', '2026-10-12T20:30:00+11:00', now)!
    expect(Math.round(e5)).toBe(32)
    expect(paceTone(33, e5)).toBe(paceTone(95, 50)) // over pace: red
    expect(paceTone(20, e5)).not.toBe(paceTone(33, e5)) // well under pace: green
    expect(paceTone(29, e5)).not.toBe(paceTone(20, e5)) // close to pace: amber
    // weekly window resetting in 2h: 73% used is under pace
    const e7 = elapsedPct('seven_day', '2026-10-12T19:00:00+11:00', now)!
    expect(paceTone(73, e7)).toBe(paceTone(20, e5))
    // 90% used is red whatever the pace
    expect(paceTone(90, 99)).toBe(paceTone(33, e5))
    // unknown window or the first 10% of it: plain thresholds
    expect(elapsedPct('spend_limit', '2026-10-12T19:00:00Z', now)).toBe(null)
    expect(paceTone(30, null)).toBe(tone(30))
    expect(paceTone(30, 5)).toBe(tone(30))
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
