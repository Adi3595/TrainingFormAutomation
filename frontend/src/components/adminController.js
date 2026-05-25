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
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const namespaceBuffer = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBuffer = Buffer.from(employeeCode);

  const hash = crypto.createHash('sha1');
  hash.update(namespaceBuffer);
  hash.update(nameBuffer);
  const hashBuffer = hash.digest();

  hashBuffer[6] = (hashBuffer[6] & 0x0f) | 0x50;
  hashBuffer[8] = (hashBuffer[8] & 0x3f) | 0x80;

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

// ⚡ UPDATED: Just returns employee object with generated UUID — no DB insert into employees table
async function getOrCreateEmployee(client, employeeCode, employeeName) {
  if (!employeeCode) return null;

  const generatedUUID = generateUUIDFromCode(employeeCode);

  return {
    employee_id: generatedUUID,
    employee_code: employeeCode,
    name: employeeName
  };
}

// ==============================
// 📌 Upload Training with Employees (Single Excel File)
// Inserts employees directly into training_employees — no employees table touched
// ==============================
exports.uploadTrainingWithEmployees = async (req, res) => {
  const client = await pool.connect();

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileExt = req.file.originalname.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(fileExt)) {
      return res.status(400).json({ message: "Please upload an Excel (.xlsx, .xls) or CSV file" });
    }

    let trainingInfo = {};
    let employees = [];

    if (fileExt === 'csv') {
      const data = await parseCSV(req.file.path);
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
      const parsed = await parseTrainingExcel(req.file.path);
      trainingInfo = parsed.trainingInfo;
      employees = parsed.employees.map(emp => ({
        employee_code: emp.employee_code.toString().trim(),
        name: emp.name.toString().trim()
      }));
    }

    if (!trainingInfo.training_name) {
      return res.status(400).json({ message: "Training Name is required in the Excel file" });
    }

    if (employees.length === 0) {
      return res.status(400).json({ message: "No employees found in the file. Please ensure 'Per No' and 'Name' columns exist." });
    }

    await client.query("BEGIN");

    const userId = req.user?.user_id || null;
    const { training, isNew } = await getOrCreateTraining(client, trainingInfo, userId);

    let employeesAssigned = 0;
    let employeesSkipped = 0;
    const employeeErrors = [];

    for (const emp of employees) {
      try {
        if (!emp.employee_code || !emp.name) {
          employeesSkipped++;
          employeeErrors.push({ employee: emp, error: "Missing employee_code or name" });
          continue;
        }

        const employee = await getOrCreateEmployee(client, emp.employee_code, emp.name);

        if (!employee) {
          employeesSkipped++;
          employeeErrors.push({ employee: emp, error: "Failed to generate employee record" });
          continue;
        }

        // ⚡ Insert directly into training_employees — employees table not touched
        const assignResult = await client.query(
          `INSERT INTO training_employees 
             (employee_id, training_id, assigned_at, status, employee_code, name)
           VALUES ($1, $2, CURRENT_TIMESTAMP, 'pending', $3, $4)
           ON CONFLICT (employee_id, training_id) DO UPDATE SET
             employee_code = EXCLUDED.employee_code,
             name = EXCLUDED.name
           RETURNING employee_id`,
          [employee.employee_id, training.training_id, emp.employee_code, emp.name]
        );

        if (assignResult.rows.length > 0) {
          employeesAssigned++;
          console.log(`✅ Assigned to training: ${emp.name} (Code: ${emp.employee_code})`);
        } else {
          employeesSkipped++;
          employeeErrors.push({ employee: emp, error: "No rows returned after insert" });
        }
      } catch (empError) {
        employeesSkipped++;
        employeeErrors.push({ employee: emp, error: empError.message });
      }
    }

    await client.query("COMMIT");

    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
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
        employees_assigned: employeesAssigned,
        employees_skipped: employeesSkipped
      }
    };

    if (employeeErrors.length > 0) {
      response.errors = employeeErrors.slice(0, 10);
      if (employeeErrors.length > 10) {
        response.errors_truncated = true;
        response.total_errors = employeeErrors.length;
      }
    }

    console.log(`📊 Training Upload Summary - Training: ${training.training_name}, Assigned: ${employeesAssigned}, Skipped: ${employeesSkipped}`);
    res.json(response);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Training Upload Error:", err);
    res.status(500).json({ message: `Error processing file: ${err.message}` });
  } finally {
    client.release();
  }
};

// ==============================
// 📌 Upload Employees CSV
// ==============================
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
      details: { inserted: insertedCount, updated: updatedCount, skipped: skippedCount },
      ...(errors.length > 0 && { errors: errors.slice(0, 10) })
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Employee Upload Error:", err);
    res.status(500).json({ message: `Error uploading employees: ${err.message}` });
  } finally {
    client.release();
  }
};

