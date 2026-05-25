// updateController.js - Complete working version
const pool = require("../db");

// Helper function to validate UUID
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

function formatDelayForDisplay(value, unit) {
  if (!value) return "0 minutes";
  const numValue = parseInt(value);
  
  switch (unit?.toLowerCase()) {
    case "minutes":
      return `${numValue} minute${numValue !== 1 ? "s" : ""}`;
    case "hours":
      return `${numValue} hour${numValue !== 1 ? "s" : ""}`;
    case "days":
      return `${numValue} day${numValue !== 1 ? "s" : ""}`;
    case "months":
      return `${numValue} month${numValue !== 1 ? "s" : ""}`;
    default:
      return `${numValue} ${unit || "minutes"}`;
  }
}

// ==============================
// EMPLOYEE CONTROLLERS
// ==============================

const getAllEmployees = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.employee_id, e.name, e.email, e.department, e.manager_id,
              e.employee_code, e.created_at,
              m.name AS manager_name, m.email AS manager_email
       FROM employees e
       LEFT JOIN managers m ON e.manager_id = m.manager_id
       ORDER BY e.name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getAllEmployees error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getEmployeeById = async (req, res) => {
  const { id } = req.params;
  
  try {
    let result;
    
    // Check if id is a UUID or employee_code
    if (isValidUUID(id)) {
      result = await pool.query(
        `SELECT e.employee_id, e.name, e.email, e.department, e.manager_id,
                e.employee_code, e.created_at,
                m.name AS manager_name, m.email AS manager_email
         FROM employees e
         LEFT JOIN managers m ON e.manager_id = m.manager_id
         WHERE e.employee_id = $1`,
        [id]
      );
    } else {
      // Search by employee_code or name
      result = await pool.query(
        `SELECT e.employee_id, e.name, e.email, e.department, e.manager_id,
                e.employee_code, e.created_at,
                m.name AS manager_name, m.email AS manager_email
         FROM employees e
         LEFT JOIN managers m ON e.manager_id = m.manager_id
         WHERE e.employee_code = $1 OR e.name ILIKE $2`,
        [id, `%${id}%`]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("getEmployeeById error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateEmployee = async (req, res) => {
  const { id } = req.params;
  const { name, email, department, manager_id, employee_code } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }

  try {
    const result = await pool.query(
      `UPDATE employees
       SET name = $1, 
           email = $2, 
           department = $3,
           manager_id = $4, 
           employee_code = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE employee_id = $6
       RETURNING employee_id, name, email, department, manager_id, employee_code, created_at`,
      [name, email, department || null, manager_id || null, employee_code || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    
    res.json({ 
      message: "Employee updated successfully", 
      data: result.rows[0] 
    });
  } catch (err) {
    if (err.code === "23505") {
      const field = err.constraint?.includes("email") ? "email" : "employee_code";
      return res.status(409).json({ error: `This ${field} is already in use` });
    }
    console.error("updateEmployee error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ==============================
// MANAGER CONTROLLERS
// ==============================

const getAllManagers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT manager_id, name, email, department 
       FROM managers 
       ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("getAllManagers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getManagerById = async (req, res) => {
  const { id } = req.params;
  
  try {
    let result;
    
    if (isValidUUID(id)) {
      result = await pool.query(
        `SELECT manager_id, name, email, department, created_at
         FROM managers 
         WHERE manager_id = $1`,
        [id]
      );
    } else {
      // Search by name or email
      result = await pool.query(
        `SELECT manager_id, name, email, department, created_at
         FROM managers 
         WHERE name ILIKE $1 OR email ILIKE $2`,
        [`%${id}%`, `%${id}%`]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Manager not found" });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error("getManagerById error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateManager = async (req, res) => {
  const { id } = req.params;
  const { name, email, department } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }

  try {
    const result = await pool.query(
      `UPDATE managers
       SET name = $1, 
           email = $2, 
           department = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE manager_id = $4
       RETURNING manager_id, name, email, department, created_at`,
      [name, email, department || null, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Manager not found" });
    }
    
    res.json({ 
      message: "Manager updated successfully", 
      data: result.rows[0] 
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "This email is already in use" });
    }
    console.error("updateManager error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// ==============================
// TRAINING PROGRAM CONTROLLERS
// ==============================

const getAllTrainingPrograms = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT training_id, training_name, description,
              requires_employee_form, requires_manager_feedback,
              employee_form_link, manager_form_link,
              initial_delay_value, initial_delay_unit,
              reminder_delay_value, reminder_delay_unit,
              created_at, created_by
       FROM training_programs 
       ORDER BY created_at DESC`
    );
    
    const trainings = result.rows.map(training => ({
      ...training,
      initial_delay_readable: formatDelayForDisplay(training.initial_delay_value, training.initial_delay_unit),
      reminder_delay_readable: formatDelayForDisplay(training.reminder_delay_value, training.reminder_delay_unit)
    }));
    
    res.json(trainings);
  } catch (err) {
    console.error("getAllTrainingPrograms error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getTrainingProgramById = async (req, res) => {
  const { id } = req.params;
  
  try {
    let result;
    
    if (isValidUUID(id)) {
      result = await pool.query(
        `SELECT training_id, training_name, description,
                requires_employee_form, requires_manager_feedback,
                employee_form_link, manager_form_link,
                initial_delay_value, initial_delay_unit,
                reminder_delay_value, reminder_delay_unit,
                created_at, created_by
         FROM training_programs 
         WHERE training_id = $1`,
        [id]
      );
    } else {
      // Search by training name
      result = await pool.query(
        `SELECT training_id, training_name, description,
                requires_employee_form, requires_manager_feedback,
                employee_form_link, manager_form_link,
                initial_delay_value, initial_delay_unit,
                reminder_delay_value, reminder_delay_unit,
                created_at, created_by
         FROM training_programs 
         WHERE training_name ILIKE $1`,
        [`%${id}%`]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Training program not found" });
    }
    
    const training = result.rows[0];
    training.initial_delay_readable = formatDelayForDisplay(
      training.initial_delay_value, 
      training.initial_delay_unit
    );
    training.reminder_delay_readable = formatDelayForDisplay(
      training.reminder_delay_value, 
      training.reminder_delay_unit
    );
    
    res.json(training);
  } catch (err) {
    console.error("getTrainingProgramById error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateTrainingProgram = async (req, res) => {
  const { id } = req.params;
  const {
    training_name,
    description,
    requires_employee_form,
    requires_manager_feedback,
    employee_form_link,
    manager_form_link,
    initial_delay_value,
    initial_delay_unit,
    reminder_delay_value,
    reminder_delay_unit,
  } = req.body;

  if (!training_name) {
    return res.status(400).json({ error: "training_name is required" });
  }

  const validUnits = ["minutes", "hours", "days", "months"];
  if (
    (initial_delay_unit && !validUnits.includes(initial_delay_unit)) ||
    (reminder_delay_unit && !validUnits.includes(reminder_delay_unit))
  ) {
    return res.status(400).json({ 
      error: "Delay unit must be minutes, hours, days, or months" 
    });
  }

  try {
    const result = await pool.query(
      `UPDATE training_programs
       SET training_name = $1,
           description = $2,
           requires_employee_form = $3,
           requires_manager_feedback = $4,
           employee_form_link = $5,
           manager_form_link = $6,
           initial_delay_value = $7,
           initial_delay_unit = $8,
           reminder_delay_value = $9,
           reminder_delay_unit = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE training_id = $11
       RETURNING *`,
      [
        training_name,
        description || null,
        requires_employee_form ?? false,
        requires_manager_feedback ?? false,
        employee_form_link || null,
        manager_form_link || null,
        initial_delay_value ?? 0,
        initial_delay_unit || "minutes",
        reminder_delay_value ?? 3,
        reminder_delay_unit || "days",
        id,
      ]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Training program not found" });
    }
    
    const updated = result.rows[0];
    updated.initial_delay_readable = formatDelayForDisplay(
      updated.initial_delay_value, 
      updated.initial_delay_unit
    );
    updated.reminder_delay_readable = formatDelayForDisplay(
      updated.reminder_delay_value, 
      updated.reminder_delay_unit
    );
    
    res.json({ 
      message: "Training program updated successfully", 
      data: updated 
    });
  } catch (err) {
    console.error("updateTrainingProgram error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getEmployeeById,
  updateEmployee,
  getManagerById,
  updateManager,
  getTrainingProgramById,
  updateTrainingProgram,
  getAllManagers,
  getAllEmployees,
  getAllTrainingPrograms
};