import { apiClient } from './client';
import { createSessionScopedCrudApi } from './createCrudApi';

// One tab of a Session's Notes section — see electron/store.js's "Note
// tabs" section. Versioned the same way a Combat tab is: written in one
// Session, it carries forward into the Campaign's later Sessions, where
// editing or deleting it leaves the earlier Sessions' copy alone.
export interface NoteTab {
  id: string;
  sessionId: string;
  name: string;
  order: number;
  notes: string;
  /** The tab this one sits inside, or null for a tab on the top row. */
  parentId: string | null;
  /** How the formatted view lays this tab's text out — see RichNotesEditor. Defaults to 1. */
  columns: 1 | 2;
  /** True when this tab was last changed in an earlier session than the one being viewed. */
  carried?: boolean;
}

export interface CreateNoteTabRequest {
  sessionId: string;
  name: string;
  order: number;
  notes?: string;
  parentId?: string | null;
}

export interface UpdateNoteTabRequest {
  name?: string;
  order?: number;
  notes?: string;
  columns?: 1 | 2;
}

export const noteTabsApi = {
  ...createSessionScopedCrudApi<NoteTab, CreateNoteTabRequest, UpdateNoteTabRequest>('noteTabs'),
  listBySession: (sessionId: string) => apiClient.listNoteTabsBySession<NoteTab>(sessionId),
};
