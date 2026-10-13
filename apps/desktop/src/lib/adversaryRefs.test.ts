import { describe, expect, it } from 'vitest';
import { findAdversaryRefs } from './adversaryRefs';

const names = [
  'Vampire',
  'Head Vampire',
  'Green Ooze',
  'Tiny Green Ooze',
  'Huge Green Ooze',
  'Bladed Guard',
  'Jagged Knife Lackey',
  'Zombie Legion',
  'Entombed Cat Beast',
  'Bear',
  'Dire Wolf',
  'Merchant',
  'High Seraph',
  'Pirate Raiders',
];
const adversaries = names.map((name) => ({ id: name.toLowerCase().replace(/ /g, '-'), name }));
const refs = (text: string, owner: string) => findAdversaryRefs(text, owner, adversaries).map((r) => `${r.quantity} ${r.name}`);

describe('findAdversaryRefs', () => {
  it('finds a summoned Adversary and how many', () => {
    expect(refs('Summon three Jagged Knife Lackeys, who appear at Far range.', 'Jagged Knife Lieutenant')).toEqual(['3 Jagged Knife Lackey']);
    expect(refs('Once per scene, mark a Stress to summon 1d4 Bladed Guards.', 'Petty Noble')).toEqual(['1d4 Bladed Guard']);
    expect(refs('replace her with the Entombed Cat Beast and immediately spotlight them.', 'Entombed Empress')).toEqual(['1 Entombed Cat Beast']);
    expect(refs('summon a Pirate Raiders Horde, which appears at Far range.', 'Pirate Captain')).toEqual(['1 Pirate Raiders']);
  });

  it('lists several in the order they appear, each once', () => {
    expect(refs('summon a Bear, Dire Wolf, or similar Tier 1 animal. The Bear appears at Close range.', 'Giant Beastmaster')).toEqual([
      '1 Bear',
      '1 Dire Wolf',
    ]);
    expect(refs('summon a High Seraph and 1d4 Bladed Guards', 'Hallowed Temple')).toEqual(['1 High Seraph', '1d4 Bladed Guard']);
  });

  it('reads past one describing word to the count', () => {
    expect(refs('the Harbinger summons 1d4 Contagious Zombie Legions within Far range', 'Harbinger of Pestilence')).toEqual(['1d4 Zombie Legion']);
  });

  it('takes the longest name, not a shorter one inside it', () => {
    expect(refs('split them into two Tiny Green Oozes (with no marked HP or Stress).', 'Green Ooze')).toEqual(['2 Tiny Green Ooze']);
  });

  it('ignores the ordinary word in lower case', () => {
    expect(refs('one of the merchants has something they want', 'Bustling Marketplace')).toEqual([]);
    expect(refs('What symbols or icons do they bear?', 'Hallowed Temple')).toEqual([]);
  });

  it("does not take a stat block's short name for itself as another Adversary", () => {
    expect(refs('When the Vampire makes a successful attack, all PCs lose a Hope.', 'Head Vampire')).toEqual([]);
    expect(refs('Spend 2 Fear to summon 1d4 Vampires, who appear at Far range.', 'Head Vampire')).toEqual(['1d4 Vampire']);
    expect(refs('split them into two Green Oozes', 'Huge Green Ooze')).toEqual(['2 Green Ooze']);
    expect(refs('The Head Vampire is spotlighted.', 'Head Vampire')).toEqual([]);
  });

  it('handles no text', () => {
    expect(findAdversaryRefs(null, 'Bear', adversaries)).toEqual([]);
  });
});
