// The Guide tab of the Advanced editor: one fixed example frame that shows,
// source beside result, everything that matters about writing a frame so it
// looks like the Daggerheart books. It is a constant. Opening it only swaps
// what the two panes are showing; the frame being edited is never touched.

// A stand-in picture for the examples that need one, so the guide doesn't
// depend on any file being on the reader's machine.
const PICTURE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0" stop-color="#f2c879"/><stop offset=".5" stop-color="#5c8a4a"/><stop offset="1" stop-color="#16321a"/>' +
  '</linearGradient></defs><rect width="640" height="400" fill="url(#g)"/>' +
  '<circle cx="430" cy="150" r="70" fill="#fbe3a6" opacity=".85"/></svg>';

export const GUIDE_PICTURE = `data:image/svg+xml;base64,${btoa(PICTURE_SVG)}`;

const FENCE = '```';

export const BREW_GUIDE = `{{titlePage}}

{{wide
# Writing a Frame
*Everything on these pages is written in the text on the left. Read the two side by side.*

Designed by You
Complexity Rating: ●●
}}

## The Title Page
*This is how a frame in the books opens.*

Put ${'`{{titlePage}}`'} on a line of its own at the top. It paints the frame's **Cover image** (set above the editor) across the top of the page and turns the text white on green.

The title block is wrapped in ${'`{{wide`'} ... ${'`}}`'} so that it runs across both columns. The **Title page** button writes all of this for you.

\\column

## Tone & Feel
Adventurous, Uncanny, Whimsical

## Themes
Grief, Survival, People vs. Nature

## Touchstones
A book, a film, a game

\\page

# Headings
*A line in italics straight after a section heading is the note the books print there.*

One ${'`#`'} is a **section**, like Overview or Distinctions. Two is an **entry** inside it, and three a small **sub-head**.

${FENCE}
# Distinctions
## The Witherwild
### Before the Invasion
${FENCE}

## The Witherwild
An entry heading, as used for each Community, Principle, Distinction and Mechanic.

### Before the Invasion
A sub-head, for a part of an entry.

# Text
Leave a blank line between paragraphs. Emphasis is marked with asterisks:

${FENCE}
**bold**, *italic*, ***both***
${FENCE}

**bold**, *italic*, ***both***. The books bold a name the first time it matters, like **Fanewick**, and italicise the name of a rule, like *Pivoting Fate*.

Questions for your players are a list. Start each line with a hyphen:

${FENCE}
- What do you protect?
- Who have you lost?
${FENCE}

- What do you protect?
- Who have you lost?

A line starting with ${'`>`'} becomes a note box:

> **For the GM:** a tip, an optional rule, or an example of play.

# Pages and Columns
Nothing moves to the next page by itself. Text that runs past the bottom is cut off, and the editor tells you which page is too full.

Write ${'`\\page`'} on a line of its own to start a new page, and ${'`\\column`'} to jump to the next column. This column ends here because the next line of the text is ${'`\\column`'}.

\\column

**Fit to pages** adds the page breaks for you wherever a page is over-full. Run it after pasting in a lot of text, then move the breaks to taste.

# Tables
A table is rows of cells split by bars, with a row of dashes under the headings. A line starting with five ${'`#`'} just above it is its title.

${FENCE}
##### Redeemed Action
| Roll | Effect |
|:--|:--|
| 1 | The GM gains a Fear. |
| 2 | A PC gains a Hope. |
${FENCE}

##### Redeemed Action
| Roll | Effect |
|:--|:--|
| 1 | The GM gains a Fear. |
| 2 | A PC gains a Hope. |
| 3 | A PC gains a token. |

\\page

{{wide
# Wide Tables
For a big table, write ${'`{{wide`'} on the line above it and ${'`}}`'} on the line below. Anything between the two runs across the whole page, and the columns carry on underneath.

##### Primary Weapons
| Name | Trait | Range | Damage | Burden | Feature |
|:--|:--|:--|:--|:--|:--|
| **Cleaver** | Agility | Melee | d8 phy | One-Handed | ***Reliable:*** +1 to attack rolls |
| **Pitchfork** | Strength | Melee | d10+3 phy | Two-Handed | — |
}}

{{watercolor4,top:330px,left:360px,width:400px,background-color:#BBAD82,opacity:70%}}

# Pictures
The **Picture** button copies a picture into the app and writes a line like this one. The braces after it set its size:

${FENCE}
![A swamp](dhmedia://frame-image/your-file.png) {width:60%}
${FENCE}

![An example picture](${GUIDE_PICTURE}) {width:60%}

A link to a picture on the web works in the same place.

\\column

# Stains
The splash of colour behind this column is a **stain**. It is one line, and the **Stain** button writes it:

${FENCE}
{{watercolor4,top:330px,left:360px,
  width:400px,background-color:#BBAD82,
  opacity:70%}}
${FENCE}

Type it all on a single line. The number picks one of twelve shapes. ${'`top`'} and ${'`left`'} place it from the corner of the page, ${'`width`'} sizes it, and the colour and opacity are yours to choose.

A stain sits behind the text, so it can go anywhere on the page.

\\page

# Watercolor Edges
The picture across the bottom of this page is torn off in watercolor. The **Watercolor picture** menu writes this for an edge, the middle, or a corner of the page:

${FENCE}
{{imageMaskEdge3,--offset:14%,--rotation:0
  ![A swamp](your-picture) {width:100%,bottom:0%}
}}
${FENCE}

The number after the name picks a different torn shape: 1 to 8 for edges, 1 to 16 for the middle, 1 to 37 for corners. Change it until you like the look.

\\column

- **imageMaskEdge** runs along one side. ${'`--rotation`'} chooses the side: 0 is the bottom, 180 the top, 90 the left and 270 the right. ${'`--offset`'} pushes the torn edge toward that side.
- **imageMaskCenter** is a shape in the middle of the page, moved with ${'`--offsetX`'} and ${'`--offsetY`'}.
- **imageMaskCorner** fills a corner.

# Your Own Style
The **Style** tab takes CSS for this frame's pages only. Every page is a ${'`.page`'}. This turns the section headings red:

${FENCE}
h1 { color: #7a1f1f; }
${FENCE}

{{imageMaskEdge3,--offset:14%,--rotation:0
  ![An example picture](${GUIDE_PICTURE}) {width:100%,bottom:0%}
}}
`;
