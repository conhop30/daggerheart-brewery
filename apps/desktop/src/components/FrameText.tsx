import { memo } from 'react';
import { parseFrameText, type FrameSpan } from '../lib/frameMarkup';

function Spans({ spans }: { spans: FrameSpan[] }) {
  return (
    <>
      {spans.map((span, i) => {
        if (span.bold && span.italic)
          return (
            <strong key={i}>
              <em>{span.text}</em>
            </strong>
          );
        if (span.bold) return <strong key={i}>{span.text}</strong>;
        if (span.italic) return <em key={i}>{span.text}</em>;
        return <span key={i}>{span.text}</span>;
      })}
    </>
  );
}

// A Campaign Frame's prose, drawn from lib/frameMarkup's parsed blocks as
// real elements. Used inline too (a question, a table cell) via `inline`,
// where only the bold/italic spans apply.
function FrameText({ text, inline = false }: { text: string; inline?: boolean }) {
  const blocks = parseFrameText(text);
  if (inline) {
    return (
      <>
        {blocks.map((block, i) =>
          block.kind === 'list' ? (
            block.items.map((item, j) => <Spans key={`${i}-${j}`} spans={item} />)
          ) : (
            <Spans key={i} spans={block.spans} />
          )
        )}
      </>
    );
  }
  return (
    <div className="frame-text">
      {blocks.map((block, i) => {
        if (block.kind === 'heading')
          return (
            <h4 key={i} className="frame-text__heading">
              <Spans spans={block.spans} />
            </h4>
          );
        if (block.kind === 'list')
          return (
            <ul key={i} className="frame-text__list">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Spans spans={item} />
                </li>
              ))}
            </ul>
          );
        return (
          <p key={i}>
            <Spans spans={block.spans} />
          </p>
        );
      })}
    </div>
  );
}

export default memo(FrameText);
