export type EventType = 'poop' | 'fart'
export interface DiaryEvent { id: string; user_id: string; type: EventType; occurred_at: string; created_at: string }
export interface EventInput { type: EventType; occurred_at: string }
export interface Repository {
  list(): Promise<DiaryEvent[]>
  add(input: EventInput): Promise<DiaryEvent>
  update(id: string, input: EventInput): Promise<DiaryEvent>
  remove(id: string): Promise<void>
  clear(): Promise<void>
  import(inputs: EventInput[]): Promise<void>
}
