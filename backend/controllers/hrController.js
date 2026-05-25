// hrController.js - Updated with requires_employee_form and uploadTrainingWithEmployees
const pool = require("../db");
const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');

// ==================== HELPER FUNCTIONS FOR FILE PARSING ====================

const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
};

// Parse Training Excel function
const parseTrainingExcel = (filePath) => {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      const trainingInfo = {};
      const employees = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i] || [];

        const colA = (row[0] || "").toString().trim();
        const colB = (row[1] || "").toString().trim();
        const colC = (row[2] || "").toString().trim();
        const colD = (row[3] || "").toString().trim();
        const colE = row[4];
        const colF = (row[5] || "").toString().trim();
        const colG = row[6];

        if (colA === "Training Name*" || colA === "Training Name") {
          trainingInfo.training_name = colD || "";
        }
        else if (
          colA === "Training Date* (DD-MMM-YYYY)" ||
          colA === "Training Date* (DD-MMM-YYYY) " ||
          colA === "Training Date*" ||
          colA === "Training Date"
        ) {
          trainingInfo.start_date = colE || null;
          trainingInfo.end_date = colG || null;
        }
        else if (
          colA === "Duration*(hrs)" ||
          colA === "Duration* (hrs)" ||
          colA === "Duration"
        ) {
          trainingInfo.duration = colD || "";
        }
        else if (colA === "Trainer*" || colA === "Trainer") {
          trainingInfo.trainer = colD || "";
        }
        else if (colA === "Secondary Trainer") {
          trainingInfo.secondary_trainer = colD || "";
        }
        else if (colA === "Training Venue") {
          trainingInfo.venue = colD || "";
        }
        else if (colA === "Training Category*" || colA === "Training Category") {
          trainingInfo.category = colD || "";
        }
        else if (colA === "Program Cost") {
          trainingInfo.program_cost = colD || "0";
          trainingInfo.currency = (row[6] || "INR").toString().trim();
        }
        else if (colA === "Sr.No" && colB === "Per No" && colC.trim() === "Name") {
          for (let j = i + 1; j < data.length; j++) {
            const empRow = data[j] || [];

            const srNo = (empRow[0] || "").toString().trim();
            const perNo = (empRow[1] || "").toString().trim();
            const name = (empRow[2] || "").toString().trim();

            if (!srNo && !perNo && !name) continue;

            if (perNo && name) {
              employees.push({
                sr_no: srNo || String(employees.length + 1),
                employee_code: perNo,
                name
              });
            }
          }
          break;
        }
      }

      console.log("📊 Parsed Training Info:", trainingInfo);
      console.log("👥 Parsed Employees:", employees.length);

      resolve({ trainingInfo, employees });
    } catch (err) {
      reject(err);
    }
  });
};

// Helper function to get or create employee using employee_code (Per No)
async function getOrCreateEmployee(client, employeeCode, employeeName) {
  const existing = await client.query(
    `SELECT employee_id, employee_code, name, created_at, updated_at 
     FROM employees 
     WHERE employee_code = $1`,
    [employeeCode]
  );
  
  if (existing.rows.length > 0) {
    const employee = existing.rows[0];
    
    if (employee.name !== employeeName) {
      await client.query(
        `UPDATE employees 
         SET name = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE employee_code = $2`,
        [employeeName, employeeCode]
      );
      console.log(`📝 Updated employee name: ${employeeCode} from "${employee.name}" to "${employeeName}"`);
    }
    
    return { 
      employee_id: employee.employee_id,
      was_created: false,
      created_at: employee.created_at,
      updated_at: employee.updated_at
    };
  }
  
  const result = await client.query(
    `INSERT INTO employees (employee_code, name, created_at, updated_at)
     VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING employee_id, employee_code, name, created_at, updated_at`,
    [employeeCode, employeeName]
  );
  
  console.log(`🆕 Created new employee: ${employeeName} (Code: ${employeeCode}, ID: ${result.rows[0].employee_id})`);
  
  return { 
    employee_id: result.rows[0].employee_id,
    was_created: true,
    created_at: result.rows[0].created_at,
    updated_at: result.rows[0].updated_at
  };
}

