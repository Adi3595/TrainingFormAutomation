# 🚀 Training Management System

## Overview
Full-stack app for employee training management with automated feedback collection.

**Tech Stack**: Node.js/Express/PostgreSQL | React | Google OAuth | Nodemailer Cron

## Architecture
Frontend → API → Controllers → DB ↺ Scheduler → Emails

## Quick Start
cd backend && npm i && npm start (port 5000)
cd frontend && npm i && npm start (port 3000)

```
Frontend (React) ──→ Backend API Routes ──→ Controllers ──→ PostgreSQL DB
                         │
                    Jobs/Scheduler (cron *) ──→ EmailService ──→ Gmail
                         │
                    CSV Uploads (Multer) ──→ XLSX Parse ──→ Bulk INSERT
```


## 🚀 Quick Start

### Backend
```bash
cd backend
npm install
# Create backend/.env from ENV_EXAMPLE.md (do not commit secrets)
npm start
```
**Port**: 5000


### Frontend  
```bash
cd frontend
npm install
npm start
```
**Port**: 3000

### Database
```sql
psql -f database/postgreSQL.sql your_database
```

## 👥 User Flows

### 1. ADMIN DATA UPLOAD
**Component**: AdminUpload.js → `/admin/upload-employees`

**CSV Format**: `employees_with_manager_ids.csv`
```
employee_id,name,email,department,manager_id
```

**Flow**:
```
1. Select CSV → XLSX parse → Validate emails/IDs
2. POST /admin/upload-employees → adminController.uploadEmployees()
3. Multer → backend/uploads/[hash] → Parse → INSERT employees/managers
✓ Success: "X employees uploaded"
✗ Error: Duplicate email/manager_id
```

### 2. CREATE TRAINING PROGRAM
**Component**: CreateTraining → `/hr/create-training`

```
POST {training_name, description, employee_form_link, manager_form_link, requires_manager_feedback}
→ INSERT training_programs → Return training_id
```

**Cases**:
- Manager feedback required → Both form links needed
- No manager feedback → Employee only ✓

### 3. CREATE BATCH
**Component**: CreateBatch → `/hr/create-batch`

```
Select training → Manager → Start/End date → POST
→ INSERT training_batches ✓
```

### 4. ASSIGN EMPLOYEES TO BATCH
**Component**: AssignEmployee → `/hr/assign-employee`

```
POST {batch_id, employee_ids[]} → Bulk INSERT batch_employees (unique constraint)
Response: {assigned_count, skipped_count, skipped_employees[]} ✓
```

**Edge Cases**: Already assigned/duplicates → Skip ✓

### 5. EMPLOYEE FEEDBACK 
**Endpoint**: POST `/employee/submit-feedback`

```
1. Employee gets form email (batch end + delay) 
2. Submit rating/comments → INSERT employee_feedback
3. IF requires_manager_feedback → TRIGGER manager email scheduling
```

### 6. MANAGER FEEDBACK 
**Endpoint**: POST `/manager/submit-feedback`

```
1. Receives dynamic HTML email (jobs/Scheduler.js)
2. Submit performance rating → INSERT manager_feedback
```

### 7. TRAINING REPORTS
**GET** `/hr/training-report/:batch_id` → Stats + feedback table ✓

## 📧 Email System

### Trigger: Employee Submits Feedback
```
POST /employee/submit-feedback
→ INSERT employee_feedback
→ IF training_programs.requires_manager_feedback:
  → Calculate delay
  → INSERT scheduled_emails (initial)
```

### Cron Scheduler (`jobs/Scheduler.js`)
**Every minute** (`* * * * *`):
```
1. SELECT pending: scheduled_time <= NOW() AND attempts < 2
2. Check manager not done → Send
3. Schedule reminder (3 days)
```

### Email Sending (`services/emailService.js`)
Gmail HTML templates with employee/training details.

**DB**: `scheduled_emails` tracks attempts, types ('initial'/'reminder').

**Edges**: Max retries, early submit cancels, cleanup old failed.

## 📋 Key API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/upload-employees` | CSV → Employees |
| POST | `/hr/create-training` | New training program |
| POST | `/hr/create-batch` | Training batch w/ manager |
| POST | `/hr/assign-employee` | Assign employees to batch |
| POST | `/employee/submit-feedback` | Employee rating/comments |
| POST | `/manager/submit-feedback` | Manager performance review |
| GET | `/hr/training-report/:batch_id` | Completion stats + feedback |

**Full routes**: adminRoutes (`/admin/*`), hrRoutes (`/hr/*`), employeeRoutes (`/employee/*`), managerRoutes (`/manager/*`), authRoutes (`/auth/*`), trainingRoutes

### File Map (Key Files)
| Category | Files | Role |
|----------|-------|------|
| Frontend | CreateTraining.js, CreateBatch.js, AssignEmployee.js, AdminUpload.js, TrainingReport.js | UI for all flows |
| Backend Controllers | hrController.js, adminController.js, employeeController.js | Core logic |
| Jobs/Services | jobs/Scheduler.js, services/emailService.js | Auto-emails |
| DB | postgreSQL.sql, scheduled_emails table | Schema + cron tracking |

## 📊 Database Schema (Expanded)
- `app_users` (roles), `employees` (w/ manager_id), `managers`
- `training_programs` (form_links, delays), `training_batches`, `batch_employees`
- `employee_feedback`, `manager_feedback`
- **`scheduled_emails`** (scheduled_time, attempts, email_type='initial/reminder', max_attempts=2)

**Views**: `training_batches_with_programs`, `employee_feedback_status`

## 🔄 End-to-End Flow Diagram
```
1. Admin: CSV Upload → employees/managers DB
2. HR: Create Training (Google Forms) → training_programs
3. HR: Create Batch (manager+dates) → training_batches
4. HR: Assign Employees → batch_employees
5. AUTO (batch end): Email employee form → Feedback DB
6. AUTO (feedback done): Schedule manager email → Feedback DB
7. HR: Report (stats/export)
```

## 🐛 KNOWN ISSUES (Critical)
1. **hrController.js Table Mismatches**:
   - `createBatch` → uses `batches` (should be `training_batches`)
   - `assignEmployee` → checks `batches` 
   - `getEmployees` → queries non-existent `position` column
   - **See FIXES.md for patches**

2. **No backend package.json start script** - Add manually.

## ✨ Features
- ✅ CSV Bulk Upload (employees/managers/feedback)
- ✅ Role-based Dashboard (Admin/HR/Employee/Manager)
- ✅ Automated Email Scheduling + Reminders (cron)
- ✅ Training Reports w/ Stats/Charts
- ✅ Google OAuth + JWT Auth

---
*Last Updated: Oct 2024*


