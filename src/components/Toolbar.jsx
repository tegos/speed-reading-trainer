const ALIGNMENTS = ['left', 'center', 'justify', 'right'];

export default function Toolbar({
  speed,
  onSpeedChange,
  fontSize,
  onFontSizeChange,
  textAlign,
  onTextAlignChange,
  running,
  onToggleRun,
  onOpenFile,
  onReset,
}) {
  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button type="button" onClick={onOpenFile} title="Ctrl+O">
          Open file
        </button>
        <button type="button" onClick={onReset} title="F5">
          Reset
        </button>
        <span className="hint">Paste text: Ctrl+V</span>
      </div>

      <div className="toolbar-group">
        <label>
          Speed: <b className="speed-value">{speed}</b> wpm
          <input
            type="range"
            min="60"
            max="1500"
            step="10"
            value={speed}
            onChange={(e) => onSpeedChange(+e.target.value)}
          />
        </label>
        <button
          type="button"
          className="run-button"
          onClick={onToggleRun}
          aria-label={running ? 'Pause' : 'Play'}
        >
          {running ? '⏸' : '▶'}
        </button>
      </div>

      <div className="toolbar-group">
        <label>
          Font size
          <input
            type="number"
            min="10"
            max="30"
            value={fontSize}
            onChange={(e) => {
              const value = +e.target.value;
              if (value >= 10 && value <= 30) onFontSizeChange(value);
            }}
          />
        </label>
      </div>

      <div className="toolbar-group align-buttons" role="group" aria-label="Text alignment">
        {ALIGNMENTS.map((align) => (
          <button
            key={align}
            type="button"
            className={textAlign === align ? 'active' : ''}
            onClick={() => onTextAlignChange(align)}
            title={`Align ${align}`}
          >
            <AlignIcon align={align} />
          </button>
        ))}
      </div>
    </div>
  );
}

function AlignIcon({ align }) {
  // line widths per alignment, drawn as a tiny 4-bar glyph
  const bars = {
    left: [14, 9, 14, 9],
    center: [14, 9, 14, 9],
    justify: [14, 14, 14, 14],
    right: [14, 9, 14, 9],
  }[align];
  const x = (w) => (align === 'right' ? 16 - w : align === 'center' ? (16 - w) / 2 : 1);

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {bars.map((w, i) => (
        <rect key={i} x={x(w)} y={1.5 + i * 4} width={w} height="2" fill="currentColor" />
      ))}
    </svg>
  );
}
