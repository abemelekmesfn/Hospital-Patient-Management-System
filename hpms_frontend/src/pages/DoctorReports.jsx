import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/axios";
import TopNav from "../components/TopNav";
import "./Styles/doctor-reports.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function DoctorReports() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("weekly");
  const [activeSection, setActiveSection] = useState("summary");
  const [showPrintModal, setShowPrintModal] = useState(false);

  const fetchReports = async (selectedRange) => {
    setLoading(true);
    try {
      const res = await API.get(`/doctor/reports/?range=${selectedRange}`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem("access")) {
      navigate("/", { replace: true });
      return;
    }
    fetchReports(range);
  }, [range, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (!data) return <div className="hpms-shell"><TopNav title="Doctor Reports" /><div>Loading...</div></div>;

  const { patient_summary, common_diagnoses, demographics, disease_trends, rx_stats } = data;

  // Chart Data Preparation
  const diagnosesChartData = {
    labels: common_diagnoses.map((d) => d.diagnosis),
    datasets: [
      {
        label: "Cases",
        data: common_diagnoses.map((d) => d.count),
        backgroundColor: "rgba(57, 73, 171, 0.7)",
      },
    ],
  };

  const genderChartData = {
    labels: ["Male", "Female", "Other"],
    datasets: [
      {
        data: [demographics.gender.male, demographics.gender.female, demographics.gender.other],
        backgroundColor: ["#1e88e5", "#e53935", "#8e24aa"],
      },
    ],
  };

  const ageChartData = {
    labels: ["Children (0-14)", "Adults (15-64)", "Elderly (65+)"],
    datasets: [
      {
        label: "Patients",
        data: [
          demographics.age_groups.children_0_14,
          demographics.age_groups.adults_15_64,
          demographics.age_groups.elderly_65_plus,
        ],
        backgroundColor: ["#43a047", "#fdd835", "#fb8c00"],
      },
    ],
  };

  const trendsChartData = {
    labels: [...new Set(disease_trends.map(d => d.period))],
    datasets: (() => {
      const diseases = [...new Set(disease_trends.map(d => d.diagnosis))].slice(0, 5); // top 5
      const colors = ["#d32f2f", "#1976d2", "#388e3c", "#fbc02d", "#8e24aa"];
      return diseases.map((disease, i) => {
        const periodData = [...new Set(disease_trends.map(d => d.period))];
        const dataPoints = periodData.map(p => {
          const point = disease_trends.find(d => d.period === p && d.diagnosis === disease);
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

  const rxChartData = {
    labels: rx_stats.map((r) => r.drug_name),
    datasets: [
      {
        label: "Prescriptions",
        data: rx_stats.map((r) => r.count),
        backgroundColor: "rgba(0, 150, 136, 0.7)",
      },
    ],
  };

  const ReportContent = () => (
    <>
      <div id="summary" className="report-section">
        <h2>Patient Summary</h2>
        <div className="report-summary-card">
          <div className="report-summary-value">{patient_summary.count}</div>
          <div className="report-summary-label">Patients Seen {range.charAt(0).toUpperCase() + range.slice(1)}</div>
        </div>
      </div>

      <div id="diagnoses" className="report-section">
        <h2>Common Diagnoses</h2>
        <div className="report-chart-container">
          <Bar data={diagnosesChartData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>

      <div id="demographics" className="report-section">
        <h2>Patient Demographics</h2>
        <div className="report-grid">
          <div>
            <h4 style={{textAlign: "center", color: "#607d8b"}}>Gender Distribution</h4>
            <div className="report-chart-container" style={{height: "250px"}}>
              <Pie data={genderChartData} options={{ maintainAspectRatio: false }} />
            </div>
          </div>
          <div>
            <h4 style={{textAlign: "center", color: "#607d8b"}}>Age Groups</h4>
            <div className="report-chart-container" style={{height: "250px"}}>
              <Bar data={ageChartData} options={{ maintainAspectRatio: false, indexAxis: 'y' }} />
            </div>
          </div>
        </div>
      </div>

      <div id="trends" className="report-section">
        <h2>Disease Trends</h2>
        <div className="report-chart-container">
          <Line data={trendsChartData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>

      <div id="prescriptions" className="report-section">
        <h2>Prescription & Treatment Statistics</h2>
        <div className="report-chart-container">
          <Bar data={rxChartData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>
    </>
  );

  return (
    <div className="hpms-shell">
      <TopNav title="Doctor Reports" />
      <div className="reports-page-layout">
        <div className="reports-sidebar">
        <h3>Doctor Reports</h3>
        <button className={`reports-nav-link ${activeSection === "summary" ? "active" : ""}`} onClick={() => scrollToSection("summary")}>Patient Summary</button>
        <button className={`reports-nav-link ${activeSection === "diagnoses" ? "active" : ""}`} onClick={() => scrollToSection("diagnoses")}>Common Diagnoses</button>
        <button className={`reports-nav-link ${activeSection === "demographics" ? "active" : ""}`} onClick={() => scrollToSection("demographics")}>Patient Demographics</button>
        <button className={`reports-nav-link ${activeSection === "trends" ? "active" : ""}`} onClick={() => scrollToSection("trends")}>Disease Trends</button>
        <button className={`reports-nav-link ${activeSection === "prescriptions" ? "active" : ""}`} onClick={() => scrollToSection("prescriptions")}>Prescriptions</button>
      </div>

      <div className="reports-main">
        <div className="reports-header">
          <h1>Performance & Analytics</h1>
          <div className="reports-actions">
            <select className="reports-filter-select" value={range} onChange={(e) => setRange(e.target.value)}>
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

        <div className="reports-content">
          {loading ? <div>Loading reports...</div> : <ReportContent />}
        </div>
      </div>

      {showPrintModal && (
        <div className="print-modal-overlay">
          <div className="print-modal-content">
            <div className="print-modal-header">
              <h2>Print Preview</h2>
              <button className="reports-btn" onClick={() => setShowPrintModal(false)}>Close</button>
            </div>
            <div className="print-modal-body">
              <h1 style={{textAlign: "center", color: "#1a237e"}}>Doctor Performance Report ({range})</h1>
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
    </div>
  );
}
