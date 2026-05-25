// CreateTrainingWithAssignment.js - Updated with Calendar/Date Picker for Delays
// Flow: Upload Excel → Fill Forms & Feedback → Create Training → Auto-assign Employees

import React, { useState, useEffect, useRef } from "react";
import API from "../services/api";
import * as XLSX from "xlsx";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./CreateTrainingWithAssignment.css";

function CreateTrainingWithAssignment() {
  // ==================== CREATION MODE ====================
  const [creationMode, setCreationMode] = useState("manual"); // manual | upload

  // ==================== TRAINING FORM STATE ====================
  const [formData, setFormData] = useState({
    trainingName: "",
    description: "",
    requiresEmployeeForm: false,
    requiresManagerFeedback: false,
    formLink: "",
    managerFormLink: "",
    initialDelayValue: "",
    initialDelayUnit: "minutes",
    reminderDelayValue: "",
    reminderDelayUnit: "days"
  });

  // Delay Type States
  const [initialDelayType, setInitialDelayType] = useState("duration"); // "duration" or "specificDate"
  const [reminderDelayType, setReminderDelayType] = useState("duration");
  const [selectedInitialDate, setSelectedInitialDate] = useState(null);
  const [selectedReminderDate, setSelectedReminderDate] = useState(null);
  const [initialDateError, setInitialDateError] = useState("");
  const [reminderDateError, setReminderDateError] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [touched, setTouched] = useState({});
  const [formStep, setFormStep] = useState(1);
  const [previewMode, setPreviewMode] = useState(false);

  // ==================== TRAINING CREATION RESULT ====================
  const [createdTraining, setCreatedTraining] = useState(null);
  const [showAssignment, setShowAssignment] = useState(false);

  // ==================== EXCEL UPLOAD STATE ====================
  const [trainingExcelFile, setTrainingExcelFile] = useState(null);
  const [trainingExcelError, setTrainingExcelError] = useState("");
  const [trainingExcelSuccess, setTrainingExcelSuccess] = useState("");
  const [isDragActive, setIsDragActive] = useState(false);
  const [parsedEmployeesFromExcel, setParsedEmployeesFromExcel] = useState([]);
  const trainingExcelInputRef = useRef(null);

  // ==================== EMPLOYEE ASSIGNMENT STATE ====================
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [managerSearchTerm, setManagerSearchTerm] = useState("");
  const [showManagerDropdown, setShowManagerDropdown] = useState(false);

  const [loadingData, setLoadingData] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectAll, setSelectAll] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [assignLoading, setAssignLoading] = useState(false);

  // ==================== BULK EMPLOYEE UPLOAD FOR ASSIGNMENT ====================
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPreview, setUploadPreview] = useState([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [uploadStats, setUploadStats] = useState(null);
  const [isUploadDragActive, setIsUploadDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const managerRef = useRef(null);

  const MAX_CHARS = 500;

  const initialDelayUnits = [
    { value: "minutes", label: "Minutes", max: 1440, min: 0, description: "0-1440 minutes (0-24 hours)" },
    { value: "hours", label: "Hours", max: 24, min: 0, description: "0-24 hours" },
    { value: "days", label: "Days", max: 1, min: 0, description: "0-1 day" },
    { value: "months", label: "Months", max: 12, min: 0, description: "0-12 months" }
  ];

  const reminderDelayUnits = [
    { value: "minutes", label: "Minutes", max: 10080, min: 1, description: "1-10080 minutes (1 min to 7 days)" },
    { value: "hours", label: "Hours", max: 168, min: 1, description: "1-168 hours (1 hour to 7 days)" },
    { value: "days", label: "Days", max: 30, min: 1, description: "1-30 days" },
    { value: "months", label: "Months", max: 12, min: 1, description: "1-12 months" }
  ];

  // ==================== EFFECTS ====================
  useEffect(() => {
    if (showAssignment) {
      fetchEmployeesAndManagers();
    }
  }, [showAssignment]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (managerRef.current && !managerRef.current.contains(event.target)) {
        setShowManagerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ==================== DATA LOADING ====================
  const fetchEmployeesAndManagers = async () => {
    try {
      setLoadingData(true);
      const [empRes, managerRes] = await Promise.all([
        API.get("/hr/employees"),
        API.get("/hr/managers")
      ]);
      setEmployees(empRes.data || []);
      setManagers(managerRes.data || []);
    } catch (err) {
      console.error("Error loading data", err);
      setAssignError("Failed to load employees and managers");
    } finally {
      setLoadingData(false);
    }
  };

  // ==================== MANAGER SEARCH ====================
  const filteredManagers = managers.filter((manager) =>
    manager.name?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
    manager.email?.toLowerCase().includes(managerSearchTerm.toLowerCase()) ||
    manager.manager_id?.toLowerCase().includes(managerSearchTerm.toLowerCase())
  );

  const handleManagerSelect = (manager) => {
    setSelectedManagerId(manager.manager_id);
    setManagerSearchTerm(manager.name);
    setShowManagerDropdown(false);
  };

  // ==================== MANUAL FORM HANDLERS ====================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue
    }));

    if (name === "description") {
      setCharCount(value.length);
    }
  };

  const handleInitialDateChange = (date) => {
    setSelectedInitialDate(date);
    if (date) {
      setFormData(prev => ({ ...prev, initialDelayValue: "" }));
      setInitialDateError("");
    }
  };

  const handleReminderDateChange = (date) => {
    setSelectedReminderDate(date);
    if (date) {
      setFormData(prev => ({ ...prev, reminderDelayValue: "" }));
      setReminderDateError("");
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({
      ...prev,
      [field]: true
    }));
  };

  const validateField = (field) => {
    if (!touched[field]) return true;

    switch (field) {
      case "trainingName":
        return formData.trainingName.trim().length >= 3;

      case "formLink":
      case "managerFormLink":
        if (!formData[field]) return true;
        try {
          new URL(formData[field]);
          return true;
        } catch {
          return false;
        }

      case "initialDelayValue":
        if (!formData.requiresManagerFeedback || initialDelayType !== "duration") return true;
        if (!formData.initialDelayValue) return false;
        {
          const initialValue = parseInt(formData.initialDelayValue, 10);
          if (isNaN(initialValue)) return false;
          const initialUnit = formData.initialDelayUnit;
          const initialMax = initialDelayUnits.find((u) => u.value === initialUnit)?.max || 1440;
          const initialMin = initialDelayUnits.find((u) => u.value === initialUnit)?.min || 0;
          return initialValue >= initialMin && initialValue <= initialMax;
        }

      case "reminderDelayValue":
        if (!formData.requiresManagerFeedback || reminderDelayType !== "duration") return true;
        if (!formData.reminderDelayValue) return false;
        {
          const reminderValue = parseInt(formData.reminderDelayValue, 10);
          if (isNaN(reminderValue)) return false;
          const reminderUnit = formData.reminderDelayUnit;
          const reminderMax = reminderDelayUnits.find((u) => u.value === reminderUnit)?.max || 30;
          const reminderMin = reminderDelayUnits.find((u) => u.value === reminderUnit)?.min || 1;
          return reminderValue >= reminderMin && reminderValue <= reminderMax;
        }

      default:
        return true;
    }
  };

  const nextStep = () => {
    if (formData.trainingName.trim().length >= 3) {
      setFormStep(2);
    }
  };

  const prevStep = () => {
    setFormStep(1);
  };

  const clearForm = () => {
    setFormData({
      trainingName: "",
      description: "",
      requiresEmployeeForm: false,
      requiresManagerFeedback: false,
      formLink: "",
      managerFormLink: "",
      initialDelayValue: "",
      initialDelayUnit: "minutes",
      reminderDelayValue: "",
      reminderDelayUnit: "days"
    });
    setInitialDelayType("duration");
    setReminderDelayType("duration");
    setSelectedInitialDate(null);
    setSelectedReminderDate(null);
    setCharCount(0);
    setTouched({});
    setFormStep(1);
    setPreviewMode(false);
    setError("");
    setSuccess(false);
    setParsedEmployeesFromExcel([]);
    setTrainingExcelFile(null);
    setTrainingExcelSuccess("");
    setTrainingExcelError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.trainingName.trim()) {
      setError("Training name is required");
      return;
    }

    if (formData.requiresEmployeeForm && !formData.formLink) {
      setError("Employee form link is required when employee form is enabled");
      return;
    }

    if (formData.requiresManagerFeedback && !formData.managerFormLink) {
      setError("Manager feedback form link is required when manager feedback is enabled");
      return;
    }

    // Validate initial delay
    if (formData.requiresManagerFeedback) {
      if (initialDelayType === "duration") {
        if (!formData.initialDelayValue) {
          setError("Initial delay value is required when manager feedback is enabled");
          return;
        }
      } else {
        if (!selectedInitialDate) {
          setError("Please select a date for initial delay");
          return;
        }
      }

      // Validate reminder delay
      if (reminderDelayType === "duration") {
        if (!formData.reminderDelayValue) {
          setError("Reminder delay value is required when manager feedback is enabled");
          return;
        }
      } else {
        if (!selectedReminderDate) {
          setError("Please select a date for reminder delay");
          return;
        }
      }
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Calculate delay values based on type
      let initialDelayMinutes = 0;
      let reminderDelayMinutes = 0;

      if (formData.requiresManagerFeedback) {
        if (initialDelayType === "duration") {
          initialDelayMinutes = convertToMinutes(formData.initialDelayValue, formData.initialDelayUnit);
        } else if (selectedInitialDate) {
          const now = new Date();
          initialDelayMinutes = Math.max(0, Math.floor((selectedInitialDate - now) / (1000 * 60)));
        }

        if (reminderDelayType === "duration") {
          reminderDelayMinutes = convertToMinutes(formData.reminderDelayValue, formData.reminderDelayUnit);
        } else if (selectedReminderDate) {
          const now = new Date();
          reminderDelayMinutes = Math.max(0, Math.floor((selectedReminderDate - now) / (1000 * 60)));
        }
      }

      const payload = {
        training_name: formData.trainingName,
        description: formData.description || null,
        employee_form_link: formData.requiresEmployeeForm ? formData.formLink : null,
        manager_form_link: formData.requiresManagerFeedback ? formData.managerFormLink : null,
        initial_delay_value: formData.requiresManagerFeedback ? initialDelayMinutes : 0,
        initial_delay_unit: "minutes",
        reminder_delay_value: formData.requiresManagerFeedback ? reminderDelayMinutes : 0,
        reminder_delay_unit: "minutes",
        requires_manager_feedback: formData.requiresManagerFeedback,
        requires_employee_form: formData.requiresEmployeeForm
      };

      const response = await API.post("/hr/create-training", payload);

      setCreatedTraining({
        id: response.data.training_id,
        name: formData.trainingName,
        message: response.data.message || "Training created successfully!"
      });

      setSuccess(true);

      if (parsedEmployeesFromExcel.length > 0 && creationMode === "upload") {
        await autoAssignEmployeesFromExcel(response.data.training_id);
      }

      setTimeout(() => {
        setShowAssignment(true);
        setSuccess(false);
      }, 1200);
    } catch (err) {
      console.error("❌ Error creating training:", err);
      setError(err.response?.data?.message || err.response?.data?.error || "Error creating training");
    } finally {
      setLoading(false);
    }
  };

  const convertToMinutes = (value, unit) => {
    if (!value) return 0;
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return 0;
    
    switch (unit) {
      case 'minutes': return numValue;
      case 'hours': return numValue * 60;
      case 'days': return numValue * 24 * 60;
      case 'months': return numValue * 30 * 24 * 60;
      default: return numValue;
    }
  };

  const autoAssignEmployeesFromExcel = async (trainingId) => {
    try {
      const empRes = await API.get("/hr/employees");
      const existingEmployees = empRes.data || [];
      
      const employeeIdsToAssign = [];
      for (const excelEmp of parsedEmployeesFromExcel) {
        const foundEmp = existingEmployees.find(e => e.employee_code === excelEmp.employee_code);
        if (foundEmp) {
          employeeIdsToAssign.push(foundEmp.employee_id);
        }
      }
      
      if (employeeIdsToAssign.length === 0) {
        console.log("No matching employees found in system for Excel data");
        return;
      }
      
      const payload = {
        training_id: trainingId,
        employee_ids: employeeIdsToAssign
      };
      
      if (selectedManagerId) {
        payload.manager_id = selectedManagerId;
      }
      
      await API.post("/hr/assign-employees", payload);
      await scheduleEmployeeMails(trainingId);

      console.log(`✅ Auto-assigned ${employeeIdsToAssign.length} employees from Excel`);
    } catch (err) {
      console.error("Error auto-assigning employees:", err);
    }
  };

  const getValidationIcon = (field) => {
    if (!touched[field] || !formData[field]) return null;

    return validateField(field) ? (
      <svg className="validation-icon valid" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9
          10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <svg className="validation-icon invalid" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586
          10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414
          10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const isValid = () => {
    if (!formData.trainingName || formData.trainingName.trim().length < 3) return false;
    if (formData.requiresEmployeeForm && !formData.formLink) return false;

    if (formData.requiresManagerFeedback) {
      if (!formData.managerFormLink) return false;
      
      if (initialDelayType === "duration") {
        if (!formData.initialDelayValue) return false;
        if (touched.initialDelayValue && !validateField("initialDelayValue")) return false;
      } else {
        if (!selectedInitialDate) return false;
      }
      
      if (reminderDelayType === "duration") {
        if (!formData.reminderDelayValue) return false;
        if (touched.reminderDelayValue && !validateField("reminderDelayValue")) return false;
      } else {
        if (!selectedReminderDate) return false;
      }
    }

    return true;
  };

  const formatTimeReadable = (value, unit) => {
    if (!value) return "";
    const num = parseInt(value, 10);

    if (unit === "minutes") {
      if (num < 60) return `${num} minute${num !== 1 ? "s" : ""}`;
      if (num < 1440) return `${Math.floor(num / 60)} hour${Math.floor(num / 60) !== 1 ? "s" : ""}`;
      return `${Math.floor(num / 1440)} day${Math.floor(num / 1440) !== 1 ? "s" : ""}`;
    }

    if (unit === "hours") {
      if (num < 24) return `${num} hour${num !== 1 ? "s" : ""}`;
      return `${Math.floor(num / 24)} day${Math.floor(num / 24) !== 1 ? "s" : ""}`;
    }

    if (unit === "days") {
      return `${num} day${num !== 1 ? "s" : ""}`;
    }

    if (unit === "months") {
      return `${num} month${num !== 1 ? "s" : ""}`;
    }

    return `${num} ${unit}`;
  };

  const formatDateReadable = (date) => {
    if (!date) return "";
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ==================== EXCEL PARSING ====================
  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

          let trainingInfo = {};
          let employees = [];
          let headerRowIndex = -1;

          for (let i = 0; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const colA = (row[0] || "").toString().trim();
            const colD = (row[3] || row[2] || "").toString().trim();

            if (colA === "Training Name*" || colA === "Training Name") {
              trainingInfo.trainingName = colD;
            } else if (colA === "Duration*(hrs)" || colA === "Duration* (hrs)" || colA === "Duration") {
              trainingInfo.duration = colD;
            } else if (colA === "Trainer*" || colA === "Trainer") {
              trainingInfo.trainer = colD;
            } else if (colA === "Training Venue") {
              trainingInfo.venue = colD;
            } else if (colA === "Training Category*" || colA === "Training Category") {
              trainingInfo.category = colD;
            } else if (colA === "Sr.No") {
              headerRowIndex = i;
              break;
            }
          }

          if (headerRowIndex !== -1) {
            for (let j = headerRowIndex + 1; j < jsonData.length; j++) {
              const empRow = jsonData[j];
              if (!empRow) continue;

              const srNo = (empRow[0] || "").toString().trim();
              const perNo = (empRow[1] || "").toString().trim();
              const name = (empRow[2] || "").toString().trim();

              if (!perNo && !name) continue;

              if (perNo && name && !isNaN(parseInt(srNo))) {
                employees.push({
                  sr_no: srNo,
                  employee_code: perNo,
                  name: name
                });
              }
            }
          }

          const descParts = [
            trainingInfo.duration ? `Duration: ${trainingInfo.duration}` : null,
            trainingInfo.trainer  ? `Trainer: ${trainingInfo.trainer}`   : null,
            trainingInfo.venue    ? `Venue: ${trainingInfo.venue}`       : null,
            trainingInfo.category ? `Category: ${trainingInfo.category}` : null,
          ].filter(Boolean);

          resolve({
            trainingInfo: {
              trainingName: trainingInfo.trainingName || "",
              description: descParts.join('\n')
            },
            employees
          });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) setIsDragActive(true);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if ([".xlsx", ".xls"].includes(ext)) {
        setTrainingExcelFile(file);
        setTrainingExcelError("");
        setTrainingExcelSuccess("");
        
        try {
          const { trainingInfo, employees } = await parseExcelFile(file);
          setFormData(prev => ({
            ...prev,
            trainingName: trainingInfo.trainingName || prev.trainingName,
            description: trainingInfo.description || prev.description
          }));
          setParsedEmployeesFromExcel(employees);
          setTrainingExcelSuccess(`✅ File parsed successfully! Found ${employees.length} employees.`);
        } catch (err) {
          setTrainingExcelError("Error parsing file: " + err.message);
        }
      } else {
        setTrainingExcelError("Please upload an Excel file (.xlsx or .xls)");
      }
    }
  };

  const handleTrainingExcelSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![".xlsx", ".xls"].includes(ext)) {
      setTrainingExcelError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setTrainingExcelError("File size exceeds 10MB limit");
      return;
    }

    setTrainingExcelFile(file);
    setTrainingExcelError("");
    setTrainingExcelSuccess("");
    
    try {
      const { trainingInfo, employees } = await parseExcelFile(file);
      setFormData(prev => ({
        ...prev,
        trainingName: trainingInfo.trainingName || prev.trainingName,
        description: trainingInfo.description || prev.description
      }));
      setParsedEmployeesFromExcel(employees);
      setTrainingExcelSuccess(`✅ File parsed successfully! Found ${employees.length} employees.`);
    } catch (err) {
      setTrainingExcelError("Error parsing file: " + err.message);
    }
  };

  const clearTrainingExcel = () => {
    setTrainingExcelFile(null);
    setTrainingExcelError("");
    setTrainingExcelSuccess("");
    setParsedEmployeesFromExcel([]);
    if (trainingExcelInputRef.current) {
      trainingExcelInputRef.current.value = "";
    }
  };

  // ==================== EMPLOYEE ASSIGNMENT ====================
  const filteredEmployees = employees.filter((emp) =>
    emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (checked) => {
    setSelectAll(checked);

    if (checked) {
      const allEmployeeIds = filteredEmployees.map((emp) => emp.employee_id);
      setSelectedEmployees(allEmployeeIds);
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    setSelectedEmployees((prev) => {
      const isSelected = prev.includes(employeeId);
      const newSelection = isSelected
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId];

      const allFilteredIds = filteredEmployees.map((emp) => emp.employee_id);
      const allSelected =
        allFilteredIds.length > 0 &&
        allFilteredIds.every((id) => newSelection.includes(id));

      setSelectAll(allSelected);
      return newSelection;
    });
  };

  const scheduleEmployeeMails = async (trainingId) => {
    if (!formData.requiresEmployeeForm || !formData.formLink) {
      return;
    }

    try {
      const response = await API.post("/hr/schedule-employee-mails", {
        training_id: trainingId,
        delay_minutes: 0
      });

      console.log("✅ Employee mails scheduled:", response.data);
    } catch (err) {
      console.error("❌ Error scheduling employee mails:", err);
      setAssignError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Employees assigned, but mail scheduling failed"
      );
    }
  };

  const handleManualAssignSubmit = async (e) => {
    e.preventDefault();

    if (selectedEmployees.length === 0) {
      setAssignError("Please select at least one employee");
      return;
    }

    setAssignLoading(true);
    setAssignError("");
    setAssignSuccess(false);

    try {
      const payload = {
        training_id: createdTraining.id,
        employee_ids: selectedEmployees
      };

      if (selectedManagerId) {
        payload.manager_id = selectedManagerId;
      }

      const response = await API.post("/hr/assign-employees", payload);
      await scheduleEmployeeMails(createdTraining.id);

      if (response.data.assigned_count) {
        setAssignSuccess(
          `${response.data.message} (${response.data.assigned_count} assigned${
            response.data.skipped_count ? `, ${response.data.skipped_count} skipped` : ""
          })`
        );
      } else {
        setAssignSuccess(response.data.message || "Employees assigned successfully to the training!");
      }

      setSelectedEmployees([]);
      setSearchTerm("");
      setSelectAll(false);

      const empRes = await API.get("/hr/employees");
      setEmployees(empRes.data || []);

      setTimeout(() => setAssignSuccess(false), 4000);
    } catch (assignErr) {
      console.error(assignErr);
      setAssignError(
        assignErr.response?.data?.message ||
        assignErr.response?.data?.error ||
        "Error assigning employees"
      );
    } finally {
      setAssignLoading(false);
    }
  };

  // ==================== BULK EMPLOYEE UPLOAD ====================
  const handleUploadDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUploadDragActive(true);
  };

  const handleUploadDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUploadDragActive(false);
  };

  const handleUploadDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploadDragActive) setIsUploadDragActive(true);
  };

  const handleUploadDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsUploadDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      validateAndSetUploadFile(file);
    }
  };

  const validateAndSetUploadFile = (file) => {
    const validTypes = [".csv", ".xlsx", ".xls"];
    const fileExt = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!validTypes.includes(fileExt)) {
      setUploadError("Please upload a CSV or Excel file (.csv, .xlsx, .xls)");
      return false;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size exceeds 10MB limit");
      return false;
    }

    setUploadFile(file);
    setUploadError("");
    setUploadStats(null);
    previewFile(file);
    return true;
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetUploadFile(file);
    }
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ""));
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim().replace(/^["']|["']$/g, ""));
    return result;
  };

  const previewFile = async (file) => {
    try {
      const data = await readFile(file);
      setUploadPreview(data.slice(0, 10));

      const uniqueIds = new Set(data.map((emp) => emp.employee_id));
      setUploadStats({
        total: data.length,
        unique: uniqueIds.size,
        duplicates: data.length - uniqueIds.size
      });
    } catch (err) {
      setUploadError("Error reading file: " + err.message);
    }
  };

  const readFile = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const data = e.target.result;
        let parsedEmployees = [];

        try {
          if (file.name.endsWith(".csv")) {
            const text = data;
            const lines = text.split("\n").filter((line) => line.trim());

            if (lines.length === 0) {
              reject(new Error("File is empty"));
              return;
            }

            const headers = parseCSVLine(lines[0]);

            for (let i = 1; i < lines.length; i += 1) {
              if (!lines[i].trim()) continue;

              const values = parseCSVLine(lines[i]);
              const employee = {};

              headers.forEach((header, idx) => {
                employee[header] = values[idx] || "";
              });

              const employeeId =
                employee["Employee ID"] ||
                employee["employee_id"] ||
                employee["Employee Code"] ||
                employee["employee_code"] ||
                employee["Per No"] ||
                employee["ID"] ||
                employee["id"];

              const name = employee["Name"] || employee["name"];
              const email = employee["Email"] || employee["email"];

              if (employeeId) {
                parsedEmployees.push({
                  employee_id: String(employeeId).trim(),
                  name: name ? String(name).trim() : "",
                  email: email ? String(email).trim() : ""
                });
              }
            }
          } else {
            const workbook = XLSX.read(data, { type: "binary" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);

            parsedEmployees = jsonData
              .map((row) => {
                let employeeId = null;

                Object.keys(row).forEach((key) => {
                  const lower = key.toLowerCase();
                  if (!employeeId && (lower.includes("employee") || lower.includes("per") || lower === "id")) {
                    employeeId = row[key];
                  }
                });

                return {
                  employee_id: employeeId ? String(employeeId).trim() : "",
                  name: row["Name"] || row["name"] || "",
                  email: row["Email"] || row["email"] || ""
                };
              })
              .filter((emp) => emp.employee_id);
          }

          if (parsedEmployees.length === 0) {
            reject(new Error('No valid employee data found. Please ensure the file contains an "Employee ID" or "Employee Code" column.'));
            return;
          }

          resolve(parsedEmployees);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = () => reject(new Error("Failed to read file"));

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file, "UTF-8");
      } else {
        reader.readAsBinaryString(file);
      }
    });

  const handleUploadEmployees = async () => {
    if (!uploadFile) {
      setUploadError("Please select a file to upload");
      return;
    }

    setUploadLoading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const data = await readFile(uploadFile);

      if (data.length === 0) {
        throw new Error("No valid employee data found in file");
      }

      const employeeIds = [...new Set(data.map((emp) => emp.employee_id).filter(Boolean))];

      if (employeeIds.length === 0) {
        throw new Error("No valid employee IDs found in file");
      }

      const existingEmployeeIds = new Set(
        employees.map((emp) => String(emp.employee_id))
      );
      const validEmployeeIds = employeeIds.filter((id) => existingEmployeeIds.has(String(id)));
      const invalidEmployeeIds = employeeIds.filter((id) => !existingEmployeeIds.has(String(id)));

      if (validEmployeeIds.length === 0) {
        throw new Error("No valid employees found. Please ensure employee IDs exist in the system.");
      }

      const payload = {
        training_id: createdTraining.id,
        employee_ids: validEmployeeIds
      };

      if (selectedManagerId) {
        payload.manager_id = selectedManagerId;
      }

      const response = await API.post("/hr/assign-employees", payload);

      let successMessage = "";
      if (response.data.assigned_count) {
        successMessage = `✅ Successfully assigned ${response.data.assigned_count} employee(s) to training!`;
        if (response.data.skipped_count) {
          successMessage += `\n⚠️ ${response.data.skipped_count} employee(s) were already assigned to this training.`;
        }
      } else {
        successMessage = `✅ Successfully assigned ${validEmployeeIds.length} employee(s) to training!`;
      }

      if (invalidEmployeeIds.length > 0) {
        successMessage += `\n⚠️ ${invalidEmployeeIds.length} employee(s) were skipped (not found in system).`;
      }

      setUploadSuccess(successMessage);

      const empRes = await API.get("/hr/employees");
      setEmployees(empRes.data || []);

      setUploadFile(null);
      setUploadPreview([]);
      setUploadStats(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess("");
      }, 2500);
    } catch (err) {
      setUploadError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Error uploading employees"
      );
    } finally {
      setUploadLoading(false);
    }
  };

  const downloadEmployeeTemplate = () => {
    const headers = ["Employee ID", "Name", "Email"];
    const sampleData = [
      ["EMP001", "John Doe", "john.doe@example.com"],
      ["EMP002", "Jane Smith", "jane.smith@example.com"],
      ["EMP003", "Bob Johnson", "bob.johnson@example.com"]
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employee_training_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSelectedEmployeesDetails = () =>
    employees.filter((emp) => selectedEmployees.includes(emp.employee_id));

  const selectedEmployeesDetails = getSelectedEmployeesDetails();
  const selectedManager = managers.find((m) => m.manager_id === selectedManagerId);

  const clearAllSelections = () => {
    setSelectedEmployees([]);
    setSelectAll(false);
  };

  const resetAndCreateNew = () => {
    clearForm();
    clearTrainingExcel();
    setCreationMode("manual");
    setShowAssignment(false);
    setCreatedTraining(null);
    setFormStep(1);
    setSelectedEmployees([]);
    setSelectedManagerId("");
    setManagerSearchTerm("");
    setAssignError("");
    setAssignSuccess(false);
    setError("");
    setSuccess(false);
    setParsedEmployeesFromExcel([]);
  };

  // Delay Row Component for rendering
  const DelayRowWithCalendar = ({ 
    label, 
    delayType, 
    setDelayType, 
    selectedDate, 
    onDateChange,
    value,
    unit,
    onValueChange,
    onUnitChange,
    units,
    dateError
  }) => (
    <div className="delay-row-modern">
      <span className="delay-label">{label}</span>
      
      <div className="delay-type-toggle">
        <button
          type="button"
          className={`delay-type-btn ${delayType === "duration" ? "active" : ""}`}
          onClick={() => setDelayType("duration")}
        >
          ⏱️ Duration
        </button>
        <button
          type="button"
          className={`delay-type-btn ${delayType === "specificDate" ? "active" : ""}`}
          onClick={() => setDelayType("specificDate")}
        >
          📅 Specific Date & Time
        </button>
      </div>

      {delayType === "duration" ? (
        <div className="duration-controls">
          <input
            type="number"
            min={0}
            className="delay-input"
            value={value ?? ""}
            onChange={(e) => onValueChange(parseInt(e.target.value, 10) || 0)}
            placeholder="Enter value"
          />
          <select
            className="delay-select"
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
          >
            {units.map((unitOption) => (
              <option key={unitOption.value} value={unitOption.value}>
                {unitOption.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="date-picker-wrapper">
          <DatePicker
            selected={selectedDate}
            onChange={onDateChange}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            timeCaption="Time"
            dateFormat="MMMM d, yyyy h:mm aa"
            placeholderText="Select date and time"
            className="date-picker-input"
            minDate={new Date()}
          />
          {dateError && <span className="date-error">{dateError}</span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="create-training-assignment-container">
      {!showAssignment ? (
        <div className="training-card">
          <div className="card-header">
            <div className="header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2>Create New Training Program</h2>
            <p className="subtitle">Choose how you want to create the training</p>

            <div className="creation-mode-switch">
              <button
                type="button"
                className={`mode-btn ${creationMode === "manual" ? "active" : ""}`}
                onClick={() => {
                  setCreationMode("manual");
                  setFormStep(1);
                  clearTrainingExcel();
                }}
              >
                Manual Create
              </button>
              <button
                type="button"
                className={`mode-btn ${creationMode === "upload" ? "active" : ""}`}
                onClick={() => {
                  setCreationMode("upload");
                  setFormStep(2);
                }}
              >
                Upload Excel
              </button>
            </div>

            {/* Progress Steps */}
            <div className="progress-steps">
              <div className={`step ${formStep >= 1 ? "active" : ""} ${formStep > 1 ? "completed" : ""}`}>
                <span className="step-number">1</span>
                <span className="step-label">Basic Info</span>
              </div>
              <div className={`step-connector ${formStep >= 2 ? "active" : ""}`}></div>
              <div className={`step ${formStep >= 2 ? "active" : ""}`}>
                <span className="step-number">2</span>
                <span className="step-label">Forms & Feedback</span>
              </div>
            </div>
          </div>

          {/* Step 1: Basic Info - ONLY for manual mode and when formStep is 1 */}
          {creationMode === "manual" && formStep === 1 && (
            <form className="training-form">
              <div className="step-content">
                <div className="form-group">
                  <label>
                    <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356.257l-1.68 5.359A.993.993 0 014 14c.357 0 .692.12.957.32l3.013-3.013 2.03 2.03-3.013 3.013c.2.265.32.6.32.957a.993.993 0 01-.332.744l5.359-1.68a.999.999 0 01.257-.356L16.08 13.45l1.84 3.03a1 1 0 001.84-.788l-3-7z" />
                    </svg>
                    Training Name
                    <span className="required-star">*</span>
                  </label>
                  <div className="input-wrapper">
                    <input
                      name="trainingName"
                      type="text"
                      placeholder="e.g., Cyber Security Training, Leadership Development"
                      value={formData.trainingName}
                      onChange={handleChange}
                      onBlur={() => handleBlur("trainingName")}
                      required
                      className={`${touched.trainingName && !validateField("trainingName") ? "error" : ""} ${formData.trainingName ? "has-value" : ""}`}
                    />
                    {getValidationIcon("trainingName")}
                  </div>
                  {touched.trainingName && !validateField("trainingName") && (
                    <p className="field-error">Training name must be at least 3 characters</p>
                  )}
                </div>

                <div className="form-group">
                  <label>
                    <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116
                          7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0
                          110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Description
                  </label>
                  <div className="textarea-wrapper">
                    <textarea
                      name="description"
                      rows="5"
                      maxLength={MAX_CHARS}
                      placeholder="Provide a detailed description of the training program..."
                      value={formData.description}
                      onChange={handleChange}
                    />
                    <div className={`char-counter ${charCount > MAX_CHARS * 0.9 ? "warning" : ""}`}>
                      <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1
                            0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {charCount}/{MAX_CHARS}
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="next-button"
                    onClick={nextStep}
                    disabled={!formData.trainingName || formData.trainingName.length < 3}
                  >
                    Continue
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1
                          0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Step 2: Forms & Feedback - Show for both manual (step 2) AND upload mode */}
          {(creationMode === "upload" || formStep === 2) && (
            <form onSubmit={handleSubmit} className="training-form">
              <div className="step-content">
                {/* Excel Upload Section - Only shown in upload mode */}
                {creationMode === "upload" && (
                  <div className="excel-upload-section">
                    <div className="excel-upload-info">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p>Upload Excel file to auto-fill training name and employee list</p>
                    </div>

                    <div
                      className={`drag-drop-zone ${isDragActive ? "drag-active" : ""} ${trainingExcelFile ? "has-file" : ""}`}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => trainingExcelInputRef.current?.click()}
                    >
                      <input
                        ref={trainingExcelInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleTrainingExcelSelect}
                        className="file-input-hidden"
                        style={{ display: "none" }}
                      />
                      
                      {!trainingExcelFile ? (
                        <>
                          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <p className="drag-drop-text">Drag & drop Excel file here</p>
                          <p className="drag-drop-subtext">or</p>
                          <button type="button" className="browse-file-btn">
                            Browse Files
                          </button>
                          <p className="file-hint">Supports .xlsx, .xls (Max 10MB)</p>
                        </>
                      ) : (
                        <div className="selected-file-info">
                          <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="file-details">
                            <span className="file-name">{trainingExcelFile.name}</span>
                            <span className="file-size">{(trainingExcelFile.size / 1024).toFixed(2)} KB</span>
                            {parsedEmployeesFromExcel.length > 0 && (
                              <div className="file-stats">
                                <span className="stat-badge">📊 {parsedEmployeesFromExcel.length} employees found</span>
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            className="remove-file-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              clearTrainingExcel();
                            }}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>

                    {trainingExcelError && (
                      <div className="upload-error">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                        </svg>
                        <div className="error-content">
                          <strong>Error:</strong> {trainingExcelError}
                        </div>
                      </div>
                    )}

                    {trainingExcelSuccess && (
                      <div className="upload-success">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                        </svg>
                        <div className="success-content">
                          <strong>Success!</strong> {trainingExcelSuccess}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Employee Form Checkbox */}
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        name="requiresEmployeeForm"
                        checked={formData.requiresEmployeeForm}
                        onChange={handleChange}
                      />
                      <span className="checkbox-custom">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0
                              01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1
                              1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </div>
                    <div className="checkbox-content">
                      <span className="checkbox-title">Requires Employee Form</span>
                      <span className="checkbox-description">
                        Employees will need to fill out a form for this training
                      </span>
                    </div>
                  </label>
                </div>

                {formData.requiresEmployeeForm && (
                  <div className="conditional-fields">
                    <div className="form-group">
                      <label>
                        <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M12.9 2.1a1 1 0 00-1.4 1.42l1.35 1.35H5a1 1 0 100 2h7.85l-1.35 1.35a1 1 0 001.42 1.42l3-3a1 1 0 000-1.42l-3-3z" />
                        </svg>
                        Employee Training Form Link
                        <span className="required-star">*</span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          type="url"
                          name="formLink"
                          placeholder="https://forms.office.com/employee-form"
                          value={formData.formLink}
                          onChange={handleChange}
                          onBlur={() => handleBlur("formLink")}
                          required={formData.requiresEmployeeForm}
                          className={touched.formLink && !validateField("formLink") && formData.formLink ? "error" : ""}
                        />
                        {getValidationIcon("formLink")}
                        {formData.formLink && validateField("formLink") && (
                          <button
                            type="button"
                            className="test-link-button"
                            onClick={() => window.open(formData.formLink, "_blank")}
                          >
                            Test
                          </button>
                        )}
                      </div>
                      {touched.formLink && !validateField("formLink") && formData.formLink && (
                        <p className="field-error">Please enter a valid URL</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Manager Feedback Checkbox */}
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <div className="checkbox-wrapper">
                      <input
                        type="checkbox"
                        name="requiresManagerFeedback"
                        checked={formData.requiresManagerFeedback}
                        onChange={handleChange}
                      />
                      <span className="checkbox-custom">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0
                              01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1
                              1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    </div>
                    <div className="checkbox-content">
                      <span className="checkbox-title">Requires Manager Feedback</span>
                      <span className="checkbox-description">
                        Managers will need to provide feedback upon completion
                      </span>
                    </div>
                  </label>
                </div>

                {formData.requiresManagerFeedback && (
                  <div className="conditional-fields">
                    {/* Manager Feedback Form Link */}
                    <div className="form-group">
                      <label>
                        <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M12.9 2.1a1 1 0 00-1.4 1.42l1.35 1.35H5a1 1 0 100 2h7.85l-1.35 1.35a1 1 0 001.42 1.42l3-3a1 1 0 000-1.42l-3-3z" />
                        </svg>
                        Manager Feedback Form Link
                        <span className="required-star">*</span>
                      </label>
                      <div className="input-wrapper">
                        <input
                          type="url"
                          name="managerFormLink"
                          placeholder="https://forms.office.com/manager-feedback"
                          value={formData.managerFormLink}
                          onChange={handleChange}
                          onBlur={() => handleBlur("managerFormLink")}
                          required={formData.requiresManagerFeedback}
                          className={touched.managerFormLink && !validateField("managerFormLink") && formData.managerFormLink ? "error" : ""}
                        />
                        {getValidationIcon("managerFormLink")}
                        {formData.managerFormLink && validateField("managerFormLink") && (
                          <button
                            type="button"
                            className="test-link-button"
                            onClick={() => window.open(formData.managerFormLink, "_blank")}
                          >
                            Test
                          </button>
                        )}
                      </div>
                      {touched.managerFormLink && !validateField("managerFormLink") && formData.managerFormLink && (
                        <p className="field-error">Please enter a valid URL</p>
                      )}
                    </div>

                    {/* Initial Delay with Calendar */}
                    <DelayRowWithCalendar
                      label="Initial Delay"
                      delayType={initialDelayType}
                      setDelayType={setInitialDelayType}
                      selectedDate={selectedInitialDate}
                      onDateChange={handleInitialDateChange}
                      value={formData.initialDelayValue}
                      unit={formData.initialDelayUnit}
                      onValueChange={(val) => handleChange({ target: { name: "initialDelayValue", value: val } })}
                      onUnitChange={(unit) => handleChange({ target: { name: "initialDelayUnit", value: unit } })}
                      units={initialDelayUnits}
                      dateError={initialDateError}
                    />

                    {/* Reminder Delay with Calendar */}
                    <DelayRowWithCalendar
                      label="Reminder Delay"
                      delayType={reminderDelayType}
                      setDelayType={setReminderDelayType}
                      selectedDate={selectedReminderDate}
                      onDateChange={handleReminderDateChange}
                      value={formData.reminderDelayValue}
                      unit={formData.reminderDelayUnit}
                      onValueChange={(val) => handleChange({ target: { name: "reminderDelayValue", value: val } })}
                      onUnitChange={(unit) => handleChange({ target: { name: "reminderDelayUnit", value: unit } })}
                      units={reminderDelayUnits}
                      dateError={reminderDateError}
                    />

                    <div className="field-help">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0
                            11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1
                            1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Choose either duration (e.g., 2 days) or a specific date/time for when emails should be sent</span>
                    </div>
                    
                    {initialDelayType === "specificDate" && selectedInitialDate && (
                      <p className="field-hint">
                        📧 Initial email will be sent on: {formatDateReadable(selectedInitialDate)}
                      </p>
                    )}
                    {reminderDelayType === "specificDate" && selectedReminderDate && (
                      <p className="field-hint">
                        ⏰ Reminder email will be sent on: {formatDateReadable(selectedReminderDate)}
                      </p>
                    )}
                  </div>
                )}

                {(formData.trainingName || formData.description || formData.requiresManagerFeedback) && (
                  <div className="preview-toggle">
                    <button
                      type="button"
                      className={`preview-btn ${previewMode ? "active" : ""}`}
                      onClick={() => setPreviewMode(!previewMode)}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path
                          fillRule="evenodd"
                          d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943
                            9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458
                            10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {previewMode ? "Hide Preview" : "Show Preview"}
                    </button>
                  </div>
                )}

                {previewMode && (formData.trainingName || formData.description) && (
                  <div className="training-preview">
                    <div className="preview-header">
                      <h4>Live Preview</h4>
                      <span className="preview-badge">Preview Mode</span>
                    </div>
                    <div className="preview-card">
                      <div className="preview-header">
                        <h3>{formData.trainingName || "New Training Program"}</h3>

                        {formData.requiresEmployeeForm && (
                          <span className="employee-form-badge">
                            <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                            Employee Form Required
                          </span>
                        )}

                        {formData.requiresManagerFeedback && (
                          <span className="manager-feedback-badge">
                            <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                              <path
                                fillRule="evenodd"
                                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0
                                  01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2
                                  11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8
                                  7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Manager Feedback Required
                            {initialDelayType === "duration" && formData.initialDelayValue && (
                              <span className="delay-info"> (Initial: {formatTimeReadable(formData.initialDelayValue, formData.initialDelayUnit)})</span>
                            )}
                            {initialDelayType === "specificDate" && selectedInitialDate && (
                              <span className="delay-info"> (Initial: {formatDateReadable(selectedInitialDate)})</span>
                            )}
                            {reminderDelayType === "duration" && formData.reminderDelayValue && (
                              <span className="delay-info">, Reminder: {formatTimeReadable(formData.reminderDelayValue, formData.reminderDelayUnit)})</span>
                            )}
                            {reminderDelayType === "specificDate" && selectedReminderDate && (
                              <span className="delay-info">, Reminder: {formatDateReadable(selectedReminderDate)})</span>
                            )}
                          </span>
                        )}
                      </div>

                      <p className="preview-description">
                        {formData.description || "No description provided yet."}
                      </p>

                      {formData.requiresEmployeeForm && formData.formLink && (
                        <div className="preview-form-link">
                          <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M12.9 2.1a1 1 0 00-1.4 1.42l1.35 1.35H5a1 1 0 100 2h7.85l-1.35 1.35a1 1 0 001.42 1.42l3-3a1 1 0 000-1.42l-3-3z" />
                          </svg>
                          <span>Employee Form: </span>
                          <a href={formData.formLink} target="_blank" rel="noopener noreferrer">
                            {formData.formLink.length > 40 ? `${formData.formLink.substring(0, 40)}...` : formData.formLink}
                          </a>
                        </div>
                      )}

                      {formData.requiresManagerFeedback && formData.managerFormLink && (
                        <div className="preview-form-link manager">
                          <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7
                                0 1114 0H3z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span>Manager Form: </span>
                          <a href={formData.managerFormLink} target="_blank" rel="noopener noreferrer">
                            {formData.managerFormLink.length > 40 ? `${formData.managerFormLink.substring(0, 40)}...` : formData.managerFormLink}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  {creationMode === "manual" && formStep === 2 && (
                    <button type="button" className="back-button" onClick={prevStep}>
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293
                            3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1
                            1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Back
                    </button>
                  )}

                  <button type="button" className="clear-button" onClick={clearForm} disabled={loading}>
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1
                          1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0
                          01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0
                          01-1.414-1.414L8.586 10 4.293 5.707a1 1 0
                          010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Clear All
                  </button>

                  <button
                    type="submit"
                    className={`submit-button ${loading ? "loading" : ""}`}
                    disabled={loading || !isValid()}
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Creating Program...
                      </>
                    ) : (
                      <>
                        <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0
                              11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {parsedEmployeesFromExcel.length > 0 && creationMode === "upload"
                          ? `Create Training & Auto-Assign ${parsedEmployeesFromExcel.length} Employees`
                          : "Create Training Program"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707
                      7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293
                      1.293a1 1 0 101.414 1.414L10 11.414l1.293
                      1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1
                      1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              )}

              {success && (
                <div className="success-message">
                  <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1
                      1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0
                      00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {createdTraining?.message || "Training program created successfully!"}
                  {parsedEmployeesFromExcel.length > 0 && creationMode === "upload" && ` ${parsedEmployeesFromExcel.length} employees auto-assigned!`}
                </div>
              )}
            </form>
          )}
        </div>
      ) : (
        // Assignment Section - Manual assignment only (same as before)
        <div className="assign-card">
          <div className="card-header">
            <div className="header-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <h2>Assign Additional Employees to Training</h2>
            <p className="subtitle">
              {createdTraining && `Training "${createdTraining.name}" created successfully!`}
              {parsedEmployeesFromExcel.length > 0 && creationMode === "upload" && ` ✅ ${parsedEmployeesFromExcel.length} employees already auto-assigned from Excel.`}
            </p>
            <button className="create-new-btn" onClick={resetAndCreateNew}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0
                  11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Create Another Training
            </button>
          </div>

          {loadingData ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading employees...</p>
            </div>
          ) : (
            <form onSubmit={handleManualAssignSubmit} className="assign-form">
              {/* Manager Assignment Section */}
              <div className="form-group" ref={managerRef}>
                <label>
                  <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7
                      7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Assign Manager (Optional)
                  <span className="optional-badge">Optional</span>
                </label>

                <div className="search-dropdown-container">
                  <input
                    type="text"
                    className={`search-input ${selectedManagerId ? "selected" : ""}`}
                    placeholder="Search manager by name or email (optional)..."
                    value={managerSearchTerm}
                    onChange={(e) => {
                      setManagerSearchTerm(e.target.value);
                      setShowManagerDropdown(true);
                    }}
                    onFocus={() => setShowManagerDropdown(true)}
                  />

                  {showManagerDropdown && (
                    <div className="search-dropdown">
                      {filteredManagers.length > 0 ? (
                        filteredManagers.map((manager) => (
                          <div
                            key={manager.manager_id}
                            className={`dropdown-item ${selectedManagerId === manager.manager_id ? "selected" : ""}`}
                            onClick={() => handleManagerSelect(manager)}
                          >
                            <div className="dropdown-item-content">
                              <div className="item-title">{manager.name}</div>
                              <div className="item-subtitle">
                                {manager.email} • {manager.department || "No department"}
                                {manager.team_size !== undefined && ` • ${manager.team_size} team members`}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="dropdown-empty">
                          <p>No managers found matching "{managerSearchTerm}"</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedManager && (
                  <div className="selected-manager-info">
                    <span className="selected-badge">
                      Selected: {selectedManager.name} ({selectedManager.email})
                      <button
                        type="button"
                        className="remove-selection"
                        onClick={() => {
                          setSelectedManagerId("");
                          setManagerSearchTerm("");
                        }}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                )}

                <p className="field-hint">
                  💡 Assigning a manager is optional. The manager will receive feedback requests if manager feedback is enabled for this training.
                </p>
              </div>

              {/* Employee Selection Section */}
              <div className="form-group">
                <div className="employee-section-header">
                  <label>
                    <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    Select Additional Employees
                    <span className="selected-count">({selectedEmployees.length} selected)</span>
                  </label>

                  <button
                    type="button"
                    className="bulk-upload-btn"
                    onClick={() => setShowUploadModal(true)}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0
                        01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1
                        1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3
                        3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Bulk Upload CSV/Excel
                  </button>
                </div>

                <div className="employee-controls">
                  <div className="search-wrapper">
                    <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0
                        1110.89 3.476l4.817 4.817a1 1 0
                        01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <input
                      type="text"
                      className="search-input"
                      placeholder="Search by name, ID, email, or department..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        className="clear-search"
                        onClick={() => setSearchTerm("")}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="controls-row">
                    <div className="select-all-wrapper">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          disabled={filteredEmployees.length === 0}
                        />
                        <span className="checkbox-custom"></span>
                        <span className="select-all-text">
                          {selectAll ? "Deselect All" : "Select All"}
                        </span>
                      </label>

                      <span className="employee-count">
                        {filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""} found
                      </span>

                      {selectedEmployees.length > 0 && (
                        <button
                          type="button"
                          className="clear-selection-btn"
                          onClick={clearAllSelections}
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>

                    <div className="view-toggle">
                      <button
                        type="button"
                        className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                        onClick={() => setViewMode("grid")}
                        title="Grid View"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM13 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM13 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={`view-btn ${viewMode === "list" ? "active" : ""}`}
                        onClick={() => setViewMode("list")}
                        title="List View"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M3 5a1 1 0 011-1h12a1 1 0 110
                            2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1
                            1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1
                            1 0 110 2H4a1 1 0 01-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`employee-container ${viewMode}`}>
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map((emp) => (
                      <div
                        key={emp.employee_id}
                        className={`employee-card ${selectedEmployees.includes(emp.employee_id) ? "selected" : ""}`}
                        onClick={() => handleEmployeeSelect(emp.employee_id)}
                      >
                        <div className="employee-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedEmployees.includes(emp.employee_id)}
                            onChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                            readOnly
                          />
                          <span className="checkbox-custom"></span>
                        </div>

                        <div className="employee-avatar">
                          {emp.avatar ? (
                            <img src={emp.avatar} alt={emp.name} />
                          ) : (
                            <span>{emp.name?.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="employee-info">
                          <span className="employee-name">{emp.name}</span>
                          <span className="employee-id">{emp.employee_id}</span>
                          {emp.email && <span className="employee-email">{emp.email}</span>}
                          {emp.department && (
                            <span className="employee-department">{emp.department}</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-employees">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p>No employees found matching "{searchTerm}"</p>
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setSearchTerm("")}
                      >
                        Clear Search
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {selectedEmployeesDetails.length > 0 && (
                <div className="selected-summary">
                  <div className="summary-header">
                    <h4>Selected Employees ({selectedEmployeesDetails.length})</h4>
                    <div className="training-stats">
                      <span className="stat-badge">
                        📊 Will be assigned to "{createdTraining?.name}"
                      </span>
                    </div>
                  </div>

                  <div className="selected-chips">
                    {selectedEmployeesDetails.map((emp) => (
                      <div key={emp.employee_id} className="chip">
                        <div className="chip-avatar">{emp.name?.charAt(0).toUpperCase()}</div>
                        <div className="chip-content">
                          <span className="chip-name">{emp.name}</span>
                          <span className="chip-id">{emp.employee_id}</span>
                        </div>
                        <button
                          type="button"
                          className="chip-remove"
                          onClick={() => handleEmployeeSelect(emp.employee_id)}
                          title="Remove"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1
                              1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0
                              01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0
                              01-1.414-1.414L8.586 10 4.293 5.707a1 1 0
                              010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {assignError && (
                <div className="error-message">
                  <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7
                      4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0
                      00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {assignError}
                </div>
              )}

              {assignSuccess && (
                <div className="success-message">
                  <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1
                      1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0
                      00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {assignSuccess}
                </div>
              )}

              <button
                type="submit"
                className={`submit-button ${assignLoading ? "loading" : ""}`}
                disabled={assignLoading || selectedEmployees.length === 0}
              >
                {assignLoading ? (
                  <>
                    <span className="spinner"></span>
                    Assigning...
                  </>
                ) : (
                  <>
                    <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8
                        8a1 1 0 01-1.414 0l-4-4a1 1 0
                        011.414-1.414L8 12.586l7.293-7.293a1 1 0
                        011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Assign {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? "s" : ""} to Training
                  </>
                )}
              </button>
            </form>
          )}

          <div className="card-footer">
            <p className="info-text">
              <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0
                  11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001
                  1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              Click employee cards to select/deselect. Assigning a manager is optional. Use the bulk upload button to assign multiple employees via CSV/Excel.
            </p>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Bulk Upload Employees to Training</h3>
              <button className="modal-close" onClick={() => setShowUploadModal(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {createdTraining && (
                <div className="training-info">
                  <strong>Training:</strong> {createdTraining.name}
                </div>
              )}

              <div className="upload-area">
                <div className="upload-instructions">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p>Upload CSV or Excel file with employee IDs</p>
                  <button className="template-download" onClick={downloadEmployeeTemplate}>
                    Download Template
                  </button>
                </div>

                <div
                  className={`drag-drop-zone ${isUploadDragActive ? "drag-active" : ""} ${uploadFile ? "has-file" : ""}`}
                  onDragEnter={handleUploadDragEnter}
                  onDragLeave={handleUploadDragLeave}
                  onDragOver={handleUploadDragOver}
                  onDrop={handleUploadDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="file-input-hidden"
                    style={{ display: "none" }}
                  />

                  {!uploadFile ? (
                    <>
                      <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="drag-drop-text">Drag & drop CSV/Excel file here</p>
                      <p className="drag-drop-subtext">or</p>
                      <button type="button" className="browse-file-btn">
                        Browse Files
                      </button>
                      <p className="file-hint">Supports .csv, .xlsx, .xls (Max 10MB)</p>
                    </>
                  ) : (
                    <div className="selected-file-info">
                      <svg className="file-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="file-details">
                        <span className="file-name">{uploadFile.name}</span>
                        <span className="file-size">{(uploadFile.size / 1024).toFixed(2)} KB</span>
                        {uploadStats && (
                          <div className="file-stats">
                            <span className="stat-badge">📊 {uploadStats.total} records</span>
                            <span className="stat-badge">🔢 {uploadStats.unique} unique</span>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadFile(null);
                          setUploadPreview([]);
                          setUploadStats(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>

                {uploadPreview.length > 0 && (
                  <div className="preview-table-wrapper">
                    <h4>Preview (first {Math.min(10, uploadPreview.length)} rows)</h4>
                    <table className="preview-table">
                      <thead>
                        <tr>
                          <th>Employee ID</th>
                          <th>Name</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadPreview.map((emp, idx) => (
                          <tr key={idx}>
                            <td>{emp.employee_id}</td>
                            <td>{emp.name || "-"}</td>
                            <td>{emp.email || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {uploadError && (
                  <div className="upload-error">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707
                        7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293
                        1.293a1 1 0 101.414 1.414L10 11.414l1.293
                        1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1
                        1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="error-content">
                      <strong>Error:</strong> {uploadError}
                    </div>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="upload-success">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1
                        1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0
                        00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="success-content">
                      <strong>Success!</strong> {uploadSuccess}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setShowUploadModal(false)}>
                Cancel
              </button>
              <button
                className="modal-upload"
                onClick={handleUploadEmployees}
                disabled={!uploadFile || uploadLoading}
              >
                {uploadLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    Uploading & Assigning...
                  </>
                ) : (
                  "Upload & Assign"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateTrainingWithAssignment;