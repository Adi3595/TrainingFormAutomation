// TrainingReport.js - Futuristic Dark Theme (No Colors)
import React, { useState, useEffect } from "react";
import API from "../services/api";
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
  Filler
} from "chart.js";
import { Bar, Pie, Line, Doughnut } from "react-chartjs-2";
import "./TrainingReport.css";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

function TrainingReport() {
  const [trainingId, setTrainingId] = useState("");
  const [trainings, setTrainings] = useState([]);
  const [filteredTrainings, setFilteredTrainings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trainingsLoading, setTrainingsLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("bar");
  const [recentSearches, setRecentSearches] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [tableExportLoading, setTableExportLoading] = useState("");

  // Database table reports state
  const [tableReports, setTableReports] = useState({
    employees: [],
    managers: [],
    trainingPrograms: [],
    trainingEmployees: [],
    employeeFeedback: [],
    managerFeedback: [],
    scheduledEmails: [],
    scheduledEmployeeEmails: []
  });

  const [tableReportsLoading, setTableReportsLoading] = useState(false);

  // Fetch all trainings on component mount
  useEffect(() => {
    fetchTrainings();
    fetchAllTableReports();
  }, []);

  // Filter trainings based on search term
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTrainings(trainings);
    } else {
      const filtered = trainings.filter(training => 
        training.training_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        training.training_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTrainings(filtered);
    }
  }, [searchTerm, trainings]);

  const fetchTrainings = async () => {
    setTrainingsLoading(true);
    try {
      const res = await API.get("/hr/trainings");
      setTrainings(res.data);
      setFilteredTrainings(res.data);
    } catch (err) {
      console.error("Failed to fetch trainings:", err);
      setError("Failed to load trainings");
    } finally {
      setTrainingsLoading(false);
    }
  };

  const fetchAllTableReports = async () => {
    setTableReportsLoading(true);
    try {
      const [
        employeesRes,
        managersRes,
        trainingProgramsRes,
        trainingEmployeesRes,
        employeeFeedbackRes,
        managerFeedbackRes,
        scheduledEmailsRes,
        scheduledEmployeeEmailsRes
      ] = await Promise.all([
        API.get("/hr/reports/table/employees"),
        API.get("/hr/reports/table/managers"),
        API.get("/hr/reports/table/training_programs"),
        API.get("/hr/reports/table/training_employees"),
        API.get("/hr/reports/table/employee_feedback"),
        API.get("/hr/reports/table/manager_feedback"),
        API.get("/hr/reports/table/scheduled_emails"),
        API.get("/hr/reports/table/scheduled_employee_emails")
      ]);

      setTableReports({
        employees: employeesRes.data || [],
        managers: managersRes.data || [],
        trainingPrograms: trainingProgramsRes.data || [],
        trainingEmployees: trainingEmployeesRes.data || [],
        employeeFeedback: employeeFeedbackRes.data || [],
        managerFeedback: managerFeedbackRes.data || [],
        scheduledEmails: scheduledEmailsRes.data || [],
        scheduledEmployeeEmails: scheduledEmployeeEmailsRes.data || []
      });
    } catch (err) {
      console.error("Failed to fetch table reports:", err);
      setError("Failed to load database reports");
    } finally {
      setTableReportsLoading(false);
    }
  };

  const downloadTableReport = async (tableKey, label) => {
    try {
      setTableExportLoading(tableKey);
      const response = await API.get(`/hr/reports/table/${tableKey}/export`, {
        responseType: "blob"
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tableKey}_report_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(`Failed to download ${label} report`);
    } finally {
      setTableExportLoading("");
    }
  };

  const fetchReport = async () => {
    if (!trainingId.trim()) {
      setError("Please select a Training");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const res = await API.get(`/hr/training-report/${trainingId}`);
      setReport(res.data);
      
      const training = trainings.find(t => t.training_id === trainingId);
      setSelectedTraining(training);
      
      setRecentSearches(prev => {
        const newSearches = [trainingId, ...prev.filter(id => id !== trainingId)].slice(0, 5);
        return newSearches;
      });
      
      setShowDropdown(false);
      setSearchTerm("");
      setActiveTab("overview");
      
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to fetch report");
      setReport(null);
      setSelectedTraining(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainingSelect = (training) => {
    setTrainingId(training.training_id);
    setSelectedTraining(training);
    setSearchTerm("");
    setShowDropdown(false);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
    if (e.target.value === "") {
      setTrainingId("");
      setSelectedTraining(null);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && trainingId) {
      fetchReport();
    }
  };

  const clearReport = () => {
    setReport(null);
    setTrainingId("");
    setSelectedTraining(null);
    setSearchTerm("");
    setError("");
    setActiveTab("overview");
  };

  const handleExport = async (format) => {
    if (!trainingId) {
      setError("Please select and generate a training report first");
      return;
    }

    setExportLoading(true);
    setError("");

    try {
      if (format === "excel") {
        const response = await API.get(`/hr/training-report/${trainingId}/export`, {
          responseType: "blob"
        });

        const blob = new Blob([response.data], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safeName = report?.training_name?.replace(/[^a-zA-Z0-9]/g, "_") || "Training";
        a.href = url;
        a.download = `Reports_ARAI_Training_${safeName}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Training Report - ${report.training_name}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; }
                h1 { color: #333; border-bottom: 3px solid #333; padding-bottom: 10px; }
                .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
                .kpi-card { padding: 20px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
                .kpi-value { font-size: 28px; font-weight: bold; color: #333; }
              </style>
            </head>
            <body>
              <h1>Training Performance Report</h1>
              <p>Generated: ${new Date().toLocaleString()}</p>
              <p><strong>Training:</strong> ${report.training_name}</p>
              <div class="kpi-grid">
                <div class="kpi-card"><div class="kpi-value">${report.summary?.total_employees || 0}</div><div>Total Employees</div></div>
                <div class="kpi-card"><div class="kpi-value">${report.summary?.completed_count || 0}</div><div>Completed</div></div>
                <div class="kpi-card"><div class="kpi-value">${report.summary?.completion_rate || 0}%</div><div>Completion Rate</div></div>
              </div>
              <button onclick="window.print()">Print</button>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (error) {
      console.error("Export failed:", error);
      setError("Failed to export report");
    } finally {
      setExportLoading(false);
    }
  };

  // Chart configurations - Grayscale for futuristic dark theme
  const barChartData = report && {
    labels: ["Total Employees", "Completed", "Completion %", "Employee Feedback", "Manager Feedback"],
    datasets: [{
      label: "Training Performance Metrics",
      data: [
        report.summary?.total_employees || 0,
        report.summary?.completed_count || 0,
        report.summary?.completion_rate || 0,
        report.summary?.employee_feedback_count || 0,
        report.summary?.manager_feedback_count || 0
      ],
      backgroundColor: [
        'rgba(180, 180, 200, 0.8)',
        'rgba(160, 160, 180, 0.8)',
        'rgba(140, 140, 160, 0.8)',
        'rgba(120, 120, 140, 0.8)',
        'rgba(100, 100, 120, 0.8)'
      ],
      borderRadius: 8,
    }]
  };

  const ratingDistributionData = report && {
    labels: ['1 Star', '2 Stars', '3 Stars', '4 Stars', '5 Stars'],
    datasets: [
      {
        label: 'Employee Ratings',
        data: [
          report.ratings?.employee_rating_distribution?.[1] || 0,
          report.ratings?.employee_rating_distribution?.[2] || 0,
          report.ratings?.employee_rating_distribution?.[3] || 0,
          report.ratings?.employee_rating_distribution?.[4] || 0,
          report.ratings?.employee_rating_distribution?.[5] || 0
        ],
        backgroundColor: 'rgba(150, 150, 170, 0.8)',
        borderRadius: 8,
      },
      {
        label: 'Manager Ratings',
        data: [
          report.ratings?.manager_rating_distribution?.[1] || 0,
          report.ratings?.manager_rating_distribution?.[2] || 0,
          report.ratings?.manager_rating_distribution?.[3] || 0,
          report.ratings?.manager_rating_distribution?.[4] || 0,
          report.ratings?.manager_rating_distribution?.[5] || 0
        ],
        backgroundColor: 'rgba(100, 100, 120, 0.8)',
        borderRadius: 8,
      }
    ]
  };

  const pieChartData = report && {
    labels: ['Completed', 'In Progress/Pending'],
    datasets: [{
      data: [
        report.summary?.completed_count || 0,
        (report.summary?.total_employees || 0) - (report.summary?.completed_count || 0)
      ],
      backgroundColor: ['rgba(160, 160, 180, 0.8)', 'rgba(80, 80, 100, 0.8)'],
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    }]
  };

  const doughnutChartData = report && {
    labels: ['Completed', 'In Progress/Pending'],
    datasets: [{
      data: [
        report.summary?.completed_count || 0,
        (report.summary?.total_employees || 0) - (report.summary?.completed_count || 0)
      ],
      backgroundColor: ['rgba(160, 160, 180, 0.8)', 'rgba(80, 80, 100, 0.8)'],
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      cutout: '60%',
    }]
  };

  const lineChartData = report && {
    labels: ['Completion Rate', 'Employee Rating', 'Manager Rating', 'Feedback Rate'],
    datasets: [{
      label: 'Performance Metrics',
      data: [
        report.summary?.completion_rate || 0,
        (report.ratings?.avg_employee_rating || 0) * 20,
        (report.ratings?.avg_manager_rating || 0) * 20,
        report.summary?.employee_feedback_rate || 0
      ],
      backgroundColor: 'rgba(100, 100, 120, 0.2)',
      borderColor: 'rgba(200, 200, 220, 1)',
      borderWidth: 2,
      tension: 0.4,
      fill: true,
      pointBackgroundColor: 'rgba(200, 200, 220, 1)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 6,
      pointHoverRadius: 8,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top', 
        labels: { 
          font: { size: 12, weight: '500' }, 
          usePointStyle: true,
          color: '#a0a0b0'
        } 
      },
      title: { 
        display: true, 
        text: 'Training Performance Metrics', 
        font: { size: 16, weight: '600' }, 
        padding: 20,
        color: '#e0e0e8'
      },
      tooltip: { 
        backgroundColor: 'rgba(0, 0, 0, 0.9)', 
        titleFont: { size: 14, weight: 'bold' }, 
        bodyFont: { size: 13 }, 
        padding: 12, 
        cornerRadius: 8,
        titleColor: '#fff',
        bodyColor: '#ccc'
      }
    },
    scales: { 
      y: { 
        beginAtZero: true, 
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#a0a0b0' }
      }, 
      x: { 
        grid: { display: false },
        ticks: { color: '#a0a0b0' }
      } 
    }
  };

  const pieOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  const getRatingIcon = (rating) => {
    if (!rating) return '★';
    const avg = parseFloat(rating);
    if (avg >= 4.5) return '★★★★★';
    if (avg >= 3.5) return '★★★★';
    if (avg >= 2.5) return '★★★';
    if (avg >= 1.5) return '★★';
    return '★';
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'in_progress': return 'status-progress';
      case 'pending': return 'status-pending';
      default: return 'status-default';
    }
  };

  // Table report buttons - Grayscale theme
  const tableReportButtons = [
    { key: "employees", label: "Employees Report", icon: "👥" },
    { key: "managers", label: "Managers Report", icon: "👔" },
    { key: "training_programs", label: "Training Programs Report", icon: "📚" },
    { key: "training_employees", label: "Training Employees Report", icon: "👨‍🏫" },
    { key: "employee_feedback", label: "Employee Feedback Report", icon: "💬" },
    { key: "manager_feedback", label: "Manager Feedback Report", icon: "📝" },
    { key: "scheduled_emails", label: "Manager Scheduled Emails Report", icon: "📧" },
    { key: "scheduled_employee_emails", label: "Employee Scheduled Emails Report", icon: "📨" }
  ];

  return (
    <div className="training-report-container">
      <div className="report-card">
        <div className="card-header">
          <div className="header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2>Training Performance Report</h2>
          <p className="subtitle">Analyze training completion and feedback metrics</p>
        </div>

        {/* Training Selection Section */}
        <div className="search-section">
          <div className="search-wrapper">
            <div className="training-search-container">
              <div className="input-group">
                <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by Training Name or ID..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => setShowDropdown(true)}
                  onKeyPress={handleKeyPress}
                  className={error ? 'error' : ''}
                />
                {searchTerm && (
                  <button type="button" className="clear-input" onClick={() => {
                    setSearchTerm("");
                    setTrainingId("");
                    setSelectedTraining(null);
                    setShowDropdown(false);
                  }}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>

              {showDropdown && (
                <div className="training-dropdown">
                  {trainingsLoading ? (
                    <div className="dropdown-loading"><span className="spinner"></span>Loading trainings...</div>
                  ) : filteredTrainings.length > 0 ? (
                    filteredTrainings.map((training) => (
                      <div key={training.training_id} className={`dropdown-item ${trainingId === training.training_id ? 'selected' : ''}`} onClick={() => handleTrainingSelect(training)}>
                        <div className="training-preview">
                          <div className="training-header">
                            <span className="training-name">{training.training_name}</span>
                            <span className={`training-status ${training.total_enrolled > 0 ? 'active' : 'inactive'}`}>
                              {training.total_enrolled > 0 ? `${training.total_enrolled} enrolled` : 'No enrollments'}
                            </span>
                          </div>
                          <div className="training-meta">
                            <span>Created: {new Date(training.created_at).toLocaleDateString()}</span>
                            {training.completed_count !== undefined && <span>Completed: {training.completed_count}</span>}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="dropdown-empty">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                      <p>No trainings found matching "{searchTerm}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={fetchReport} disabled={loading || !trainingId} className={`fetch-button ${loading ? 'loading' : ''}`}>
              {loading ? (<><span className="spinner"></span>Generating...</>) : (<><svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>Generate Report</>)}
            </button>
          </div>

          {selectedTraining && !report && (
            <div className="selected-training-preview">
              <div className="preview-header"><svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg><span>Selected Training</span></div>
              <div className="preview-content">
                <div className="preview-row"><strong>Training ID:</strong><code>{selectedTraining.training_id}</code></div>
                <div className="preview-row"><strong>Training Name:</strong><span>{selectedTraining.training_name}</span></div>
                <div className="preview-row"><strong>Enrolled:</strong><span>{selectedTraining.total_enrolled || 0} employees</span></div>
              </div>
            </div>
          )}

          {recentSearches.length > 0 && (
            <div className="recent-searches">
              <span className="recent-label">Recent:</span>
              {recentSearches.map((id, index) => {
                const training = trainings.find(t => t.training_id === id);
                return (
                  <button key={index} className="recent-badge" onClick={() => {
                    if (training) { setTrainingId(id); setSelectedTraining(training); }
                  }}>
                    {training?.training_name?.substring(0, 20) || id.substring(0, 8)}...
                  </button>
                );
              })}
            </div>
          )}

          {error && <div className="error-message"><svg className="icon" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</div>}
        </div>

        {/* Training Report Content */}
        {report && (
          <div className="report-content">
            <div className="training-info-header">
              <div className="training-title">
                <h3>Training Report: <span className="training-id">{report.training_name}</span></h3>
                <div className="training-meta">
                  <span className="meta-item"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356.257l-1.68 5.359A.993.993 0 014 14c.357 0 .692.12.957.32l3.013-3.013 2.03 2.03-3.013 3.013c.2.265.32.6.32.957a.993.993 0 01-.332.744l5.359-1.68a.999.999 0 01.257-.356L16.08 13.45l1.84 3.03a1 1 0 001.84-.788l-3-7z" /></svg>{report.training_name}</span>
                  <span className="meta-item"><svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>Created: {new Date(report.created_at).toLocaleDateString()}</span>
                </div>
                <span className="generated-date">Generated: {new Date().toLocaleString()}</span>
              </div>
              <button className="new-report-button" onClick={clearReport}><svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>New Report</button>
            </div>

            {/* Tab Navigation */}
            <div className="report-tabs">
              <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Overview</button>
              <button className={`tab-btn ${activeTab === 'ratings' ? 'active' : ''}`} onClick={() => setActiveTab('ratings')}>⭐ Ratings</button>
              <button className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>👥 Employees</button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <>
                <div className="kpi-grid">
                  <div className="kpi-card total"><div className="kpi-icon"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg></div><div className="kpi-content"><span className="kpi-label">Total Employees</span><span className="kpi-value">{report.summary?.total_employees || 0}</span></div></div>
                  <div className="kpi-card completed"><div className="kpi-icon"><svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg></div><div className="kpi-content"><span className="kpi-label">Completed</span><span className="kpi-value">{report.summary?.completed_count || 0}</span></div></div>
                  <div className="kpi-card rate"><div className="kpi-icon"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg></div><div className="kpi-content"><span className="kpi-label">Completion Rate</span><span className="kpi-value">{report.summary?.completion_rate || 0}%</span><div className="progress-bar"><div className="progress-fill" style={{ width: `${report.summary?.completion_rate || 0}%` }}></div></div></div></div>
                  <div className="kpi-card feedback"><div className="kpi-icon"><svg viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 13v-3a2 2 0 00-2-2H4a2 2 0 00-2 2v3a2 2 0 002 2h12a2 2 0 002-2zM2 5v2a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4a2 2 0 00-2 2z" clipRule="evenodd" /></svg></div><div className="kpi-content"><span className="kpi-label">Feedback Rate</span><span className="kpi-value">{report.summary?.employee_feedback_rate || 0}%</span><div className="progress-bar"><div className="progress-fill" style={{ width: `${report.summary?.employee_feedback_rate || 0}%` }}></div></div></div></div>
                </div>

                <div className="chart-controls">
                  <span className="chart-label">Visualization:</span>
                  <div className="chart-type-buttons">
                    <button className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`} onClick={() => setChartType('bar')}>📊 Bar</button>
                    <button className={`chart-type-btn ${chartType === 'pie' ? 'active' : ''}`} onClick={() => setChartType('pie')}>🥧 Pie</button>
                    <button className={`chart-type-btn ${chartType === 'doughnut' ? 'active' : ''}`} onClick={() => setChartType('doughnut')}>🍩 Doughnut</button>
                    <button className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`} onClick={() => setChartType('line')}>📈 Line</button>
                  </div>
                </div>

                <div className="chart-container">
                  {chartType === 'bar' && <Bar data={barChartData} options={chartOptions} />}
                  {chartType === 'pie' && <Pie data={pieChartData} options={pieOptions} />}
                  {chartType === 'doughnut' && <Doughnut data={doughnutChartData} options={pieOptions} />}
                  {chartType === 'line' && <Line data={lineChartData} options={chartOptions} />}
                </div>
              </>
            )}

            {/* Ratings Tab */}
            {activeTab === 'ratings' && (
              <>
                <div className="kpi-grid">
                  <div className="kpi-card rating"><div className="kpi-icon"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg></div><div className="kpi-content"><span className="kpi-label">Employee Rating</span><span className="kpi-value">{report.ratings?.avg_employee_rating?.toFixed(1) || 'N/A'}</span><span className="kpi-stars">{getRatingIcon(report.ratings?.avg_employee_rating)}</span></div></div>
                  <div className="kpi-card rating manager"><div className="kpi-icon"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg></div><div className="kpi-content"><span className="kpi-label">Manager Rating</span><span className="kpi-value">{report.ratings?.avg_manager_rating?.toFixed(1) || 'N/A'}</span><span className="kpi-stars">{getRatingIcon(report.ratings?.avg_manager_rating)}</span></div></div>
                </div>

                <div className="chart-container" style={{ height: '400px' }}>
                  <Bar data={ratingDistributionData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Rating Distribution Comparison' } } }} />
                </div>

                <div className="rating-distribution-grid">
                  <div className="rating-distribution-card">
                    <h4>Employee Ratings Distribution</h4>
                    {[5, 4, 3, 2, 1].map(star => (
                      <div key={star} className="rating-bar-item">
                        <span className="rating-star">{star} {star === 1 ? 'Star' : 'Stars'}</span>
                        <div className="rating-bar-container">
                          <div className="rating-bar-fill" style={{ width: `${((report.ratings?.employee_rating_distribution?.[star] || 0) / (report.summary?.employee_feedback_count || 1)) * 100}%` }}></div>
                        </div>
                        <span className="rating-count">{report.ratings?.employee_rating_distribution?.[star] || 0}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rating-distribution-card">
                    <h4>Manager Ratings Distribution</h4>
                    {[5, 4, 3, 2, 1].map(star => (
                      <div key={star} className="rating-bar-item">
                        <span className="rating-star">{star} {star === 1 ? 'Star' : 'Stars'}</span>
                        <div className="rating-bar-container">
                          <div className="rating-bar-fill" style={{ width: `${((report.ratings?.manager_rating_distribution?.[star] || 0) / (report.summary?.manager_feedback_count || 1)) * 100}%` }}></div>
                        </div>
                        <span className="rating-count">{report.ratings?.manager_rating_distribution?.[star] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Employees Tab */}
            {activeTab === 'employees' && (
              <div className="employees-table-wrapper">
                <table className="employees-table">
                  <thead>
                    <tr>
                      <th>Employee Code</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Employee Rating</th>
                      <th>Employee Comments</th>
                      <th>Manager Rating</th>
                      <th>Manager Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.employees?.map((emp, idx) => (
                      <tr key={idx}>
                        <td><code>{emp.employee_code || '-'}</code></td>
                        <td><strong>{emp.name}</strong></td>
                        <td>{emp.department || '-'}</td>
                        <td><span className={`status-badge ${getStatusBadgeClass(emp.training_status)}`}>{emp.training_status}</span></td>
                        <td className="rating-cell">{emp.employee_feedback?.rating ? <><span className="rating-stars">{getRatingIcon(emp.employee_feedback.rating)}</span><span className="rating-value">{emp.employee_feedback.rating}</span></> : '-'}</td>
                        <td className="comments-cell">{emp.employee_feedback?.comments || '-'}</td>
                        <td className="rating-cell">{emp.manager_feedback?.rating ? <><span className="rating-stars">{getRatingIcon(emp.manager_feedback.rating)}</span><span className="rating-value">{emp.manager_feedback.rating}</span></> : '-'}</td>
                        <td className="comments-cell">{emp.manager_feedback?.comments || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Export Options */}
            <div className="export-options">
              <button className="export-btn" onClick={() => handleExport('pdf')} disabled={exportLoading}>📄 {exportLoading ? 'Exporting...' : 'Export as PDF'}</button>
              <button className="export-btn" onClick={() => handleExport('csv')} disabled={exportLoading}>📊 Export as CSV</button>
              <button className="export-btn" onClick={() => handleExport("excel")} disabled={exportLoading}>📑 Export as Excel</button>
            </div>
          </div>
        )}

        {/* Database Reports Section - Futuristic Dark Theme */}
        <div className="all-table-reports-section">
          <div className="database-reports-header">
            <h3>⚡ Database Reports</h3>
            <p className="subtitle">Download complete reports in Excel format</p>
          </div>

          {tableReportsLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading reports...</p>
            </div>
          ) : (
            <div className="table-report-grid">
              {tableReportButtons.map((item) => {
                const dataCount = tableReports[item.key]?.length || 0;
                return (
                  <button
                    key={item.key}
                    className="table-report-btn"
                    onClick={() => downloadTableReport(item.key, item.label)}
                    disabled={tableExportLoading === item.key}
                  >
                    <span className="btn-icon">{item.icon}</span>
                    <span className="btn-label">{item.label}</span>
                    {dataCount > 0 && <span className="btn-count">{dataCount.toLocaleString()}</span>}
                    {tableExportLoading === item.key && <span className="btn-spinner"></span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!report && !loading && !error && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3>No Report Generated</h3>
            <p>Search and select a training above to generate a performance report</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainingReport;