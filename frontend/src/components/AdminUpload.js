// AdminUpload.js - 4 Upload Sections (2x2 Grid)
import React, { useState, useRef } from "react";
import API from "../services/api";
import "./AdminUpload.css";

function AdminUpload() {
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState("");
  const [message, setMessage] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [dragActive, setDragActive] = useState({});
  const [csvPreview, setCsvPreview] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const fileInputRefs = useRef({});

  // Upload sections - 4 sections in 2x2 grid
  const uploadSections = [
    {
      type: "employees",
      endpoint: "/admin/upload-employees",
      label: "Employees",
      icon: "👥",
      title: "Employee Data",
      description: "Upload employee information and profiles",
      template: "employee_code, name, email, department, manager_id",
      requiredFields: ["Employee Code", "name", "email"],
      expectedColumns: ["Employee Code", "name", "email", "department", "manager_id"],
      gradient: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)",
      lightGradient: "linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(15, 15, 26, 0.6) 100%)",
      accent: "#6d28d9"
    },
    {
      type: "managers",
      endpoint: "/admin/upload-managers",
      label: "Managers",
      icon: "👔",
      title: "Manager Data",
      description: "Upload manager profiles and hierarchy",
      template: "manager_id, name, email, department",
      requiredFields: ["manager_id", "email"],
      expectedColumns: ["manager_id", "name", "email", "department"],
      gradient: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)",
      lightGradient: "linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(15, 15, 26, 0.6) 100%)",
      accent: "#0f766e"
    },
    {
      type: "employeeFeedback",
      endpoint: "/admin/upload-employee-feedback",
      label: "Employee Feedback",
      icon: "💬",
      title: "Employee Feedback",
      description: "Upload feedback from employees",
      template: "Employee Code, Training Name, Rating, Comments",
      requiredFields: ["Employee code", "Training Name"],
      expectedColumns: ["Employee code", "Training Name", "Rating", "Comments"],
      gradient: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)",
      lightGradient: "linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(15, 15, 26, 0.6) 100%)",
      accent: "#9333ea"
    },
    {
      type: "managerFeedback",
      endpoint: "/admin/upload-manager-feedback",
      label: "Manager Feedback",
      icon: "📝",
      title: "Manager Feedback",
      description: "Upload feedback from managers",
      template: "Manager ID, Employee Name, Training Name, Rating, Comments",
      requiredFields: ["Manager ID", "Employee Name", "Training Name"],
      expectedColumns: ["Manager ID", "Employee Name", "Training Name", "Rating", "Comments"],
      gradient: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%)",
      lightGradient: "linear-gradient(135deg, rgba(26, 26, 46, 0.6) 0%, rgba(15, 15, 26, 0.6) 100%)",
      accent: "#db2777"
    }
  ];

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    
    return result.map(field => field.replace(/^["']|["']$/g, ''));
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files[0];
    console.log(`[Frontend] File selected for ${type}:`, file?.name);
    
    if (file) {
      await validateAndSetFile(file, type);
    } else {
      console.log("[Frontend] No file selected");
    }
  };

  const validateAndSetFile = async (file, type) => {
    console.log(`[Frontend] Validating file for ${type}:`, file.name);
    
    if (!file) {
      showMessage(`❌ No file selected`, 'error');
      return false;
    }

    const section = uploadSections.find(s => s.type === type);
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    // All sections now use CSV only (removed Excel support)
    const validExtensions = ['.csv', '.txt'];
    if (!validExtensions.includes(fileExt) && file.type !== "text/csv") {
      showMessage(`❌ Please upload a CSV file. File must end with .csv`, 'error');
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      showMessage(`❌ File size exceeds 10MB limit`, 'error');
      return false;
    }

    setValidationErrors(prev => ({ ...prev, [type]: null }));

    try {
      const preview = await previewCSV(file);
      
      console.log(`[Frontend] File preview for ${type}:`, preview);
      
      if (!section) {
        showMessage(`❌ Invalid section type: ${type}`, 'error');
        return false;
      }
      
      const headers = preview.headers.map(h => h.toLowerCase().trim());
      const missingRequired = section.requiredFields.filter(
        field => !headers.includes(field.toLowerCase().trim())
      );
      
      if (missingRequired.length > 0) {
        const errorMsg = `Missing required fields: ${missingRequired.join(', ')}. Found headers: ${preview.headers.join(', ')}`;
        console.error(`[Frontend] Validation error:`, errorMsg);
        setValidationErrors(prev => ({ ...prev, [type]: errorMsg }));
        showMessage(`❌ ${errorMsg}`, 'error');
        return false;
      }
      
      console.log(`[Frontend] File validation passed for ${type}`);
      
      setCsvPreview(prev => ({ ...prev, [type]: preview }));
      setFiles(prev => ({ ...prev, [type]: file }));
      showMessage(`✅ File "${file.name}" loaded successfully!`, 'success');
      
      return true;
      
    } catch (err) {
      console.error("[Frontend] Error reading file:", err);
      showMessage(`❌ Error reading file: ${err.message}`, 'error');
      return false;
    }
  };

  const previewCSV = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target.result;
          const lines = text.split(/\r?\n/).filter(line => line.trim());
          
          console.log(`[Frontend] Total lines in CSV: ${lines.length}`);
          
          if (lines.length === 0) {
            reject(new Error('File is empty'));
            return;
          }
          
          const headers = parseCSVLine(lines[0]);
          console.log(`[Frontend] CSV Headers:`, headers);
          
          const previewRows = lines.slice(1, 6).map(line => {
            const values = parseCSVLine(line);
            const row = {};
            headers.forEach((header, idx) => {
              row[header] = values[idx] || '';
            });
            return row;
          });
          
          resolve({
            headers,
            rowCount: lines.length - 1,
            previewRows,
            sampleData: previewRows.slice(0, 3)
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleDragOver = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: true }));
  };

  const handleDragLeave = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));
  };

  const handleDrop = async (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [type]: false }));
    
    const file = e.dataTransfer.files[0];
    console.log(`[Frontend] File dropped for ${type}:`, file?.name);
    
    if (file) {
      const section = uploadSections.find(s => s.type === type);
      const isValidExt = file.name.endsWith('.csv') || file.type === "text/csv";
      
      if (isValidExt) {
        await validateAndSetFile(file, type);
      } else {
        showMessage(`❌ Please upload a CSV file for ${section?.label}`, 'error');
      }
    }
  };

  const showMessage = (msg, type = 'success') => {
    console.log(`[Frontend] Message: [${type}] ${msg}`);
    setMessage({ text: msg, type });
    setTimeout(() => {
      setMessage(null);
    }, 5000);
  };

  const uploadFile = async (type, endpoint, label) => {
    console.log(`[Frontend] Attempting to upload ${label}, file exists:`, !!files[type]);
    
    if (!files[type]) {
      showMessage(`❌ Please select a file for ${label}`, 'error');
      return;
    }

    const file = files[type];
    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(type);
      console.log(`[Frontend] Uploading file to ${endpoint}:`, {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      const res = await API.post(endpoint, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000
      });

      console.log(`[Frontend] Upload successful:`, res.data);
      
      const successMsg = res.data.message || `✅ ${label} uploaded successfully!`;
      showMessage(successMsg, 'success');
      
      const historyItem = {
        id: Date.now(),
        type: label,
        fileName: file.name,
        timestamp: new Date().toLocaleString(),
        status: 'success',
        fileSize: (file.size / 1024).toFixed(2),
        rowCount: csvPreview[type]?.rowCount || 0
      };
      
      setUploadHistory(prev => [historyItem, ...prev].slice(0, 10));
      
      setFiles(prev => ({ ...prev, [type]: null }));
      setCsvPreview(prev => ({ ...prev, [type]: null }));
      setValidationErrors(prev => ({ ...prev, [type]: null }));
      
      if (fileInputRefs.current[type]) {
        fileInputRefs.current[type].value = '';
      }

    } catch (err) {
      console.error(`[Frontend] Upload error:`, {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || `❌ Failed to upload ${label}`;
      showMessage(errorMsg, 'error');
      
      setUploadHistory(prev => [{
        id: Date.now(),
        type: label,
        fileName: files[type]?.name,
        timestamp: new Date().toLocaleString(),
        status: 'error',
        error: errorMsg,
        fileSize: files[type] ? (files[type].size / 1024).toFixed(2) : 0,
        rowCount: csvPreview[type]?.rowCount || 0
      }, ...prev].slice(0, 10));
      
    } finally {
      setLoading("");
    }
  };

  const clearFile = (type) => {
    console.log(`[Frontend] Clearing file for ${type}`);
    setFiles(prev => ({ ...prev, [type]: null }));
    setCsvPreview(prev => ({ ...prev, [type]: null }));
    setValidationErrors(prev => ({ ...prev, [type]: null }));
    if (fileInputRefs.current[type]) {
      fileInputRefs.current[type].value = '';
    }
  };

  const clearAllHistory = () => {
    setUploadHistory([]);
  };

  const downloadTemplate = (section) => {
    const headers = section.template.split(', ');
    const csvContent = headers.join(',');
    
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${section.type}_template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage(`📥 Template "${section.type}_template.csv" downloaded`, 'success');
  };

  const getFileSizeDisplay = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="admin-upload-container">
      <div className="upload-dashboard">
        {/* Dark/Black Header */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-icon-wrapper">
              <div className="header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="header-text">
              <h1>Data Upload Center</h1>
              <p className="subtitle">Upload and manage your training data with ease</p>
            </div>
            
            {/* Stats Cards */}
            <div className="header-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-value">{uploadHistory.length}</span>
                  <span className="stat-label">Total Uploads</span>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-card">
                <div className="stat-icon success">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {uploadHistory.filter(h => h.status === 'success').length}
                  </span>
                  <span className="stat-label">Successful</span>
                </div>
              </div>
              <div className="stat-divider"></div>
              <div className="stat-card">
                <div className="stat-icon error">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="stat-info">
                  <span className="stat-value">
                    {uploadHistory.filter(h => h.status === 'error').length}
                  </span>
                  <span className="stat-label">Failed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Message */}
        {message && (
          <div className={`toast-message ${message.type}`}>
            <div className="toast-content">
              <span className="toast-icon">
                {message.type === 'success' ? '✓' : '⚠'}
              </span>
              <span className="toast-text">{message.text}</span>
              <button className="toast-close" onClick={() => setMessage(null)}>×</button>
            </div>
          </div>
        )}

        {/* Upload Grid - 4 Cards in 2x2 Grid */}
        <div className="upload-grid upload-grid-2x2">
          {uploadSections.map((section, index) => (
            <div 
              key={section.type} 
              className="upload-card"
              style={{ 
                animationDelay: `${index * 0.1}s`,
                borderTop: `4px solid ${section.accent}`
              }}
            >
              <div className="card-header" style={{ background: section.lightGradient }}>
                <div className="card-icon" style={{ background: section.gradient }}>
                  <span>{section.icon}</span>
                </div>
                <div className="card-title-section">
                  <h3>{section.title}</h3>
                  <p className="card-description">{section.description}</p>
                </div>
              </div>
              
              <div className="card-content">
                {/* Required Fields */}
                <div className="info-section">
                  <div className="info-header">
                    <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span className="info-label">Required Fields</span>
                  </div>
                  <div className="required-fields">
                    {section.requiredFields.map((field, idx) => (
                      <span key={idx} className="field-tag" style={{ background: `${section.accent}15`, color: section.accent }}>
                        {field}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Template */}
                <div className="info-section">
                  <div className="info-header">
                    <svg className="info-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="info-label">Template Format</span>
                  </div>
                  <code className="template-code">{section.template}</code>
                </div>

                <button 
                  className="download-btn"
                  onClick={() => downloadTemplate(section)}
                  style={{ borderColor: section.accent, color: section.accent }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Download Template
                </button>

                {/* Drop Zone */}
                <div 
                  className={`drop-zone ${dragActive[section.type] ? 'drag-active' : ''} ${files[section.type] ? 'has-file' : ''}`}
                  onDragOver={(e) => handleDragOver(e, section.type)}
                  onDragLeave={(e) => handleDragLeave(e, section.type)}
                  onDrop={(e) => handleDrop(e, section.type)}
                  onClick={() => fileInputRefs.current[section.type]?.click()}
                >
                  <input
                    ref={el => fileInputRefs.current[section.type] = el}
                    type="file"
                    id={`file-${section.type}`}
                    accept=".csv"
                    onChange={(e) => handleFileChange(e, section.type)}
                    style={{ display: 'none' }}
                  />
                  
                  {!files[section.type] ? (
                    <>
                      <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="drop-zone-text">Drag & drop CSV file here</p>
                      <p className="drop-zone-subtext">or</p>
                      <label htmlFor={`file-${section.type}`} className="browse-btn" style={{ background: section.gradient }} onClick={(e) => e.stopPropagation()}>
                        Browse Files
                      </label>
                      <p className="file-hint">Max 10MB</p>
                    </>
                  ) : (
                    <div className="selected-file">
                      <div className="file-icon-wrapper">
                        <svg className="file-icon" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="file-details">
                        <span className="file-name">{files[section.type].name}</span>
                        <div className="file-meta">
                          <span className="file-size">{getFileSizeDisplay(files[section.type].size)}</span>
                          {csvPreview[section.type]?.rowCount > 0 && (
                            <span className="file-rows">📊 {csvPreview[section.type].rowCount} rows</span>
                          )}
                        </div>
                      </div>
                      <button 
                        className="clear-file-btn" 
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFile(section.type);
                        }}
                        title="Remove file"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {/* Validation Warning */}
                {validationErrors[section.type] && files[section.type] && (
                  <div className="validation-warning">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{validationErrors[section.type]}</span>
                  </div>
                )}

                {/* CSV Preview */}
                {csvPreview[section.type] && csvPreview[section.type].sampleData && csvPreview[section.type].sampleData.length > 0 && (
                  <div className="csv-preview">
                    <div className="preview-header">
                      <span className="preview-title">Data Preview</span>
                      <span className="preview-badge">{csvPreview[section.type].rowCount} rows</span>
                    </div>
                    <div className="preview-table-wrapper">
                      <table className="preview-table">
                        <thead>
                          <tr>
                            {csvPreview[section.type].headers.slice(0, 4).map((header, idx) => (
                              <th key={idx}>{header}</th>
                            ))}
                            {csvPreview[section.type].headers.length > 4 && <th>...</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview[section.type].sampleData.slice(0, 2).map((row, idx) => (
                            <tr key={idx}>
                              {csvPreview[section.type].headers.slice(0, 4).map((header, colIdx) => (
                                <td key={colIdx} title={row[header] || '-'}>
                                  {row[header] ? (row[header].length > 30 ? row[header].substring(0, 30) + '...' : row[header]) : '-'}
                                 </td>
                              ))}
                              {csvPreview[section.type].headers.length > 4 && <td>...</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <button
                  className={`upload-btn ${loading === section.type ? 'loading' : ''}`}
                  onClick={() => uploadFile(section.type, section.endpoint, section.label)}
                  disabled={loading === section.type || !files[section.type]}
                  style={{ background: section.gradient }}
                >
                  {loading === section.type ? (
                    <>
                      <span className="spinner"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <svg className="upload-btn-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Upload Now
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Upload History */}
        {uploadHistory.length > 0 && (
          <div className="history-section">
            <div className="history-header">
              <div className="history-title">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <h3>Recent Uploads</h3>
                <span className="history-count">{uploadHistory.length} items</span>
              </div>
              <button className="clear-history-btn" onClick={clearAllHistory}>
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Clear All
              </button>
            </div>
            <div className="history-list">
              {uploadHistory.map((item) => (
                <div key={item.id} className={`history-item ${item.status}`}>
                  <div className="history-item-icon">
                    {item.status === 'success' ? (
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="history-item-details">
                    <div className="history-item-title">
                      <span className="history-type">{item.type}</span>
                      <span className="history-filename">{item.fileName}</span>
                    </div>
                    <div className="history-item-meta">
                      <span className="history-time">{item.timestamp}</span>
                      {item.fileSize && <span className="history-size">{item.fileSize} KB</span>}
                      {item.rowCount > 0 && <span className="history-rows">{item.rowCount} rows</span>}
                      {item.status === 'error' && <span className="history-error">{item.error}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="instructions-section">
          <div className="instructions-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h4>CSV Format Guidelines</h4>
          </div>
          <div className="instructions-grid">
            <div className="instruction-item">
              <div className="instruction-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="instruction-text">
                <strong>CSV Format Required</strong>
                <p>UTF-8 encoded .csv files only</p>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="instruction-text">
                <strong>Required Fields</strong>
                <p>All required fields must contain valid data</p>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-1 1v1H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2h-2V3a1 1 0 10-2 0v1H9V3a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="instruction-text">
                <strong>File Size Limit</strong>
                <p>Maximum file size is 10MB per upload</p>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                </svg>
              </div>
              <div className="instruction-text">
                <strong>Use Templates</strong>
                <p>Download templates for the correct format</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminUpload;