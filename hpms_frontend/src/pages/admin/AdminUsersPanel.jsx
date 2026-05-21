import { useState } from "react";

const ROLES = [
  { value: "TRIAGE", label: "Triage" },
  { value: "RECEPTION", label: "Reception" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
  { value: "LABORATORY", label: "Laboratory" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "CASHIER", label: "Cashier" },
];

function formatRole(role) {
  if (!role) return "—";
  return String(role).replace(/_/g, " ");
}

const emptyForm = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  role: "RECEPTION",
};

export default function AdminUsersPanel({
  users = [],
  loading,
  onToggle,
  onCreateUser,
  togglingId,
  creating,
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await onCreateUser(form);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      const data = err.response?.data;
      const msg =
        (typeof data === "string" && data) ||
        data?.error ||
        Object.values(data || {})
          .flat()
          .join(" ") ||
        "Could not create user.";
      setFormError(msg);
    }
  };

  if (loading) {
    return <p className="admin-panel-loading">Loading users…</p>;
  }

  return (
    <div className="admin-panel">
      <header className="admin-panel-head admin-panel-head-row">
        <div>
          <h1>User Management</h1>
          <p>Create staff accounts and manage access (admin cannot be disabled)</p>
        </div>
        <button
          type="button"
          className="admin-btn"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "+ Add user"}
        </button>
      </header>

      {showForm && (
        <form className="admin-form-card" onSubmit={handleSubmit}>
          <h3>New staff account</h3>
          {formError && <p className="admin-form-error">{formError}</p>}
          <div className="admin-form-grid">
            <label>
              Username *
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                autoComplete="off"
              />
            </label>
            <label>
              Password *
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
              />
            </label>
            <label>
              First name *
              <input
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Last name
              <input
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
              />
            </label>
            <label>
              Role *
              <select name="role" value={form.role} onChange={handleChange} required>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" className="admin-btn" disabled={creating}>
            {creating ? "Creating…" : "Create user"}
          </button>
        </form>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-table-empty">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.first_name} {user.last_name}
                  </td>
                  <td>{user.username}</td>
                  <td>
                    <span className="admin-role-pill">{formatRole(user.role)}</span>
                  </td>
                  <td>
                    <span
                      className={`admin-status-pill ${
                        user.is_active ? "on" : "off"
                      }`}
                    >
                      {user.is_active ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td>
                    {user.can_disable === false || user.role === "ADMIN" ? (
                      <span className="admin-protected-label">Protected</span>
                    ) : (
                      <button
                        type="button"
                        className="admin-btn admin-btn-secondary"
                        disabled={togglingId === user.id}
                        onClick={() => onToggle(user.id)}
                      >
                        {togglingId === user.id
                          ? "Updating…"
                          : user.is_active
                            ? "Disable"
                            : "Enable"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
