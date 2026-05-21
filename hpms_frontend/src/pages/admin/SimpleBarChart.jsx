/** Lightweight horizontal bar chart — no external chart library. */
export default function SimpleBarChart({ data = [], labelKey = "label", valueKey = "value" }) {
  if (!data.length) {
    return <p className="admin-chart-empty">No data to display yet.</p>;
  }

  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="admin-bar-chart" role="img" aria-label="Bar chart">
      {data.map((row, i) => {
        const value = Number(row[valueKey]) || 0;
        const pct = Math.round((value / max) * 100);
        const label = row[labelKey] ?? "—";
        return (
          <div key={`${label}-${i}`} className="admin-bar-row">
            <span className="admin-bar-label" title={label}>
              {label}
            </span>
            <div className="admin-bar-track">
              <div
                className="admin-bar-fill"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="admin-bar-value">{value}</span>
          </div>
        );
      })}
    </div>
  );
}