// Helper function to get or create training
async function getOrCreateTraining(client, trainingInfo, userId) {
  let training = await client.query(
    `SELECT * FROM training_programs WHERE training_name ILIKE $1`,
    [`%${trainingInfo.training_name}%`]
  );
  
  if (training.rows.length > 0) {
    return { training: training.rows[0], isNew: false };
  }
  
  const result = await client.query(
    `INSERT INTO training_programs 
     (training_name, description, created_by, requires_manager_feedback, requires_employee_form)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      trainingInfo.training_name,
      `Duration: ${trainingInfo.duration || 'N/A'}\nTrainer: ${trainingInfo.trainer || 'N/A'}\nVenue: ${trainingInfo.venue || 'N/A'}\nCategory: ${trainingInfo.category || 'N/A'}`,
      userId,
      false,
      true
    ]
  );
  
  return { training: result.rows[0], isNew: true };
}

// ==================== HELPER FUNCTIONS FOR DELAYS ====================

// Helper function to convert any time unit to minutes for storage
function convertToMinutes(value, unit) {
  if (!value) return 0;
  const numValue = parseInt(value);
  if (isNaN(numValue)) return 0;
  
  switch (unit?.toLowerCase()) {
    case 'minutes':
      return numValue;
    case 'hours':
      return numValue * 60;
    case 'days':
      return numValue * 24 * 60;
    case 'months':
      return numValue * 30 * 24 * 60;
    default:
      return numValue;
  }
}

// Helper function to format delay for display
function formatDelayForDisplay(value, unit) {
  if (!value) return '0 minutes';
  const numValue = parseInt(value);
  
  switch (unit?.toLowerCase()) {
    case 'minutes':
      return `${numValue} minute${numValue !== 1 ? 's' : ''}`;
    case 'hours':
      return `${numValue} hour${numValue !== 1 ? 's' : ''}`;
    case 'days':
      return `${numValue} day${numValue !== 1 ? 's' : ''}`;
    case 'months':
      return `${numValue} month${numValue !== 1 ? 's' : ''}`;
    default:
      return `${numValue} ${unit || 'minutes'}`;
  }
}

// Helper function to validate delay based on unit
function validateDelay(value, unit, isReminder = false) {
  if (!value) return false;
  const numValue = parseInt(value);
  if (isNaN(numValue)) return false;
  
  switch (unit?.toLowerCase()) {
    case 'minutes':
      if (isReminder) {
        return numValue >= 1 && numValue <= 10080;
      } else {
        return numValue >= 0 && numValue <= 1440;
      }
    case 'hours':
      if (isReminder) {
        return numValue >= 1 && numValue <= 168;
      } else {
        return numValue >= 0 && numValue <= 24;
      }
    case 'days':
      if (isReminder) {
        return numValue >= 1 && numValue <= 30;
      } else {
        return numValue >= 0 && numValue <= 1;
      }
    case 'months':
      if (isReminder) {
        return numValue >= 1 && numValue <= 12;
      } else {
        return numValue >= 0 && numValue <= 12;
      }
    default:
      return false;
  }
}

// Helper function to validate UUID
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// ==============================
// GET TRAINING ID FROM TRAINING NAME
// ==============================
exports.getTrainingIdByName = async (req, res) => {
  try {
    const { training_name } = req.params;
    
    if (!training_name || !training_name.trim()) {
      return res.status(400).json({ 
        error: "Training name is required" 
      });
    }
    
    const result = await pool.query(
      `SELECT training_id, training_name, description, created_at 
       FROM training_programs 
       WHERE training_name ILIKE $1`,
      [`%${training_name.trim()}%`]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: "No training found with the given name",
        training_name: training_name 
      });
    }
    
    // If multiple trainings found, return all matches
    if (result.rows.length > 1) {
      return res.json({
        message: `Found ${result.rows.length} trainings matching "${training_name}"`,
        trainings: result.rows,
        training_id: result.rows[0].training_id // Return first as primary
      });
    }
    
    return res.json({
      training_id: result.rows[0].training_id,
      training_name: result.rows[0].training_name,
      description: result.rows[0].description,
      created_at: result.rows[0].created_at
    });
    
  } catch (error) {
    console.error("❌ Get Training ID By Name Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// GET TRAINING ID FROM TRAINING NAME (POST version for body)
// ==============================
exports.getTrainingIdByNamePost = async (req, res) => {
  try {
    const { training_name } = req.body;
    
    if (!training_name || !training_name.trim()) {
      return res.status(400).json({ 
        error: "Training name is required" 
      });
    }
    
    const result = await pool.query(
      `SELECT training_id, training_name, description, created_at 
       FROM training_programs 
       WHERE training_name ILIKE $1`,
      [`%${training_name.trim()}%`]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        message: "No training found with the given name",
        training_name: training_name 
      });
    }
    
    // If multiple trainings found, return all matches
    if (result.rows.length > 1) {
      return res.json({
        message: `Found ${result.rows.length} trainings matching "${training_name}"`,
        trainings: result.rows,
        training_id: result.rows[0].training_id
      });
    }
    
    return res.json({
      training_id: result.rows[0].training_id,
      training_name: result.rows[0].training_name,
      description: result.rows[0].description,
      created_at: result.rows[0].created_at
    });
    
  } catch (error) {
    console.error("❌ Get Training ID By Name Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// UPLOAD TRAINING WITH EMPLOYEES (from adminController)
// ==============================
exports.uploadTrainingWithEmployees = async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log("🚀 Starting uploadTrainingWithEmployees...");
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    console.log(`📁 File received: ${req.file.originalname}, Path: ${req.file.path}`);
    
    const fileExt = req.file.originalname.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt)) {
      return res.status(400).json({ message: "Please upload an Excel (.xlsx, .xls) or CSV file" });
    }
    
    let trainingInfo = {};
    let employees = [];
    
    if (fileExt === 'csv') {
      console.log("📄 Processing CSV file...");
      const data = await parseCSV(req.file.path);
      console.log(`📊 CSV has ${data.length} rows`);
      
      for (let row of data) {
        if (row["Training Name*"]) trainingInfo.training_name = row["Training Name*"];
        if (row["Training Date*"]) {
          trainingInfo.training_date = row["Training Date*"];
          const dateMatch = row["Training Date*"].match(/From date:\s*(\S+)\s*To date:\s*(\S+)/i);
          if (dateMatch) {
            trainingInfo.start_date = dateMatch[1];
            trainingInfo.end_date = dateMatch[2];
          }
        }
        if (row["Duration* (hrs)"]) trainingInfo.duration = row["Duration* (hrs)"];
        if (row["Trainer*"]) trainingInfo.trainer = row["Trainer*"];
        if (row["Training Venue"]) trainingInfo.venue = row["Training Venue"];
        if (row["Training Category*"]) trainingInfo.category = row["Training Category*"];
        if (row["Program Cost"]) trainingInfo.program_cost = row["Program Cost"];
      }
      
      for (let row of data) {
        if (row["Per No"] && row["Name"]) {
          employees.push({
            employee_code: row["Per No"].toString().trim(),
            name: row["Name"].toString().trim()
          });
        }
      }
    } else {
      console.log("📄 Processing Excel file...");
      const parsed = await parseTrainingExcel(req.file.path);
      trainingInfo = parsed.trainingInfo;
      employees = parsed.employees.map(emp => ({
        employee_code: emp.employee_code.toString().trim(),
        name: emp.name.toString().trim()
      }));
    }
    
    console.log("📊 Training Info:", JSON.stringify(trainingInfo, null, 2));
    console.log(`👥 Found ${employees.length} employees in file`);
    
    if (!trainingInfo.training_name) {
      return res.status(400).json({ message: "Training Name is required in the Excel file" });
    }
    
    if (employees.length === 0) {
      return res.status(400).json({ message: "No employees found in the file. Please ensure 'Per No' and 'Name' columns exist." });
    }
    
    await client.query("BEGIN");
    console.log("🔓 Transaction started");
    
    const userId = req.user?.user_id || null;
    console.log(`👤 User ID: ${userId}`);
    
    const { training, isNew } = await getOrCreateTraining(client, trainingInfo, userId);
    console.log(`📌 Training ${isNew ? 'created' : 'found'}: ${training.training_name} (ID: ${training.training_id})`);
    
    let employeesCreated = 0;
    let employeesAssigned = 0;
    let employeesSkipped = 0;
    let employeesNotFound = 0;
    const employeeErrors = [];
    
    console.log("🔄 Starting to process employees...");
    
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      console.log(`\n--- Processing employee ${i + 1}/${employees.length}: ${emp.employee_code} ---`);
      
      try {
        if (!emp.employee_code || !emp.name) {
          console.log(`⚠️ Missing data - Code: "${emp.employee_code}", Name: "${emp.name}"`);
          employeesSkipped++;
          employeeErrors.push({ employee: emp, error: "Missing employee_code or name" });
          continue;
        }
        
        console.log(`🔍 Looking up employee with code: ${emp.employee_code}`);
        const employee = await getOrCreateEmployee(client, emp.employee_code, emp.name);
        
        if (!employee || !employee.employee_id) {
          console.log(`❌ Failed to get/create employee for code: ${emp.employee_code}`);
          employeesNotFound++;
          employeeErrors.push({ 
            employee: emp, 
            error: "Failed to create/retrieve employee from database" 
          });
          continue;
        }
        
        console.log(`✅ Employee found/created: ID=${employee.employee_id}, Name=${emp.name}, WasCreated=${employee.was_created}`);
        
        console.log(`📝 Attempting to assign employee ${employee.employee_id} to training ${training.training_id}`);
        
        const assignResult = await client.query(
          `INSERT INTO training_employees (employee_id, training_id, status, assigned_at)
           VALUES ($1, $2, 'pending', CURRENT_TIMESTAMP)
           ON CONFLICT (employee_id, training_id) DO NOTHING
           RETURNING employee_id, training_id`,
          [employee.employee_id, training.training_id]
        );
        
        console.log(`📊 Query result: ${assignResult.rows.length} rows returned`);
        
        if (assignResult.rows.length > 0) {
          employeesAssigned++;
          console.log(`✅ SUCCESS: Assigned employee ${emp.employee_code} to training ${training.training_id}`);
          
          if (employee.was_created) {
            employeesCreated++;
            console.log(`🆕 Employee was newly created`);
          }
        } else {
          console.log(`⚠️ Employee ${emp.employee_code} was not assigned. Checking reason...`);
          
          const checkExists = await client.query(
            `SELECT te.*, tp.training_name 
             FROM training_employees te
             JOIN training_programs tp ON te.training_id = tp.training_id
             WHERE te.employee_id = $1 AND te.training_id = $2`,
            [employee.employee_id, training.training_id]
          );
          
          if (checkExists.rows.length > 0) {
            console.log(`   Reason: Already assigned to this training (Status: ${checkExists.rows[0].status})`);
            employeeErrors.push({ 
              employee: emp, 
              error: "Already assigned to this training" 
            });
          } else {
            console.log(`   Reason: Unknown - INSERT didn't return row but no conflict found`);
            employeeErrors.push({ 
              employee: emp, 
              error: "Unknown error during assignment" 
            });
          }
          employeesSkipped++;
        }
        
      } catch (empError) {
        employeesSkipped++;
        employeeErrors.push({ 
          employee: emp, 
          error: empError.message 
        });
        console.error(`❌ ERROR processing employee ${emp.employee_code}:`, empError.message);
        console.error(empError.stack);
      }
    }
    
    console.log("\n📊 Final Summary Before Commit:");
    console.log(`   - Total employees: ${employees.length}`);
    console.log(`   - Assigned: ${employeesAssigned}`);
    console.log(`   - Created: ${employeesCreated}`);
    console.log(`   - Skipped: ${employeesSkipped}`);
    console.log(`   - Not Found: ${employeesNotFound}`);
    
    await client.query("COMMIT");
    console.log("✅ Transaction COMMITTED successfully");
    
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
      console.log("🗑️ Temporary file deleted");
    }
    
    const response = {
      message: `✅ Training "${training.training_name}" processed successfully!`,
      training: {
        training_id: training.training_id,
        training_name: training.training_name,
        is_new: isNew,
        description: training.description
      },
      summary: {
        total_employees_in_file: employees.length,
        employees_created_in_system: employeesCreated,
        employees_assigned_to_training: employeesAssigned,
        employees_skipped: employeesSkipped,
        employees_not_found: employeesNotFound
      }
    };
    
    if (employeeErrors.length > 0) {
      response.errors = employeeErrors.slice(0, 10);
      if (employeeErrors.length > 10) {
        response.errors_truncated = true;
        response.total_errors = employeeErrors.length;
      }
    }
    
    console.log("\n📊 Training Upload Summary:");
    console.log(`   - Training: ${training.training_name} (${isNew ? 'NEW' : 'EXISTING'})`);
    console.log(`   - Assigned: ${employeesAssigned}/${employees.length} employees`);
    console.log(`   - New employees created: ${employeesCreated}`);
    console.log(`   - Skipped: ${employeesSkipped}`);
    
    res.json(response);
    
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ TRAINING UPLOAD ERROR:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ message: `Error processing file: ${err.message}` });
  } finally {
    client.release();
    console.log("🔒 Database connection released");
  }
};

