import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import TopNav from "../components/TopNav";
import "./Styles/lab.css";

const testTemplates = {
  CBC: [
    { name: "Hemoglobin", unit: "g/dL", normal: "12-16" },
    { name: "WBC", unit: "10^9/L", normal: "4-11" },
  ],
  Urinalysis: [{ name: "pH", unit: "", normal: "5-7" }],
  "Blood Sugar": [{ name: "Glucose", unit: "mg/dL", normal: "70-100" }],
};

function rowKey(orderId, paramName) {
  return `${orderId}::${paramName}`;
}

export default function Lab() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  const [queueError, setQueueError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState({});
  const [banner, setBanner] = useState(null);

  const fetchQueue = useCallback(async () => {
    if (!localStorage.getItem("access")) {
      setQueueError("Not signed in.");
      setQueue([]);
      return;
    }
    try {
      const res = await API.get("/lab/queue/");
      setQueueError(null);
      setQueue(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      if (status === 401) {
        setQueueError("Session expired. Please log in again.");
        setQueue([]);
      } else {
        setQueueError(
          err.response?.data?.detail ||
            "Could not load the lab queue. Check that the server is running."
        );
      }
    }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("access")) {
      navigate("/", { replace: true });
      return;
    }
    const raw = localStorage.getItem("hpms_user");
    if (raw) {
      try {
        const role = JSON.parse(raw)?.role?.toLowerCase();
        if (role && role !== "laboratory") {
          navigate("/", { replace: true });
          return;
        }
      } catch {
        /* ignore */
      }
    }
    const initial = setTimeout(() => {
      void fetchQueue();
    }, 0);
    const t = setInterval(() => {
      void fetchQueue();
    }, 4000);
    return () => {
      clearTimeout(initial);
      clearInterval(t);
    };
  }, [fetchQueue, navigate]);

  const priorityClass = (p) =>
    p && ["LOW", "MEDIUM", "URGENT", "CRITICAL"].includes(p) ? p : "";

  const selectVisit = (entry) => {
    setSelected(entry);
    setResults({});
  };

  const tableRows = selected
    ? selected.orders.flatMap((order) => {
        const rows =
          testTemplates[order.test_name] || [
            { name: "Result", unit: "", normal: "" },
          ];
        return rows.map((param) => ({
          orderId: order.id,
          testName: order.test_name,
          param,
        }));
      })
    : [];

  const handleSubmit = async () => {
    if (!selected?.visit_id) return;
    const ordersPayload = selected.orders.map((o) => {
      const rows =
        testTemplates[o.test_name] || [
          { name: "Result", unit: "", normal: "" },
        ];
      const slice = {};
      for (const param of rows) {
        const v = results[rowKey(o.id, param.name)];
        if (v !== undefined && v !== "") slice[param.name] = v;
      }
      return {
        id: o.id,
        result: JSON.stringify(slice),
      };
    });

    try {
      await API.post(`/lab/visit/${selected.visit_id}/submit/`, {
        orders: ordersPayload,
      });
      setBanner({
        type: "success",
        message: "Results authorized and sent to the doctor.",
      });
      setQueue((prev) => prev.filter((q) => q.visit_id !== selected.visit_id));
      setSelected(null);
      setResults({});
    } catch (err) {
      console.error(err);
      setBanner({
        type: "urgent",
        message:
          err.response?.data?.detail ||
          "Could not save results. Check your connection and try again.",
      });
    }
  };

  return (
    <div className="hpms-shell">
      <TopNav title="Laboratory" />
      <div className="hpms-shell-content">
        <div className="lab-container">
          {banner && (
            <div className={`lab-banner custom-alert ${banner.type}`}>
              <span>{banner.message}</span>
              <button type="button" onClick={() => setBanner(null)}>
                ×
              </button>
            </div>
          )}

          <div className="lab-main-row">
            <div className="lab-left">
              <h3>Specimen Queue</h3>

              {queueError && (
                <div className="lab-queue-error" role="alert">
                  {queueError}
                </div>
              )}

              {!queueError && queue.length === 0 && (
                <p className="lab-queue-empty">No pending lab orders.</p>
              )}

              {queue.map((item) => (
                <div
                  key={item.visit_id}
                  className={`lab-card ${priorityClass(item.priority)} ${
                    selected?.visit_id === item.visit_id ? "active" : ""
                  }`}
                  onClick={() => selectVisit(item)}
                >
                  <h4>{item.patient_name}</h4>
                  <p className="lab-card-tests">
                    {(item.orders || []).map((o) => o.test_name).join(" · ")}
                  </p>
                  <span className="status">
                    {(item.orders || []).length} test
                    {(item.orders || []).length === 1 ? "" : "s"} pending
                  </span>
                </div>
              ))}
            </div>

            <div className="lab-right">
              {!selected ? (
                <p>Select a patient from the queue.</p>
              ) : (
                <>
                  <h2>{selected.patient_name}</h2>
                  <p className="lab-selected-test">
                    Enter results for all ordered tests in one table.
                  </p>

                  <table className="lab-table lab-table-merged">
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th>Parameter</th>
                        <th>Result</th>
                        <th>Units</th>
                        <th>Normal</th>
                        <th>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((row, index) => {
                        const { orderId, testName, param } = row;
                        const rk = rowKey(orderId, param.name);
                        const value = results[rk] || "";

                        let flag = "";
                        if (
                          value !== "" &&
                          param.normal &&
                          /^\s*\d+\s*-\s*\d+\s*$/.test(param.normal)
                        ) {
                          const [low, high] = param.normal
                            .split("-")
                            .map((s) => Number(s.trim()));
                          const n = Number(value);
                          if (!Number.isNaN(n)) {
                            if (n < low) flag = "L";
                            if (n > high) flag = "H";
                          }
                        }

                        return (
                          <tr key={`${rk}-${index}`}>
                            <td className="lab-td-test">{testName}</td>
                            <td>{param.name}</td>
                            <td>
                              <input
                                type={param.normal ? "number" : "text"}
                                value={value}
                                onChange={(e) =>
                                  setResults({
                                    ...results,
                                    [rk]: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td>{param.unit}</td>
                            <td>{param.normal || "—"}</td>
                            <td
                              className={
                                flag === "H"
                                  ? "high"
                                  : flag === "L"
                                    ? "low"
                                    : ""
                              }
                            >
                              {flag}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            className="authorize-btn"
            onClick={handleSubmit}
            disabled={!selected}
          >
            Authorize & Send to Doctor
          </button>
        </div>
      </div>
    </div>
  );
}
