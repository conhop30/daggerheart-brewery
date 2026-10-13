import { useCallback, useEffect, useState } from 'react';
import { upsertById } from './upsert';
import { alertDialog, confirmDialog } from './confirm';
import { COLLECTION_CHANGED } from '../api/client';

// Every browse page below needs one to four of these — same loading/error/
// unmount-guard boilerplate each time, so it's a hook instead of copy-paste.
// Also hands back upsert/remove so a successful edit or delete can update
// the on-screen list immediately instead of a full refetch.
//
// `watch` names the collection the list comes from, for a list that isn't
// the one being edited: it is fetched again whenever anything, anywhere in
// the app, writes to that collection.
export function useApiList<T extends { id: string }>(fetcher: () => Promise<T[]>, watch?: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (cancelled) return;
        setItems(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load your data.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // fetcher is expected to be stable (a bare api.list reference) —
    // re-running this on every render would defeat the point of the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!watch) return;
    let latest = 0;
    const refetch = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== watch) return;
      const mine = ++latest;
      fetcher()
        .then((result) => {
          if (mine === latest) setItems(result);
        })
        // The list already on screen stays; the next change tries again.
        .catch(() => {});
    };
    window.addEventListener(COLLECTION_CHANGED, refetch);
    return () => {
      latest = -1;
      window.removeEventListener(COLLECTION_CHANGED, refetch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watch]);

  function upsert(item: T) {
    setItems((prev) => upsertById(prev, item));
  }

  function remove(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  return { items, loading, error, upsert, remove };
}

// Every browse page also repeats the same "which id is being edited (or
// opened)" state plus a confirm -> api.remove -> list.remove -> alert
// delete handler, once per entity type it lists. Takes a `useApiList`
// result rather than owning one itself, so pages stay free to mix this with
// list.upsert etc. directly. Returns id-based handlers (not closures over
// the item) so list-card components can stay React.memo'd — their identity
// only changes when the list itself does.
export function useEntityActions<T extends { id: string; name: string }>(
  list: Pick<ReturnType<typeof useApiList<T>>, 'items' | 'remove'>,
  remove: (id: string) => Promise<unknown>,
  label: string
) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const edit = useCallback((id: string) => setEditingId(id), []);
  const cancelEdit = useCallback(() => setEditingId(null), []);

  const handleDelete = useCallback(
    async (id: string) => {
      const item = list.items.find((x) => x.id === id);
      if (!item || !(await confirmDialog(`Delete "${item.name}"? This can't be undone.`))) return;
      try {
        await remove(id);
        list.remove(id);
        setEditingId((current) => (current === id ? null : current));
      } catch (err) {
        alertDialog(err instanceof Error ? err.message : `Could not delete the ${label}.`);
      }
    },
    // list.remove is a fresh closure every render, but it only ever calls
    // the stable setItems updater — safe to leave out, same as the
    // per-page handlers this hook replaces relied on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list.items, remove, label]
  );

  const editingItem = editingId ? list.items.find((x) => x.id === editingId) ?? null : null;

  return { editingId, editingItem, edit, cancelEdit, handleDelete };
}
