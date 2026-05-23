import { useState } from "react";
import API from "../../api/axios";

const SERVICE_TYPES = [
  { value: "REGISTRATION", label: "Registration" },
  { value: "CONSULTATION", label: "Consultation" },
  { value: "LAB", label: "Laboratory" },
  { value: "OTHER", label: "Other" },
];

const emptyForm = {
  code: "",
  name: "",
  department: "General",
  default_price: "",
  service_type: "OTHER",
};

export default function AdminServicesPanel({ services, onRefresh, loading }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await API.post("/billing/services/", {
        ...form,
        default_price: form.default_price || "0",
        is_active: true,
      });
      setForm(emptyForm);
      await onRefresh();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save service.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (svc) => {
    try {
      await API.patch(`/billing/services/${svc.id}/`, {
        is_active: !svc.is_active,
      });
      await onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="admin-panel admin-services-panel">
      <header className="admin-panel-head">
        <h2>Hospital services & fees</h2>
        <p>Configure registration, consultation, lab, and other charges (ETB).</p>
      </header>

      <form className="admin-services-form" onSubmit={handleCreate}>
        <h3>Add service</h3>
        {error && <p className="admin-form-error">{error}</p>}
        <div className="admin-services-grid">
          <label>
            Code
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="e.g. XRAY_CHEST"
              required
            />
          </label>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label>
            Department
            <input
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </label>
          <label>
            Price (ETB)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.default_price}
              onChange={(e) => setForm({ ...form, default_price: e.target.value })}
              required
            />
          </label>
          <label>
            Type
            <select
              value={form.service_type}
              onChange={(e) => setForm({ ...form, service_type: e.target.value })}
            >
              {SERVICE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className="admin-btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Add service"}
        </button>
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Department</th>
              <th>Price (ETB)</th>
              <th>Type</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>Loading…</td>
              </tr>
            )}
            {!loading && (!services || services.length === 0) && (
              <tr>
                <td colSpan={6}>No services configured.</td>
              </tr>
            )}
            {(services || []).map((svc) => (
              <tr key={svc.id} className={!svc.is_active ? "inactive-row" : ""}>
                <td>{svc.code}</td>
                <td>{svc.name}</td>
                <td>{svc.department}</td>
                <td>{Number(svc.default_price).toLocaleString("en-ET")}</td>
                <td>{svc.service_type}</td>
                <td>
                  <button
                    type="button"
                    className="admin-btn-ghost"
                    onClick={() => toggleActive(svc)}
                  >
                    {svc.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
