export type EventType = 'poop' | 'fart'
export type BristolType = 1 | 2 | 3 | 4 | 5 | 6 | 7
export interface Symptoms {
  pain?: 0 | 1 | 2 | 3 | null
  straining?: boolean | null
  incomplete?: boolean | null
  blood?: boolean | null
  bloating?: boolean | null
  laxative?: boolean | null
}
export interface DiaryEvent {
  id: string
  user_id: string
  type: EventType
  bristol_type?: BristolType | null
  symptoms?: Symptoms | null
  occurred_at: string
  created_at: string
}
export interface EventInput {
  type: EventType
  bristol_type?: BristolType | null
  symptoms?: Symptoms | null
  occurred_at: string
}
export interface Repository {
  list(): Promise<DiaryEvent[]>
  add(input: EventInput): Promise<DiaryEvent>
  update(id: string, input: EventInput): Promise<DiaryEvent>
  remove(id: string): Promise<void>
  clear(): Promise<void>
  import(inputs: EventInput[]): Promise<void>
}
