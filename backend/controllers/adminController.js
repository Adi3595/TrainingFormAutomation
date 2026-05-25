// adminController.js
const csv = require('csv-parser');
const fs = require('fs');
const XLSX = require('xlsx');
const crypto = require('crypto');
const pool = require("../db");

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

// Updated parseTrainingExcel function to handle your exact Excel format
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

        // A=0, B=1, C=2, D=3, E=4, F=5, G=6
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

function convertToMinutes(value, unit) {
  if (!value) return 0;
  switch (unit?.toLowerCase()) {
    case 'minutes': return parseInt(value);
    case 'hours': return parseInt(value) * 60;
    case 'days': return parseInt(value) * 24 * 60;
    default: return parseInt(value) || 0;
  }
}

// Helper function to generate UUID v5 from employee code
function generateUUIDFromCode(employeeCode) {
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace UUID
  const namespaceBuffer = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBuffer = Buffer.from(employeeCode);
  
  // Create SHA-1 hash
  const hash = crypto.createHash('sha1');
  hash.update(namespaceBuffer);
  hash.update(nameBuffer);
  const hashBuffer = hash.digest();
  
  // Set version (5) and variant bits
  hashBuffer[6] = (hashBuffer[6] & 0x0f) | 0x50;
  hashBuffer[8] = (hashBuffer[8] & 0x3f) | 0x80;
  
  // Format as UUID
  const uuid = hashBuffer.toString('hex', 0, 16);
  return `${uuid.slice(0,8)}-${uuid.slice(8,12)}-${uuid.slice(12,16)}-${uuid.slice(16,20)}-${uuid.slice(20,32)}`;
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

// Helper function to get or create employee using employee_code (Per No)
async function getOrCreateEmployee(client, employeeCode, employeeName) {
  // First, try to find existing employee by employee_code
  const existing = await client.query(
    `SELECT employee_id, employee_code, name, created_at, updated_at 
     FROM employees 
     WHERE employee_code = $1`,
    [employeeCode]
  );
  
  if (existing.rows.length > 0) {
    const employee = existing.rows[0];
    
    // Update name if it has changed
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
  
  // Create new employee if not exists
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

// Upload Training with Employees (Single Excel File) - FIXED VERSION
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
    
    // STEP 1: Create or get training
    console.log("📌 Getting or creating training...");
    const { training, isNew } = await getOrCreateTraining(client, trainingInfo, userId);
    console.log(`📌 Training ${isNew ? 'created' : 'found'}: ${training.training_name} (ID: ${training.training_id})`);
    
    let employeesCreated = 0;
    let employeesAssigned = 0;
    let employeesSkipped = 0;
    let employeesNotFound = 0;
    const employeeErrors = [];
    
    // STEP 2: Process each employee from Excel
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
        
        // STEP 3: Get or create employee using employee_code
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
        
        // STEP 4: Assign employee to training in training_employees table
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
          
          // Check if employee was newly created in this session
          if (employee.was_created) {
            employeesCreated++;
            console.log(`🆕 Employee was newly created`);
          }
        } else {
          // Check why it wasn't assigned
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
    
    // Clean up uploaded file
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

// Upload Employees CSV
exports.uploadEmployees = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({ message: "Please upload a CSV file" });
    }

    const data = await parseCSV(req.file.path);
    
    if (data.length === 0) {
      return res.status(400).json({ message: "CSV file is empty" });
    }

    await client.query("BEGIN");

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let row of data) {
      try {
        const employee_code = row.employee_code || row["employee_code"] || row["Per No"] || row["Employee Code"];
        const name = row.name || row.Name;
        const email = row.email || row.Email;
        const department = row.department || row.Department;
        const manager_id = row.manager_id || row["manager_id"];

        if (!employee_code || !name || !email) {
          skippedCount++;
          errors.push({ employee_code, email, error: "Missing required fields (employee_code, name, or email)" });
          continue;
        }

        const generatedUUID = generateUUIDFromCode(employee_code);
        
        const result = await client.query(
          `INSERT INTO employees (employee_id, employee_code, name, email, department, manager_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (employee_code) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             department = EXCLUDED.department,
             manager_id = EXCLUDED.manager_id
           RETURNING *`,
          [generatedUUID, employee_code, name, email, department || null, manager_id || null]
        );

        if (result.rows.length > 0) {
          insertedCount++;
          console.log(`✅ Processed employee: ${name} (Code: ${employee_code}, UUID: ${generatedUUID})`);
        } else {
          skippedCount++;
        }
      } catch (rowError) {
        console.error(`❌ Error processing employee:`, rowError.message);
        skippedCount++;
        errors.push({ 
          employee_code: row.employee_code || row["Per No"],
          email: row.email, 
          error: rowError.message 
        });
      }
    }

    await client.query("COMMIT");
    
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json({
      message: `Employees processed: ${insertedCount} inserted/updated, ${skippedCount} skipped`,
      details: { inserted: insertedCount, updated: updatedCount, skipped: skippedCount }
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Employee Upload Error:", err);
    res.status(500).json({ message: `Error uploading employees: ${err.message}` });
  } finally {
    client.release();
  }
};

// ============================================================
// UPDATED: Upload Managers CSV (with duplicate handling)
// ============================================================
exports.uploadManagers = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({ message: "Please upload a CSV file" });
    }

    const data = await parseCSV(req.file.path);
    
    if (data.length === 0) {
      return res.status(400).json({ message: "CSV file is empty" });
    }

    await client.query("BEGIN");

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let row of data) {
      try {
        // Get values from CSV with multiple possible column names
        const manager_code = row.manager_code || row["manager_code"] || row["Manager Code"] || row["ManagerCode"] || "";
        const name = row.name || row.Name || row["Manager Name"] || "";
        const email = row.email || row.Email || row["Manager Email"] || "";
        const department = row.department || row.Department || "";

        if (!manager_code || !name || !email) {
          skippedCount++;
          errors.push({ manager_code, email, error: "Missing required fields (manager_code, name, or email)" });
          continue;
        }

        // Check if manager already exists by manager_code or email
        const existing = await client.query(
          `SELECT manager_id, manager_code, name, email FROM managers WHERE manager_code = $1 OR email = $2`,
          [manager_code, email]
        );

        let result;

        if (existing.rows.length > 0) {
          // Update existing manager
          result = await client.query(
            `UPDATE managers 
             SET name = $1, 
                 email = $2, 
                 department = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE manager_code = $4
             RETURNING manager_id, manager_code, name, email, department`,
            [name, email, department || null, manager_code]
          );
          updatedCount++;
          console.log(`✅ Updated manager: ${name} (Code: ${manager_code})`);
        } else {
          // Check if code already exists (race condition)
          const codeCheck = await client.query(
            `SELECT manager_code FROM managers WHERE manager_code = $1`,
            [manager_code]
          );
          
          let finalCode = manager_code;
          if (codeCheck.rows.length > 0) {
            const randomSuffix = Math.floor(Math.random() * 10000);
            finalCode = `${manager_code}_${randomSuffix}`;
            console.log(`⚠️ Manager code ${manager_code} exists, using: ${finalCode}`);
          }
          
          // Generate UUID from manager_code
          const generatedUUID = generateManagerUUIDFromCode(finalCode);
          
          // Insert new manager
          result = await client.query(
            `INSERT INTO managers (manager_id, manager_code, name, email, department, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING manager_id, manager_code, name, email, department`,
            [generatedUUID, finalCode, name, email, department || null]
          );
          insertedCount++;
          console.log(`✅ Inserted new manager: ${name} (Code: ${finalCode}, UUID: ${result.rows[0].manager_id})`);
        }

        if (result.rows.length === 0) {
          skippedCount++;
        }
        
      } catch (rowError) {
        console.error(`❌ Error processing manager:`, rowError.message);
        skippedCount++;
        errors.push({ 
          manager_code: row.manager_code || row["Manager Code"],
          email: row.email, 
          error: rowError.message 
        });
      }
    }

    await client.query("COMMIT");
    
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json({
      message: `Managers processed: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped`,
      details: { inserted: insertedCount, updated: updatedCount, skipped: skippedCount },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Manager Upload Error:", err);
    res.status(500).json({ message: `Error uploading managers: ${err.message}` });
  } finally {
    client.release();
  }
};

