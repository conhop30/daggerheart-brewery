// The app's own "are you sure?" and "that didn't work" — replacements for
// window.confirm and window.alert, whose native boxes look like the
// operating system rather than the app. Called the same way from anywhere
// (a component, a hook, a plain handler):
//
//   if (!(await confirmDialog(`Delete "${name}"? This can't be undone.`))) return;
//   alertDialog('Could not save that change.');
//
// ConfirmHost (mounted once, in main.tsx) is what actually draws it. This
// module is only the hand-off between the two.

export interface ConfirmRequest {
  /** 'confirm' asks a yes/no question; 'notice' only reports something and has the one button. */
  kind: 'confirm' | 'notice';
  message: string;
  /** What the button that goes ahead (or, on a notice, dismisses) says. */
  confirmLabel: string;
  resolve: (confirmed: boolean) => void;
}

type Listener = (request: ConfirmRequest | null) => void;

let listener: Listener | null = null;
let pending: ConfirmRequest | null = null;

/** ConfirmHost's subscription: it's told each time a question is asked, or answered. */
export function onConfirmRequest(next: Listener): () => void {
  listener = next;
  next(pending);
  return () => {
    if (listener === next) listener = null;
  };
}

export function confirmDialog(message: string, options: { confirmLabel?: string } = {}): Promise<boolean> {
  // One question at a time: a second asked before the first is answered
  // takes its place, and the first reads as "no".
  pending?.resolve(false);
  return new Promise<boolean>((resolve) => {
    const request: ConfirmRequest = {
      kind: 'confirm',
      message,
      // Every question here either deletes or removes something, and says
      // which in its first word.
      confirmLabel: options.confirmLabel ?? (/^remove/i.test(message) ? 'Remove' : 'Delete'),
      resolve: (confirmed) => {
        if (pending !== request) return;
        pending = null;
        listener?.(null);
        resolve(confirmed);
      },
    };
    pending = request;
    listener?.(request);
  });
}

/**
 * Reports something (in practice: that an action failed) in the same box.
 * Nothing needs to wait on it, so callers don't await it, but it resolves
 * once dismissed for any that care.
 */
export function alertDialog(message: string): Promise<void> {
  pending?.resolve(false);
  return new Promise<void>((resolve) => {
    const request: ConfirmRequest = {
      kind: 'notice',
      message,
      confirmLabel: 'OK',
      resolve: () => {
        if (pending !== request) return;
        pending = null;
        listener?.(null);
        resolve();
      },
    };
    pending = request;
    listener?.(request);
  });
}

/** "Delete "X"? This can't be undone." reads as a heading and a line under it. */
export function splitConfirmMessage(message: string): { title: string; detail: string } {
  const end = message.indexOf('?');
  if (end === -1) return { title: message, detail: '' };
  return { title: message.slice(0, end + 1), detail: message.slice(end + 1).trim() };
}
