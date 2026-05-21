import { useMemo, useState } from "react";

const emptyItem = {
  name: "",
  sku: "",
  category: "MEDICINE",
  description: "",
  quantity: "0",
  unit: "units",
  reorder_level: "10",
  location: "",
};

export default function AdminInventoryPanel({
  inventory,
  loading,
  onAdd,
  onUpdate,
  onDelete,
  saving,
}) {
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyItem);
  const [formError, setFormError] = useState("");
  const [editQty, setEditQty] = useState({});

  const categories = inventory?.categories || [];
  const items = inventory?.items || [];
  const maxItems = inventory?.max_items ?? 200;
  const total = inventory?.total ?? 0;

  const filtered = useMemo(() => {
    if (activeCategory === "ALL") return items;
    return items.filter((i) => i.category === activeCategory);
  }, [items, activeCategory]);

  const handleFormChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError("");
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await onAdd({
        ...form,
        quantity: parseInt(form.quantity, 10) || 0,
        reorder_level: parseInt(form.reorder_level, 10) || 0,
      });
      setForm(emptyItem);
      setShowForm(false);
    } catch (err) {
      const data = err.response?.data;
      setFormError(
        (typeof data === "string" && data) ||
          data?.error ||
          Object.values(data || {})
            .flat()
            .join(" ") ||
          "Could not add item."
      );
    }
  };

  const saveQuantity = async (item) => {
    const raw = editQty[item.id];
    if (raw === undefined || raw === "") return;
    const qty = parseInt(raw, 10);
    if (Number.isNaN(qty) || qty < 0) return;
    await onUpdate(item.id, { quantity: qty });
    setEditQty((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
  };

  if (loading) {
    return <p className="admin-panel-loading">Loading inventory…</p>;
  }

  const atLimit = total >= maxItems;

  return (
    <div className="admin-panel">
      <header className="admin-panel-head admin-panel-head-row">
        <div>
          <h1>Inventory</h1>
          <p>
            {total} / {maxItems} items · grouped by type (medicine, assets, supplies, …)
          </p>
        </div>
        <button
          type="button"
          className="admin-btn"
          disabled={atLimit}
          title={atLimit ? "Inventory limit reached" : undefined}
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancel" : "+ Add inventory"}
        </button>
      </header>

      <div className="admin-inv-tabs">
        <button
          type="button"
          className={activeCategory === "ALL" ? "active" : ""}
          onClick={() => setActiveCategory("ALL")}
        >
          All ({items.length})
        </button>
        {categories.map((c) => (
          <button
            key={c.value}
            type="button"
            className={activeCategory === c.value ? "active" : ""}
            onClick={() => setActiveCategory(c.value)}
          >
            {c.label} (
            {items.filter((i) => i.category === c.value).length})
          </button>
        ))}
      </div>

      {showForm && (
        <form className="admin-form-card" onSubmit={handleAdd}>
          <h3>Add inventory item</h3>
          {formError && <p className="admin-form-error">{formError}</p>}
          <div className="admin-form-grid">
            <label>
              Name *
              <input name="name" value={form.name} onChange={handleFormChange} required />
            </label>
            <label>
              SKU / code
              <input name="sku" value={form.sku} onChange={handleFormChange} />
            </label>
            <label>
              Category *
              <select
                name="category"
                value={form.category}
                onChange={handleFormChange}
                required
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity *
              <input
                name="quantity"
                type="number"
                min="0"
                value={form.quantity}
                onChange={handleFormChange}
                required
              />
            </label>
            <label>
              Unit
              <input name="unit" value={form.unit} onChange={handleFormChange} />
            </label>
            <label>
              Reorder level
              <input
                name="reorder_level"
                type="number"
                min="0"
                value={form.reorder_level}
                onChange={handleFormChange}
              />
            </label>
            <label>
              Location
              <input name="location" value={form.location} onChange={handleFormChange} />
            </label>
            <label className="admin-form-full">
              Description
              <textarea
                name="description"
                rows={2}
                value={form.description}
                onChange={handleFormChange}
              />
            </label>
          </div>
          <button type="submit" className="admin-btn" disabled={saving}>
            {saving ? "Saving…" : "Save item"}
          </button>
        </form>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Reorder</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="admin-table-empty">
                  No items in this category. Add inventory above.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.description && (
                      <div className="admin-inv-desc">{item.description}</div>
                    )}
                  </td>
                  <td>{item.sku || "—"}</td>
                  <td>
                    <span className="admin-role-pill">
                      {categories.find((c) => c.value === item.category)?.label ||
                        item.category}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="admin-qty-input"
                      min="0"
                      value={
                        editQty[item.id] !== undefined
                          ? editQty[item.id]
                          : String(item.quantity)
                      }
                      onChange={(e) =>
                        setEditQty((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      onBlur={() => void saveQuantity(item)}
                    />
                  </td>
                  <td>{item.unit}</td>
                  <td>{item.reorder_level}</td>
                  <td>{item.location || "—"}</td>
                  <td>
                    <span className={`admin-inv-pill ${item.status}`}>
                      {item.status === "low" ? "Low stock" : "OK"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      disabled={saving}
                      onClick={() => {
                        if (window.confirm(`Remove ${item.name}?`)) {
                          void onDelete(item.id);
                        }
                      }}
                    >
                      Remove
                    </button>
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
