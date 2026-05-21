import SimpleBarChart from "./SimpleBarChart";
import SimpleDonutChart from "./SimpleDonutChart";

export default function AdminAnalyticsPanel({ analytics, loading }) {
  if (loading) {
    return <p className="admin-panel-loading">Loading analytics…</p>;
  }

  const statusData = (analytics?.visits_by_status || []).map((row) => ({
    label: (row.status || "—").replace(/_/g, " "),
    value: row.count,
  }));

  const roleData = (analytics?.staff_by_role || []).map((row) => ({
    label: (row.role || "—").replace(/_/g, " "),
    value: row.count,
  }));

  const priorityData = (analytics?.triage_by_priority || []).map((row) => ({
    label: row.priority || "—",
    value: row.count,
  }));

  const billing = analytics?.billing || {};

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Analytics</h1>
        <p>Operational breakdowns from live hospital data</p>
      </header>

      <div className="admin-billing-strip">
        <div className="admin-billing-chip paid">
          <span>Paid invoices</span>
          <strong>${Number(billing.paid_total || 0).toLocaleString()}</strong>
        </div>
        <div className="admin-billing-chip pending">
          <span>Pending invoices</span>
          <strong>${Number(billing.pending_total || 0).toLocaleString()}</strong>
        </div>
      </div>

      <div className="admin-charts-grid">
        <section className="admin-chart-card wide">
          <h3>Visits by workflow status</h3>
          <SimpleBarChart data={statusData} />
        </section>
        <section className="admin-chart-card">
          <h3>Staff by role</h3>
          <SimpleDonutChart data={roleData} />
        </section>
        <section className="admin-chart-card">
          <h3>Triage priorities</h3>
          <SimpleDonutChart data={priorityData} />
        </section>
      </div>
    </div>
  );
}
