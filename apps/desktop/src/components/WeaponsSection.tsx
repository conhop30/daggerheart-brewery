import { memo, useMemo, useState } from 'react';
import { weaponsApi, type Weapon, type WeaponSlot } from '../api/weapons';
import { useApiList, useEntityActions } from '../lib/useApiList';
import { useTagFilters, type FilterDimension } from '../lib/useTagFilters';
import { useGameSets } from '../context/GameSetsContext';
import { titleCaseEnum } from '../lib/format';
import { ContentCard, MetaChip } from './ContentCard';
import EquipmentSection from './EquipmentSection';
import WeaponForm from './WeaponForm';
import { dash } from './EquipmentCards';
import type { EquipmentTableColumn } from './EquipmentTable';
import type { EquipmentView } from '../lib/equipmentView';

/** gameSetId -> its name, so "Set" can filter/display the way every other dimension does instead of showing a raw id. */
type GameSetName = (id: string) => string;

// No Slot dimension/column here — Primary and Secondary are two separate
// tables below (see WeaponsSection), so which one a weapon is in already
// says its slot; repeating it as a filter or a column would be redundant.
function buildWeaponFilters(gameSetName: GameSetName): FilterDimension<Weapon>[] {
  return [
    { key: 'gameSetId', label: 'Set', getValue: (w) => w.gameSetId, formatValue: gameSetName },
    { key: 'tier', label: 'Tier', getValue: (w) => w.tier },
    { key: 'burden', label: 'Burden', getValue: (w) => w.burden, formatValue: titleCaseEnum },
    { key: 'trait', label: 'Trait', getValue: (w) => w.trait, formatValue: titleCaseEnum },
    { key: 'damageType', label: 'Damage Type', getValue: (w) => w.damageType, formatValue: titleCaseEnum },
    { key: 'range', label: 'Range', getValue: (w) => w.range, formatValue: titleCaseEnum },
  ];
}

function buildWeaponColumns(gameSetName: GameSetName): EquipmentTableColumn<Weapon>[] {
  return [
    { key: 'name', label: 'Name', render: (w) => w.name, width: '1.3fr', emphasize: true },
    { key: 'set', label: 'Set', render: (w) => gameSetName(w.gameSetId) },
    { key: 'tier', label: 'Tier', render: (w) => dash(w.tier), align: 'center', width: '0.6fr' },
    { key: 'range', label: 'Range', render: (w) => dash(w.range && titleCaseEnum(w.range)) },
    { key: 'burden', label: 'Burden', render: (w) => titleCaseEnum(w.burden) },
    { key: 'damage', label: 'Damage', render: (w) => dash(w.damage), align: 'center' },
    { key: 'trait', label: 'Trait', render: (w) => dash(w.trait && titleCaseEnum(w.trait)) },
    { key: 'type', label: 'Type', render: (w) => dash(w.damageType && titleCaseEnum(w.damageType)) },
    { key: 'feature', label: 'Feature', render: (w) => dash(w.feature), width: '2fr' },
  ];
}

const WeaponCard = memo(function WeaponCard({
  w,
  gameSetName,
  onEdit,
  onDelete,
}: {
  w: Weapon;
  gameSetName: GameSetName;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <ContentCard
      title={w.name}
      onEdit={() => onEdit(w.id)}
      onDelete={() => onDelete(w.id)}
      meta={
        <>
          <MetaChip label="Set" value={gameSetName(w.gameSetId)} />
          <MetaChip label="Tier" value={w.tier} />
          <MetaChip label="Range" value={w.range && titleCaseEnum(w.range)} />
          <MetaChip label="Burden" value={titleCaseEnum(w.burden)} />
          <MetaChip label="Damage" value={w.damage} />
          <MetaChip label="Trait" value={w.trait && titleCaseEnum(w.trait)} />
          <MetaChip label="Type" value={w.damageType && titleCaseEnum(w.damageType)} />
        </>
      }
    >
      {w.feature && <p className="content-card__description">{w.feature}</p>}
    </ContentCard>
  );
});

interface WeaponSlotSectionProps {
  title: string;
  slot: WeaponSlot;
  items: Weapon[];
  gameSetName: GameSetName;
  view: EquipmentView;
  loading: boolean;
  error: string | null;
  creating: boolean;
  onStartCreate: () => void;
  onCancelCreate: () => void;
  onCreated: (w: Weapon) => void;
  editingWeapon: Weapon | null;
  editingId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onCancelEdit: () => void;
  onSavedEdit: (w: Weapon) => void;
}

// One Primary or Secondary table — pulled out so WeaponsSection isn't just
// the same ~40 lines written out twice with "PRIMARY"/"SECONDARY" swapped.
function WeaponSlotSection({
  title,
  slot,
  items,
  gameSetName,
  view,
  loading,
  error,
  creating,
  onStartCreate,
  onCancelCreate,
  onCreated,
  editingWeapon,
  editingId,
  onEdit,
  onDelete,
  onCancelEdit,
  onSavedEdit,
}: WeaponSlotSectionProps) {
  const weaponFilters = useMemo(() => buildWeaponFilters(gameSetName), [gameSetName]);
  const weaponColumns = useMemo(() => buildWeaponColumns(gameSetName), [gameSetName]);
  const filters = useTagFilters(items, weaponFilters);

  return (
    <EquipmentSection<Weapon>
      title={title}
      addButtons={
        <button type="button" className="browse-page__add-button" onClick={onStartCreate}>
          + New {title.replace(' Weapons', '')}
        </button>
      }
      createForm={creating && <WeaponForm weaponSlot={slot} onSaved={onCreated} onCancel={onCancelCreate} />}
      editForm={
        editingWeapon && (
          <WeaponForm weaponSlot={slot} initial={editingWeapon} onSaved={onSavedEdit} onCancel={onCancelEdit} />
        )
      }
      loading={loading}
      error={error}
      items={filters.filtered}
      getKey={(w) => w.id}
      emptyMessage={
        filters.hasActiveFilters ? `No ${title} match those filters.` : `No ${title} yet — click + New above to create one.`
      }
      renderCard={(w) =>
        editingId === w.id ? (
          <WeaponForm weaponSlot={slot} initial={w} onSaved={onSavedEdit} onCancel={onCancelEdit} />
        ) : (
          <WeaponCard w={w} gameSetName={gameSetName} onEdit={onEdit} onDelete={onDelete} />
        )
      }
      table={{ view, columns: weaponColumns, onEdit: (w) => onEdit(w.id), onDelete: (w) => onDelete(w.id), editing: Boolean(editingWeapon) }}
      filterBar={{
        dimensions: filters.dimensions,
        onToggle: filters.toggle,
        onClear: filters.clear,
        hasActiveFilters: filters.hasActiveFilters,
      }}
    />
  );
}

// Fully self-contained — nothing else on the Equipment page reads Weapon
// data or state, so it owns its own fetch/edit/delete/creating state rather
// than taking any of it as props (unlike Loot/LootTable, which are cross-
// referenced from the page level). Primary and Secondary render as two
// separate tables/galleries rather than one combined list with a Slot
// filter — they're different enough in practice (a Primary's stats stand
// alone, a Secondary's modify whatever Primary it's paired with) that
// browsing them together was more confusing than convenient.
export default function WeaponsSection({ view }: { view: EquipmentView }) {
  const weapons = useApiList(weaponsApi.list);
  const actions = useEntityActions(weapons, weaponsApi.remove, 'Weapon');
  const [creatingSlot, setCreatingSlot] = useState<WeaponSlot | null>(null);
  const editingWeapon = actions.editingItem;

  const { gameSets } = useGameSets();
  const gameSetNameById = useMemo(() => new Map(gameSets.map((g) => [g.id, g.name])), [gameSets]);
  const gameSetName: GameSetName = useMemo(() => (id) => gameSetNameById.get(id) ?? 'Unknown Set', [gameSetNameById]);

  const primaryItems = useMemo(() => weapons.items.filter((w) => w.weaponSlot === 'PRIMARY'), [weapons.items]);
  const secondaryItems = useMemo(() => weapons.items.filter((w) => w.weaponSlot === 'SECONDARY'), [weapons.items]);

  function handleCreated(saved: Weapon) {
    weapons.upsert(saved);
    setCreatingSlot(null);
  }

  function handleSavedEdit(saved: Weapon) {
    weapons.upsert(saved);
    actions.cancelEdit();
  }

  return (
    <>
      <WeaponSlotSection
        title="Primary Weapons"
        slot="PRIMARY"
        items={primaryItems}
        gameSetName={gameSetName}
        view={view}
        loading={weapons.loading}
        error={weapons.error}
        creating={creatingSlot === 'PRIMARY'}
        onStartCreate={() => setCreatingSlot('PRIMARY')}
        onCancelCreate={() => setCreatingSlot(null)}
        onCreated={handleCreated}
        editingWeapon={editingWeapon?.weaponSlot === 'PRIMARY' ? editingWeapon : null}
        editingId={actions.editingId}
        onEdit={actions.edit}
        onDelete={actions.handleDelete}
        onCancelEdit={actions.cancelEdit}
        onSavedEdit={handleSavedEdit}
      />
      <WeaponSlotSection
        title="Secondary Weapons"
        slot="SECONDARY"
        items={secondaryItems}
        gameSetName={gameSetName}
        view={view}
        loading={weapons.loading}
        error={weapons.error}
        creating={creatingSlot === 'SECONDARY'}
        onStartCreate={() => setCreatingSlot('SECONDARY')}
        onCancelCreate={() => setCreatingSlot(null)}
        onCreated={handleCreated}
        editingWeapon={editingWeapon?.weaponSlot === 'SECONDARY' ? editingWeapon : null}
        editingId={actions.editingId}
        onEdit={actions.edit}
        onDelete={actions.handleDelete}
        onCancelEdit={actions.cancelEdit}
        onSavedEdit={handleSavedEdit}
      />
    </>
  );
}
