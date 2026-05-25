# Complete Training Management System Flows & Mapping

## 🎯 Table of Contents
1. [User Flows](#user-flows)
2. [Email System](#email-system)
3. [File Mapping](#file-mapping)
4. [Database Schema](#db-schema)
5. [End-to-End Diagram](#end-to-end)

## 👥 User Flows

### 1. ADMIN DATA UPLOAD
**CSV**: `employees_with_manager_ids.csv`
```
employee_id,name,email,department,manager_id
```
**Flow**: AdminUpload.js → Multer → Parse → INSERT

### 2-4. HR Flows
CreateTraining → CreateBatch → AssignEmployee → DB inserts

### 5-6. Feedback
Employee → POST feedback → Trigger manager email
Manager → POST feedback

### 7. Reports
`/hr/training-report/:batch_id`

## 📧 Email System (Full Detail)
**Trigger**: Employee feedback insert
**Cron**: Scheduler.js every minute
**DB**: scheduled_emails (12 columns)
**Types**: initial, reminder (3 days)

## 📁 File Mapping
| Category | Key Files |
|----------|-----------|
| Frontend | AdminUpload.js, CreateTraining.js, CreateBatch.js |
| Backend | hrController.js, jobs/Scheduler.js, emailService.js |

## 🗄️ DB Schema
- app_users, employees, training_programs...
- scheduled_emails: scheduled_time, attempts=2 max

## 🔄 End-to-End
```
Admin CSV → HR Training/Batch/Assign → Auto Emails → Feedback → Reports
```

*Consolidated from all flow docs. Updated: Oct 2024*