// ==============================
// CREATE TRAINING (UPDATED with requires_employee_form)
// ==============================
exports.createTraining = async (req, res) => {
  try {
    const {
      training_name,
      description,
      employee_form_link,
      manager_form_link,
      initial_delay_value,
      initial_delay_unit,
      reminder_delay_value,
      reminder_delay_unit,
      requires_manager_feedback,
      requires_employee_form
    } = req.body;

    if (!req.user || !req.user.user_id) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!training_name || !training_name.trim()) {
      return res.status(400).json({ error: "training_name is required" });
    }

    const currentUser = req.user;

    const needsManagerFeedback = requires_manager_feedback === true || requires_manager_feedback === "true";
    const needsEmployeeForm = requires_employee_form === true || requires_employee_form === "true";

    let initialDelayMinutes = 0;
    let reminderDelayMinutes = 0;
    let initialDelayUnitStored = "minutes";
    let reminderDelayUnitStored = "minutes";

    if (needsManagerFeedback) {
      if (!manager_form_link || !manager_form_link.trim()) {
        return res.status(400).json({
          error: "manager_form_link is required when manager feedback is enabled"
        });
      }

      if (initial_delay_value !== undefined && initial_delay_value !== null && initial_delay_value !== "") {
        if (!validateDelay(initial_delay_value, initial_delay_unit, false)) {
          return res.status(400).json({
            error: `Invalid initial delay: ${initial_delay_value} ${initial_delay_unit}. Valid ranges: minutes (0-1440), hours (0-24), days (0-1), months (0-12)`
          });
        }
        
        initialDelayMinutes = convertToMinutes(initial_delay_value, initial_delay_unit);
        initialDelayUnitStored = "minutes";
      } else {
        initialDelayMinutes = 0;
      }

      if (reminder_delay_value !== undefined && reminder_delay_value !== null && reminder_delay_value !== "") {
        if (!validateDelay(reminder_delay_value, reminder_delay_unit, true)) {
          return res.status(400).json({
            error: `Invalid reminder delay: ${reminder_delay_value} ${reminder_delay_unit}. Valid ranges: minutes (1-10080), hours (1-168), days (1-30), months (1-12)`
          });
        }
        
        reminderDelayMinutes = convertToMinutes(reminder_delay_value, reminder_delay_unit);
        reminderDelayUnitStored = "minutes";
      } else {
        reminderDelayMinutes = 3 * 24 * 60;
      }

      console.log("📊 Manager feedback configuration:", {
        initial_delay: `${initial_delay_value} ${initial_delay_unit} (${initialDelayMinutes} minutes)`,
        reminder_delay: `${reminder_delay_value} ${reminder_delay_unit} (${reminderDelayMinutes} minutes)`,
        form_link: manager_form_link
      });
    }

    const query = `
      INSERT INTO training_programs
      (
        training_name,
        description,
        employee_form_link,
        manager_form_link,
        initial_delay_value,
        initial_delay_unit,
        reminder_delay_value,
        reminder_delay_unit,
        requires_manager_feedback,
        requires_employee_form,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING training_id, training_name
    `;

    const result = await pool.query(query, [
      training_name.trim(),
      description || null,
      needsEmployeeForm ? (employee_form_link || null) : null,
      needsManagerFeedback ? manager_form_link.trim() : null,
      needsManagerFeedback ? initialDelayMinutes : 0,
      needsManagerFeedback ? initialDelayUnitStored : "minutes",
      needsManagerFeedback ? reminderDelayMinutes : 0,
      needsManagerFeedback ? reminderDelayUnitStored : "minutes",
      needsManagerFeedback,
      needsEmployeeForm,
      currentUser.user_id
    ]);

    console.log(`✅ Training created: ${result.rows[0].training_name} (ID: ${result.rows[0].training_id})`);

    return res.json({
      message: "Training created successfully",
      training_id: result.rows[0].training_id,
      training_name: result.rows[0].training_name
    });
  } catch (error) {
    console.error("❌ Create Training Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// GET TRAININGS
// ==============================
exports.getTrainings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.training_id,
        tp.training_name,
        tp.description,
        tp.employee_form_link,
        tp.manager_form_link,
        tp.initial_delay_value,
        tp.initial_delay_unit,
        tp.reminder_delay_value,
        tp.reminder_delay_unit,
        tp.requires_manager_feedback,
        tp.requires_employee_form,
        tp.created_by,
        tp.created_at,
        u.name AS created_by_name,
        u.email AS created_by_email,
        COUNT(DISTINCT te.employee_id) AS total_enrolled,
        COUNT(DISTINCT CASE WHEN te.status = 'completed' THEN te.employee_id END) AS completed_count
      FROM training_programs tp
      LEFT JOIN app_users u ON tp.created_by = u.user_id
      LEFT JOIN training_employees te ON tp.training_id = te.training_id
      GROUP BY 
        tp.training_id, 
        tp.training_name, 
        tp.description, 
        tp.employee_form_link, 
        tp.manager_form_link, 
        tp.initial_delay_value,
        tp.initial_delay_unit, 
        tp.reminder_delay_value, 
        tp.reminder_delay_unit,
        tp.requires_manager_feedback,
        tp.requires_employee_form,
        tp.created_by, 
        tp.created_at,
        u.name, 
        u.email
      ORDER BY tp.created_at DESC
    `);

    const trainings = result.rows.map(training => ({
      training_id: training.training_id,
      training_name: training.training_name,
      description: training.description,
      employee_form_link: training.employee_form_link,
      manager_form_link: training.manager_form_link,
      requires_manager_feedback: training.requires_manager_feedback,
      requires_employee_form: training.requires_employee_form,
      total_enrolled: parseInt(training.total_enrolled) || 0,
      completed_count: parseInt(training.completed_count) || 0,
      created_by_name: training.created_by_name,
      created_by_email: training.created_by_email,
      created_at: training.created_at
    }));

    return res.json(trainings);
  } catch (error) {
    console.error("❌ Get Trainings Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// GET SINGLE TRAINING
// ==============================
exports.getTrainingById = async (req, res) => {
  try {
    const { training_id } = req.params;
    
    if (!isValidUUID(training_id)) {
      return res.status(400).json({ error: "Invalid training_id format" });
    }
    
    const trainingResult = await pool.query(`
      SELECT 
        tp.*,
        u.name AS created_by_name,
        u.email AS created_by_email,
        COUNT(DISTINCT te.employee_id) AS total_enrolled
      FROM training_programs tp
      LEFT JOIN app_users u ON tp.created_by = u.user_id
      LEFT JOIN training_employees te ON tp.training_id = te.training_id
      WHERE tp.training_id = $1
      GROUP BY tp.training_id, u.name, u.email
    `, [training_id]);
    
    if (trainingResult.rows.length === 0) {
      return res.status(404).json({ error: "Training not found" });
    }
    
    const employeesResult = await pool.query(`
      SELECT 
        e.employee_id,
        e.name,
        e.email,
        e.department,
        m.name AS manager_name,
        te.status,
        te.assigned_at,
        te.completed_at,
        EXISTS(SELECT 1 FROM employee_feedback ef WHERE ef.employee_id = e.employee_id AND ef.training_id = te.training_id) as has_employee_feedback,
        EXISTS(SELECT 1 FROM manager_feedback mf WHERE mf.employee_id = e.employee_id AND mf.training_id = te.training_id) as has_manager_feedback
      FROM training_employees te
      JOIN employees e ON te.employee_id = e.employee_id
      LEFT JOIN managers m ON e.manager_id = m.manager_id
      WHERE te.training_id = $1
      ORDER BY e.name
    `, [training_id]);
    
    const training = trainingResult.rows[0];
    training.employees = employeesResult.rows;
    training.total_enrolled = parseInt(training.total_enrolled) || 0;
    
    return res.json(training);
  } catch (error) {
    console.error("❌ Get Training By ID Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// ASSIGN EMPLOYEES TO TRAINING
// ==============================
exports.assignEmployeesToTraining = async (req, res) => {
  const client = await pool.connect();

  try {
    const { employee_ids, training_id } = req.body;

    if (!training_id || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({
        error: "training_id and employee_ids are required"
      });
    }

    if (!isValidUUID(training_id)) {
      return res.status(400).json({ error: "Invalid training_id format" });
    }

    if (employee_ids.length > 1000) {
      return res.status(400).json({
        error: "Cannot assign more than 1000 employees at once"
      });
    }

    await client.query("BEGIN");

    const trainingCheck = await client.query(
      "SELECT training_id, training_name FROM training_programs WHERE training_id = $1",
      [training_id]
    );

    if (trainingCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Training not found"
      });
    }

    let assignedCount = 0;
    let skippedCount = 0;
    const skippedEmployees = [];
    const assignedEmployees = [];
    const invalidUUIDs = [];

    for (const empId of employee_ids) {
      if (!isValidUUID(empId)) {
        invalidUUIDs.push(empId);
        skippedCount++;
        continue;
      }

      const employeeCheck = await client.query(
        "SELECT employee_id, name, email FROM employees WHERE employee_id = $1",
        [empId]
      );

      if (employeeCheck.rows.length === 0) {
        skippedCount++;
        skippedEmployees.push(empId);
        continue;
      }

      try {
        const result = await client.query(
          `
          INSERT INTO training_employees
          (employee_id, training_id, assigned_at, status)
          VALUES ($1, $2, CURRENT_TIMESTAMP, 'pending')
          ON CONFLICT (employee_id, training_id) DO NOTHING
          RETURNING employee_id
          `,
          [empId, training_id]
        );

        if (result.rows.length > 0) {
          assignedCount++;
          assignedEmployees.push(empId);
        } else {
          skippedCount++;
          skippedEmployees.push(empId);
        }
      } catch (insertError) {
        console.error(`Error inserting employee ${empId}:`, insertError);
        skippedCount++;
        skippedEmployees.push(empId);
      }
    }

    await client.query("COMMIT");

    const response = {
      message: `${assignedCount} employees assigned successfully`,
      training_id,
      training_name: trainingCheck.rows[0].training_name,
      assigned_count: assignedCount,
      total_submitted: employee_ids.length
    };

    if (skippedCount > 0) {
      response.warning = `${skippedCount} employee(s) were skipped (already assigned, not found, or invalid UUID)`;
      response.skipped_count = skippedCount;
      response.skipped_employees = skippedEmployees.slice(0, 10);
      if (skippedEmployees.length > 10) {
        response.skipped_employees_truncated = true;
      }
    }

    if (invalidUUIDs.length > 0) {
      response.invalid_uuids = invalidUUIDs.slice(0, 10);
      if (invalidUUIDs.length > 10) {
        response.invalid_uuids_truncated = true;
      }
    }

    console.log(`✅ Assigned ${assignedCount} employees to training ${training_id}`);

    return res.json(response);

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Assign Employees Error:", error);
    return res.status(500).json({ error: "Server error: " + error.message });
  } finally {
    client.release();
  }
};

// ==============================
// GET TRAINING EMPLOYEES
// ==============================
exports.getTrainingEmployees = async (req, res) => {
  try {
    const { training_id } = req.params;
    
    if (!isValidUUID(training_id)) {
      return res.status(400).json({ error: "Invalid training_id format" });
    }
    
    const result = await pool.query(`
      SELECT 
        e.employee_id,
        e.name,
        e.email,
        e.department,
        e.manager_id,
        m.name AS manager_name,
        te.status,
        te.assigned_at,
        te.completed_at,
        te.manager_form_sent,
        te.manager_form_sent_date
      FROM training_employees te
      JOIN employees e ON te.employee_id = e.employee_id
      LEFT JOIN managers m ON e.manager_id = m.manager_id
      WHERE te.training_id = $1
      ORDER BY e.name
    `, [training_id]);
    
    return res.json({
      training_id,
      total: result.rows.length,
      employees: result.rows
    });
  } catch (error) {
    console.error("❌ Get Training Employees Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// TRAINING REPORT
// ==============================
exports.getTrainingReport = async (req, res) => {
  try {
    const { training_id } = req.params;
    
    if (!isValidUUID(training_id)) {
      return res.status(400).json({ error: "Invalid training_id format" });
    }

    // Get training details with counts
    const trainingDetails = await pool.query(`
      SELECT 
        tp.training_id,
        tp.training_name,
        tp.description,
        tp.employee_form_link,
        tp.manager_form_link,
        tp.requires_manager_feedback,
        tp.requires_employee_form,
        tp.created_at,
        COUNT(DISTINCT te.employee_id) AS total_employees_count,
        COUNT(DISTINCT CASE WHEN te.status = 'completed' THEN te.employee_id END) AS completed_count
      FROM training_programs tp
      LEFT JOIN training_employees te ON tp.training_id = te.training_id
      WHERE tp.training_id = $1
      GROUP BY tp.training_id, tp.training_name, tp.description, tp.employee_form_link, tp.manager_form_link, tp.requires_manager_feedback, tp.requires_employee_form, tp.created_at
    `, [training_id]);

    if (trainingDetails.rows.length === 0) {
      return res.status(404).json({ message: "Training not found" });
    }

    const training = trainingDetails.rows[0];

    // Get all employees with their feedback
    const feedbackQuery = `
      SELECT 
        e.employee_id,
        e.employee_code,
        e.name,
        e.email,
        e.department,
        e.manager_id,
        m.name AS manager_name,
        m.email AS manager_email,
        te.status,
        te.assigned_at,
        te.completed_at,
        -- Employee feedback
        ef.rating AS employee_rating,
        ef.comments AS employee_comments,
        ef.submitted_at AS employee_feedback_date,
        -- Manager feedback
        mf.performance_rating AS manager_rating,
        mf.manager_comments AS manager_comments,
        mf.submitted_at AS manager_feedback_date,
        -- Feedback status flags
        CASE WHEN ef.rating IS NOT NULL THEN true ELSE false END as has_employee_feedback,
        CASE WHEN mf.performance_rating IS NOT NULL THEN true ELSE false END as has_manager_feedback
      FROM training_employees te
      JOIN employees e ON te.employee_id = e.employee_id
      LEFT JOIN managers m ON e.manager_id = m.manager_id
      LEFT JOIN employee_feedback ef
        ON ef.employee_id = e.employee_id 
        AND ef.training_id = te.training_id
      LEFT JOIN manager_feedback mf
        ON mf.employee_id = e.employee_id
        AND mf.training_id = te.training_id
      WHERE te.training_id = $1
      ORDER BY e.name
    `;

    const feedbackResult = await pool.query(feedbackQuery, [training_id]);

    // Calculate statistics
    const employeesWithEmployeeFeedback = feedbackResult.rows.filter(r => r.has_employee_feedback);
    const employeesWithManagerFeedback = feedbackResult.rows.filter(r => r.has_manager_feedback);
    const employeesWithBothFeedbacks = feedbackResult.rows.filter(r => r.has_employee_feedback && r.has_manager_feedback);
    
    // Calculate average ratings
    const avgEmployeeRating = employeesWithEmployeeFeedback.length > 0
      ? employeesWithEmployeeFeedback.reduce((sum, r) => sum + (parseFloat(r.employee_rating) || 0), 0) / employeesWithEmployeeFeedback.length
      : 0;
      
    const avgManagerRating = employeesWithManagerFeedback.length > 0
      ? employeesWithManagerFeedback.reduce((sum, r) => sum + (parseFloat(r.manager_rating) || 0), 0) / employeesWithManagerFeedback.length
      : 0;

    // Calculate rating distributions
    const employeeRatingDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };
    const managerRatingDistribution = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0
    };

    employeesWithEmployeeFeedback.forEach(r => {
      const rating = Math.round(parseFloat(r.employee_rating));
      if (rating >= 1 && rating <= 5) {
        employeeRatingDistribution[rating]++;
      }
    });

    employeesWithManagerFeedback.forEach(r => {
      const rating = Math.round(parseFloat(r.manager_rating));
      if (rating >= 1 && rating <= 5) {
        managerRatingDistribution[rating]++;
      }
    });

    const totalEmployees = parseInt(training.total_employees_count) || 0;
    const completedCount = parseInt(training.completed_count) || 0;
    const completionRate = totalEmployees > 0 ? (completedCount / totalEmployees) * 100 : 0;
    
    const employeeFeedbackRate = totalEmployees > 0 ? (employeesWithEmployeeFeedback.length / totalEmployees) * 100 : 0;
    const managerFeedbackRate = totalEmployees > 0 ? (employeesWithManagerFeedback.length / totalEmployees) * 100 : 0;

    return res.json({
      // Training info
      training_id: training.training_id,
      training_name: training.training_name,
      description: training.description,
      employee_form_link: training.employee_form_link,
      manager_form_link: training.manager_form_link,
      requires_manager_feedback: training.requires_manager_feedback,
      requires_employee_form: training.requires_employee_form,
      created_at: training.created_at,
      
      // Summary statistics
      summary: {
        total_employees: totalEmployees,
        completed_count: completedCount,
        completion_rate: Math.round(completionRate * 100) / 100,
        employee_feedback_count: employeesWithEmployeeFeedback.length,
        employee_feedback_rate: Math.round(employeeFeedbackRate * 100) / 100,
        manager_feedback_count: employeesWithManagerFeedback.length,
        manager_feedback_rate: Math.round(managerFeedbackRate * 100) / 100,
        both_feedbacks_count: employeesWithBothFeedbacks.length,
        pending_feedback_count: totalEmployees - employeesWithEmployeeFeedback.length
      },
      
      // Rating statistics
      ratings: {
        avg_employee_rating: Math.round(avgEmployeeRating * 100) / 100,
        avg_manager_rating: Math.round(avgManagerRating * 100) / 100,
        employee_rating_distribution: employeeRatingDistribution,
        manager_rating_distribution: managerRatingDistribution
      },
      
      // Detailed employee list
      employees: feedbackResult.rows.map(emp => ({
        employee_id: emp.employee_id,
        employee_code: emp.employee_code,
        name: emp.name,
        email: emp.email,
        department: emp.department,
        manager_name: emp.manager_name,
        manager_email: emp.manager_email,
        training_status: emp.status,
        assigned_at: emp.assigned_at,
        completed_at: emp.completed_at,
        employee_feedback: {
            has_feedback: emp.has_employee_feedback,
            rating: emp.employee_rating ? parseFloat(emp.employee_rating) : null,
            comments: emp.employee_comments,
            submitted_at: emp.employee_feedback_date
        },
        manager_feedback: {
            has_feedback: emp.has_manager_feedback,
            rating: emp.manager_rating ? parseFloat(emp.manager_rating) : null,
            comments: emp.manager_comments,
            submitted_at: emp.manager_feedback_date
        }
      }))
    });
  } catch (error) {
    console.error("❌ Get Training Report Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// GET OVERALL TRAINING STATISTICS
// ==============================
exports.getOverallTrainingStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT tp.training_id) as total_trainings,
        COUNT(DISTINCT te.employee_id) as total_enrollments,
        COUNT(DISTINCT CASE WHEN te.status = 'completed' THEN te.employee_id END) as total_completions,
        COUNT(DISTINCT ef.employee_id) as total_employee_feedback,
        COUNT(DISTINCT mf.employee_id) as total_manager_feedback,
        ROUND(AVG(CASE WHEN ef.rating IS NOT NULL THEN ef.rating END), 2) as avg_employee_rating,
        ROUND(AVG(CASE WHEN mf.performance_rating IS NOT NULL THEN mf.performance_rating END), 2) as avg_manager_rating
      FROM training_programs tp
      LEFT JOIN training_employees te ON tp.training_id = te.training_id
      LEFT JOIN employee_feedback ef ON te.employee_id = ef.employee_id AND te.training_id = ef.training_id
      LEFT JOIN manager_feedback mf ON te.employee_id = mf.employee_id AND te.training_id = mf.training_id
    `);
    
    return res.json({
      stats: result.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Get Overall Stats Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// UPDATE EMPLOYEE TRAINING STATUS
// ==============================
exports.updateTrainingStatus = async (req, res) => {
  try {
    const { training_id, employee_id } = req.params;
    const { status } = req.body;
    
    if (!isValidUUID(training_id) || !isValidUUID(employee_id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }
    
    const validStatuses = ['pending', 'in_progress', 'completed', 'dropped'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    
    const result = await pool.query(`
      UPDATE training_employees
      SET status = $1,
          completed_at = CASE WHEN $1 = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE training_id = $2 AND employee_id = $3
      RETURNING *
    `, [status, training_id, employee_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Training assignment not found" });
    }
    
    return res.json({
      message: "Status updated successfully",
      assignment: result.rows[0]
    });
  } catch (error) {
    console.error("❌ Update Training Status Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// GET EMPLOYEES
// ==============================
exports.getEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.employee_id, 
        e.employee_code,
        e.name, 
        e.email, 
        e.department,
        e.manager_id,
        m.name AS manager_name,
        m.email AS manager_email
      FROM employees e
      LEFT JOIN managers m ON e.manager_id = m.manager_id
      ORDER BY e.name
    `);

    return res.json(result.rows);
  } catch (error) {
    console.error("❌ Get Employees Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// GET MANAGERS
// ==============================
exports.getManagers = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.manager_id, 
        m.name, 
        m.email, 
        m.department,
        COUNT(DISTINCT e.employee_id) AS team_size
      FROM managers m
      LEFT JOIN employees e ON m.manager_id = e.manager_id
      GROUP BY m.manager_id, m.name, m.email, m.department
      ORDER BY m.name
    `);

    const managers = result.rows.map(manager => ({
      manager_id: manager.manager_id,
      name: manager.name,
      email: manager.email,
      department: manager.department,
      team_size: parseInt(manager.team_size) || 0
    }));

    return res.json(managers);
  } catch (error) {
    console.error("❌ Get Managers Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// VALIDATE EMPLOYEES (for bulk upload)
// ==============================
exports.validateEmployees = async (req, res) => {
  try {
    const { employee_ids } = req.body;
    
    if (!Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({
        error: "employee_ids array is required"
      });
    }
    
    if (employee_ids.length > 5000) {
      return res.status(400).json({
        error: "Cannot validate more than 5000 employees at once"
      });
    }
    
    const validUUIDs = employee_ids.filter(id => isValidUUID(id));
    const invalidFormatIds = employee_ids.filter(id => !isValidUUID(id));
    
    if (validUUIDs.length === 0) {
      return res.status(400).json({
        error: "No valid UUIDs provided. Employee IDs must be in UUID format.",
        invalid_format_ids: invalidFormatIds.slice(0, 20)
      });
    }
    
    const placeholders = validUUIDs.map((_, i) => `$${i + 1}`).join(',');
    const query = `
      SELECT employee_id, name, email, department, manager_id
      FROM employees
      WHERE employee_id IN (${placeholders})
    `;
    
    const result = await pool.query(query, validUUIDs);
    const foundIds = result.rows.map(row => row.employee_id);
    const notFoundIds = validUUIDs.filter(id => !foundIds.includes(id));
    
    return res.json({
      total_validated: employee_ids.length,
      valid_uuids_count: validUUIDs.length,
      found: foundIds.length,
      not_found: notFoundIds.length,
      valid_employees: result.rows,
      invalid_format_ids: invalidFormatIds.slice(0, 20),
      not_found_employee_ids: notFoundIds.slice(0, 100)
    });
  } catch (error) {
    console.error("❌ Validate Employees Error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// ==============================
// DEBUG CHECK ASSIGNMENTS
// ==============================
exports.debugCheckAssignments = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const trainingEmployees = await client.query(`
      SELECT 
        te.id,
        te.training_id,
        te.employee_id,
        te.status,
        te.assigned_at,
        tp.training_name,
        e.employee_code,
        e.name as employee_name
      FROM training_employees te
      LEFT JOIN training_programs tp ON te.training_id = tp.training_id
      LEFT JOIN employees e ON te.employee_id = e.employee_id
      ORDER BY te.assigned_at DESC
      LIMIT 20
    `);
    
    const employees = await client.query(`
      SELECT employee_id, employee_code, name, email, created_at
      FROM employees
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    const trainings = await client.query(`
      SELECT training_id, training_name, created_at
      FROM training_programs
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM training_employees) as training_employees_count,
        (SELECT COUNT(*) FROM employees) as employees_count,
        (SELECT COUNT(*) FROM training_programs) as trainings_count
    `);
    
    res.json({
      counts: counts.rows[0],
      recent_assignments: trainingEmployees.rows,
      recent_employees: employees.rows,
      recent_trainings: trainings.rows
    });
    
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};

// ==============================
// SCHEDULE EMPLOYEE MAILS FOR TRAINING
// ==============================
exports.scheduleEmployeeMailsForTraining = async (req, res) => {
  try {
    const { training_id, delay_minutes = 0 } = req.body;

    if (!training_id || !isValidUUID(training_id)) {
      return res.status(400).json({
        error: "Valid training_id is required"
      });
    }

    const trainingCheck = await pool.query(
      `
      SELECT training_id, training_name, employee_form_link, requires_employee_form
      FROM training_programs
      WHERE training_id = $1
      `,
      [training_id]
    );

    if (trainingCheck.rows.length === 0) {
      return res.status(404).json({
        error: "Training not found"
      });
    }

    const training = trainingCheck.rows[0];

    if (!training.requires_employee_form) {
      return res.status(400).json({
        error: "Employee feedback form is not enabled for this training"
      });
    }

    if (!training.employee_form_link) {
      return res.status(400).json({
        error: "Employee form link is missing for this training"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO scheduled_employee_emails
      (
        employee_id,
        training_id,
        email,
        form_link,
        scheduled_time,
        status
      )
      SELECT
        te.employee_id,
        te.training_id,
        e.email,
        tp.employee_form_link,
        NOW() + ($2 || ' minutes')::interval,
        'pending'
      FROM training_employees te
      JOIN employees e
        ON te.employee_id = e.employee_id
      JOIN training_programs tp
        ON te.training_id = tp.training_id
      WHERE te.training_id = $1
      AND e.email IS NOT NULL
      AND e.email <> ''
      AND tp.employee_form_link IS NOT NULL
      AND tp.requires_employee_form = true
      ON CONFLICT (employee_id, training_id)
      DO NOTHING
      `,
      [training_id, delay_minutes]
    );

    return res.json({
      message: "Employee mails scheduled successfully",
      training_id,
      training_name: training.training_name,
      scheduled_count: result.rowCount
    });

  } catch (error) {
    console.error("❌ Schedule Employee Mails Error:", error);
    return res.status(500).json({
      error: error.message
    });
  }
};

exports.exportTrainingReportExcel = async (req, res) => {
  try {
    const { training_id } = req.params;

    if (!isValidUUID(training_id)) {
      return res.status(400).json({ error: "Invalid training_id" });
    }

    const trainingResult = await pool.query(`
      SELECT *
      FROM training_programs
      WHERE training_id = $1
    `, [training_id]);

    if (trainingResult.rows.length === 0) {
      return res.status(404).json({ error: "Training not found" });
    }

    const training = trainingResult.rows[0];

    const result = await pool.query(`
      SELECT
        e.employee_id,
        e.employee_code,
        e.name,
        e.email,
        e.department,
        te.status,
        te.assigned_at,
        te.completed_at,

        m.manager_id,
        m.name AS manager_name,
        m.email AS manager_email,

        ef.rating AS employee_rating,
        ef.comments AS employee_comments,
        ef.submitted_at AS employee_submitted_at,

        mf.performance_rating AS manager_rating,
        mf.manager_comments AS manager_comments,
        mf.submitted_at AS manager_submitted_at

      FROM training_employees te
      JOIN employees e ON te.employee_id = e.employee_id
      LEFT JOIN managers m ON e.manager_id = m.manager_id
      LEFT JOIN employee_feedback ef
        ON ef.employee_id = e.employee_id
        AND ef.training_id = te.training_id
      LEFT JOIN manager_feedback mf
        ON mf.employee_id = e.employee_id
        AND mf.training_id = te.training_id
      WHERE te.training_id = $1
      ORDER BY e.name
    `, [training_id]);

    const rows = result.rows;

    const workbook = XLSX.utils.book_new();

    const trainingReport = rows.map((r) => ({
      "Employee Id": r.employee_code || r.employee_id,
      "Name": r.name,
      "Department": r.department || "",
      "TrainingType": "",
      "TrainingNameOrCourseName": training.training_name,
      "TrainerName": "",
      "CourseStatus": r.status || "",
      "StartDate": r.assigned_at || "",
      "EndDate": r.completed_at || "",
      "Hours": ""
    }));

    const employeeFeedbackReport = [];

    rows.forEach((r) => {
      if (r.employee_rating) {
        employeeFeedbackReport.push({
          "Employee Id": r.employee_code || r.employee_id,
          "Name": r.name,
          "Training Name": training.training_name,
          "Question": "Overall rating of the programme",
          "Response": r.employee_rating,
          "Department": r.department || "",
          "Training Date and time": r.employee_submitted_at || ""
        });
      }

      if (r.employee_comments) {
        employeeFeedbackReport.push({
          "Employee Id": r.employee_code || r.employee_id,
          "Name": r.name,
          "Training Name": training.training_name,
          "Question": "Employee comments",
          "Response": r.employee_comments,
          "Department": r.department || "",
          "Training Date and time": r.employee_submitted_at || ""
        });
      }
    });

    const managerFeedbackReport = [];

    rows.forEach((r) => {
      if (r.manager_rating) {
        managerFeedbackReport.push({
          "Feedback": "Managers Feedback (Feedback review)",
          "Employee Id": r.employee_code || r.employee_id,
          "Name": r.name,
          "Manager Id": r.manager_id || "",
          "ManagerName": r.manager_name || "",
          "Question": "Manager overall rating",
          "Response": r.manager_rating,
          "QuestionType": "SingleChoice",
          "TrainingName": training.training_name,
          "SubmittedDate": r.manager_submitted_at || "",
          "Average": r.manager_rating,
          "Department": r.department || "",
          "Training Date and time": r.assigned_at || ""
        });
      }

      if (r.manager_comments) {
        managerFeedbackReport.push({
          "Feedback": "Managers Feedback (Feedback review)",
          "Employee Id": r.employee_code || r.employee_id,
          "Name": r.name,
          "Manager Id": r.manager_id || "",
          "ManagerName": r.manager_name || "",
          "Question": "Manager comments",
          "Response": r.manager_comments,
          "QuestionType": "Descriptive",
          "TrainingName": training.training_name,
          "SubmittedDate": r.manager_submitted_at || "",
          "Average": "",
          "Department": r.department || "",
          "Training Date and time": r.assigned_at || ""
        });
      }
    });

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(trainingReport),
      "Training report"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(employeeFeedbackReport),
      "Employee Feedback report"
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(managerFeedbackReport),
      "Manager's Feedback report"
    );

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    const safeName = training.training_name.replace(/[^a-z0-9]/gi, "_");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=Reports_ARAI_Training_${safeName}.xlsx`
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);

  } catch (error) {
    console.error("❌ Export Training Report Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ==============================
// EXPORT ALL DATABASE REPORTS
// ==============================
exports.exportAllDatabaseReports = async (req, res) => {
  try {
    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();

    const queries = {
      "Employees": `
        SELECT 
          e.employee_code,
          e.name AS employee_name,
          e.email,
          e.department,
          m.name AS manager_name,
          m.email AS manager_email,
          e.created_at
        FROM employees e
        LEFT JOIN managers m ON e.manager_id = m.manager_id
        ORDER BY e.name
      `,

      "Managers": `
        SELECT 
          m.name AS manager_name,
          m.email,
          m.department,
          COUNT(e.employee_id) AS team_size,
          m.created_at
        FROM managers m
        LEFT JOIN employees e ON m.manager_id = e.manager_id
        GROUP BY m.manager_id
        ORDER BY m.name
      `,

      "Training Programs": `
        SELECT 
          tp.training_name,
          tp.description,
          tp.requires_employee_form,
          tp.requires_manager_feedback,
          tp.employee_form_link,
          tp.manager_form_link,
          tp.initial_delay_value,
          tp.initial_delay_unit,
          tp.reminder_delay_value,
          tp.reminder_delay_unit,
          tp.created_at
        FROM training_programs tp
        ORDER BY tp.created_at DESC
      `,

      "Training Employees": `
        SELECT
          tp.training_name,
          e.employee_code,
          e.name AS employee_name,
          e.email,
          e.department,
          te.status,
          te.assigned_at,
          te.completed_at
        FROM training_employees te
        JOIN employees e ON te.employee_id = e.employee_id
        JOIN training_programs tp ON te.training_id = tp.training_id
        ORDER BY te.assigned_at DESC
      `,

      "Employee Feedback": `
        SELECT
          tp.training_name,
          e.employee_code,
          e.name AS employee_name,
          e.department,
          ef.rating,
          ef.comments,
          ef.form_completed,
          ef.manager_email_sent,
          ef.manager_email_sent_at,
          ef.manager_reminder_count,
          ef.submitted_at
        FROM employee_feedback ef
        LEFT JOIN employees e ON ef.employee_id = e.employee_id
        LEFT JOIN training_programs tp ON ef.training_id = tp.training_id
        ORDER BY ef.submitted_at DESC
      `,

      "Manager Feedback": `
        SELECT
          tp.training_name,
          e.employee_code,
          e.name AS employee_name,
          m.name AS manager_name,
          m.email AS manager_email,
          mf.performance_rating,
          mf.manager_comments,
          mf.form_completed,
          mf.submitted_at
        FROM manager_feedback mf
        LEFT JOIN employees e ON mf.employee_id = e.employee_id
        LEFT JOIN managers m ON mf.manager_id = m.manager_id
        LEFT JOIN training_programs tp ON mf.training_id = tp.training_id
        ORDER BY mf.submitted_at DESC
      `,

      "Manager Scheduled Emails": `
        SELECT
          tp.training_name,
          e.employee_code,
          e.name AS employee_name,
          m.name AS manager_name,
          se.email,
          se.email_type,
          se.form_link,
          se.scheduled_time,
          se.email_sent,
          se.sent_at,
          se.attempts,
          se.max_attempts,
          se.status,
          se.error_message,
          se.email_cancelled,
          se.cancelled_at,
          se.cancellation_reason
        FROM scheduled_emails se
        LEFT JOIN employees e ON se.employee_id = e.employee_id
        LEFT JOIN managers m ON se.manager_id = m.manager_id
        LEFT JOIN training_programs tp ON se.training_id = tp.training_id
        ORDER BY se.scheduled_time DESC
      `,

      "Employee Scheduled Emails": `
        SELECT
          tp.training_name,
          e.employee_code,
          e.name AS employee_name,
          see.email,
          see.form_link,
          see.scheduled_time,
          see.email_sent,
          see.sent_at,
          see.attempts,
          see.max_attempts,
          see.status,
          see.error_message,
          see.email_cancelled,
          see.cancelled_at,
          see.cancellation_reason,
          see.created_at
        FROM scheduled_employee_emails see
        LEFT JOIN employees e ON see.employee_id = e.employee_id
        LEFT JOIN training_programs tp ON see.training_id = tp.training_id
        ORDER BY see.scheduled_time DESC
      `
    };

    const summaryResult = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM employees) AS total_employees,
        (SELECT COUNT(*) FROM managers) AS total_managers,
        (SELECT COUNT(*) FROM training_programs) AS total_trainings,
        (SELECT COUNT(*) FROM training_employees) AS total_training_assignments,
        (SELECT COUNT(*) FROM employee_feedback) AS total_employee_feedback,
        (SELECT COUNT(*) FROM manager_feedback) AS total_manager_feedback,
        (SELECT COUNT(*) FROM scheduled_emails) AS total_manager_scheduled_emails,
        (SELECT COUNT(*) FROM scheduled_employee_emails) AS total_employee_scheduled_emails
    `);

    const summarySheet = XLSX.utils.json_to_sheet(summaryResult.rows);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    for (const [sheetName, query] of Object.entries(queries)) {
      const result = await pool.query(query);
      const sheet = XLSX.utils.json_to_sheet(result.rows);

      sheet["!cols"] = Object.keys(result.rows[0] || {}).map(() => ({
        wch: 25
      }));

      XLSX.utils.book_append_sheet(workbook, sheet, sheetName.substring(0, 31));
    }

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=All_Database_Reports.xlsx`
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);

  } catch (error) {
    console.error("❌ Export All Reports Error:", error);
    return res.status(500).json({
      error: error.message
    });
  }
};

exports.exportSingleTableReport = async (req, res) => {
  try {
    const XLSX = require("xlsx");
    const { table } = req.params;

    const reports = {
      employees: {
        sheet: "Employees",
        filename: "Employees_Report.xlsx",
        query: `
          SELECT 
            e.employee_code,
            e.name AS employee_name,
            e.email,
            e.department,
            m.name AS manager_name,
            m.email AS manager_email,
            e.created_at
          FROM employees e
          LEFT JOIN managers m ON e.manager_id = m.manager_id
          ORDER BY e.name
        `
      },

      managers: {
        sheet: "Managers",
        filename: "Managers_Report.xlsx",
        query: `
          SELECT 
            m.name AS manager_name,
            m.email,
            m.department,
            COUNT(e.employee_id) AS team_size,
            m.created_at
          FROM managers m
          LEFT JOIN employees e ON m.manager_id = e.manager_id
          GROUP BY m.manager_id
          ORDER BY m.name
        `
      },

      training_programs: {
        sheet: "Training Programs",
        filename: "Training_Programs_Report.xlsx",
        query: `
          SELECT 
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
            created_at
          FROM training_programs
          ORDER BY created_at DESC
        `
      },

      training_employees: {
        sheet: "Training Employees",
        filename: "Training_Employees_Report.xlsx",
        query: `
          SELECT
            tp.training_name,
            e.employee_code,
            e.name AS employee_name,
            e.email,
            e.department,
            te.status,
            te.assigned_at,
            te.completed_at
          FROM training_employees te
          JOIN employees e ON te.employee_id = e.employee_id
          JOIN training_programs tp ON te.training_id = tp.training_id
          ORDER BY te.assigned_at DESC
        `
      },

      employee_feedback: {
        sheet: "Employee Feedback",
        filename: "Employee_Feedback_Report.xlsx",
        query: `
          SELECT
            tp.training_name,
            e.employee_code,
            e.name AS employee_name,
            e.department,
            ef.rating,
            ef.comments,
            ef.form_completed,
            ef.manager_email_sent,
            ef.manager_email_sent_at,
            ef.manager_reminder_count,
            ef.submitted_at
          FROM employee_feedback ef
          LEFT JOIN employees e ON ef.employee_id = e.employee_id
          LEFT JOIN training_programs tp ON ef.training_id = tp.training_id
          ORDER BY ef.submitted_at DESC
        `
      },

      manager_feedback: {
        sheet: "Manager Feedback",
        filename: "Manager_Feedback_Report.xlsx",
        query: `
          SELECT
            tp.training_name,
            e.employee_code,
            e.name AS employee_name,
            m.name AS manager_name,
            m.email AS manager_email,
            mf.performance_rating,
            mf.manager_comments,
            mf.form_completed,
            mf.submitted_at
          FROM manager_feedback mf
          LEFT JOIN employees e ON mf.employee_id = e.employee_id
          LEFT JOIN managers m ON mf.manager_id = m.manager_id
          LEFT JOIN training_programs tp ON mf.training_id = tp.training_id
          ORDER BY mf.submitted_at DESC
        `
      },

      scheduled_emails: {
        sheet: "Manager Scheduled Emails",
        filename: "Manager_Scheduled_Emails_Report.xlsx",
        query: `
          SELECT
            tp.training_name,
            e.employee_code,
            e.name AS employee_name,
            m.name AS manager_name,
            se.email,
            se.email_type,
            se.form_link,
            se.scheduled_time,
            se.email_sent,
            se.sent_at,
            se.attempts,
            se.max_attempts,
            se.status,
            se.error_message,
            se.email_cancelled,
            se.cancelled_at,
            se.cancellation_reason
          FROM scheduled_emails se
          LEFT JOIN employees e ON se.employee_id = e.employee_id
          LEFT JOIN managers m ON se.manager_id = m.manager_id
          LEFT JOIN training_programs tp ON se.training_id = tp.training_id
          ORDER BY se.scheduled_time DESC
        `
      },

      scheduled_employee_emails: {
        sheet: "Employee Scheduled Emails",
        filename: "Employee_Scheduled_Emails_Report.xlsx",
        query: `
          SELECT
            tp.training_name,
            e.employee_code,
            e.name AS employee_name,
            see.email,
            see.form_link,
            see.scheduled_time,
            see.email_sent,
            see.sent_at,
            see.attempts,
            see.max_attempts,
            see.status,
            see.error_message,
            see.email_cancelled,
            see.cancelled_at,
            see.cancellation_reason,
            see.created_at
          FROM scheduled_employee_emails see
          LEFT JOIN employees e ON see.employee_id = e.employee_id
          LEFT JOIN training_programs tp ON see.training_id = tp.training_id
          ORDER BY see.scheduled_time DESC
        `
      }
    };

    if (!reports[table]) {
      return res.status(400).json({ error: "Invalid report table selected" });
    }

    const result = await pool.query(reports[table].query);

    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(result.rows);

    sheet["!cols"] = Object.keys(result.rows[0] || {}).map(() => ({
      wch: 25
    }));

    XLSX.utils.book_append_sheet(workbook, sheet, reports[table].sheet);

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${reports[table].filename}`
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);

  } catch (error) {
    console.error("❌ Export Single Table Report Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

// ==============================
// GET TABLE DATA AS JSON (for frontend display)
// ==============================

// Get employees table data
exports.getEmployeesTable = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        e.employee_id,
        e.employee_code,
        e.name,
        e.email,
        e.department,
        m.name AS manager_name,
        e.created_at
      FROM employees e
      LEFT JOIN managers m ON e.manager_id = m.manager_id
      ORDER BY e.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get Employees Table Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get managers table data
exports.getManagersTable = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.manager_id,
        m.name,
        m.email,
        m.department,
        COUNT(e.employee_id) AS team_size,
        m.created_at
      FROM managers m
      LEFT JOIN employees e ON m.manager_id = e.manager_id
      GROUP BY m.manager_id, m.name, m.email, m.department, m.created_at
      ORDER BY m.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get Managers Table Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get training programs table data
exports.getTrainingProgramsTable = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        training_id,
        training_name,
        description,
        requires_employee_form,
        requires_manager_feedback,
        created_at
      FROM training_programs
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get Training Programs Table Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get training employees table data
exports.getTrainingEmployeesTable = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.training_name,
        e.employee_code,
        e.name AS employee_name,
        e.email,
        e.department,
        te.status,
        te.assigned_at,
        te.completed_at
      FROM training_employees te
      JOIN employees e ON te.employee_id = e.employee_id
      JOIN training_programs tp ON te.training_id = tp.training_id
      ORDER BY te.assigned_at DESC
      LIMIT 1000
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get Training Employees Table Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get employee feedback table data
exports.getEmployeeFeedbackTable = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.training_name,
        e.employee_code,
        e.name AS employee_name,
        e.department,
        ef.rating,
        ef.comments,
        ef.submitted_at
      FROM employee_feedback ef
      LEFT JOIN employees e ON ef.employee_id = e.employee_id
      LEFT JOIN training_programs tp ON ef.training_id = tp.training_id
      ORDER BY ef.submitted_at DESC
      LIMIT 1000
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get Employee Feedback Table Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get manager feedback table data
exports.getManagerFeedbackTable = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.training_name,
        e.employee_code,
        e.name AS employee_name,
        m.name AS manager_name,
        m.email AS manager_email,
        mf.performance_rating,
        mf.manager_comments,
        mf.submitted_at
      FROM manager_feedback mf
      LEFT JOIN employees e ON mf.employee_id = e.employee_id
      LEFT JOIN managers m ON mf.manager_id = m.manager_id
      LEFT JOIN training_programs tp ON mf.training_id = tp.training_id
      ORDER BY mf.submitted_at DESC
      LIMIT 1000
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get Manager Feedback Table Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get scheduled emails table data
exports.getScheduledEmailsTable = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.training_name,
        e.employee_code,
        e.name AS employee_name,
        m.name AS manager_name,
        se.email,
        se.email_type,
        se.scheduled_time,
        se.email_sent,
        se.attempts,
        se.status,
        se.email_cancelled
      FROM scheduled_emails se
      LEFT JOIN employees e ON se.employee_id = e.employee_id
      LEFT JOIN managers m ON se.manager_id = m.manager_id
      LEFT JOIN training_programs tp ON se.training_id = tp.training_id
      ORDER BY se.scheduled_time DESC
      LIMIT 1000
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get Scheduled Emails Table Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get scheduled employee emails table data
exports.getScheduledEmployeeEmailsTable = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        tp.training_name,
        e.employee_code,
        e.name AS employee_name,
        see.email,
        see.scheduled_time,
        see.email_sent,
        see.attempts,
        see.status,
        see.created_at
      FROM scheduled_employee_emails see
      LEFT JOIN employees e ON see.employee_id = e.employee_id
      LEFT JOIN training_programs tp ON see.training_id = tp.training_id
      ORDER BY see.scheduled_time DESC
      LIMIT 1000
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get Scheduled Employee Emails Table Error:", error);
    res.status(500).json({ error: error.message });
  }
};