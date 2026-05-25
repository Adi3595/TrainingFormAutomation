// UpdatePage.js - Complete with search by name + assign employees + Date Picker for delays
import React, { useState, useEffect } from "react";
import API from "../services/api";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./UpdatePage.css";

const Field = ({ label, required, children }) => (
  <div className="update-field">
    <label className="update-field-label">
      {label}
      {required && <span className="update-field-required"> *</span>}
    </label>
    {children}
  </div>
);

const Input = (props) => <input className="update-input" {...props} />;

const Select = ({ children, ...props }) => (
  <select className="update-select" {...props}>
    {children}
  </select>
);

const Textarea = (props) => <textarea className="update-textarea" {...props} />;

const Toggle = ({ label, checked, onChange }) => (
  <div className="update-toggle-row">
    <span className="update-toggle-label">{label}</span>
    <div
      className={`update-toggle-track ${checked ? "active" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <div className={`update-toggle-thumb ${checked ? "active" : ""}`} />
    </div>
  </div>
);

// Updated DelayRow with Date Picker option
const DelayRowWithCalendar = ({ 
  label, 
  value, 
  unit, 
  onValueChange, 
  onUnitChange,
  delayType,
  setDelayType,
  selectedDate,
  onDateChange,
  units,
  dateError
}) => (
  <div className="update-delay-row-modern">
    <span className="update-delay-label">{label}</span>
    
    <div className="update-delay-type-toggle">
      <button
        type="button"
        className={`update-delay-type-btn ${delayType === "duration" ? "active" : ""}`}
        onClick={() => setDelayType("duration")}
      >
        ⏱️ Duration
      </button>
      <button
        type="button"
        className={`update-delay-type-btn ${delayType === "specificDate" ? "active" : ""}`}
        onClick={() => setDelayType("specificDate")}
      >
        📅 Specific Date & Time
      </button>
    </div>

    {delayType === "duration" ? (
      <div className="update-duration-controls">
        <input
          type="number"
          min={0}
          className="update-delay-input"
          value={value ?? ""}
          onChange={(e) => onValueChange(parseInt(e.target.value, 10) || 0)}
          placeholder="Enter value"
        />
        <select
          className="update-delay-select"
          value={unit || "minutes"}
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
      <div className="update-date-picker-wrapper">
        <DatePicker
          selected={selectedDate}
          onChange={onDateChange}
          showTimeSelect
          timeFormat="HH:mm"
          timeIntervals={15}
          timeCaption="Time"
          dateFormat="MMMM d, yyyy h:mm aa"
          placeholderText="Select date and time"
          className="update-date-picker-input"
          minDate={new Date()}
        />
        {dateError && <span className="update-date-error">{dateError}</span>}
      </div>
    )}
  </div>
);

const StatusBanner = ({ status }) => {
  if (!status) return null;
  const isError = status.type === "error";
  return (
    <div className={`update-banner ${isError ? "update-banner-error" : "update-banner-success"}`}>
      <span className="update-banner-icon">{isError ? "⚠" : "✓"}</span>
      {status.message}
    </div>
  );
};

const SectionCard = ({ title, children }) => (
  <div className="update-card">
    <h3 className="update-card-title">{title}</h3>
    {children}
  </div>
);

function UpdateEmployee() {
  const [searchId, setSearchId] = useState("");
  const [form, setForm] = useState(null);
  const [managers, setManagers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchManagers();
    fetchEmployees();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await API.get("/update/managers");
      setManagers(response.data || []);
    } catch (err) {
      console.error("Failed to fetch managers:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await API.get("/update/employees");
      setEmployees(response.data || []);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const handleSearchSelect = (employee) => {
    setSearchId(employee.name);
    setForm(employee);
    setShowDropdown(false);
  };

  const fetchEmployee = async () => {
    if (!searchId.trim()) {
      setStatus({ type: "error", message: "Please enter a name or ID to search" });
      return;
    }

    setLoading(true);
    setStatus(null);
    setForm(null);

    try {
      const response = await API.get(`/update/employees/${encodeURIComponent(searchId.trim())}`);
      setForm(response.data);
      setStatus({ type: "success", message: `Found: ${response.data.name}` });
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.error || "Employee not found" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const response = await API.put(`/update/employees/${form.employee_id}`, form);
      setStatus({ type: "success", message: response.data.message || "Employee updated successfully" });
      fetchEmployees();
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.error || "Update failed" });
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((emp) =>
    emp.name?.toLowerCase().includes(searchId.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(searchId.toLowerCase()) ||
    emp.employee_code?.toLowerCase().includes(searchId.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchId.toLowerCase())
  );

  return (
    <div>
      <SectionCard title="Find Employee">
        <div className="update-search-container">
          <div className="update-search-wrapper">
            <input
              className="update-search-input"
              placeholder="Search by Name, Employee ID, Employee Code, or Email..."
              value={searchId}
              onChange={(e) => {
                setSearchId(e.target.value);
                setShowDropdown(true);
                setForm(null);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => e.key === "Enter" && fetchEmployee()}
            />

            {showDropdown && filteredEmployees.length > 0 && (
              <div className="update-dropdown">
                {filteredEmployees.slice(0, 10).map((emp) => (
                  <div
                    key={emp.employee_id}
                    className="update-dropdown-item"
                    onClick={() => handleSearchSelect(emp)}
                  >
                    <div className="update-dropdown-item-name">{emp.name}</div>
                    <div className="update-dropdown-item-id">
                      {emp.employee_code || emp.employee_id.substring(0, 8)} • {emp.email}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="update-btn-primary" onClick={fetchEmployee} disabled={loading}>
            {loading ? "Loading..." : "Load"}
          </button>
        </div>
      </SectionCard>

      <StatusBanner status={status} />

      {form && (
        <SectionCard title={`Editing: ${form.name}`}>
          <div className="update-grid-2">
            <Field label="Full Name" required>
              <Input value={form.name || ""} onChange={(e) => handleChange("name", e.target.value)} />
            </Field>

            <Field label="Email" required>
              <Input type="email" value={form.email || ""} onChange={(e) => handleChange("email", e.target.value)} />
            </Field>

            <Field label="Department">
              <Input value={form.department || ""} onChange={(e) => handleChange("department", e.target.value)} />
            </Field>

            <Field label="Employee Code">
              <Input value={form.employee_code || ""} onChange={(e) => handleChange("employee_code", e.target.value)} />
            </Field>

            <Field label="Manager">
              <Select value={form.manager_id || ""} onChange={(e) => handleChange("manager_id", e.target.value || null)}>
                <option value="">— No Manager —</option>
                {managers.map((m) => (
                  <option key={m.manager_id} value={m.manager_id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="update-form-footer">
            <small className="update-meta-id">ID: {form.employee_id}</small>
            <button className="update-btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function UpdateManager() {
  const [searchId, setSearchId] = useState("");
  const [form, setForm] = useState(null);
  const [managers, setManagers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await API.get("/update/managers");
      setManagers(response.data || []);
    } catch (err) {
      console.error("Failed to fetch managers:", err);
    }
  };

  const handleSearchSelect = (manager) => {
    setSearchId(manager.name);
    setForm(manager);
    setShowDropdown(false);
  };

  const fetchManager = async () => {
    if (!searchId.trim()) {
      setStatus({ type: "error", message: "Please enter a name or ID to search" });
      return;
    }

    setLoading(true);
    setStatus(null);
    setForm(null);

    try {
      const response = await API.get(`/update/managers/${encodeURIComponent(searchId.trim())}`);
      setForm(response.data);
      setStatus({ type: "success", message: `Found: ${response.data.name}` });
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.error || "Manager not found" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const response = await API.put(`/update/managers/${form.manager_id}`, form);
      setStatus({ type: "success", message: response.data.message || "Manager updated successfully" });
      fetchManagers();
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.error || "Update failed" });
    } finally {
      setLoading(false);
    }
  };

  const filteredManagers = managers.filter((m) =>
    m.name?.toLowerCase().includes(searchId.toLowerCase()) ||
    m.manager_id?.toLowerCase().includes(searchId.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchId.toLowerCase())
  );

  return (
    <div>
      <SectionCard title="Find Manager">
        <div className="update-search-container">
          <div className="update-search-wrapper">
            <input
              className="update-search-input"
              placeholder="Search by Name, Manager ID, or Email..."
              value={searchId}
              onChange={(e) => {
                setSearchId(e.target.value);
                setShowDropdown(true);
                setForm(null);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => e.key === "Enter" && fetchManager()}
            />

            {showDropdown && filteredManagers.length > 0 && (
              <div className="update-dropdown">
                {filteredManagers.slice(0, 10).map((m) => (
                  <div
                    key={m.manager_id}
                    className="update-dropdown-item"
                    onClick={() => handleSearchSelect(m)}
                  >
                    <div className="update-dropdown-item-name">{m.name}</div>
                    <div className="update-dropdown-item-id">{m.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="update-btn-primary" onClick={fetchManager} disabled={loading}>
            {loading ? "Loading..." : "Load"}
          </button>
        </div>
      </SectionCard>

      <StatusBanner status={status} />

      {form && (
        <SectionCard title={`Editing: ${form.name}`}>
          <div className="update-grid-2">
            <Field label="Full Name" required>
              <Input value={form.name || ""} onChange={(e) => handleChange("name", e.target.value)} />
            </Field>

            <Field label="Email" required>
              <Input type="email" value={form.email || ""} onChange={(e) => handleChange("email", e.target.value)} />
            </Field>

            <Field label="Department">
              <Input value={form.department || ""} onChange={(e) => handleChange("department", e.target.value)} />
            </Field>
          </div>

          <div className="update-form-footer">
            <small className="update-meta-id">ID: {form.manager_id}</small>
            <button className="update-btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function UpdateTrainingProgram() {
  const [searchId, setSearchId] = useState("");
  const [form, setForm] = useState(null);
  const [trainings, setTrainings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Delay type states
  const [initialDelayType, setInitialDelayType] = useState("duration");
  const [reminderDelayType, setReminderDelayType] = useState("duration");
  const [selectedInitialDate, setSelectedInitialDate] = useState(null);
  const [selectedReminderDate, setSelectedReminderDate] = useState(null);
  const [initialDateError, setInitialDateError] = useState("");
  const [reminderDateError, setReminderDateError] = useState("");

  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignStatus, setAssignStatus] = useState(null);

  const delayUnits = [
    { value: "minutes", label: "Minutes", max: 1440, min: 0 },
    { value: "hours", label: "Hours", max: 24, min: 0 },
    { value: "days", label: "Days", max: 30, min: 0 },
    { value: "months", label: "Months", max: 12, min: 0 }
  ];

  useEffect(() => {
    fetchTrainings();
    fetchEmployees();
  }, []);

  const fetchTrainings = async () => {
    try {
      const response = await API.get("/update/training-programs");
      setTrainings(response.data || []);
    } catch (err) {
      console.error("Failed to fetch trainings:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await API.get("/hr/employees");
      setEmployees(response.data || []);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const handleSearchSelect = (training) => {
    setSearchId(training.training_name);
    setForm(training);
    setSelectedEmployees([]);
    setAssignStatus(null);
    setShowDropdown(false);
    
    // Reset delay type states based on existing values
    if (training.initial_delay_value && training.initial_delay_value > 0) {
      setInitialDelayType("duration");
    } else {
      setInitialDelayType("duration");
    }
    if (training.reminder_delay_value && training.reminder_delay_value > 0) {
      setReminderDelayType("duration");
    } else {
      setReminderDelayType("duration");
    }
    setSelectedInitialDate(null);
    setSelectedReminderDate(null);
  };

  const fetchProgram = async () => {
    if (!searchId.trim()) {
      setStatus({ type: "error", message: "Please enter a training name or ID to search" });
      return;
    }

    setLoading(true);
    setStatus(null);
    setForm(null);
    setSelectedEmployees([]);
    setAssignStatus(null);

    try {
      const response = await API.get(`/update/training-programs/${encodeURIComponent(searchId.trim())}`);
      setForm(response.data);
      setStatus({ type: "success", message: `Found: ${response.data.training_name}` });
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.error || "Training program not found" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleInitialDateChange = (date) => {
    setSelectedInitialDate(date);
    if (date) {
      handleChange("initial_delay_value", "");
      setInitialDateError("");
    }
  };

  const handleReminderDateChange = (date) => {
    setSelectedReminderDate(date);
    if (date) {
      handleChange("reminder_delay_value", "");
      setReminderDateError("");
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

  const handleSubmit = async () => {
    setLoading(true);
    setStatus(null);

    try {
      // Calculate delay values based on type
      let initialDelayMinutes = 0;
      let reminderDelayMinutes = 0;

      if (initialDelayType === "duration") {
        initialDelayMinutes = convertToMinutes(form.initial_delay_value, form.initial_delay_unit);
      } else if (selectedInitialDate) {
        const now = new Date();
        initialDelayMinutes = Math.max(0, Math.floor((selectedInitialDate - now) / (1000 * 60)));
      }

      if (reminderDelayType === "duration") {
        reminderDelayMinutes = convertToMinutes(form.reminder_delay_value, form.reminder_delay_unit);
      } else if (selectedReminderDate) {
        const now = new Date();
        reminderDelayMinutes = Math.max(0, Math.floor((selectedReminderDate - now) / (1000 * 60)));
      }

      const updatedForm = {
        ...form,
        initial_delay_value: initialDelayMinutes,
        initial_delay_unit: "minutes",
        reminder_delay_value: reminderDelayMinutes,
        reminder_delay_unit: "minutes"
      };

      const response = await API.put(`/update/training-programs/${form.training_id}`, updatedForm);
      setStatus({ type: "success", message: response.data.message || "Training program updated successfully" });
      fetchTrainings();
    } catch (err) {
      setStatus({ type: "error", message: err.response?.data?.error || "Update failed" });
    } finally {
      setLoading(false);
    }
  };

  const filteredTrainings = trainings.filter((t) =>
    t.training_name?.toLowerCase().includes(searchId.toLowerCase()) ||
    t.training_id?.toLowerCase().includes(searchId.toLowerCase())
  );

  const filteredEmployees = employees.filter((emp) =>
    emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.employee_code?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.email?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.department?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  const toggleEmployee = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAllVisibleEmployees = () => {
    const visibleIds = filteredEmployees.slice(0, 50).map((emp) => emp.employee_id);
    setSelectedEmployees((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearSelectedEmployees = () => {
    setSelectedEmployees([]);
  };

  const assignEmployeesToTraining = async () => {
    if (!form?.training_id) {
      setAssignStatus({ type: "error", message: "Please load a training first" });
      return;
    }

    if (selectedEmployees.length === 0) {
      setAssignStatus({ type: "error", message: "Please select at least one employee" });
      return;
    }

    setAssignLoading(true);
    setAssignStatus(null);

    try {
      const response = await API.post("/hr/assign-employees", {
        training_id: form.training_id,
        employee_ids: selectedEmployees
      });

      setAssignStatus({
        type: "success",
        message: response.data.message || "Employees assigned successfully"
      });

      setSelectedEmployees([]);

      if (form.requires_employee_form && form.employee_form_link) {
        await API.post("/hr/schedule-employee-mails", {
          training_id: form.training_id,
          delay_minutes: 0
        });
      }
    } catch (err) {
      setAssignStatus({
        type: "error",
        message: err.response?.data?.error || err.response?.data?.message || "Assignment failed"
      });
    } finally {
      setAssignLoading(false);
    }
  };

  return (
    <div>
      <SectionCard title="Find Training Program">
        <div className="update-search-container">
          <div className="update-search-wrapper">
            <input
              className="update-search-input"
              placeholder="Search by Training Name or ID..."
              value={searchId}
              onChange={(e) => {
                setSearchId(e.target.value);
                setShowDropdown(true);
                setForm(null);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => e.key === "Enter" && fetchProgram()}
            />

            {showDropdown && filteredTrainings.length > 0 && (
              <div className="update-dropdown">
                {filteredTrainings.slice(0, 10).map((t) => (
                  <div
                    key={t.training_id}
                    className="update-dropdown-item"
                    onClick={() => handleSearchSelect(t)}
                  >
                    <div className="update-dropdown-item-name">{t.training_name}</div>
                    <div className="update-dropdown-item-id">{t.training_id.substring(0, 8)}...</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button className="update-btn-primary" onClick={fetchProgram} disabled={loading}>
            {loading ? "Loading..." : "Load"}
          </button>
        </div>
      </SectionCard>

      <StatusBanner status={status} />

      {form && (
        <>
          <SectionCard title="Basic Info">
            <div className="update-grid-2">
              <Field label="Training Name" required>
                <Input value={form.training_name || ""} onChange={(e) => handleChange("training_name", e.target.value)} />
              </Field>
            </div>

            <Field label="Description">
              <Textarea value={form.description || ""} onChange={(e) => handleChange("description", e.target.value)} />
            </Field>
          </SectionCard>

          <SectionCard title="Form Requirements">
            <Toggle
              label="Requires Employee Form"
              checked={!!form.requires_employee_form}
              onChange={(v) => handleChange("requires_employee_form", v)}
            />

            {form.requires_employee_form && (
              <div className="update-conditional-fields">
                <Field label="Employee Form Link">
                  <Input
                    placeholder="https://..."
                    value={form.employee_form_link || ""}
                    onChange={(e) => handleChange("employee_form_link", e.target.value)}
                  />
                </Field>
              </div>
            )}

            <Toggle
              label="Requires Manager Feedback"
              checked={!!form.requires_manager_feedback}
              onChange={(v) => handleChange("requires_manager_feedback", v)}
            />

            {form.requires_manager_feedback && (
              <div className="update-conditional-fields">
                <Field label="Manager Form Link">
                  <Input
                    placeholder="https://..."
                    value={form.manager_form_link || ""}
                    onChange={(e) => handleChange("manager_form_link", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Delay Settings">
            <DelayRowWithCalendar
              label="Initial Delay"
              value={form.initial_delay_value}
              unit={form.initial_delay_unit}
              onValueChange={(val) => handleChange("initial_delay_value", val)}
              onUnitChange={(unit) => handleChange("initial_delay_unit", unit)}
              delayType={initialDelayType}
              setDelayType={setInitialDelayType}
              selectedDate={selectedInitialDate}
              onDateChange={handleInitialDateChange}
              units={delayUnits}
              dateError={initialDateError}
            />

            <DelayRowWithCalendar
              label="Reminder Delay"
              value={form.reminder_delay_value}
              unit={form.reminder_delay_unit}
              onValueChange={(val) => handleChange("reminder_delay_value", val)}
              onUnitChange={(unit) => handleChange("reminder_delay_unit", unit)}
              delayType={reminderDelayType}
              setDelayType={setReminderDelayType}
              selectedDate={selectedReminderDate}
              onDateChange={handleReminderDateChange}
              units={delayUnits}
              dateError={reminderDateError}
            />
          </SectionCard>

          <SectionCard title="Assign Employees to Training">
            <div className="update-search-container">
              <input
                className="update-search-input"
                placeholder="Search employees by name, code, email, department, or ID..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
            </div>

            <div className="update-assignment-actions">
              <button type="button" className="update-btn-secondary" onClick={selectAllVisibleEmployees}>
                Select Visible
              </button>

              <button type="button" className="update-btn-secondary" onClick={clearSelectedEmployees}>
                Clear Selection
              </button>
            </div>

            <div className="update-employee-list">
              {filteredEmployees.slice(0, 50).map((emp) => (
                <div
                  key={emp.employee_id}
                  className={`update-employee-row ${
                    selectedEmployees.includes(emp.employee_id) ? "selected" : ""
                  }`}
                  onClick={() => toggleEmployee(emp.employee_id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(emp.employee_id)}
                    readOnly
                  />

                  <div>
                    <strong>{emp.name}</strong>
                    <div className="update-dropdown-item-id">
                      {emp.employee_code || emp.employee_id.substring(0, 8)} • {emp.email || "No email"}
                    </div>
                    {emp.department && (
                      <div className="update-dropdown-item-id">
                        Department: {emp.department}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {filteredEmployees.length === 0 && (
                <div className="update-empty-state">
                  No employees found.
                </div>
              )}
            </div>

            {assignStatus && <StatusBanner status={assignStatus} />}

            <div className="update-form-footer">
              <small className="update-meta-id">
                {selectedEmployees.length} employee(s) selected
              </small>

              <button
                type="button"
                className="update-btn-primary"
                onClick={assignEmployeesToTraining}
                disabled={assignLoading || selectedEmployees.length === 0}
              >
                {assignLoading
                  ? "Assigning..."
                  : `Assign ${selectedEmployees.length} Employee${selectedEmployees.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </SectionCard>

          <div className="update-form-footer">
            <small className="update-meta-id">ID: {form.training_id}</small>
            <button className="update-btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const TABS = [
  { key: "employee", label: "👤 Employee", component: UpdateEmployee },
  { key: "manager", label: "🏢 Manager", component: UpdateManager },
  { key: "training", label: "📋 Training Program", component: UpdateTrainingProgram }
];

export default function UpdatePage() {
  const [activeTab, setActiveTab] = useState("employee");
  const ActiveComponent = TABS.find((t) => t.key === activeTab)?.component;

  return (
    <div className="update-page-container">
      <div className="update-header">
        <h1>Update Records</h1>
        <p className="update-subheading">
          Select a category, search for a record by name or ID, and save your changes.
        </p>
      </div>

      <div className="update-tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`update-tab ${activeTab === t.key ? "active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="update-content">
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}