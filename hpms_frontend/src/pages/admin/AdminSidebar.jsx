export const ADMIN_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: "◉" },
  { id: "users", label: "User Management", icon: "👥" },
  { id: "services", label: "Services & Fees", icon: "💰" },
  { id: "analytics", label: "Analytics", icon: "📊" },
  { id: "audit", label: "Audit Logs", icon: "📋" },
  { id: "inventory", label: "Inventory", icon: "📦" },
];

export default function AdminSidebar({ active, onNavigate, onLogout }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span className="admin-sidebar-logo">HPMS</span>
        <h2>Admin Dashboard</h2>
        <p className="admin-sidebar-tagline">Hospital operations</p>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin sections">
        <ul>
          {ADMIN_SECTIONS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`admin-nav-link ${active === item.id ? "active" : ""}`}
                onClick={() => onNavigate(item.id)}
                aria-current={active === item.id ? "page" : undefined}
              >
                <span className="admin-nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="admin-sidebar-foot">
        <p>Secure admin workspace</p>
        {onLogout && (
          <button type="button" className="admin-sidebar-logout" onClick={onLogout}>
            Log out
          </button>
        )}
      </div>
    </aside>
  );
}
