import { describe, expect, it } from 'vitest';
import { parseFrameSpans, parseFrameText, splitCommaList } from './frameMarkup';

describe('parseFrameSpans', () => {
  it('leaves plain text as one span', () => {
    expect(parseFrameSpans('Hope was a literal force.')).toEqual([{ text: 'Hope was a literal force.' }]);
  });

  it('marks bold, italic and both', () => {
    expect(parseFrameSpans('Before **the age of Cresting**, *Eldrefell* was ***bright***.')).toEqual([
      { text: 'Before ' },
      { text: 'the age of Cresting', bold: true },
      { text: ', ' },
      { text: 'Eldrefell', italic: true },
      { text: ' was ' },
      { text: 'bright', bold: true, italic: true },
      { text: '.' },
    ]);
  });

  it('finds italic inside bold, and bold inside italic', () => {
    expect(parseFrameSpans('then **count up on the *Pivoting Fate* equal to the *Counting Value***.')).toEqual([
      { text: 'then ' },
      { text: 'count up on the ', bold: true },
      { text: 'Pivoting Fate', bold: true, italic: true },
      { text: ' equal to the ', bold: true },
      { text: 'Counting Value', bold: true, italic: true },
      { text: '.' },
    ]);
    expect(parseFrameSpans('*see **this** now*')).toEqual([
      { text: 'see ', italic: true },
      { text: 'this', italic: true, bold: true },
      { text: ' now', italic: true },
    ]);
  });

  it('leaves asterisks that are not wrapped tightly around text alone', () => {
    expect(parseFrameSpans('Roll 2 * 3, or note it * here')).toEqual([{ text: 'Roll 2 * 3, or note it * here' }]);
    expect(parseFrameSpans('A footnote*')).toEqual([{ text: 'A footnote*' }]);
  });
});

describe('parseFrameText', () => {
  it('makes each line its own paragraph and skips blank ones', () => {
    expect(parseFrameText('First.\n\nSecond.\r\nThird.')).toEqual([
      { kind: 'paragraph', spans: [{ text: 'First.' }] },
      { kind: 'paragraph', spans: [{ text: 'Second.' }] },
      { kind: 'paragraph', spans: [{ text: 'Third.' }] },
    ]);
  });

  it('gathers neighbouring bullets into one list, whichever bullet mark they use', () => {
    const blocks = parseFrameText('Ask:\n- One?\n• Two?\n● **Three**?\nAfter.\n- A new list');
    expect(blocks).toEqual([
      { kind: 'paragraph', spans: [{ text: 'Ask:' }] },
      {
        kind: 'list',
        items: [[{ text: 'One?' }], [{ text: 'Two?' }], [{ text: 'Three', bold: true }, { text: '?' }]],
      },
      { kind: 'paragraph', spans: [{ text: 'After.' }] },
      { kind: 'list', items: [[{ text: 'A new list' }]] },
    ]);
  });

  it('reads a hashed line as a sub-heading', () => {
    expect(parseFrameText('### Before the age of Cresting\nAterra took shape.')).toEqual([
      { kind: 'heading', spans: [{ text: 'Before the age of Cresting' }] },
      { kind: 'paragraph', spans: [{ text: 'Aterra took shape.' }] },
    ]);
  });

  it('does not mistake a hyphenated word or a negative number for a bullet', () => {
    expect(parseFrameText('-1 to Difficulty')).toEqual([{ kind: 'paragraph', spans: [{ text: '-1 to Difficulty' }] }]);
  });

  it('returns nothing for empty text', () => {
    expect(parseFrameText('  \n ')).toEqual([]);
  });
});

describe('splitCommaList', () => {
  it('trims each part and drops empties', () => {
    expect(splitCommaList(' Loss, Tragedy ,, Healing ,')).toEqual(['Loss', 'Tragedy', 'Healing']);
    expect(splitCommaList('')).toEqual([]);
  });
});
