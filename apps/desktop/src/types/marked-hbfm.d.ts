// marked-hbfm (Homebrewery Flavored Markdown) ships no types of its own.
declare module 'marked-hbfm' {
  interface HbfmToken {
    type: string;
    raw: string;
  }

  export const hbfm: {
    marked: { lexer: (text: string) => HbfmToken[] };
    /** Pages must be rendered in order from 0: each reads the page-number variable the one before it set. */
    render: (rawBrewText: string, pageNumber?: number) => string;
    validate: (rawBrewText: string) => unknown[];
  };
}
