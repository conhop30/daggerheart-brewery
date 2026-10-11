import { describe, expect, it } from 'vitest';
import type { CampaignFrame } from '../api/campaignFrames';
import { splitPages } from './brew';
import * as snippets from './brewSnippets';
import { frameTextToMarkdown, frameToMarkdown, tableToMarkdown } from './frameToMarkdown';

const EMPTY: CampaignFrame = {
  id: 'f1',
  name: 'Lost Legend of Hope',
  gameSetId: 'gs',
  format: 'structured',
  markdown: '',
  styleCss: '',
  concept: '',
  designers: '',
  complexity: 1,
  coverImage: null,
  pitch: '',
  toneAndFeel: [],
  themes: [],
  touchstones: [],
  overview: '',
  communities: [],
  ancestries: [],
  classes: [],
  playerPrinciples: [],
  gmPrinciples: [],
  distinctions: [],
  mechanics: [],
  incitingIncident: '',
  sessionZeroQuestions: [],
  credits: '',
};

describe('frameTextToMarkdown', () => {
  it('gives every line its own paragraph, keeps bullets together and lowers sub-headings to ###', () => {
    expect(frameTextToMarkdown('First.\nSecond.\n# Before\nAsk:\n- One?\n• Two?\nAfter.')).toBe(
      'First.\n\nSecond.\n\n### Before\n\nAsk:\n\n- One?\n- Two?\n\nAfter.'
    );
  });
});

describe('tableToMarkdown', () => {
  it('writes the title, caption and rows, escaping bars', () => {
    expect(
      tableToMarkdown({ title: 'Redeemed Action', caption: 'Roll a d6.', columns: ['Value', 'Effect'], rows: [['1', 'A | B']] })
    ).toBe('##### Redeemed Action\n*Roll a d6.*\n\n| Value | Effect |\n|:--|:--|\n| 1 | A \\| B |');
  });

  it('runs a table of four or more columns across the page', () => {
    const md = tableToMarkdown({ title: '', caption: '', columns: ['A', 'B', 'C', 'D'], rows: [['1', '2', '3', '4']] });
    expect(md.startsWith('{{wide\n')).toBe(true);
    expect(md.endsWith('\n}}')).toBe(true);
  });
});

describe('frameToMarkdown', () => {
  it('opens with a title page, then the sections in book order on what follows', () => {
    const md = frameToMarkdown({
      ...EMPTY,
      concept: 'Empathy must bring back a world.',
      designers: 'Connor Hopkins',
      complexity: 2,
      pitch: 'Hope was a force.\nYou play heroes.',
      toneAndFeel: ['Loss', 'Healing'],
      overview: 'Before **the age of Cresting**.',
      communities: [
        { heading: '', body: 'All communities are available.', questions: [], tables: [] },
        { heading: 'Loreborne', body: 'The Kollect.', questions: ['Are you part of it?'], tables: [] },
      ],
      mechanics: [
        {
          heading: 'Pivoting Fate',
          body: 'Count up.\n### Pivoting Table\nSee below.',
          questions: [],
          tables: [{ title: 'Pivoting Fate', caption: '', columns: ['Tier', 'Start'], rows: [['I', '3']] }],
        },
      ],
      sessionZeroQuestions: ['How do you perceive karma?'],
    });
    const [title, body] = splitPages(md);
    expect(title).toContain('{{titlePage}}');
    expect(title).toContain('# Lost Legend of Hope\n*Empathy must bring back a world.*');
    expect(title).toContain('Designed by Connor Hopkins  \nComplexity Rating: ●●');
    expect(title).toContain('Hope was a force.\n\nYou play heroes.');
    expect(title).toContain('\\column\n\n## Tone & Feel\nLoss, Healing');

    expect(body).toContain('# Overview\n\n*If your group decides');
    // The frame's own line replaces the stock one, and isn't repeated as an entry.
    expect(body).toContain('# Communities\n\n*All communities are available.*\n\n## Loreborne\n\nThe Kollect.\n\n- Are you part of it?');
    expect(body).toContain('## Pivoting Fate\n\nCount up.\n\n### Pivoting Table\n\nSee below.\n\n##### Pivoting Fate\n| Tier | Start |');
    expect(body).toContain('# Session Zero Questions');
    expect(body.indexOf('# Overview')).toBeLessThan(body.indexOf('# Communities'));
    expect(body.indexOf('# Communities')).toBeLessThan(body.indexOf('# Campaign Mechanics'));
  });

  it('a frame with only a name is just its title page', () => {
    expect(splitPages(frameToMarkdown(EMPTY))).toHaveLength(1);
  });
});

describe('brewSnippets', () => {
  const pick = (max: number) => max;

  it('a stain is a positioned, coloured watercolor block', () => {
    expect(snippets.stain(pick)).toBe('{{watercolor12,top:20px,left:30px,width:300px,background-color:#BBAD82,opacity:80%}}\n\n');
  });

  it('an edge picture is turned to its side of the page', () => {
    expect(snippets.imageEdge('dhmedia://frame-image/a.png', 'top', 'swamp', pick)).toContain(
      '{{imageMaskEdge8,--offset:10%,--rotation:180\n  ![swamp](dhmedia://frame-image/a.png) {width:100%,top:0%}\n}}'
    );
    expect(snippets.imageEdge('u', 'left', '', pick)).toContain('--rotation:90\n  ![](u) {height:100%}');
  });

  it('a corner picture is pushed into its corner', () => {
    expect(snippets.imageCorner('u', 'bottom', 'right', '', pick)).toContain(
      '{{imageMaskCorner37,--offsetX:50%,--offsetY:-50%,--rotation:0'
    );
    expect(snippets.imageCenter('u', '', pick)).toContain('{{imageMaskCenter16,--offsetX:0%,--offsetY:0%,--rotation:0');
  });

  it('breaks are lines of their own', () => {
    expect(snippets.pageBreak()).toBe('\n\\page\n\n');
    expect(snippets.columnBreak()).toBe('\n\\column\n\n');
  });
});
