import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createLocalRepository } from '../src/lib/localRepository.ts'
test('multiple daily events persist across repository instances and support editing/deletion', async () => {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value) } }
  const repo = createLocalRepository(storage)
  const first = await repo.add({ type: 'poop', occurred_at: '2026-10-25T12:00:00.000Z' })
  const second = await repo.add({ type: 'poop', occurred_at: '2026-10-25T13:00:00.000Z' })
  assert.notEqual(first.id, second.id)
  const reloaded = createLocalRepository(storage)
  assert.equal((await reloaded.list()).length, 2)
  assert.equal((await reloaded.list())[0].id, second.id)
  await reloaded.update(first.id, { type: 'fart', occurred_at: '2026-10-24T12:00:00.000Z' })
  assert.equal((await repo.list()).find(e => e.id === first.id)?.type, 'fart')
  await reloaded.remove(second.id)
  assert.equal((await repo.list()).length, 1)
  await reloaded.import([{ type: 'fart', occurred_at: '2026-10-25T12:00:00.000Z' }])
  assert.equal((await repo.list()).length, 2)
  await reloaded.clear()
  assert.deepEqual(await repo.list(), [])
})
test('failed persistence rejects instead of reporting a successful save', async () => {
  const repo = createLocalRepository({ getItem: () => '[]', setItem: () => { throw new Error('Quota exceeded') } })
  await assert.rejects(repo.add({ type: 'poop', occurred_at: '2026-10-25T12:00:00.000Z' }), /Quota/)
  assert.deepEqual(await repo.list(), [])
})
