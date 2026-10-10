import { useEffect, useState } from 'react';
import { onConfirmRequest, splitConfirmMessage, type ConfirmRequest } from '../lib/confirm';
import './ConfirmHost.css';

// Draws whatever lib/confirm's confirmDialog() is currently asking, or its
// alertDialog() is reporting. Mounted once for the whole app (main.tsx),
// above everything else on screen.
export default function ConfirmHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);

  useEffect(() => onConfirmRequest(setRequest), []);

  useEffect(() => {
    if (!request) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') request?.resolve(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [request]);

  if (!request) return null;
  const notice = request.kind === 'notice';
  // A notice's message is whatever went wrong, in the store's own words, so
  // it reads as the line under a fixed heading.
  const { title, detail } = notice
    ? { title: 'Something went wrong', detail: request.message }
    : splitConfirmMessage(request.message);

  return (
    // A click on the dimmed page behind is a "no", same as Escape.
    <div className="confirm-dialog__scrim" onMouseDown={() => request.resolve(false)}>
      <div
        className={`confirm-dialog${notice ? ' confirm-dialog--notice' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="confirm-dialog__title" id="confirm-dialog-title">
          {title}
        </h2>
        {detail && <p className="confirm-dialog__detail">{detail}</p>}
        <div className="confirm-dialog__actions">
          {!notice && (
            <button type="button" className="confirm-dialog__cancel" onClick={() => request.resolve(false)}>
              Cancel
            </button>
          )}
          {/* Focused, so Enter goes ahead — as it did on the native box. */}
          <button type="button" className="confirm-dialog__confirm" autoFocus onClick={() => request.resolve(true)}>
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
