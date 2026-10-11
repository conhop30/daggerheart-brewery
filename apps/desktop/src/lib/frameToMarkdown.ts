import type { CampaignFrame, FrameEntry, FrameTable } from '../api/campaignFrames';
import {
  FRAME_ENTRY_SECTIONS,
  INCITING_INCIDENT_INTRO,
  OVERVIEW_INTRO,
  PITCH_INTRO,
  SESSION_ZERO_INTRO,
} from './frameSections';
import { joinPages } from './brew';

// A structured frame written out as Advanced-format Markdown: the starting
// point when a frame is converted. It only decides where the title page
// ends; fitting the rest onto pages needs real layout and is done afterwards
// by lib/brewPaginate.

const BULLET = /^\s*[-•●]\s+/;
const HEADING = /^\s*#{1,6}\s+/;

/**
 * Frame markup (lib/frameMarkup) is nearly Markdown already: the difference
 * is that every line there is a paragraph, where Markdown wants a blank line
 * between them. Sub-headings drop to `###`, the level the page theme gives
 * them.
 */
export function frameTextToMarkdown(text: string): string {
  const out: string[] = [];
  let inList = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (BULLET.test(line)) {
      if (!inList && out.length) out.push('');
      out.push(`- ${line.replace(BULLET, '')}`);
      inList = true;
      continue;
    }
    if (out.length) out.push('');
    inList = false;
    out.push(HEADING.test(line) ? `### ${line.replace(HEADING, '')}` : line);
  }
  return out.join('\n');
}

const cell = (text: string) => text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim() || ' ';

/** A FrameTable as a Markdown table; four or more columns get the full width of the page. */
export function tableToMarkdown(table: FrameTable): string {
  const lines: string[] = [];
  if (table.title) lines.push(`##### ${table.title}`);
  if (table.caption) lines.push(`*${table.caption}*`, '');
  lines.push(`| ${table.columns.map(cell).join(' | ')} |`);
  lines.push(`|${table.columns.map(() => ':--').join('|')}|`);
  for (const row of table.rows) lines.push(`| ${row.map(cell).join(' | ')} |`);
  const markdown = lines.join('\n');
  return table.columns.length >= 4 ? `{{wide\n${markdown}\n}}` : markdown;
}

function entryToMarkdown(entry: FrameEntry): string {
  const parts: string[] = [];
  if (entry.heading) parts.push(`## ${entry.heading}`);
  if (entry.body) parts.push(frameTextToMarkdown(entry.body));
  if (entry.questions.length > 0) parts.push(entry.questions.map((q) => `- ${q}`).join('\n'));
  for (const table of entry.tables) parts.push(tableToMarkdown(table));
  return parts.join('\n\n');
}

function section(title: string, intro: string | null, body: string): string {
  return [`# ${title}`, intro ? `*${intro}*` : null, body].filter(Boolean).join('\n\n');
}

export function frameToMarkdown(frame: CampaignFrame): string {
  const title: string[] = ['{{titlePage}}'];
  const heading = [`# ${frame.name}`];
  if (frame.concept) heading.push(`*${frame.concept}*`);
  const credit = [
    frame.designers ? `Designed by ${frame.designers}` : null,
    `Complexity Rating: ${'●'.repeat(Math.max(1, frame.complexity))}`,
  ].filter(Boolean);
  title.push(`{{wide\n${heading.join('\n')}\n\n${credit.join('  \n')}\n}}`);
  if (frame.pitch) title.push(`## The Pitch\n*${PITCH_INTRO}*\n\n${frameTextToMarkdown(frame.pitch)}`);
  const lists = [
    ['Tone & Feel', frame.toneAndFeel],
    ['Themes', frame.themes],
    ['Touchstones', frame.touchstones],
  ].filter(([, values]) => (values as string[]).length > 0) as [string, string[]][];
  if (lists.length > 0) {
    if (frame.pitch) title.push('\\column');
    for (const [name, values] of lists) title.push(`## ${name}\n${values.join(', ')}`);
  }

  const body: string[] = [];
  if (frame.overview) body.push(section('Overview', OVERVIEW_INTRO, frameTextToMarkdown(frame.overview)));
  for (const def of FRAME_ENTRY_SECTIONS) {
    const entries = frame[def.key];
    if (entries.length === 0) continue;
    // A first entry with no heading is the frame's own line under the section title.
    const [first, ...rest] = entries;
    const ownIntro = !first.heading && first.body && first.questions.length === 0 && first.tables.length === 0;
    const intro = ownIntro ? first.body.replace(/\r?\n/g, ' ') : def.intro;
    body.push(section(def.title, intro, (ownIntro ? rest : entries).map(entryToMarkdown).join('\n\n')));
  }
  if (frame.incitingIncident) {
    body.push(section('The Inciting Incident', INCITING_INCIDENT_INTRO, frameTextToMarkdown(frame.incitingIncident)));
  }
  if (frame.sessionZeroQuestions.length > 0) {
    body.push(section('Session Zero Questions', SESSION_ZERO_INTRO, frame.sessionZeroQuestions.map((q) => `- ${q}`).join('\n')));
  }
  if (frame.credits) body.push(section('Credit', null, frameTextToMarkdown(frame.credits)));

  const pages = [title.join('\n\n')];
  if (body.length > 0) pages.push(body.join('\n\n'));
  return joinPages(pages) + '\n';
}
