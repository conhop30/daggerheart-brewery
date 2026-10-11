import { createCrudApi } from './createCrudApi';

/** A table inside an entry: a mechanic's roll table, a countdown's values per tier. */
export interface FrameTable {
  title: string;
  /** The line printed above the table, e.g. "Roll a number of d6s equal to the NPC's tier." */
  caption: string;
  columns: string[];
  /** Each row is exactly as long as `columns`. */
  rows: string[][];
}

/**
 * One headed block within a section. Every repeatable section uses it: a
 * Community's notes and prompts, a principle, a distinction, a mechanic.
 * A blank heading makes the entry a lead-in paragraph for its section.
 */
export interface FrameEntry {
  heading: string;
  /** Light markup: see lib/frameMarkup. */
  body: string;
  questions: string[];
  tables: FrameTable[];
}

export interface CampaignFrame {
  id: string;
  name: string;
  gameSetId: string;
  /** The one-line description under the title. */
  concept: string;
  designers: string;
  /** 1-5; the rulebooks' own frames run 1-4. */
  complexity: number;
  /** Optional cover art, as a data: URL. */
  coverImage: string | null;
  pitch: string;
  toneAndFeel: string[];
  themes: string[];
  touchstones: string[];
  overview: string;
  communities: FrameEntry[];
  ancestries: FrameEntry[];
  classes: FrameEntry[];
  playerPrinciples: FrameEntry[];
  gmPrinciples: FrameEntry[];
  distinctions: FrameEntry[];
  mechanics: FrameEntry[];
  incitingIncident: string;
  sessionZeroQuestions: string[];
  credits: string;
}

export type CreateCampaignFrameRequest = Partial<Omit<CampaignFrame, 'id'>> & { name: string; gameSetId: string };
export type UpdateCampaignFrameRequest = Partial<Omit<CampaignFrame, 'id'>>;

export const campaignFramesApi = createCrudApi<CampaignFrame, CreateCampaignFrameRequest, UpdateCampaignFrameRequest>(
  'campaignFrames'
);
