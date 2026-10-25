import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dayKey, fromDay, monthDays, recentDays, localInput } from '../src/lib/dates.ts'
import { parseImport } from '../src/lib/import.ts'
test('local calendar dates do not use UTC', () => {
  const d = new Date(2026, 0, 1, 0, 5)
  assert.equal(dayKey(d), '2026-01-01')
  assert.equal(localInput(d), '2026-01-01T00:05')
  assert.equal(dayKey(fromDay('2024-02-29')), '2024-02-29')
})
test('calendar begins on Monday and includes leap days', () => {
  const days = monthDays(new Date(2024, 1, 1))
  assert.deepEqual(days.slice(0, 3), [null, null, null])
  assert.equal(days.filter(Boolean).length, 29)
  assert.equal(monthDays(new Date(2026, 5, 1))[0]?.getDay(), 1)
  assert.equal(monthDays(new Date(2026, 1, 1)).filter(Boolean).length, 28)
})
test('recent period crosses year boundary without UTC shifts', () => {
  assert.deepEqual(recentDays(3, new Date(2026, 0, 2)), ['2025-12-31', '2026-01-01', '2026-01-02'])
})
test('import validates structure and discards supplied ownership', () => {
  assert.deepEqual(parseImport(JSON.stringify({ events: [{ type: 'poop', occurred_at: '2026-01-01T00:00:00+03:00', user_id: 'other', id: 'other' }] })), [{ type: 'poop', occurred_at: '2025-12-31T21:00:00.000Z' }])
  for (const input of ['null', '{}', '[]', '[{"type":"wrong","occurred_at":"2026-01-01T00:00:00Z"}]', '[{"type":"fart","occurred_at":"2026-01-01"}]']) assert.throws(() => parseImport(input))
  assert.throws(() => parseImport('[{"type":"poop","occurred_at":"2026-02-30T12:00:00Z"}]'))
  assert.throws(() => parseImport('[{"type":"poop","occurred_at":"2026-01-01T24:00:00Z"}]'))
})