// Helper function to generate UUID v5 from manager code (similar to employees)
// ============================================================
// UPDATED HELPER FUNCTION: Generate UUID v5 from manager code
// ============================================================
function generateManagerUUIDFromCode(managerCode) {
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace UUID
  const namespaceBuffer = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBuffer = Buffer.from(managerCode);
  
  // Create SHA-1 hash
  const hash = crypto.createHash('sha1');
  hash.update(namespaceBuffer);
  hash.update(nameBuffer);
  const hashBuffer = hash.digest();
  
  // Set version (5) and variant bits
  hashBuffer[6] = (hashBuffer[6] & 0x0f) | 0x50;
  hashBuffer[8] = (hashBuffer[8] & 0x3f) | 0x80;
  
  // Format as UUID
  const uuid = hashBuffer.toString('hex', 0, 16);
  return `${uuid.slice(0,8)}-${uuid.slice(8,12)}-${uuid.slice(12,16)}-${uuid.slice(16,20)}-${uuid.slice(20,32)}`;
}

// ============================================================
// UPDATED: Get or Create Manager (with duplicate handling)
// ============================================================
async function getOrCreateManager(client, managerCode, managerName, managerEmail, department) {
  // First, try to find existing manager by manager_code
  let existing = null;
  
  if (managerCode && managerCode.trim() !== "") {
    existing = await client.query(
      `SELECT manager_id, manager_code, name, email, department, created_at, updated_at 
       FROM managers 
       WHERE manager_code = $1`,
      [managerCode]
    );
  }
  
  // If not found by code, try by email
  if ((!existing || existing.rows.length === 0) && managerEmail && managerEmail.trim() !== "") {
    existing = await client.query(
      `SELECT manager_id, manager_code, name, email, department, created_at, updated_at 
       FROM managers 
       WHERE email = $1`,
      [managerEmail]
    );
  }
  
  // If found, return existing manager
  if (existing && existing.rows.length > 0) {
    const manager = existing.rows[0];
    
    // Update name if it has changed
    if (manager.name !== managerName && managerName) {
      await client.query(
        `UPDATE managers 
         SET name = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE manager_code = $2`,
        [managerName, manager.manager_code]
      );
      console.log(`📝 Updated manager name: ${manager.manager_code} from "${manager.name}" to "${managerName}"`);
    }
    
    return { 
      manager_id: manager.manager_id,
      manager_code: manager.manager_code,
      was_created: false
    };
  }
  
  // If no manager_code provided, try to find by name
  if ((!managerCode || managerCode.trim() === "") && managerName) {
    existing = await client.query(
      `SELECT manager_id, manager_code, name, email, department 
       FROM managers 
       WHERE name ILIKE $1 LIMIT 1`,
      [`%${managerName.trim()}%`]
    );
    
    if (existing && existing.rows.length > 0) {
      console.log(`✅ Found existing manager by name: ${managerName} (Code: ${existing.rows[0].manager_code})`);
      return { 
        manager_id: existing.rows[0].manager_id,
        manager_code: existing.rows[0].manager_code,
        was_created: false
      };
    }
  }
  
  // Create new manager - generate unique manager_code
  let newManagerCode = managerCode;
  
  // If no manager_code provided, generate a unique one
  if (!newManagerCode || newManagerCode.trim() === "") {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    newManagerCode = `MGR_${timestamp}_${randomSuffix}`;
  } else {
    // Check if manager_code already exists (race condition safety)
    const codeCheck = await client.query(
      `SELECT manager_code FROM managers WHERE manager_code = $1`,
      [newManagerCode]
    );
    
    if (codeCheck.rows.length > 0) {
      // If code exists, append random suffix
      const randomSuffix = Math.floor(Math.random() * 10000);
      newManagerCode = `${newManagerCode}_${randomSuffix}`;
      console.log(`⚠️ Manager code already exists, using: ${newManagerCode}`);
    }
  }
  
  // Generate UUID from manager_code
  const generatedUUID = generateManagerUUIDFromCode(newManagerCode);
  
  // Create new manager
  const result = await client.query(
    `INSERT INTO managers (manager_id, manager_code, name, email, department, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING manager_id, manager_code, name, email, department`,
    [generatedUUID, newManagerCode, managerName, managerEmail || null, department || null]
  );
  
  console.log(`🆕 Created new manager: ${managerName} (Code: ${newManagerCode}, ID: ${result.rows[0].manager_id})`);
  
  return { 
    manager_id: result.rows[0].manager_id,
    manager_code: result.rows[0].manager_code,
    was_created: true
  };
}

