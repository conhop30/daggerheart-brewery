// The pieces of Advanced-format Markdown the editor's snippet bar inserts.
// Each is the same text Homebrewery's own snippets produce, so anything
// learned there carries over. Variant numbers (which stain, which torn edge)
// are picked at random, as Homebrewery does; `pick` is injectable for tests.

export type Pick = (max: number) => number;
const randomPick: Pick = (max) => 1 + Math.floor(Math.random() * max);

export const STAIN_COUNT = 12;
export const EDGE_MASK_COUNT = 8;
export const CENTER_MASK_COUNT = 16;
export const CORNER_MASK_COUNT = 37;

export type Side = 'top' | 'bottom' | 'left' | 'right';

export const pageBreak = () => '\n\\page\n\n';
export const columnBreak = () => '\n\\column\n\n';

/** A plain picture in the flow of the text. */
export function image(url: string, alt = ''): string {
  return `![${alt}](${url}) {width:100%}\n\n`;
}

/** A watercolor stain: a splash of colour behind the text, placed from the page's top left. */
export function stain(pick: Pick = randomPick): string {
  return `{{watercolor${pick(STAIN_COUNT)},top:20px,left:30px,width:300px,background-color:#BBAD82,opacity:80%}}\n\n`;
}

const EDGE_ROTATION: Record<Side, number> = { bottom: 0, top: 180, left: 90, right: 270 };
const EDGE_IMAGE_STYLE: Record<Side, string> = {
  bottom: '{width:100%,bottom:0%}',
  top: '{width:100%,top:0%}',
  left: '{height:100%}',
  right: '{height:100%}',
};

/** A picture along one edge of the page, its inner side torn off in watercolor. */
export function imageEdge(url: string, side: Side = 'bottom', alt = '', pick: Pick = randomPick): string {
  return (
    `{{imageMaskEdge${pick(EDGE_MASK_COUNT)},--offset:10%,--rotation:${EDGE_ROTATION[side]}\n` +
    `  ![${alt}](${url}) ${EDGE_IMAGE_STYLE[side]}\n` +
    `}}\n` +
    `<!-- --offset moves the torn edge away from the middle of the page (% or cm); --rotation turns it, in degrees. -->\n\n`
  );
}

/** A picture in the middle of the page with a watercolor outline all round. */
export function imageCenter(url: string, alt = '', pick: Pick = randomPick): string {
  return (
    `{{imageMaskCenter${pick(CENTER_MASK_COUNT)},--offsetX:0%,--offsetY:0%,--rotation:0\n` +
    `  ![${alt}](${url}) {height:100%}\n` +
    `}}\n` +
    `<!-- --offsetX and --offsetY move the shape (% or cm); --rotation turns it, in degrees. -->\n\n`
  );
}

/** A picture filling one corner of the page, torn in watercolor on its two inner sides. */
export function imageCorner(url: string, y: 'top' | 'bottom' = 'top', x: 'left' | 'right' = 'left', alt = '', pick: Pick = randomPick): string {
  const offsetX = x === 'left' ? '-50%' : '50%';
  const offsetY = y === 'top' ? '50%' : '-50%';
  return (
    `{{imageMaskCorner${pick(CORNER_MASK_COUNT)},--offsetX:${offsetX},--offsetY:${offsetY},--rotation:0\n` +
    `  ![${alt}](${url}) {height:100%}\n` +
    `}}\n` +
    `<!-- --offsetX and --offsetY move the shape (% or cm); --rotation turns it, in degrees. -->\n\n`
  );
}

/** Something that runs across both columns. */
export const wideBlock = () => '{{wide\nEverything in here runs across both columns.\n}}\n\n';

export const table = () =>
  '##### Table Title\n| Roll | Result |\n|:----:|:-------|\n| 1 | First |\n| 2 | Second |\n| 3 | Third |\n\n';

/** The opening page of a frame, as the rulebooks lay one out: art above, the title and pitch on colour below. */
export function titlePage(name = 'Frame Name', concept = 'One sentence: the big idea of the campaign.'): string {
  return (
    `{{titlePage}}\n\n` +
    `{{wide\n# ${name}\n*${concept}*\n}}\n\n` +
    `## The Pitch\nWhat you would read to your players.\n\n` +
    `\\column\n\n` +
    `## Tone & Feel\nAdventurous, Uncanny\n\n## Themes\nGrief, Survival\n\n## Touchstones\nA book, a film, a game\n\n`
  );
}
