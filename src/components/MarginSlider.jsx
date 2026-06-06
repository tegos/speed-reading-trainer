// Dual-handle range built from two overlaid native sliders.
export default function MarginSlider({ value, onChange }) {
  const [left, right] = value;

  return (
    <div className="margin-slider" title="Reading area margins">
      <div
        className="margin-slider-track"
        style={{ left: `${left}%`, width: `${right - left}%` }}
      />
      <input
        type="range"
        min="0"
        max="100"
        value={left}
        onChange={(e) => onChange([Math.min(+e.target.value, right - 5), right])}
        aria-label="Left margin"
      />
      <input
        type="range"
        min="0"
        max="100"
        value={right}
        onChange={(e) => onChange([left, Math.max(+e.target.value, left + 5)])}
        aria-label="Right margin"
      />
    </div>
  );
}
