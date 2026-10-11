import type { CampaignFrame, FrameEntry } from '../api/campaignFrames';

type EntrySectionKey = {
  [K in keyof CampaignFrame]: CampaignFrame[K] extends FrameEntry[] ? K : never;
}[keyof CampaignFrame];

export interface FrameEntrySection {
  key: EntrySectionKey;
  title: string;
  /** Singular, for the editor's "+ Add" button. */
  itemLabel: string;
  /**
   * The line the rulebook prints under the section's heading, telling the GM
   * what the section is for. A frame overrides it by starting the section
   * with an entry that has no heading.
   */
  intro: string;
  allowTables: boolean;
}

// The repeatable sections of a frame, in the order the rulebook prints
// them. The reader and the editor are both driven from this list, which is
// what keeps a section's title and position the same in each.
export const FRAME_ENTRY_SECTIONS: FrameEntrySection[] = [
  {
    key: 'communities',
    title: 'Communities',
    itemLabel: 'community note',
    intro:
      'As needed, provide the following information to your players and choose one or more of the questions to ask them during your session zero.',
    allowTables: false,
  },
  {
    key: 'ancestries',
    title: 'Ancestries',
    itemLabel: 'ancestry note',
    intro: 'As needed, provide the following information to your players.',
    allowTables: false,
  },
  {
    key: 'classes',
    title: 'Classes',
    itemLabel: 'class note',
    intro: 'As needed, provide the following information to your players.',
    allowTables: false,
  },
  {
    key: 'playerPrinciples',
    title: 'Player Principles',
    itemLabel: 'player principle',
    intro: 'If your group decides to play this campaign, give your players the following information before character creation.',
    allowTables: false,
  },
  {
    key: 'gmPrinciples',
    title: 'GM Principles',
    itemLabel: 'GM principle',
    intro: 'Keep the following guidance in mind while you GM this campaign.',
    allowTables: false,
  },
  {
    key: 'distinctions',
    title: 'Distinctions',
    itemLabel: 'distinction',
    intro: 'Use this information to prepare your campaign. You can also share it with your players as needed.',
    allowTables: true,
  },
  {
    key: 'mechanics',
    title: 'Campaign Mechanics',
    itemLabel: 'mechanic',
    intro: 'The following mechanics are unique to this campaign.',
    allowTables: true,
  },
];

export const PITCH_INTRO = 'Read this section to your players to introduce them to the campaign.';
export const OVERVIEW_INTRO =
  'If your group decides to play this campaign, give your players the following information before character creation.';
export const INCITING_INCIDENT_INTRO = 'You can use the prompt below to start your campaign, or create your own.';
export const SESSION_ZERO_INTRO = 'Ask any of these questions to your players, or make your own.';

export const MAX_COMPLEXITY = 5;

export function emptyFrameEntry(): FrameEntry {
  return { heading: '', body: '', questions: [], tables: [] };
}
