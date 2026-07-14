import { useState } from "react";
import ConfirmModal from "../../components/ConfirmModal";
import API from "../../api/axios";

const ROLES = [
  { value: "TRIAGE", label: "Triage" },
  { value: "RECEPTION", label: "Reception" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "NURSE", label: "Nurse" },
  { value: "LABORATORY", label: "Laboratory" },
  { value: "PHARMACIST", label: "Pharmacist" },
  { value: "CASHIER", label: "Cashier" },
];

const DEPARTMENTS = [
  { value: "OPD", label: "OPD (Outpatient Department)" },
  { value: "PED", label: "PED (Pediatrics)" },
  { value: "OBGYN", label: "OB/GYN (Obstetrics and Gynecology)" },
  { value: "IM", label: "IM / INT MED (Internal Medicine)" },
  { value: "ORTHO", label: "ORTHO (Orthopedics)" },
  { value: "CARD", label: "CARD (Cardiology)" },
  { value: "DERM", label: "DERM (Dermatology)" },
  { value: "ENT", label: "ENT (Otolaryngology)" },
  { value: "OPH", label: "OPH / OPHTH (Ophthalmology)" },
];

function formatRole(role, department) {
  if (!role) return "—";
  let display = String(role).replace(/_/g, " ");
  if (role === "DOCTOR" && department) {
    display += ` (${department})`;
  }
  return display;
}

const emptyForm = {
  username: "",
  password: "",
  first_name: "",
  last_name: "",
  email: "",
  role: "RECEPTION",
  department: "OPD",
};

export default function AdminUsersPanel({
  users = [],
  loading,
  onToggle,
  onCreateUser,
  onDelete,
  togglingId,
  creating,
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  const handleResetPassword = async () => {
    setResetError("");
    if (!resetTarget || newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetting(true);
    try {
      await API.post(`/admin/users/${resetTarget.id}/reset-password/`, {
        password: newPassword,
      });
      setResetTarget(null);
      setNewPassword("");
      setConfirmPassword("");
      alert(`Password reset successfully for ${resetTarget.username}`);
    } catch (err) {
      console.error(err);
      setResetError(
        err.response?.data?.detail || err.response?.data?.error || "Could not reset password."
      );
    } finally {
      setResetting(false);
    }
  };

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
            {form.role === "DOCTOR" && (
              <label>
                Department *
                <select name="department" value={form.department} onChange={handleChange} required>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
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
              <th>Activity (D / W / M)</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-table-empty">
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
                    <span className="admin-role-pill">{formatRole(user.role, user.department)}</span>
                  </td>
                  <td>
                    {(user.role === "DOCTOR" || user.role === "NURSE") ? (
                      <span className="admin-activity-stats">
                        <span className="activity-num">{user.daily_handled ?? 0}</span>
                        <span className="activity-sep">/</span>
                        <span className="activity-num">{user.weekly_handled ?? 0}</span>
                        <span className="activity-sep">/</span>
                        <span className="activity-num">{user.monthly_handled ?? 0}</span>
                      </span>
                    ) : (
                      <span style={{ color: "#9e9e9e" }}>—</span>
                    )}
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
                      <div style={{ display: "flex", gap: "8px" }}>
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
                        <button
                          type="button"
                          className="admin-btn admin-btn-secondary"
                          onClick={() => setResetTarget(user)}
                        >
                          Reset Password
                        </button>
                        <button
                          type="button"
                          className="admin-btn"
                          style={{ backgroundColor: "#d32f2f", color: "white" }}
                          onClick={() => setDeleteTarget(user)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete User"
        message={`Are you sure you want to permanently remove user "${deleteTarget?.username}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {resetTarget && (
        <div className="cm-overlay">
          <div className="cm-backdrop" onClick={() => {
            if (!resetting) {
              setResetTarget(null);
              setNewPassword("");
              setConfirmPassword("");
              setResetError("");
            }
          }} />
          <div className="cm-card">
            <div className="cm-header">
              <h3 className="cm-title">Reset Password for {resetTarget.username}</h3>
              <button
                className="cm-close"
                onClick={() => {
                  setResetTarget(null);
                  setNewPassword("");
                  setConfirmPassword("");
                  setResetError("");
                }}
              >
                &times;
              </button>
            </div>
            <p className="cm-message">
              Enter a new password for this user (minimum 6 characters).
            </p>
            {resetError && (
              <p className="cm-message" style={{ color: "#dc2626", fontWeight: 600 }}>
                {resetError}
              </p>
            )}
            <div className="cm-inputs">
              <label className="cm-input-label">
                New Password
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </label>
              <label className="cm-input-label">
                Confirm Password
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </label>
            </div>
            <div className="cm-actions">
              <button
                className="cm-btn cm-btn-cancel"
                disabled={resetting}
                onClick={() => {
                  setResetTarget(null);
                  setNewPassword("");
                  setConfirmPassword("");
                  setResetError("");
                }}
              >
                Cancel
              </button>
              <button
                className="cm-btn cm-btn-confirm cm-primary"
                disabled={resetting || newPassword.length < 6}
                onClick={handleResetPassword}
              >
                {resetting ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
