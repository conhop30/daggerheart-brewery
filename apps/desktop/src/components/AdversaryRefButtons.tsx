import { createContext, useContext, useMemo } from 'react';
import { findAdversaryRefs, type AdversaryRef } from '../lib/adversaryRefs';
import './AdversaryRefButtons.css';

/** What a stat block needs to offer "add the Adversary this feature summons": the library to recognise names in, and the way into the current fight. */
export interface CombatRefs {
  adversaries: { id: string; name: string }[];
  onAdd: (ref: AdversaryRef, ownerName: string) => void;
}

// Provided by CombatPanel. A context, not props, because the buttons sit
// three components below it (tile, stat body, feature list) and none of the
// ones in between has any use for it. Absent anywhere else a feature list
// is shown, where there is no fight to add to and no buttons appear.
export const CombatRefsContext = createContext<CombatRefs | null>(null);

interface AdversaryRefButtonsProps {
  /** The feature's text. */
  text: string | null | undefined;
  /** Whose feature it is. */
  ownerName: string;
}

export default function AdversaryRefButtons({ text, ownerName }: AdversaryRefButtonsProps) {
  const combat = useContext(CombatRefsContext);
  const adversaries = combat?.adversaries;
  const refs = useMemo(() => (adversaries ? findAdversaryRefs(text, ownerName, adversaries) : []), [text, ownerName, adversaries]);
  if (!combat || refs.length === 0) return null;
  return (
    <span className="adversary-refs">
      {refs.map((ref) => (
        <button
          key={ref.adversaryId}
          type="button"
          className="adversary-refs__add"
          title={typeof ref.quantity === 'string' ? `Rolls ${ref.quantity} and adds that many` : undefined}
          onClick={() => combat.onAdd(ref, ownerName)}
        >
          + {ref.quantity === 1 ? '' : `${ref.quantity} × `}
          {ref.name}
        </button>
      ))}
    </span>
  );
}