// Upload Employee Feedback CSV (UPDATED - sends email to training creator/admin)
exports.uploadEmployeeFeedback = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({ message: "Please upload a CSV file" });
    }

    const data = await parseCSV(req.file.path);
    
    if (data.length === 0) {
      return res.status(400).json({ message: "CSV file is empty" });
    }

    await client.query("BEGIN");

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let emailScheduledCount = 0;
    let adminNotificationCount = 0;
    const errors = [];
    
    // Store notifications grouped by training creator
    const notificationsByCreator = new Map(); // Key: creator_email, Value: { creatorName, notifications: [] }

    for (let row of data) {
      try {
        // Map columns based on your Excel format
        const employee_name = (row["Name"] || row["Employee Name"] || row["name"] || row["Name of participant"] || "").toString().trim();
        const employee_code = (row["Per No"] || row["Employee ID"] || row["employee_code"] || row["Employee Code"] || row["Employee code"] || "").toString().trim();
        const training_name = (row["Training Name"] || row["Training Program Name"] || row["training_name"] || "").toString().trim();
        const faculty_name = (row["Faculty Name"] || row["Trainer Name"] || row["faculty_name"] || "").toString().trim();
        
        // Map rating
        let rating = null;
        let ratingText = "";
        const ratingColumn = row["Overall rating of the programme? (5 Excellent and 1 Poor)"] || 
                            row["rating"] || 
                            row["Rating"] || 
                            row["Overall rating"] || 
                            "";
        
        if (ratingColumn) {
          const ratingValue = ratingColumn.toString().trim();
          ratingText = ratingValue;
          if (!isNaN(ratingValue) && ratingValue >= 1 && ratingValue <= 5) {
            rating = parseInt(ratingValue, 10);
          } else if (ratingValue.toLowerCase() === "excellent") {
            rating = 5;
          } else if (ratingValue.toLowerCase() === "very good") {
            rating = 4;
          } else if (ratingValue.toLowerCase() === "good") {
            rating = 3;
          } else if (ratingValue.toLowerCase() === "average") {
            rating = 2;
          } else if (ratingValue.toLowerCase() === "poor") {
            rating = 1;
          }
        }
        
        // Map comments - combine multiple feedback columns
        let comments = "";
        const relevanceComments = row["Relevance of training content to your role"] || "";
        const trainerEffectiveness = row["Trainers effectiveness & engagement"] || "";
        const programDesign = row["Overall program design, content & duration"] || "";
        const recommend = row["Would you recommend this training to others?"] || "";
        const openComments = row["What did you like most about the training?"] || row["comments"] || "";
        
        // Build comprehensive comments
        const commentParts = [];
        if (relevanceComments) commentParts.push(`Content Relevance: ${relevanceComments}`);
        if (trainerEffectiveness) commentParts.push(`Trainer Effectiveness: ${trainerEffectiveness}`);
        if (programDesign) commentParts.push(`Program Design: ${programDesign}`);
        if (recommend) commentParts.push(`Would Recommend: ${recommend}`);
        if (openComments) commentParts.push(`Additional Comments: ${openComments}`);
        
        comments = commentParts.join(" | ");

        console.log("Processing employee feedback:", {
          employee_name,
          employee_code,
          training_name,
          rating,
          comments
        });

        // Validate required fields
        if (!training_name) {
          console.log("❌ Missing training_name in row:", row);
          skippedCount++;
          errors.push({ row: row, error: "Missing training name" });
          continue;
        }

        if (!employee_name && !employee_code) {
          console.log("❌ Missing both employee name and code in row:", row);
          skippedCount++;
          errors.push({ row: row, error: "Missing employee name and code" });
          continue;
        }

        // Find employee by code first (priority), then by name
        let employee = null;
        
        if (employee_code) {
          employee = await client.query(
            `SELECT employee_id, employee_code, name, manager_id, email FROM employees WHERE employee_code = $1`,
            [employee_code]
          );
        }
        
        if ((!employee || employee.rows.length === 0) && employee_name) {
          console.log(`🔍 Looking up employee by name: "${employee_name}"`);
          employee = await client.query(
            `SELECT employee_id, employee_code, name, manager_id, email FROM employees WHERE name ILIKE $1 LIMIT 1`,
            [`%${employee_name.trim()}%`]
          );
        }

        if (!employee || employee.rows.length === 0) {
          console.log(`⚠ Employee not found: ${employee_code || employee_name}`);
          skippedCount++;
          errors.push({ 
            employee_code, 
            employee_name, 
            error: "Employee not found in database" 
          });
          continue;
        }

        const employeeId = employee.rows[0].employee_id;
        const employeeManagerId = employee.rows[0].manager_id;
        const employeeEmail = employee.rows[0].email;
        console.log(`✅ Found employee: ${employee.rows[0].name} (Code: ${employee.rows[0].employee_code}, ID: ${employeeId})`);

        // Get training by name (INCLUDING creator info)
        let training = await client.query(
          `SELECT tp.training_id, tp.training_name, tp.requires_manager_feedback, tp.manager_form_link, 
                  tp.initial_delay_value, tp.initial_delay_unit, tp.reminder_delay_value, tp.reminder_delay_unit,
                  tp.created_by, u.name as creator_name, u.email as creator_email
           FROM training_programs tp
           LEFT JOIN app_users u ON tp.created_by = u.user_id
           WHERE tp.training_name ILIKE $1 
           LIMIT 1`,
          [`%${training_name.trim()}%`]
        );

        if (training.rows.length === 0) {
          // Try exact match
          training = await client.query(
            `SELECT tp.training_id, tp.training_name, tp.requires_manager_feedback, tp.manager_form_link,
                    tp.initial_delay_value, tp.initial_delay_unit, tp.reminder_delay_value, tp.reminder_delay_unit,
                    tp.created_by, u.name as creator_name, u.email as creator_email
             FROM training_programs tp
             LEFT JOIN app_users u ON tp.created_by = u.user_id
             WHERE tp.training_name = $1`,
            [training_name.trim()]
          );
        }

        if (training.rows.length === 0) {
          console.log(`⚠ No training found with name: "${training_name}"`);
          skippedCount++;
          errors.push({ 
            training_name, 
            employee_name, 
            error: "Training not found in database" 
          });
          continue;
        }

        const trainingId = training.rows[0].training_id;
        const trainingName = training.rows[0].training_name;
        const creatorEmail = training.rows[0].creator_email;
        const creatorName = training.rows[0].creator_name || "Training Creator";
        
        console.log(`✅ Found training: ${trainingName} (ID: ${trainingId})`);
        console.log(`📧 Training Creator: ${creatorName} (${creatorEmail})`);

        // Check if feedback already exists
        const existingFeedback = await client.query(
          `SELECT response_id, rating, comments, form_completed, submitted_at
           FROM employee_feedback 
           WHERE employee_id = $1 AND training_id = $2`,
          [employeeId, trainingId]
        );

        let feedbackResult;
        let isUpdate = false;
        let previousRating = null;

        if (existingFeedback.rows.length > 0) {
          previousRating = existingFeedback.rows[0].rating;
          // Update existing feedback
          feedbackResult = await client.query(
            `UPDATE employee_feedback 
             SET rating = $1, 
                 comments = $2, 
                 form_completed = true, 
                 submitted_at = CURRENT_TIMESTAMP
             WHERE employee_id = $3 AND training_id = $4
             RETURNING *`,
            [rating, comments || null, employeeId, trainingId]
          );
          isUpdate = true;
          updatedCount++;
          console.log(`📝 Updated existing feedback for employee ${employee.rows[0].name}`);
        } else {
          // Insert new feedback
          feedbackResult = await client.query(
            `INSERT INTO employee_feedback 
             (employee_id, training_id, rating, comments, form_completed, submitted_at)
             VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
             RETURNING *`,
            [employeeId, trainingId, rating, comments || null]
          );
          insertedCount++;
          console.log(`✅ Inserted new feedback for employee ${employee.rows[0].name}`);
        }

        if (feedbackResult.rows.length === 0) {
          skippedCount++;
          errors.push({ 
            employee_name, 
            training_name, 
            error: "Failed to save feedback" 
          });
          continue;
        }

        // 📧 Store notification for the training creator (admin who created this training)
        if (creatorEmail) {
          if (!notificationsByCreator.has(creatorEmail)) {
            notificationsByCreator.set(creatorEmail, {
              creatorName: creatorName,
              creatorEmail: creatorEmail,
              notifications: []
            });
          }
          
          notificationsByCreator.get(creatorEmail).notifications.push({
            employeeName: employee.rows[0].name,
            employeeCode: employee.rows[0].employee_code,
            trainingName: trainingName,
            rating: rating,
            ratingText: ratingText,
            comments: comments,
            isUpdate: isUpdate,
            previousRating: previousRating,
            submittedAt: new Date()
          });
          
          adminNotificationCount++;
        }

        // Check if manager feedback is required for this training
        if (training.rows[0].requires_manager_feedback && training.rows[0].manager_form_link) {
          
          if (!employeeManagerId) {
            console.log(`⚠ No manager_id found for employee: ${employee.rows[0].name}`);
            continue;
          }

          // Get manager details
          const manager = await client.query(
            `SELECT manager_id, name, email FROM managers WHERE manager_id = $1`,
            [employeeManagerId]
          );

          if (manager.rows.length === 0) {
            console.log(`⚠ Manager not found for manager_id: ${employeeManagerId}`);
            continue;
          }

          const managerEmail = manager.rows[0].email;
          const managerId = manager.rows[0].manager_id;

          console.log("📌 Scheduling manager email with:", {
            employee_name: employee.rows[0].name,
            training_name: trainingName,
            manager_id: managerId,
            manager_email: managerEmail
          });

          const initialDelayMinutes = convertToMinutes(
            training.rows[0].initial_delay_value,
            training.rows[0].initial_delay_unit
          );

          const initialScheduledTime = new Date();
          if (initialDelayMinutes > 0) {
            initialScheduledTime.setMinutes(
              initialScheduledTime.getMinutes() + initialDelayMinutes
            );
          }

          const reminderDelayMinutes = convertToMinutes(
            training.rows[0].reminder_delay_value,
            training.rows[0].reminder_delay_unit
          );

          const existingEmail = await client.query(
            `SELECT * FROM scheduled_emails 
             WHERE employee_id = $1 AND training_id = $2 AND email_type = 'initial' AND email_sent = false`,
            [employeeId, trainingId]
          );

          if (existingEmail.rows.length === 0) {
            await client.query(
              `INSERT INTO scheduled_emails 
               (email, form_link, scheduled_time, employee_id, training_id, manager_id, 
                email_type, email_sent, attempts, max_attempts, 
                reminder_delay_minutes, initial_delay_minutes, status)
               VALUES ($1, $2, $3, $4, $5, $6, 'initial', false, 0, 3, $7, $8, 'pending')`,
              [
                managerEmail,
                training.rows[0].manager_form_link,
                initialScheduledTime,
                employeeId,
                trainingId,
                managerId,
                reminderDelayMinutes,
                initialDelayMinutes
              ]
            );

            emailScheduledCount++;
            console.log(`📧 Initial email scheduled for: ${managerEmail} at ${initialScheduledTime}`);
          } else {
            console.log(`📧 Email already scheduled for this employee-training combination`);
          }
        }

      } catch (rowError) {
        console.error(`❌ Error processing row:`, rowError.message);
        skippedCount++;
        errors.push({ 
          row: row, 
          error: rowError.message 
        });
      }
    }

    await client.query("COMMIT");
    
    // 📧 Send notifications to each training creator (admin who created the training)
    if (notificationsByCreator.size > 0) {
      try {
        const emailService = require("../services/emailService");
        
        for (const [creatorEmail, data] of notificationsByCreator.entries()) {
          await emailService.sendTrainingCreatorNotification(
            creatorEmail,
            data.creatorName,
            data.notifications
          );
          console.log(`📧 Notification sent to training creator: ${creatorEmail} (${data.notifications.length} submissions)`);
        }
        
      } catch (emailError) {
        console.error("❌ Failed to send creator notification emails:", emailError.message);
        // Don't fail the main request if email fails
      }
    }
    
    // Clean up uploaded file
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json({ 
      message: `✅ Employee feedback processed successfully!`,
      summary: { 
        inserted: insertedCount, 
        updated: updatedCount,
        skipped: skippedCount, 
        emailsScheduled: emailScheduledCount,
        creatorsNotified: notificationsByCreator.size,
        totalNotificationsSent: adminNotificationCount
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Feedback Upload Error:", err);
    res.status(500).json({ message: `Error uploading feedback: ${err.message}` });
  } finally {
    client.release();
  }
};

// Upload Manager Feedback CSV/Excel (UPDATED - Only looks up managers, no auto-creation)
exports.uploadManagerFeedback = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileExt = req.file.originalname.split('.').pop().toLowerCase();
    let data = [];

    if (fileExt === 'csv') {
      data = await parseCSV(req.file.path);
    } else if (['xlsx', 'xls'].includes(fileExt)) {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(sheet);
    } else {
      return res.status(400).json({ message: "Please upload a CSV or Excel (.xlsx, .xls) file" });
    }

    if (data.length === 0) {
      return res.status(400).json({ message: "File is empty" });
    }

    await client.query("BEGIN");

    let insertedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let cancelledEmailsCount = 0;
    const errors = [];

    for (let row of data) {
      try {
        // Helper function to get column value with multiple possible names
        const getColumnValue = (row, possibleNames) => {
          for (const name of possibleNames) {
            if (row[name] !== undefined && row[name] !== null && row[name] !== "") {
              return row[name];
            }
            for (const key of Object.keys(row)) {
              if (key.toLowerCase() === name.toLowerCase()) {
                if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
                  return row[key];
                }
              }
            }
          }
          return "";
        };

        // ============================================================
        // COLUMN MAPPING - Based on Microsoft Form Export
        // ============================================================
        
        // Training Information
        const training_name = getColumnValue(row, [
          "Training Name",
          "TrainingName",
          "training_name"
        ]).toString().trim();

        // Employee Information
        const employee_name = getColumnValue(row, [
          "Employee Full Name",
          "Employee Name",
          "Name",
          "employee_name"
        ]).toString().trim();

        const employee_code = getColumnValue(row, [
          "Employee ID Number",
          "Employee Id",
          "Employee ID",
          "employee_id",
          "employeeId",
          "Per No"
        ]).toString().trim();

        const department = getColumnValue(row, [
          "Department",
          "department"
        ]).toString().trim();

        // Manager Information
        const manager_name = getColumnValue(row, [
          "Manager Full Name",
          "Manager Name",
          "manager_name",
          "Manager name"
        ]).toString().trim();

        const manager_code = getColumnValue(row, [
          "Manager ID Number",
          "Manager Id",
          "Manager ID",
          "manager_id",
          "managerId",
          "ManagerCode"
        ]).toString().trim();

        // ============================================================
        // RATING QUESTIONS
        // ============================================================
        
        // Rating 1: Competency Level BEFORE Training (1-5 scale)
        const competencyBeforeRaw = getColumnValue(row, [
          "Rate the employee's competency level before the training? ( 5 Excellent and 1 Poor )",
          "Rate the employee's competency level before the training?",
          "Competency Level Before Training",
          "competency_before"
        ]).toString().trim();
        
        let competencyBefore = null;
        if (competencyBeforeRaw) {
          const ratingValue = competencyBeforeRaw.toString().trim();
          if (!isNaN(ratingValue) && ratingValue >= 1 && ratingValue <= 5) {
            competencyBefore = parseInt(ratingValue, 10);
          } else if (ratingValue.toLowerCase() === "excellent") {
            competencyBefore = 5;
          } else if (ratingValue.toLowerCase() === "very good") {
            competencyBefore = 4;
          } else if (ratingValue.toLowerCase() === "good") {
            competencyBefore = 3;
          } else if (ratingValue.toLowerCase() === "fair") {
            competencyBefore = 2;
          } else if (ratingValue.toLowerCase() === "poor") {
            competencyBefore = 1;
          }
        }

        // Rating 2: Competency Level AFTER Training (1-5 scale) - PRIMARY RATING
        const competencyAfterRaw = getColumnValue(row, [
          "Rate the employee's competency level after completing the training? ( 5 Excellent and 1 Poor )",
          "Rate the employee's competency level after completing the training?",
          "Competency Level After Training",
          "competency_after"
        ]).toString().trim();
        
        let competencyAfter = null;
        if (competencyAfterRaw) {
          const ratingValue = competencyAfterRaw.toString().trim();
          if (!isNaN(ratingValue) && ratingValue >= 1 && ratingValue <= 5) {
            competencyAfter = parseInt(ratingValue, 10);
          } else if (ratingValue.toLowerCase() === "excellent") {
            competencyAfter = 5;
          } else if (ratingValue.toLowerCase() === "very good") {
            competencyAfter = 4;
          } else if (ratingValue.toLowerCase() === "good") {
            competencyAfter = 3;
          } else if (ratingValue.toLowerCase() === "fair") {
            competencyAfter = 2;
          } else if (ratingValue.toLowerCase() === "poor") {
            competencyAfter = 1;
          }
        }

        // Rating 3: Overall Performance Improvement (1-5 scale)
        const overallRatingRaw = getColumnValue(row, [
          "Rate the overall performance improvement? ( 5 Excellent and 1 Poor )",
          "Rate the overall performance improvement?",
          "Overall performance improvement",
          "overall_rating"
        ]).toString().trim();
        
        let overallRating = null;
        if (overallRatingRaw) {
          const ratingValue = overallRatingRaw.toString().trim();
          if (!isNaN(ratingValue) && ratingValue >= 1 && ratingValue <= 5) {
            overallRating = parseInt(ratingValue, 10);
          } else if (ratingValue.toLowerCase() === "excellent") {
            overallRating = 5;
          } else if (ratingValue.toLowerCase() === "very good") {
            overallRating = 4;
          } else if (ratingValue.toLowerCase() === "good") {
            overallRating = 3;
          } else if (ratingValue.toLowerCase() === "fair") {
            overallRating = 2;
          } else if (ratingValue.toLowerCase() === "poor") {
            overallRating = 1;
          }
        }

        // ============================================================
        // YES/NO QUESTIONS
        // ============================================================
        
        const competenceEstablished = getColumnValue(row, [
          "Is the necessary competence established?",
          "necessary competence established"
        ]).toString().trim();

        const matrixUpdation = getColumnValue(row, [
          "Competency Matrix Updation Required?",
          "Competency Matrix Updation Required"
        ]).toString().trim();

        // ============================================================
        // DESCRIPTIVE COMMENTS
        // ============================================================
        
        const improvementComments = getColumnValue(row, [
          "Do you notice any improvement / progress in the functional area?",
          "Do you notice any improvement / progress",
          "improvement_progress"
        ]).toString().trim();

        const additionalFeedback = getColumnValue(row, [
          "Additional Feedback / Recommendations",
          "Additional Feedback",
          "Recommendations",
          "additional_feedback"
        ]).toString().trim();

        // Combine all comments into one field
        let comments = "";
        const commentParts = [];
        if (improvementComments) commentParts.push(`📈 Improvement/Progress: ${improvementComments}`);
        if (additionalFeedback) commentParts.push(`💡 Additional Feedback: ${additionalFeedback}`);
        if (competenceEstablished) commentParts.push(`✅ Competence Established: ${competenceEstablished}`);
        if (matrixUpdation) commentParts.push(`🔄 Matrix Updation Required: ${matrixUpdation}`);
        comments = commentParts.join(" | ");

        // Submission timestamp
        const submittedDate = getColumnValue(row, [
          "Completion time",
          "Completion Time",
          "submitted_at",
          "submittedAt"
        ]);

        console.log("📊 Processing manager feedback:", {
          training_name,
          employee_name,
          employee_code,
          manager_name,
          manager_code,
          competencyBefore,
          competencyAfter,
          overallRating,
          comments: comments.substring(0, 100)
        });

        // ============================================================
        // VALIDATION
        // ============================================================
        
        if (!training_name) {
          console.log("⚠️ Skipping row - missing training_name");
          skippedCount++;
          errors.push({ row: row, error: "Missing training name" });
          continue;
        }

        if (!employee_name && !employee_code) {
          console.log("⚠️ Skipping row - missing employee identification");
          skippedCount++;
          errors.push({ row: row, error: "Missing employee name or code" });
          continue;
        }

        if (!manager_name && !manager_code) {
          console.log("⚠️ Skipping row - missing manager identification");
          skippedCount++;
          errors.push({ row: row, error: "Missing manager name or code" });
          continue;
        }

        // ============================================================
        // LOOKUP MANAGER FROM DATABASE (NO AUTO-CREATION)
        // ============================================================
        
        let manager = null;

        // First, try to find existing manager by manager_code
        if (manager_code && manager_code.trim() !== "") {
          const existingManager = await client.query(
            `SELECT manager_id, manager_code, name, email, department FROM managers WHERE manager_code = $1`,
            [manager_code]
          );
          if (existingManager.rows.length > 0) {
            manager = existingManager;
            console.log(`✅ Manager found by code: ${manager_code}`);
          }
        }

        // If not found by code, try by name
        if ((!manager || manager.rows.length === 0) && manager_name) {
          const existingByName = await client.query(
            `SELECT manager_id, manager_code, name, email, department FROM managers WHERE name ILIKE $1 LIMIT 1`,
            [`%${manager_name.trim()}%`]
          );
          if (existingByName.rows.length > 0) {
            manager = existingByName;
            console.log(`✅ Manager found by name: ${manager_name}`);
          }
        }

        // If manager not found in database, skip this row (don't auto-create)
        if (!manager || manager.rows.length === 0) {
          console.log(`❌ Manager not found in database: Name="${manager_name}", Code="${manager_code}"`);
          skippedCount++;
          errors.push({ 
            manager_name, 
            manager_code, 
            error: "Manager not found in database. Please upload managers CSV first."
          });
          continue;
        }

        const managerDbId = manager.rows[0].manager_id;
        const managerCodeValue = manager.rows[0].manager_code;
        const managerEmailValue = manager.rows[0].email;
        console.log(`✅ Manager: ${manager.rows[0].name} (Code: ${managerCodeValue}, Email: ${managerEmailValue}, ID: ${managerDbId})`);

        // ============================================================
        // GET OR CREATE EMPLOYEE
        // ============================================================
        
        let employee = null;
        
        // First try by employee_code
        if (employee_code) {
          employee = await client.query(
            `SELECT employee_id, employee_code, name, manager_id, email FROM employees WHERE employee_code = $1`,
            [employee_code]
          );
        }
        
        // If not found by code, try by name
        if ((!employee || employee.rows.length === 0) && employee_name) {
          employee = await client.query(
            `SELECT employee_id, employee_code, name, manager_id, email FROM employees WHERE name ILIKE $1 LIMIT 1`,
            [`%${employee_name.trim()}%`]
          );
        }

        // If employee not found, create a new one
        if (!employee || employee.rows.length === 0) {
          console.log(`⚠️ Employee not found. Creating new employee: ${employee_name}`);
          
          const newEmployeeCode = employee_code || `EMP_${Date.now()}`;
          const generatedUUID = generateUUIDFromCode(newEmployeeCode);
          
          const newEmployee = await client.query(
            `INSERT INTO employees (employee_id, employee_code, name, email, department, manager_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING employee_id, employee_code, name, email`,
            [generatedUUID, newEmployeeCode, employee_name, null, department || null, managerDbId]
          );
          employee = newEmployee;
          console.log(`✅ Created new employee: ${employee_name} (Code: ${newEmployeeCode})`);
        }

        if (!employee || employee.rows.length === 0) {
          console.log(`❌ Failed to find or create employee`);
          skippedCount++;
          errors.push({ employee_name, employee_code, error: "Employee not found and could not be created" });
          continue;
        }

        const employeeDbId = employee.rows[0].employee_id;
        console.log(`✅ Employee: ${employee.rows[0].name} (Code: ${employee.rows[0].employee_code}, ID: ${employeeDbId})`);

        // ============================================================
        // GET TRAINING
        // ============================================================
        
        let training = await client.query(
          `SELECT training_id, training_name FROM training_programs WHERE training_name ILIKE $1 LIMIT 1`,
          [`%${training_name.trim()}%`]
        );

        if (training.rows.length === 0) {
          // Try exact match
          training = await client.query(
            `SELECT training_id, training_name FROM training_programs WHERE training_name = $1`,
            [training_name.trim()]
          );
        }

        if (training.rows.length === 0) {
          console.log(`⚠️ Training not found with name: "${training_name}"`);
          skippedCount++;
          errors.push({ training_name, error: "Training not found in database" });
          continue;
        }

        const trainingDbId = training.rows[0].training_id;
        console.log(`✅ Training: ${training.rows[0].training_name} (ID: ${trainingDbId})`);

        // ============================================================
        // SAVE MANAGER FEEDBACK
        // ============================================================
        
        // Use the after-training competency as the main rating (fallback to overall rating or before)
        const finalRating = competencyAfter || overallRating || competencyBefore;

        if (finalRating !== null || comments) {
          // Check if feedback already exists
          const existingFeedback = await client.query(
            `SELECT * FROM manager_feedback 
             WHERE manager_id = $1 AND employee_id = $2 AND training_id = $3`,
            [managerDbId, employeeDbId, trainingDbId]
          );

          let result;
          
          if (existingFeedback.rows.length > 0) {
            // Update existing feedback - merge comments
            const existingComments = existingFeedback.rows[0].manager_comments || "";
            const newComments = comments ? (existingComments ? existingComments + " \n\n " + comments : comments) : existingComments;
            
            result = await client.query(
              `UPDATE manager_feedback
               SET performance_rating = COALESCE($1, performance_rating),
                   manager_comments = $2,
                   form_completed = true,
                   submitted_at = CURRENT_TIMESTAMP,
                   updated_at = CURRENT_TIMESTAMP
               WHERE manager_id = $3 AND employee_id = $4 AND training_id = $5
               RETURNING *`,
              [finalRating, newComments || null, managerDbId, employeeDbId, trainingDbId]
            );
            updatedCount++;
            console.log(`📝 Updated existing feedback for employee: ${employee.rows[0].name}`);
          } else {
            // Insert new feedback
            result = await client.query(
              `INSERT INTO manager_feedback
               (manager_id, employee_id, training_id, performance_rating, manager_comments, form_completed, submitted_at, created_at)
               VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
               RETURNING *`,
              [managerDbId, employeeDbId, trainingDbId, finalRating, comments || null]
            );
            insertedCount++;
            console.log(`✅ Inserted new feedback for employee: ${employee.rows[0].name}`);
          }

          if (result.rows.length > 0) {
            // Cancel any pending emails for this manager-employee-training combination
            const cancelledEmails = await client.query(
              `UPDATE scheduled_emails 
               SET 
                 email_sent = true,
                 email_cancelled = true,
                 cancelled_at = CURRENT_TIMESTAMP,
                 cancellation_reason = 'Feedback submitted by manager via CSV upload',
                 status = 'cancelled',
                 last_attempt = CURRENT_TIMESTAMP,
                 error_message = 'Cancelled: Manager feedback already submitted'
               WHERE 
                 manager_id = $1 
                 AND employee_id = $2 
                 AND training_id = $3
                 AND email_sent = false
                 AND (email_cancelled IS NOT true OR email_cancelled IS NULL)
               RETURNING id, email, email_type, scheduled_time`,
              [managerDbId, employeeDbId, trainingDbId]
            );
            
            if (cancelledEmails.rows.length > 0) {
              cancelledEmailsCount += cancelledEmails.rows.length;
              console.log(`📧 Cancelled ${cancelledEmails.rows.length} pending email(s) for ${employee.rows[0].name}`);
            }
          } else {
            skippedCount++;
          }
        } else {
          console.log(`⚠️ No rating or comments to save for this row`);
          skippedCount++;
        }

      } catch (rowError) {
        console.error(`❌ Error processing row:`, rowError.message);
        skippedCount++;
        errors.push({ 
          row: row, 
          error: rowError.message 
        });
      }
    }

    await client.query("COMMIT");
    
    // Clean up uploaded file
    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ 
      message: `✅ Manager feedback uploaded successfully!`,
      summary: { 
        inserted: insertedCount, 
        updated: updatedCount,
        skipped: skippedCount,
        emailsCancelled: cancelledEmailsCount,
        totalProcessed: insertedCount + updatedCount + skippedCount
      },
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Manager Feedback Error:", err);
    res.status(500).json({ message: `Error uploading manager feedback: ${err.message}` });
  } finally {
    client.release();
  }
};

// Debug endpoint to check assignments
exports.debugCheckAssignments = async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Check training_employees table
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
    
    // Check employees table
    const employees = await client.query(`
      SELECT employee_id, employee_code, name, email, created_at
      FROM employees
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // Check training_programs table
    const trainings = await client.query(`
      SELECT training_id, training_name, created_at
      FROM training_programs
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    // Get counts
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