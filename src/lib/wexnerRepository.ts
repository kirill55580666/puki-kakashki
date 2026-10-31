import { supabase } from './supabase'
import { parseWexner, type WexnerAssessment, type WexnerInput } from './wexner.ts'
import { createLocalWexnerRepository } from './localWexnerRepository'

export function createWexnerRepository(userId: string) {
  if (!supabase) return createLocalWexnerRepository(localStorage)
  const client = supabase
  return {
    async list(): Promise<WexnerAssessment[]> {
      const rows: WexnerAssessment[] = []
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await client
          .from('wexner_assessments')
          .select('*')
          .eq('user_id', userId)
          .order('assessed_at', { ascending: false })
          .order('id')
          .range(offset, offset + 999)
        if (error) throw error
        rows.push(...data)
        if (data.length < 1000) return rows
      }
    },
    async add(input: WexnerInput): Promise<WexnerAssessment> {
      const { data, error } = await client
        .from('wexner_assessments')
        .insert({ ...parseWexner(input), user_id: userId })
        .select()
        .single()
      if (error) throw error
      return data
    },
  }
}
