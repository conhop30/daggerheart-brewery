import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import MemberBackdrop, { type ImageFocus } from './MemberBackdrop';
import './ImageFocusField.css';

interface ImageFocusFieldProps {
  image: string;
  /** null is the picture's middle. */
  value: ImageFocus | null;
  onChange: (focus: ImageFocus | null) => void;
}

const CENTER: ImageFocus = { x: 50, y: 50 };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

// Choosing which part of a picture a Party member's tile shows. A tile is
// wide and short, so most of a picture is cropped away, and the middle of
// it is often a figure's torso, not their face. The preview is a real
// MemberBackdrop at about a tile's shape, and dragging it moves the picture
// under the pointer the way dragging a map does.
export default function ImageFocusField({ image, value, onChange }: ImageFocusFieldProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const drag = useRef<{ x: number; y: number; from: ImageFocus } | null>(null);
  const focus = value ?? CENTER;

  useEffect(() => {
    setNatural(null);
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = image;
    return () => {
      cancelled = true;
    };
  }, [image]);

  // How far, in pixels, the picture overhangs the area it's drawn in, each
  // way. A drag of that many pixels is the whole 0-100 range.
  function overhang(): { x: number; y: number } {
    const area = boxRef.current?.querySelector('.member-backdrop__image')?.getBoundingClientRect();
    if (!area || !natural) return { x: 0, y: 0 };
    const scale = Math.max(area.width / natural.w, area.height / natural.h);
    return { x: natural.w * scale - area.width, y: natural.h * scale - area.height };
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, from: focus };
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!drag.current || e.buttons === 0) return;
    const over = overhang();
    const { from } = drag.current;
    onChange({
      x: over.x > 1 ? clamp(from.x - ((e.clientX - drag.current.x) / over.x) * 100) : from.x,
      y: over.y > 1 ? clamp(from.y - ((e.clientY - drag.current.y) / over.y) * 100) : from.y,
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    const step = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }[e.key];
    if (!step) return;
    e.preventDefault();
    onChange({ x: clamp(focus.x + step[0]), y: clamp(focus.y + step[1]) });
  }

  return (
    <div className="image-focus-field">
      <span className="image-focus-field__label">Framing</span>
      <div
        ref={boxRef}
        className="image-focus-field__preview"
        tabIndex={0}
        role="group"
        aria-label="Framing"
        data-focus={`${focus.x},${focus.y}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onKeyDown={onKeyDown}
      >
        <MemberBackdrop layers={[{ image, focus, colors: [] }]} />
      </div>
      <div className="image-focus-field__row">
        <p className="create-form__hint">Drag the picture (or use the arrow keys) to choose the part a tile shows.</p>
        {value && (
          <button type="button" className="image-focus-field__reset" onClick={() => onChange(null)}>
            Reset to middle
          </button>
        )}
      </div>
    </div>
  );
}
