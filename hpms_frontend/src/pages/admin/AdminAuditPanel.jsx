function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminAuditPanel({ logs = [], loading }) {
  if (loading) {
    return <p className="admin-panel-loading">Loading audit logs…</p>;
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel-head">
        <h1>Audit Logs</h1>
        <p>Recent administrative and system actions</p>
      </header>

      <div className="admin-audit-list">
        {logs.length === 0 ? (
          <p className="admin-chart-empty">No audit entries recorded yet.</p>
        ) : (
          logs.map((log) => (
            <article key={log.id} className="admin-audit-item">
              <div className="admin-audit-meta">
                <strong>{log.username || "System"}</strong>
                <time dateTime={log.created_at}>{formatWhen(log.created_at)}</time>
              </div>
              <p>{log.action}</p>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
