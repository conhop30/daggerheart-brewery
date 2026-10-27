import { apiClient } from './client';
import { createSessionScopedCrudApi } from './createCrudApi';

// A snapshot of a master Environment at pull-in time, not a live reference —
// see electron/store.js's comment on buildSessionEnvironment for why.
export interface SessionEnvironment {
  id: string;
  sessionId: string;
  /** Which Combat tab this was pulled into — see api/combats.ts. Records predating Combat tabs read as null until first opened, when they are adopted into the first tab. */
  combatId: string | null;
  environmentId: string;
  label: string;
  name: string;
  tier: number | null;
  difficulty: number | null;
  description: string | null;
  impulses: string[];
  notes: string | null;
  /** Shown full-width above the board, in as little height as it can take. */
  pinned: boolean;
}

export interface CreateSessionEnvironmentRequest {
  sessionId: string;
  combatId: string;
  environmentId: string;
  /** Defaults to the master Environment's name — set this to tell two pulled-in copies apart. */
  label?: string;
  notes?: string;
}

export interface UpdateSessionEnvironmentRequest {
  /** Only ever sent to adopt a pre-Combat-tabs record into the first tab — see CombatPanel. */
  combatId?: string;
  label?: string;
  notes?: string;
  pinned?: boolean;
  /** Adjusted independently of the master Environment once pulled in — see SessionEnvironmentTile. */
  difficulty?: number | null;
}

export const sessionEnvironmentsApi = {
  ...createSessionScopedCrudApi<SessionEnvironment, CreateSessionEnvironmentRequest, UpdateSessionEnvironmentRequest>(
    'sessionEnvironments'
  ),
  listBySession: (sessionId: string) => apiClient.listSessionEnvironmentsBySession<SessionEnvironment>(sessionId),
};
