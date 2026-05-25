# Training Flows

1. Admin Upload CSV
2. HR Create Training/Batch/Assign
3. Employee/Manager Feedback
4. Reports

Full details in SYSTEM_FLOWS.md
```
employee_id,name,email,department,manager_id
```

**Flow**:
```
1. Select CSV → XLSX parse → Validate emails/IDs
2. POST /admin/upload-employees → adminController.uploadEmployees()
3. Multer → backend/uploads/[hash] → Parse → INSERT employees/managers
✓ Success: \"X employees uploaded\"
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

### 3. CREATE BATCH (FIXED)
**Component**: CreateBatch → `/hr/create-batch`

```
Select training → Manager → Start/End date → POST
→ INSERT training_batches ✓
```

### 4. ASSIGN EMPLOYEES TO BATCH (FIXED)
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

## 📧 EMAIL SYSTEM (DETAILED)
**Files & Flow**:

| File | Role |
|------|------|
| `jobs/Scheduler.js` | **Cron every minute**: `SELECT pending scheduled_emails` → Send or schedule reminders |
| `services/emailService.js` | **Gmail HTML emails** (.env EMAIL_USER/APP_PASSWORD) |
| `controllers/*` | **Trigger**: INSERT scheduled_emails after employee feedback |
| `scheduled_emails table` | Tracks timing, attempts (max 2), types ('initial'/'reminder') |

**Scheduling Flow**:
```
Employee Feedback → Calculate delay → INSERT scheduled_emails (initial)
  ↓ Every minute
Scheduler finds ready emails → Check manager not done → sendManagerEmail()
  ↓ Success
Schedule reminder (3 days later) → Repeat process
```

**Edge Cases**:
- Manager submits early → Auto-cancel pending emails
- Gmail fails → Retry 2x → Mark failed
- Old failed emails → Auto-clean after 7 days

### 8. AUTH & DASHBOARD
Google OAuth → JWT → Role-based dashboard tabs

## 🔄 Complete End-to-End Flow
```
1. Admin: Upload CSV employees/managers
2. HR: Create training (Google Forms links)
3. HR: Create batch (training + manager + dates)  
4. HR: Assign employees (CSV/manual)
5. **AUTO**: Batch end → Employee email → Feedback
6. **AUTO**: Employee done → Manager email (delay) → Feedback
7. HR: View report (completion stats)
```

**All files verified post-fixes. Updated: 2024**
