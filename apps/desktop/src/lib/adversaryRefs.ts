// Finds the other Adversaries a feature's text brings into a fight ("summon
// 1d4 Bladed Guards", "replace her with the Entombed Cat Beast"), so the
// Combat panel can offer a button that adds them.
//
// The books write an Adversary's name capitalised wherever they mean the
// stat block, and in lower case when they mean the ordinary word ("one of
// the merchants", "symbols they bear"), so matching is case-sensitive on
// the whole name. That one rule is what keeps this reliable.

export interface AdversaryRef {
  adversaryId: string;
  name: string;
  /** How many the text calls for: a number, or dice to roll for it ("1d4"). */
  quantity: number | string;
}

interface NamedAdversary {
  id: string;
  name: string;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

// The count just before a name, with room for one describing word in
// between ("1d4 Contagious Zombie Legions").
const COUNT_BEFORE = new RegExp(
  `(?<![A-Za-z0-9])(\\d+d\\d+(?:\\s*[+-]\\s*\\d+)?|\\d+|${Object.keys(NUMBER_WORDS).join('|')})\\s+(?:[A-Z][A-Za-z'-]*\\s+)?$`,
  'i'
);

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordsOf = (name: string) => name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

function countBefore(textBefore: string): number | string | null {
  const match = COUNT_BEFORE.exec(textBefore);
  if (!match) return null;
  const raw = match[1].toLowerCase();
  if (raw in NUMBER_WORDS) return NUMBER_WORDS[raw];
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw.replace(/\s+/g, '');
}

/**
 * The Adversaries `text` refers to, in the order they first appear, each
 * listed once. `ownerName` is whose feature this is: it never refers to
 * itself.
 */
export function findAdversaryRefs(text: string | null | undefined, ownerName: string, adversaries: NamedAdversary[]): AdversaryRef[] {
  if (!text) return [];
  const ownerWords = new Set(wordsOf(ownerName));
  // Longest names first, so "Tiny Green Ooze" is claimed before "Green
  // Ooze" can match inside it.
  const candidates = adversaries
    .filter((a) => a.name.trim().length > 0 && a.name.toLowerCase() !== ownerName.toLowerCase())
    .sort((a, b) => b.name.length - a.name.length);

  const claimed: [number, number][] = [];
  const found: (AdversaryRef & { at: number })[] = [];

  for (const candidate of candidates) {
    // A stat block calls itself by a short form of its own name: the Head
    // Vampire's features say "the Vampire" and mean the Head Vampire. So a
    // name made only of the owner's own words counts when it is plainly
    // other creatures: plural, or with a count in front ("1d4 Vampires").
    const shortFormOfOwner = wordsOf(candidate.name).every((w) => ownerWords.has(w));
    const pattern = new RegExp(`(?<![A-Za-z])${escapeRegExp(candidate.name)}(s|es)?(?![A-Za-z])`, 'g');
    for (const match of text.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      if (claimed.some(([s, e]) => start < e && end > s)) continue;
      claimed.push([start, end]);
      const count = countBefore(text.slice(0, start));
      if (shortFormOfOwner && !match[1] && count == null) continue;
      if (found.some((f) => f.adversaryId === candidate.id)) continue;
      found.push({ adversaryId: candidate.id, name: candidate.name, quantity: count ?? 1, at: start });
    }
  }

  return found.sort((a, b) => a.at - b.at).map(({ at: _at, ...ref }) => ref);
}
