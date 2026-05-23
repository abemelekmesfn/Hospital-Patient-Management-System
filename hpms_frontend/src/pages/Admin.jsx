import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import NavPatientSearch from "../components/NavPatientSearch";
import PatientHistoryView from "../components/PatientHistoryView";
import AdminSidebar from "./admin/AdminSidebar";
import AdminDashboardPanel from "./admin/AdminDashboardPanel";
import AdminUsersPanel from "./admin/AdminUsersPanel";
import AdminAnalyticsPanel from "./admin/AdminAnalyticsPanel";
import AdminAuditPanel from "./admin/AdminAuditPanel";
import AdminInventoryPanel from "./admin/AdminInventoryPanel";
import AdminServicesPanel from "./admin/AdminServicesPanel";
import "./Styles/admin.css";

export default function Admin() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [historyPatientId, setHistoryPatientId] = useState(null);

  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState({
    dashboard: true,
    users: true,
    analytics: true,
    audit: true,
    inventory: true,
    services: true,
  });
  const [togglingId, setTogglingId] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [inventorySaving, setInventorySaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const setLoad = (key, val) =>
    setLoading((prev) => ({ ...prev, [key]: val }));

  const fetchStats = useCallback(async () => {
    const res = await API.get("/admin/stats/");
    setStats(res.data);
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await API.get("/admin/users/");
    setUsers(Array.isArray(res.data) ? res.data : []);
  }, []);

  const fetchLogs = useCallback(async () => {
    const res = await API.get("/admin/logs/");
    setLogs(Array.isArray(res.data) ? res.data : []);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    const res = await API.get("/admin/analytics/");
    setAnalytics(res.data);
  }, []);

  const fetchInventory = useCallback(async () => {
    const res = await API.get("/admin/inventory/");
    setInventory(res.data);
  }, []);

  const fetchServices = useCallback(async () => {
    const res = await API.get("/billing/services/");
    setServices(Array.isArray(res.data) ? res.data : []);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    try {
      const raw = localStorage.getItem("hpms_user");
      const role = raw ? JSON.parse(raw)?.role?.toLowerCase() : "";
      if (role !== "admin") {
        navigate("/", { replace: true });
        return;
      }
    } catch {
      navigate("/", { replace: true });
      return;
    }
    setAuthChecked(true);
  }, [navigate]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;

    (async () => {
      setLoad("dashboard", true);
      try {
        await Promise.all([fetchStats(), fetchAnalytics()]);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate("/", { replace: true });
        }
      } finally {
        if (!cancelled) setLoad("dashboard", false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authChecked, fetchStats, fetchAnalytics, navigate]);

  useEffect(() => {
    if (activeSection !== "users") return;
    let cancelled = false;
    (async () => {
      setLoad("users", true);
      try {
        await fetchUsers();
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoad("users", false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection, fetchUsers]);

  useEffect(() => {
    if (activeSection !== "audit") return;
    let cancelled = false;
    (async () => {
      setLoad("audit", true);
      try {
        await fetchLogs();
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoad("audit", false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection, fetchLogs]);

  useEffect(() => {
    if (activeSection !== "analytics") return;
    let cancelled = false;
    (async () => {
      setLoad("analytics", true);
      try {
        await fetchAnalytics();
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoad("analytics", false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection, fetchAnalytics]);

  useEffect(() => {
    if (activeSection !== "inventory") return;
    let cancelled = false;
    (async () => {
      setLoad("inventory", true);
      try {
        await fetchInventory();
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoad("inventory", false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection, fetchInventory]);

  useEffect(() => {
    if (activeSection !== "services") return;
    let cancelled = false;
    (async () => {
      setLoad("services", true);
      try {
        await fetchServices();
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoad("services", false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeSection, fetchServices]);

  const handleNavigate = (section) => {
    setHistoryPatientId(null);
    setActiveSection(section);
  };

  const toggleUser = async (id) => {
    setTogglingId(id);
    try {
      await API.post(`/admin/toggle-user/${id}/`);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Could not update user status.");
    } finally {
      setTogglingId(null);
    }
  };

  const createUser = async (payload) => {
    setCreatingUser(true);
    try {
      await API.post("/admin/users/create/", payload);
      await fetchUsers();
    } finally {
      setCreatingUser(false);
    }
  };

  const addInventory = async (payload) => {
    setInventorySaving(true);
    try {
      await API.post("/admin/inventory/", payload);
      await fetchInventory();
    } finally {
      setInventorySaving(false);
    }
  };

  const updateInventory = async (id, payload) => {
    setInventorySaving(true);
    try {
      await API.patch(`/admin/inventory/${id}/`, payload);
      await fetchInventory();
    } finally {
      setInventorySaving(false);
    }
  };

  const deleteInventory = async (id) => {
    setInventorySaving(true);
    try {
      await API.delete(`/admin/inventory/${id}/`);
      await fetchInventory();
    } finally {
      setInventorySaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("hpms_user");
    navigate("/", { replace: true });
  };

  if (!authChecked) {
    return null;
  }

  const sectionTitle = {
    dashboard: "Dashboard",
    users: "User Management",
    analytics: "Analytics",
    audit: "Audit Logs",
    inventory: "Inventory",
    services: "Services & Fees",
  };

  const renderWorkspace = () => {
    if (historyPatientId) {
      return (
        <PatientHistoryView
          patientId={historyPatientId}
          variant="admin"
          onBack={() => setHistoryPatientId(null)}
        />
      );
    }

    switch (activeSection) {
      case "users":
        return (
          <AdminUsersPanel
            users={users}
            loading={loading.users}
            onToggle={toggleUser}
            onCreateUser={createUser}
            togglingId={togglingId}
            creating={creatingUser}
          />
        );
      case "analytics":
        return (
          <AdminAnalyticsPanel
            analytics={analytics}
            loading={loading.analytics}
          />
        );
      case "audit":
        return (
          <AdminAuditPanel logs={logs} loading={loading.audit} />
        );
      case "inventory":
        return (
          <AdminInventoryPanel
            inventory={inventory}
            loading={loading.inventory}
            onAdd={addInventory}
            onUpdate={updateInventory}
            onDelete={deleteInventory}
            saving={inventorySaving}
          />
        );
      case "services":
        return (
          <AdminServicesPanel
            services={services}
            loading={loading.services}
            onRefresh={fetchServices}
          />
        );
      default:
        return (
          <AdminDashboardPanel
            stats={stats}
            analytics={analytics}
            loading={loading.dashboard}
          />
        );
    }
  };

  return (
    <div className="admin-root">
      <AdminSidebar
        active={activeSection}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar-titles">
            <h2>{sectionTitle[activeSection] || "Admin"}</h2>
            {!historyPatientId && (
              <p>Search a patient to view billing and visit history</p>
            )}
          </div>
          <div className="admin-topbar-search">
            <NavPatientSearch
              variant="light"
              onSelect={(p) => setHistoryPatientId(p?.id ?? null)}
            />
          </div>
        </header>

        <main className="admin-main">{renderWorkspace()}</main>
      </div>
    </div>
  );
}
