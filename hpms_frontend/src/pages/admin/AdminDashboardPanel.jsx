import SimpleBarChart from "./SimpleBarChart";
import SimpleDonutChart from "./SimpleDonutChart";

function formatMoney(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return "0 ETB";
  return `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB`;
}

export default function AdminDashboardPanel({ stats = {}, analytics = null, loading }) {
  const priorityData = (analytics?.triage_by_priority || []).map((row) => ({
    label: row.priority || "—",
    value: row.count,
  }));

  const dayData = (analytics?.visits_by_day || []).map((row) => ({
    label: row.date ? row.date.slice(5) : "—",
    value: row.count,
  }));

  if (loading) {
    return <p className="admin-panel-loading">Loading dashboard…</p>;
  }

  return (
    <div className="admin-panel admin-dashboard-panel">
      <header className="admin-panel-head">
        <h1>Dashboard</h1>
        <p>Overview of hospital activity and key metrics</p>
      </header>

      <div className="admin-stat-grid">
        <article className="admin-stat-card">
          <span className="admin-stat-label">Total visits</span>
          <strong className="admin-stat-value">{stats.total_patients ?? 0}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Revenue (paid)</span>
          <strong className="admin-stat-value accent">
            {formatMoney(stats.revenue)}
          </strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Insurance revenue</span>
          <strong className="admin-stat-value accent">
            {formatMoney(stats.insurance_total)}
          </strong>
        </article>
        <article className="admin-stat-card alert">
          <span className="admin-stat-label">Free Services</span>
          <strong className="admin-stat-value">
            {formatMoney(stats.waived_total)}
          </strong>
        </article>
        <article className="admin-stat-card info">
          <span className="admin-stat-label">Bed Occupancy</span>
          <strong className="admin-stat-value">
            {stats.bed_occupancy?.occupied_beds ?? 0} / {stats.bed_occupancy?.total_beds ?? 0}
          </strong>
        </article>
      </div>

      <div className="admin-charts-row">
        <section className="admin-chart-card wide">
          <h3>Visits — last 7 days</h3>
          <SimpleBarChart data={dayData} />
        </section>
      </div>
    </div>
  );
}
