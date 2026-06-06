export default function ReaderZone({ words, position, fontSize, textAlign, margins }) {
  const [left, right] = margins;

  return (
    <main
      className="reader-zone unselectable"
      style={{
        marginLeft: `${left}%`,
        marginRight: `${100 - right}%`,
        fontSize,
        textAlign,
      }}
    >
      {words.map((word, i) => (
        <span key={i} className={i < position ? 'read' : ''}>
          {word}{' '}
        </span>
      ))}
    </main>
  );
}
