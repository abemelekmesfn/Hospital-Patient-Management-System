import { useMemo, useState } from "react";
import ConfirmModal from "../../components/ConfirmModal";

const emptyItem = {
  name: "",
  sku: "",
  category: "MEDICINE",
  description: "",
  quantity: "0",
  unit_price: "0",
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
  const [editPrice, setEditPrice] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const items = inventory?.items || [];
  
  const categories = useMemo(() => {
    const existing = inventory?.categories || [];
    const defaults = [
      { value: "MEDICINE", label: "Medicine" },
      { value: "ASSETS", label: "Assets" },
      { value: "SUPPLIES", label: "Supplies" },
      { value: "EQUIPMENT", label: "Equipment" },
      { value: "LABORATORY", label: "Laboratory" },
    ];
    const merged = [...defaults];
    existing.forEach((e) => {
      if (!merged.find((m) => m.value.toUpperCase() === e.value.toUpperCase())) {
        merged.push(e);
      }
    });
    return merged;
  }, [inventory]);
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
        unit_price: form.unit_price || "0",
        reorder_level: 10,
        location: "",
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

  const savePrice = async (item) => {
    const raw = editPrice[item.id];
    if (raw === undefined || raw === "") return;
    const price = parseFloat(raw);
    if (Number.isNaN(price) || price < 0) return;
    await onUpdate(item.id, { unit_price: price });
    setEditPrice((prev) => {
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
              Unit price (ETB)
              <input
                name="unit_price"
                type="number"
                min="0"
                step="0.01"
                value={form.unit_price}
                onChange={handleFormChange}
              />
            </label>
            <label>
              Unit
              <input name="unit" value={form.unit} onChange={handleFormChange} />
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
              <th>Price (ETB)</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="admin-table-empty">
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
                  <td>
                    <input
                      type="number"
                      className="admin-qty-input"
                      min="0"
                      step="0.01"
                      value={
                        editPrice[item.id] !== undefined
                          ? editPrice[item.id]
                          : String(item.unit_price || 0)
                      }
                      onChange={(e) =>
                        setEditPrice((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      onBlur={() => void savePrice(item)}
                    />
                  </td>
                  <td>{item.unit}</td>
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
                      onClick={() => setDeleteTarget(item)}
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

      <ConfirmModal
        open={!!deleteTarget}
        title="Remove Inventory Item"
        message={`Are you sure you want to remove "${deleteTarget?.name}" from inventory? This action cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
