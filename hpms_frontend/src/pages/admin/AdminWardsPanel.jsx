import React, { useState, useEffect } from "react";
import API from "../../api/axios";

export default function AdminWardsPanel() {
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWardName, setNewWardName] = useState("");
  const [newWardType, setNewWardType] = useState("MALE");
  const [selectedWard, setSelectedWard] = useState(null);
  const [newBedNumber, setNewBedNumber] = useState("");

  const fetchWards = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/wards/");
      setWards(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWards();
  }, []);

  const handleCreateWard = async (e) => {
    e.preventDefault();
    try {
      await API.post("/admin/wards/", {
        name: newWardName,
        ward_type: newWardType,
      });
      setNewWardName("");
      fetchWards();
    } catch (err) {
      console.error(err);
      alert("Failed to create ward.");
    }
  };

  const handleDeleteWard = async (e, wardId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this ward? This action cannot be undone.")) return;
    try {
      await API.delete(`/admin/wards/${wardId}/`);
      if (selectedWard === wardId) setSelectedWard(null);
      fetchWards();
    } catch (err) {
      console.error(err);
      alert("Failed to delete ward. Ensure it is empty first.");
    }
  };

  const handleAddBed = async (e, wardId) => {
    e.preventDefault();
    if (!newBedNumber) return;
    try {
      await API.post("/admin/beds/", {
        ward: wardId,
        bed_number: newBedNumber,
      });
      setNewBedNumber("");
      fetchWards();
    } catch (err) {
      console.error(err);
      alert("Failed to add bed.");
    }
  };

  const handleDeleteBed = async (e, bedId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to remove this bed?")) return;
    try {
      await API.delete(`/admin/beds/${bedId}/`);
      fetchWards();
    } catch (err) {
      console.error(err);
      alert("Failed to remove bed. Ensure it is not occupied.");
    }
  };

  if (loading) return <div>Loading Wards & Beds...</div>;

  return (
    <div className="admin-panel admin-wards">
      <header className="panel-header">
        <h3>Wards & Beds Management</h3>
        <p>Configure hospital wards and track bed occupancy.</p>
      </header>

      <section className="admin-wards-content">
        <div className="admin-wards-list">
          <h4>Wards ({wards.length})</h4>
          
          <form className="admin-form compact-form" onSubmit={handleCreateWard}>
            <input
              type="text"
              placeholder="Ward Name (e.g. Ward A)"
              value={newWardName}
              onChange={(e) => setNewWardName(e.target.value)}
              required
            />
            <select value={newWardType} onChange={(e) => setNewWardType(e.target.value)}>
              <option value="MALE">Male Ward</option>
              <option value="FEMALE">Female Ward</option>
              <option value="EMERGENCY">Emergency Ward</option>
              <option value="ICU">ICU Ward</option>
              <option value="PEDIATRICS">Pediatrics Ward</option>
              <option value="LABOR">Labor Ward</option>
            </select>
            <button type="submit" className="btn-primary">Add Ward</button>
          </form>

          <div className="ward-cards">
            {wards.map((w) => (
              <div 
                key={w.id} 
                className={`ward-card ${selectedWard === w.id ? 'active' : ''}`}
                onClick={() => setSelectedWard(w.id)}
              >
                <div className="ward-card-header">
                  <h5>{w.name}</h5>
                  <span className="ward-type-badge">{w.ward_type}</span>
                </div>
                <div className="ward-card-stats">
                  <span>{w.beds.length} Beds</span>
                  <span>{w.beds.filter(b => b.is_occupied).length} Occupied</span>
                  <button 
                    className="delete-ward-btn" 
                    onClick={(e) => handleDeleteWard(e, w.id)}
                    title="Remove Ward"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-beds-list">
          {selectedWard ? (
            <>
              {(() => {
                const ward = wards.find(w => w.id === selectedWard);
                if (!ward) return null;
                return (
                  <>
                    <h4>Beds in {ward.name}</h4>
                    
                    <form className="admin-form compact-form" onSubmit={(e) => handleAddBed(e, ward.id)}>
                      <input
                        type="text"
                        placeholder="Bed Number (e.g. A-101)"
                        value={newBedNumber}
                        onChange={(e) => setNewBedNumber(e.target.value)}
                        required
                      />
                      <button type="submit" className="btn-primary">Add Bed</button>
                    </form>
                    
                    <div className="beds-grid">
                      {ward.beds.map((b) => (
                        <div key={b.id} className={`bed-card ${b.is_occupied ? 'occupied' : 'available'}`}>
                          {!b.is_occupied && (
                            <button 
                              className="delete-bed-btn" 
                              onClick={(e) => handleDeleteBed(e, b.id)}
                              title="Remove Bed"
                            >
                              ×
                            </button>
                          )}
                          <span className="bed-icon">🛏️</span>
                          <span className="bed-num">{b.bed_number}</span>
                          <span className="bed-status">{b.is_occupied ? "Occupied" : "Available"}</span>
                        </div>
                      ))}
                      {ward.beds.length === 0 && <p>No beds in this ward yet.</p>}
                    </div>
                  </>
                );
              })()}
            </>
          ) : (
            <div className="placeholder-pane">
              <p>Select a ward to view and manage its beds.</p>
            </div>
          )}
        </div>
      </section>
      
      <style>{`
        .admin-wards-content {
          display: flex;
          gap: 2rem;
          margin-top: 1rem;
        }
        .admin-wards-list {
          flex: 1;
        }
        .admin-beds-list {
          flex: 2;
          background: rgba(255,255,255,0.02);
          border-left: 1px solid rgba(255,255,255,0.1);
          padding-left: 2rem;
        }
        .compact-form {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        .compact-form input, .compact-form select {
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(0,0,0,0.2);
          color: white;
        }
        .ward-cards {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .ward-card {
          padding: 1rem;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ward-card:hover {
          background: rgba(255,255,255,0.1);
        }
        .ward-card.active {
          border: 1px solid var(--accent);
          background: rgba(var(--accent-rgb), 0.1);
        }
        .ward-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        .ward-type-badge {
          font-size: 0.75rem;
          padding: 0.2rem 0.5rem;
          background: var(--accent);
          border-radius: 4px;
        }
        .ward-card-stats {
          display: flex;
          gap: 1rem;
          font-size: 0.85rem;
          opacity: 0.8;
        }
        .beds-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        .bed-card {
          padding: 1rem;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(255,255,255,0.05);
        }
        .bed-card.available {
          border-left: 4px solid #4ade80;
        }
        .bed-card.occupied {
          border-left: 4px solid #f87171;
          opacity: 0.7;
        }
        .bed-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .bed-status {
          font-size: 0.75rem;
          margin-top: 0.25rem;
          opacity: 0.8;
        }
        .delete-ward-btn {
          background-color: transparent;
          border: 1px solid #f87171;
          color: #f87171;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.75rem;
          transition: all 0.2s;
        }
        .delete-ward-btn:hover {
          background-color: #f87171;
          color: white;
        }
        .delete-bed-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          background: transparent;
          border: none;
          color: #f87171;
          font-size: 1.2rem;
          cursor: pointer;
          opacity: 0.6;
        }
        .delete-bed-btn:hover {
          opacity: 1;
        }
        .bed-card {
          position: relative;
        }
        .placeholder-pane {
          display: flex;
          height: 100%;
          align-items: center;
          justify-content: center;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
