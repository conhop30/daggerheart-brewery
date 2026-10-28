import { createCrudApi } from './createCrudApi';

export interface Loot {
  id: string;
  name: string;
  description: string | null;
  /** The corebook's own roll/lookup number for this item within its source table (e.g. Caltrops is 1 on the Hope & Fear Items table) — not a price. Null for homebrew Loot with no roll number. */
  value: number | null;
  gameSetId: string;
}

export interface CreateLootRequest {
  name: string;
  description?: string;
  value?: number | null;
  gameSetId: string;
}

export type UpdateLootRequest = Partial<CreateLootRequest>;

export const lootApi = createCrudApi<Loot, CreateLootRequest, UpdateLootRequest>('loot');
