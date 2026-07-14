import React, { useState, useEffect } from "react";
import API from "../../api/axios";
import { Bar, Line } from "react-chartjs-2";
import "../Styles/doctor-reports.css";

export default function AdminReportsPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("weekly");
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchReports = async (selectedRange) => {
    setLoading(true);
    try {
      const res = await API.get(`/admin/reports/?range=${selectedRange}`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching admin reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(range);
  }, [range]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="admin-panel-loading">Loading reports data...</div>;
  }

  if (!data) {
    return <div className="admin-panel-error">Error loading reports data.</div>;
  }

  const { overview, surveillance, maternal, child, infectious, chronic } = data;

  // Chart configs
  const surveillanceChartData = {
    labels: [...new Set(surveillance.trends.map(d => d.period))],
    datasets: (() => {
      const diseases = [...new Set(surveillance.trends.map(d => d.diagnosis))].slice(0, 5); // top 5
      const colors = ["#d32f2f", "#1976d2", "#388e3c", "#fbc02d", "#8e24aa"];
      return diseases.map((disease, i) => {
        const periodData = [...new Set(surveillance.trends.map(d => d.period))];
        const dataPoints = periodData.map(p => {
          const point = surveillance.trends.find(d => d.period === p && d.diagnosis === disease);
          return point ? point.count : 0;
        });
        return {
          label: disease,
          data: dataPoints,
          borderColor: colors[i % colors.length],
          fill: false,
          tension: 0.1
        };
      });
    })()
  };

  const maternalChartData = {
    labels: maternal.map((d) => d.diagnosis),
    datasets: [
      {
        label: "Maternal Cases",
        data: maternal.map((d) => d.count),
        backgroundColor: "#e91e63",
      },
    ],
  };

  const childChartData = {
    labels: child.map((d) => d.diagnosis),
    datasets: [
      {
        label: "Child Cases",
        data: child.map((d) => d.count),
        backgroundColor: "#03a9f4",
      },
    ],
  };

  const infectiousStatsData = {
    labels: infectious.stats.map((d) => d.diagnosis),
    datasets: [
      {
        label: "Infectious Cases",
        data: infectious.stats.map((d) => d.count),
        backgroundColor: "#ff9800",
      },
    ],
  };

  const infectiousTrendData = {
    labels: [...new Set(infectious.trends.map(d => d.period))],
    datasets: (() => {
      const diseases = [...new Set(infectious.trends.map(d => d.diagnosis))].slice(0, 5); // top 5
      const colors = ["#d32f2f", "#1976d2", "#388e3c", "#fbc02d", "#8e24aa"];
      return diseases.map((disease, i) => {
        const periodData = [...new Set(infectious.trends.map(d => d.period))];
        const dataPoints = periodData.map(p => {
          const point = infectious.trends.find(d => d.period === p && d.diagnosis === disease);
          return point ? point.count : 0;
        });
        return {
          label: disease,
          data: dataPoints,
          borderColor: colors[i % colors.length],
          fill: false,
          tension: 0.1
        };
      });
    })()
  };

  const chronicStatsData = {
    labels: chronic?.stats ? chronic.stats.map((d) => d.diagnosis) : [],
    datasets: [
      {
        label: "Chronic Cases",
        data: chronic?.stats ? chronic.stats.map((d) => d.count) : [],
        backgroundColor: "#9c27b0",
      },
    ],
  };

  const chronicTrendData = {
    labels: chronic?.trends ? [...new Set(chronic.trends.map(d => d.period))] : [],
    datasets: (() => {
      if (!chronic?.trends) return [];
      const diseases = [...new Set(chronic.trends.map(d => d.diagnosis))].slice(0, 5);
      const colors = ["#d32f2f", "#1976d2", "#388e3c", "#fbc02d", "#8e24aa"];
      return diseases.map((disease, i) => {
        const periodData = [...new Set(chronic.trends.map(d => d.period))];
        const dataPoints = periodData.map(p => {
          const point = chronic.trends.find(d => d.period === p && d.diagnosis === disease);
          return point ? point.count : 0;
        });
        return {
          label: disease,
          data: dataPoints,
          borderColor: colors[i % colors.length],
          fill: false,
          tension: 0.1
        };
      });
    })()
  };

  const ReportContent = () => (
    <div className="admin-reports-panel">
      {/* Overview Cards */}
      <div className="admin-stat-grid">
        <div className="admin-stat-card">
          <span className="admin-stat-label">Total Patients</span>
          <strong className="admin-stat-value">{overview.total_patients}</strong>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Total Diagnosed Cases</span>
          <strong className="admin-stat-value accent">{overview.total_diagnosed}</strong>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Maternal Cases</span>
          <strong className="admin-stat-value" style={{color: '#e91e63'}}>{overview.maternal_cases}</strong>
        </div>
        <div className="admin-stat-card">
          <span className="admin-stat-label">Child Cases</span>
          <strong className="admin-stat-value" style={{color: '#03a9f4'}}>{overview.child_cases}</strong>
        </div>
      </div>

      {/* Disease Surveillance Report */}
      <div className="admin-form-card">
        <h3>Disease Surveillance Report</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <table className="clean-table">
              <thead>
                <tr>
                  <th>Disease</th>
                  <th>Cases</th>
                </tr>
              </thead>
              <tbody>
                {surveillance.top_diseases.map((d, i) => (
                  <tr key={i}>
                    <td>{d.diagnosis}</td>
                    <td><strong>{d.count}</strong></td>
                  </tr>
                ))}
                {surveillance.top_diseases.length === 0 && (
                  <tr><td colSpan="2">No diseases diagnosed in this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="report-chart-container" style={{height: '300px'}}>
            <Line data={surveillanceChartData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Maternal & Child Health Reports */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="admin-form-card">
          <h3>Maternal Health Report (OB/GYN)</h3>
          <div className="report-chart-container" style={{height: '250px'}}>
            <Bar data={maternalChartData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
        <div className="admin-form-card">
          <h3>Child Health Report (Pediatrics)</h3>
          <div className="report-chart-container" style={{height: '250px'}}>
            <Bar data={childChartData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Infectious Disease Tracking */}
      <div className="admin-form-card">
        <h3>Infectious Disease Tracking</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="report-chart-container" style={{height: '250px'}}>
             <Bar data={infectiousStatsData} options={{ maintainAspectRatio: false }} />
          </div>
          <div className="report-chart-container" style={{height: '250px'}}>
             <Line data={infectiousTrendData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Chronic Disease Tracking */}
      <div className="admin-form-card">
        <h3>Chronic Disease Tracking</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="report-chart-container" style={{height: '250px'}}>
             <Bar data={chronicStatsData} options={{ maintainAspectRatio: false }} />
          </div>
          <div className="report-chart-container" style={{height: '250px'}}>
             <Line data={chronicTrendData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="admin-reports-header">
        <div>
          <h1 style={{margin: 0, color: '#1a237e'}}>Hospital Performance Reports</h1>
          <p style={{margin: 0, color: '#607d8b'}}>Comprehensive overview and surveillance data</p>
        </div>
        <div className="admin-reports-filters">
          <select 
            className="reports-filter-select"
            value={range}
            onChange={(e) => setRange(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button className="reports-btn reports-btn-secondary" onClick={() => setShowPrintModal(true)}>
            Print PDF
          </button>
        </div>
      </div>

      <div style={{marginTop: '24px'}}>
        <ReportContent />
      </div>

      {showPrintModal && (
        <div className="print-modal-overlay">
          <div className="print-modal-content">
            <div className="print-modal-header">
              <h2>Print Preview</h2>
              <button className="reports-btn" onClick={() => setShowPrintModal(false)}>Close</button>
            </div>
            <div className="print-modal-body">
              <h1 style={{textAlign: "center", color: "#1a237e"}}>Hospital Performance Report ({range})</h1>
              <ReportContent />
            </div>
            <div className="print-modal-footer">
              <button className="reports-btn reports-btn-secondary" onClick={() => setShowPrintModal(false)}>Cancel</button>
              <button className="reports-btn reports-btn-primary" onClick={handlePrint}>Print</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
