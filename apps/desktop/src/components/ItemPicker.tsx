import { useState } from 'react';
import { useGameSets } from '../context/GameSetsContext';
import QuantityStepper from './QuantityStepper';
import './ItemPicker.css';

interface PickableItem {
  id: string;
  name: string;
  gameSetId: string;
}

/** What an item can be narrowed by, beyond its name. */
interface ItemFacets {
  tier: number | null;
  /** Already worded for display, e.g. "Bruiser". */
  type: string | null;
}

interface ItemPickerProps<T extends PickableItem> {
  items: T[];
  value: string | null;
  onChange: (id: string) => void;
  /** Adds a "- n +" stepper next to the search box when present — the Adversary picker uses this to pull in several copies at once; the Environment picker (which shares this component) omits it and renders unchanged. */
  quantity?: { value: number; onChange: (value: number) => void; max?: number };
  /**
   * An item's Tier and type. When given, the picker adds a Tier and a type
   * filter, shows both on every row, and the search box matches them as
   * well as the name ("t2 bruiser"). The Combat panel's pickers use this; a
   * Loot Table's entries have neither, and that picker stays name-only.
   */
  describe?: (item: T) => ItemFacets;
}

// One typed word against one item: part of its name, part of its type, or
// its Tier written "t2", "tier2" or (after "tier") just "2".
function wordMatches(word: string, name: string, facets: ItemFacets | null): boolean {
  if (name.includes(word)) return true;
  if (!facets) return false;
  if (facets.type && facets.type.toLowerCase().includes(word)) return true;
  if (facets.tier != null) {
    const tier = String(facets.tier);
    if (word === `t${tier}` || word === `tier${tier}`) return true;
  }
  return false;
}

// A searchable list, not a native <select> — a Loot/Consumable Table can
// reference items across every Game Set at once (Core plus however much
// homebrew is loaded), and a flat dropdown doesn't scale past a handful of
// options. Used by the Loot/Consumable Table entry editor and by the
// Combat panel's Adversary/Environment pull-in.
export default function ItemPicker<T extends PickableItem>({ items, value, onChange, quantity, describe }: ItemPickerProps<T>) {
  const { gameSets } = useGameSets();
  const [query, setQuery] = useState('');
  const [tier, setTier] = useState<number | null>(null);
  const [type, setType] = useState('');

  function gameSetName(gameSetId: string): string {
    return gameSets.find((g) => g.id === gameSetId)?.name ?? 'Unknown Set';
  }

  const described = items.map((item) => ({ item, facets: describe ? describe(item) : null }));
  const tiers = [...new Set(described.flatMap((d) => (d.facets?.tier != null ? [d.facets.tier] : [])))].sort((a, b) => a - b);
  const types = [...new Set(described.flatMap((d) => (d.facets?.type ? [d.facets.type] : [])))].sort();

  // "tier 2" is two words meaning one thing; joined, it reads as "tier2".
  const words = query
    .trim()
    .toLowerCase()
    .replace(/\btier\s+(\d+)/g, 'tier$1')
    .split(/\s+/)
    .filter(Boolean);
  const filtered = described.filter(({ item, facets }) => {
    if (tier != null && facets?.tier !== tier) return false;
    if (type && facets?.type !== type) return false;
    const name = item.name.toLowerCase();
    return words.every((word) => wordMatches(word, name, facets));
  });
  const selected = items.find((item) => item.id === value) ?? null;

  return (
    <div className="item-picker">
      <div className="item-picker__header">
        <input
          type="text"
          className="item-picker__search"
          placeholder={selected ? selected.name : describe ? 'Search by name, type or tier…' : 'Search…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {quantity && <QuantityStepper value={quantity.value} onChange={quantity.onChange} max={quantity.max} />}
      </div>
      {describe && (tiers.length > 0 || types.length > 0) && (
        <div className="item-picker__filters">
          {tiers.length > 0 && (
            <div className="item-picker__tiers" role="group" aria-label="Tier">
              {tiers.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`item-picker__tier${tier === t ? ' item-picker__tier--chosen' : ''}`}
                  aria-pressed={tier === t}
                  onClick={() => setTier(tier === t ? null : t)}
                >
                  Tier {t}
                </button>
              ))}
            </div>
          )}
          {types.length > 0 && (
            <select className="item-picker__type" aria-label="Type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Any type</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
      <div className="item-picker__list">
        {filtered.length === 0 && <p className="item-picker__empty">No matches.</p>}
        {filtered.map(({ item, facets }) => (
          <button
            key={item.id}
            type="button"
            className={`item-picker__option${item.id === value ? ' item-picker__option--selected' : ''}`}
            onClick={() => {
              onChange(item.id);
              setQuery('');
            }}
          >
            <span className="item-picker__option-name">{item.name}</span>
            <span className="item-picker__option-set">
              {facets && [facets.tier != null ? `Tier ${facets.tier}` : null, facets.type].filter(Boolean).join(' · ')}
              {facets && (facets.tier != null || facets.type) ? ' · ' : ''}
              {gameSetName(item.gameSetId)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