// ==============================
// 📌 Upload Managers CSV
// ==============================
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
        const manager_id = row.manager_id || row["manager_id"];
        const name = row.name || row.Name;
        const email = row.email || row.Email;
        const department = row.department || row.Department;

        if (!manager_id || !email) {
          skippedCount++;
          errors.push({ manager_id, email, error: "Missing required fields" });
          continue;
        }

        const result = await client.query(
          `INSERT INTO managers (manager_id, name, email, department)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (manager_id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             department = EXCLUDED.department
           RETURNING *`,
          [manager_id, name || null, email, department || null]
        );

        if (result.rows.length > 0) {
          insertedCount++;
        } else {
          skippedCount++;
        }
      } catch (rowError) {
        skippedCount++;
        errors.push({ manager_id: row.manager_id, email: row.email, error: rowError.message });
      }
    }

    await client.query("COMMIT");

    if (req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({
      message: `Managers processed: ${insertedCount} inserted, ${updatedCount} updated, ${skippedCount} skipped`,
      details: { inserted: insertedCount, updated: updatedCount, skipped: skippedCount },
      ...(errors.length > 0 && { errors: errors.slice(0, 10) })
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Manager Upload Error:", err);
    res.status(500).json({ message: `Error uploading managers: ${err.message}` });
  } finally {
    client.release();
  }
};

// ==============================
// 📌 Upload Employee Feedback CSV
// ==============================
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
    let skippedCount = 0;
    let emailScheduledCount = 0;

    for (let row of data) {
      const employee_code = row["Employee Code"] || row["employee_code"] || row["Per No"];
      const training_id = row["Training ID"] || row["training_id"] || row.TrainingID;
      const rating = row["How would you rate the overall training?"];
      const comments = row["What did you like most about the training?"];

      if (!employee_code || !training_id) {
        console.log("❌ Missing required fields:", row);
        skippedCount++;
        continue;
      }

      // Find employee by employee_code
      let employee = await client.query(
        `SELECT * FROM employees WHERE employee_code = $1`,
        [employee_code]
      );

      if (employee.rows.length === 0) {
        employee = await client.query(
          `SELECT * FROM employees WHERE employee_id::text = $1`,
          [employee_code]
        );
      }

      if (employee.rows.length === 0) {
        console.log("⚠ Employee not found:", employee_code);
        skippedCount++;
        continue;
      }

      const feedbackRes = await client.query(
        `INSERT INTO employee_feedback 
        (employee_id, training_id, rating, comments, form_completed, submitted_at)
        VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
        ON CONFLICT (employee_id, training_id) DO UPDATE SET
          rating = EXCLUDED.rating,
          comments = EXCLUDED.comments,
          form_completed = EXCLUDED.form_completed,
          submitted_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [employee.rows[0].employee_id, training_id, rating || null, comments || null]
      );

      if (feedbackRes.rows.length === 0) {
        skippedCount++;
        continue;
      }

      insertedCount++;

      const trainingRes = await client.query(`
        SELECT 
          tp.*,
          COALESCE(tp.initial_delay_value, 0) as initial_delay_value,
          COALESCE(tp.initial_delay_unit, 'minutes') as initial_delay_unit,
          COALESCE(tp.reminder_delay_value, 3) as reminder_delay_value,
          COALESCE(tp.reminder_delay_unit, 'days') as reminder_delay_unit
        FROM training_programs tp
        WHERE tp.training_id = $1
      `, [training_id]);

      if (trainingRes.rows.length === 0) {
        console.log("⚠ No training found for ID:", training_id);
        continue;
      }

      const training = trainingRes.rows[0];

      if (training.requires_manager_feedback && training.manager_form_link) {
        const employeeManagerId = employee.rows[0].manager_id;

        if (!employeeManagerId) {
          console.log(`⚠ No manager_id found for employee: ${employee_code}`);
          continue;
        }

        const manager = await client.query(
          `SELECT * FROM managers WHERE manager_id = $1`,
          [employeeManagerId]
        );

        if (manager.rows.length === 0) {
          console.log(`⚠ Manager not found for manager_id: ${employeeManagerId}`);
          continue;
        }

        const managerEmail = manager.rows[0].email;
        const managerId = manager.rows[0].manager_id;

        const initialDelayMinutes = convertToMinutes(
          training.initial_delay_value,
          training.initial_delay_unit
        );

        const initialScheduledTime = new Date();
        if (initialDelayMinutes > 0) {
          initialScheduledTime.setMinutes(
            initialScheduledTime.getMinutes() + initialDelayMinutes
          );
        }

        const reminderDelayMinutes = convertToMinutes(
          training.reminder_delay_value,
          training.reminder_delay_unit
        );

        const existingEmail = await client.query(
          `SELECT * FROM scheduled_emails 
          WHERE employee_id = $1 AND training_id = $2 AND email_type = 'initial'`,
          [employee.rows[0].employee_id, training_id]
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
              training.manager_form_link,
              initialScheduledTime,
              employee.rows[0].employee_id,
              training_id,
              managerId,
              reminderDelayMinutes,
              initialDelayMinutes
            ]
          );

          emailScheduledCount++;
          console.log(`📧 Initial email scheduled for: ${managerEmail}, manager_id: ${managerId}`);
        }
      }
    }

    await client.query("COMMIT");

    fs.unlinkSync(req.file.path);

    res.json({
      message: `✅ Employee feedback uploaded successfully! ${insertedCount} inserted, ${skippedCount} skipped, ${emailScheduledCount} emails scheduled`,
      details: { inserted: insertedCount, skipped: skippedCount, emailsScheduled: emailScheduledCount }
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Feedback Upload Error:", err);
    res.status(500).json({ message: `Error uploading feedback: ${err.message}` });
  } finally {
    client.release();
  }
};

// ==============================
// 📌 Upload Manager Feedback CSV
// ==============================
exports.uploadManagerFeedback = async (req, res) => {
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
    let skippedCount = 0;
    let cancelledEmailsCount = 0;

    for (let row of data) {
      const manager_id = (row["Manager ID"] || "").trim();
      const employee_code = (row["Employee Code"] || row["employee_code"] || row["Per No"] || "").trim();
      const training_id = (row["Training ID"] || row["training_id"] || "").trim();
      const rating = (row["Rate the employee's performance improvement"] || "").trim();
      const comments = (row["Long Answer"] || "").trim();

      console.log("Processing manager feedback:", { manager_id, employee_code, training_id, rating, comments });

      if (!manager_id || !employee_code || !training_id) {
        console.log("⚠ Skipping invalid manager feedback row:", row);
        skippedCount++;
        continue;
      }

      const manager = await client.query(
        `SELECT * FROM managers WHERE manager_id = $1`,
        [manager_id]
      );

      let employee = await client.query(
        `SELECT * FROM employees WHERE employee_code = $1`,
        [employee_code]
      );

      if (employee.rows.length === 0) {
        employee = await client.query(
          `SELECT * FROM employees WHERE employee_id::text = $1`,
          [employee_code]
        );
      }

      if (manager.rows.length === 0 || employee.rows.length === 0) {
        console.log("⚠ Manager/Employee not found:", { manager_id, employee_code });
        skippedCount++;
        continue;
      }

      const result = await client.query(
        `INSERT INTO manager_feedback
        (manager_id, employee_id, training_id, performance_rating, manager_comments, form_completed, submitted_at)
        VALUES ($1, $2, $3, $4, $5, true, CURRENT_TIMESTAMP)
        ON CONFLICT (manager_id, employee_id, training_id) DO UPDATE SET
          performance_rating = EXCLUDED.performance_rating,
          manager_comments = EXCLUDED.manager_comments,
          form_completed = EXCLUDED.form_completed,
          submitted_at = CURRENT_TIMESTAMP
        RETURNING *`,
        [
          manager.rows[0].manager_id,
          employee.rows[0].employee_id,
          training_id,
          rating ? parseInt(rating, 10) : null,
          comments || null,
        ]
      );

      if (result.rows.length > 0) {
        insertedCount++;
        console.log(`✅ Feedback recorded for manager: ${manager_id}, employee: ${employee_code}, training: ${training_id}`);

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
          [manager.rows[0].manager_id, employee.rows[0].employee_id, training_id]
        );

        if (cancelledEmails.rows.length > 0) {
          cancelledEmailsCount += cancelledEmails.rows.length;
          console.log(`📧 Cancelled ${cancelledEmails.rows.length} pending email(s) for manager: ${manager_id}, employee: ${employee_code}, training: ${training_id}`);
          cancelledEmails.rows.forEach(email => {
            console.log(`   - Cancelled email ID: ${email.id}, Type: ${email.email_type}, Scheduled for: ${email.scheduled_time}`);
          });
        } else {
          console.log(`📧 No pending emails found to cancel for manager: ${manager_id}, employee: ${employee_code}, training: ${training_id}`);
        }

      } else {
        skippedCount++;
      }
    }

    await client.query("COMMIT");

    fs.unlinkSync(req.file.path);

    res.json({
      message: `✅ Manager feedback uploaded successfully! ${insertedCount} inserted/updated, ${skippedCount} skipped, ${cancelledEmailsCount} pending emails cancelled`,
      details: {
        inserted: insertedCount,
        skipped: skippedCount,
        emailsCancelled: cancelledEmailsCount
      }
    });

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Manager Feedback Error:", err);
    res.status(500).json({ message: `Error uploading manager feedback: ${err.message}` });
  } finally {
    client.release();
  }
};
