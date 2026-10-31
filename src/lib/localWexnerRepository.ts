import { parseWexner, type WexnerAssessment, type WexnerInput } from './wexner.ts'

export function createLocalWexnerRepository(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  const key = 'puki-demo-wexner-v1'
  const read = (): WexnerAssessment[] => JSON.parse(storage.getItem(key) || '[]')
  return {
    async list() {
      return read().sort((a, b) => b.assessed_at.localeCompare(a.assessed_at))
    },
    async add(input: WexnerInput) {
      const row: WexnerAssessment = {
        ...parseWexner(input),
        id: crypto.randomUUID(),
        user_id: 'demo',
        created_at: new Date().toISOString(),
      }
      storage.setItem(key, JSON.stringify([...read(), row]))
      return row
    },
  }
}
