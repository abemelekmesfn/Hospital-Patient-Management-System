const SLICE_COLORS = [
  "#1a237e",
  "#3949ab",
  "#5c6bc0",
  "#7986cb",
  "#e65100",
  "#2e7d32",
  "#c62828",
  "#f9a825",
];

export default function SimpleDonutChart({ data = [], labelKey = "label", valueKey = "value" }) {
  if (!data.length) {
    return <p className="admin-chart-empty">No data to display yet.</p>;
  }

  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0) || 1;
  let cursor = 0;
  const stops = data.map((row, i) => {
    const value = Number(row[valueKey]) || 0;
    const pct = (value / total) * 100;
    const start = cursor;
    cursor += pct;
    const color = SLICE_COLORS[i % SLICE_COLORS.length];
    return `${color} ${start}% ${cursor}%`;
  });

  return (
    <div className="admin-donut-wrap">
      <div
        className="admin-donut"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
        role="img"
        aria-label="Distribution chart"
      >
        <div className="admin-donut-hole">
          <span className="admin-donut-total">{total}</span>
          <span className="admin-donut-sub">total</span>
        </div>
      </div>
      <ul className="admin-donut-legend">
        {data.map((row, i) => (
          <li key={`${row[labelKey]}-${i}`}>
            <span
              className="admin-donut-swatch"
              style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
            />
            <span className="admin-donut-legend-label">{row[labelKey]}</span>
            <span className="admin-donut-legend-value">{row[valueKey]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
