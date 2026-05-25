# DSA (Data Structures & Algorithms) Used in the Project

This document catalogs all **computer science DSA concepts** actually implemented in the Training Management System codebase.

---

## 1. DATA STRUCTURES

### 1.1 Array (Linear Data Structure)
**Usage:** The most frequently used structure throughout the project.

| Location | Purpose |
|----------|---------|
| `adminController.js` | `results[]` — stores parsed CSV rows |
| `adminController.js` | `employees[]` — stores employee objects from Excel |
| `adminController.js` | `employeeErrors[]` — stores error objects during batch processing |
| `hrController.js` | `skippedEmployees[]`, `assignedEmployees[]`, `invalidUUIDs[]` |
| `hrController.js` | `validUUIDs[]`, `notFoundIds[]` — validation result arrays |
| `scheduler.js` | `result.rows[]` — pending email queue results |
| `LoginPage.js` | `features[]`, `triangles[]` — UI configuration arrays |
| `TrainingReport.js` | `csvContent[]` — 2D array for CSV export |
| `CreateTrainingWithAssignment.js` | `selectedEmployees[]` — selected IDs array |

**Array Operations Used:**
- `push()` — Append elements (O(1) amortized)
- `filter()` — Filter elements (O(n))
- `map()` — Transform elements (O(n))
- `reduce()` — Aggregate values (O(n))
- `find()` — Linear search (O(n))
- `includes()` — Membership check (O(n))
- `slice()` — Subarray extraction (O(k))
- `forEach()` — Iteration (O(n))
- `sort()` — Sorting (O(n log n))
- `join()` — String concatenation from array (O(n))

### 1.2 Object / Hash Map / Dictionary
**Usage:** Key-value pair storage for O(1) average-time lookups.

| Location | Purpose |
|----------|---------|
| `adminController.js` | `trainingInfo{}` — stores parsed training metadata with keys like `training_name`, `duration`, `trainer` |
| `hrController.js` | `response{}` — structured API response object |
| `LoginPage.js` | `formData{}` — form state with dynamic keys |
| `LoginPage.js` | `formErrors{}` — error messages mapped by field name |
| `AdminUpload.js` | `files{}` — maps upload type → File object |
| `AdminUpload.js` | `dragActive{}` — maps upload type → boolean |
| `AdminUpload.js` | `csvPreview{}` — maps upload type → preview data |
| `CreateTrainingWithAssignment.js` | `touched{}` — tracks which form fields were interacted with |
| `UpdatePage.js` | `form{}` — entity being edited (employee/manager/training) |

**Object Operations:**
- Property access: `obj.key` or `obj[key]` — O(1) average
- Dynamic key assignment: `obj[newKey] = value`
- Spread operator: `{ ...prev, [key]: val }` — shallow copy + update
- `Object.keys()`, `Object.values()` — O(n) extraction

### 1.3 Set
**Usage:** Unordered collection for O(1) membership testing and deduplication.

| Location | Purpose | Algorithm |
|----------|---------|-----------|
| `CreateTrainingWithAssignment.js` | `new Set(data.map(emp => emp.employee_id))` | Deduplicate employee IDs from upload |
| `CreateTrainingWithAssignment.js` | `new Set(employees.map(...))` | Fast O(1) lookup for validation |

**Set Operations:**
- `add()` — O(1)
- `has()` — O(1) membership test
- Spread to array: `[...new Set(array)]` — Deduplication pattern

### 1.4 2D Array (Matrix)
**Usage:** Tabular data representation for Excel parsing.

| Location | Purpose |
|----------|---------|
| `hrController.js`, `adminController.js` | `data[][]` from `XLSX.utils.sheet_to_json(sheet, { header: 1 })` |
| `CreateTrainingWithAssignment.js` | `jsonData[][]` — Excel worksheet as row×column matrix |
| `TrainingReport.js` | `csvContent[][]` — 2D array for CSV generation |

**2D Array Traversal:**
- Nested loops: `for (let i = 0; i < data.length; i++)` with `data[i][j]` access
- Row extraction: `const row = data[i] || []`

### 1.5 Graph (Tree Structure)
**Usage:** Implicit graph structure in employee-manager relationships.

| Location | Structure |
|----------|-----------|
| Database schema | `employees.manager_id → managers.manager_id` forms a **forest of trees** |
| `hrController.js` | Recursive manager lookup via SQL JOINs traverses the tree |
| `scheduler.js` | Email dependency graph: `training → employee → manager` |

**Graph Traversal:**
- SQL JOIN operations perform graph traversal at the database level
- Manager lookup: `employees → managers` (edge traversal)

### 1.6 Queue (FIFO)
**Usage:** Implicit queue in email scheduling system.

| Location | Implementation |
|----------|----------------|
| `scheduler.js` | `scheduled_emails` table acts as a **priority queue** ordered by `scheduled_time` |
| `scheduler.js` | `cron.schedule("* * * * *", ...)` dequeues due emails every minute |
| `scheduler.js` | `ORDER BY se.scheduled_time ASC LIMIT 10` — fetch top 10 from queue |

**Queue Operations:**
- Enqueue: `INSERT INTO scheduled_emails (...)`
- Dequeue: `SELECT ... WHERE scheduled_time <= NOW() ORDER BY scheduled_time ASC`
- Peek: Check if manager feedback already exists before sending

### 1.7 Stack (LIFO)
**Usage:** Implicit call stack for recursion and async operations.

| Location | Usage |
|----------|-------|
| `parseCSVLine()` | Character stack logic with `inQuotes` state |
| `Promise chains` | Async/await uses call stack for execution order |
| `bcryptjs` | Internal salt generation uses array-based stack |

---

## 2. ALGORITHMS

### 2.1 Searching Algorithms

#### Linear Search (O(n))
| Location | Implementation |
|----------|----------------|
| `hrController.js` | `employees.find(e => e.employee_code === code)` — find employee by code |
| `hrController.js` | `trainings.find(t => t.training_id === id)` — find training by ID |
| `CreateTrainingWithAssignment.js` | `existingEmployees.find(e => e.employee_code === excelEmp.employee_code)` |
| `UpdatePage.js` | `managers.find(m => m.manager_id === id)` |
| `TrainingReport.js` | `trainings.find(t => t.training_id === trainingId)` |

#### Filter Search (O(n))
| Location | Implementation |
|----------|----------------|
| `UpdatePage.js` | `employees.filter(emp => emp.name?.toLowerCase().includes(...))` |
| `UpdatePage.js` | `managers.filter(m => m.name?.toLowerCase().includes(...))` |
| `TrainingReport.js` | `trainings.filter(t => t.training_name?.toLowerCase().includes(...))` |
| `hrController.js` | `feedbackResult.rows.filter(r => r.has_employee_feedback)` |

#### Pattern Matching (Regex)
| Location | Pattern | Purpose |
|----------|---------|---------|
| `hrController.js` | `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` | UUID validation |
| `hrController.js` | `/From date:\s*(\S+)\s*To date:\s*(\S+)/i` | Date range extraction from CSV |
| `LoginPage.js` | `/\S+@\S+\.\S+/` | Email format validation |
| `adminController.js` | `/\s/g` | Whitespace replacement for filenames |

### 2.2 Sorting Algorithms

| Location | Implementation | Complexity |
|----------|----------------|------------|
| `hrController.js` | `ORDER BY tp.created_at DESC` — Database-level sort | O(n log n) |
| `hrController.js` | `ORDER BY e.name` — Alphabetical sort | O(n log n) |
| `updateController.js` | `ORDER BY created_at DESC` — Timestamp sort | O(n log n) |
| `TrainingReport.js` | `recentSearches = [trainingId, ...prev.filter(id => id !== trainingId)]` — Maintain recency order |

### 2.3 String Parsing Algorithms

#### CSV Parser (State Machine)
**Location:** `AdminUpload.js`, `CreateTrainingWithAssignment.js`

```javascript
// Finite State Machine with 2 states: inQuotes / not inQuotes
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;  // State variable

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;  // Toggle state
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
```
**Complexity:** O(n) where n = line length

#### Excel Parser (2D Traversal with Pattern Recognition)
**Location:** `hrController.js`, `CreateTrainingWithAssignment.js`

```javascript
// Two-pass algorithm over 2D array
// Pass 1: Find training metadata and header row index
// Pass 2: Extract employee data from header row onwards
for (let i = 0; i < data.length; i++) {
  const colA = (row[0] || "").toString().trim();
  if (colA === "Sr.No") { headerRowIndex = i; break; }
}
for (let j = headerRowIndex + 1; j < data.length; j++) {
  // Extract employee rows
}
```

### 2.4 Hashing Algorithms

#### SHA-1 Based UUID Generation (v5)
**Location:** `adminController.js`

```javascript
function generateUUIDFromCode(employeeCode) {
  const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const hash = crypto.createHash('sha1');
  hash.update(namespaceBuffer);
  hash.update(nameBuffer);
  const hashBuffer = hash.digest();
  // Bit manipulation for version and variant
  hashBuffer[6] = (hashBuffer[6] & 0x0f) | 0x50;
  hashBuffer[8] = (hashBuffer[8] & 0x3f) | 0x80;
  return formatAsUUID(hashBuffer);
}
```

#### Password Hashing (bcrypt)
**Location:** `authController.js`

```javascript
const password_hash = await bcrypt.hash(password, 10);  // Salt rounds = 10
const isMatch = await bcrypt.compare(password, user.password_hash);
```

### 2.5 Mathematical / Statistical Algorithms

#### Average Calculation (Reduce Pattern)
**Location:** `hrController.js`

```javascript
const avgEmployeeRating = employeesWithEmployeeFeedback.length > 0
  ? employeesWithEmployeeFeedback.reduce((sum, r) => 
      sum + (parseFloat(r.employee_rating) || 0), 0) / employeesWithEmployeeFeedback.length
  : 0;
```
**Complexity:** O(n)

#### Frequency Distribution (Counting)
**Location:** `hrController.js`

```javascript
const employeeRatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
employeesWithEmployeeFeedback.forEach(r => {
  const rating = Math.round(parseFloat(r.employee_rating));
  if (rating >= 1 && rating <= 5) {
    employeeRatingDistribution[rating]++;
  }
});
```

#### Percentage Calculation
**Location:** `hrController.js`

```javascript
const completionRate = totalEmployees > 0 
  ? (completedCount / totalEmployees) * 100 
  : 0;
```

#### Time Conversion Algorithm
**Location:** `hrController.js`, `updateController.js`

```javascript
function convertToMinutes(value, unit) {
  switch (unit?.toLowerCase()) {
    case 'minutes': return parseInt(value);
    case 'hours':   return parseInt(value) * 60;
    case 'days':    return parseInt(value) * 24 * 60;
    default:        return parseInt(value) || 0;
  }
}
```

### 2.6 Scheduling Algorithm

#### Cron-Based Priority Queue
**Location:** `scheduler.js`

```javascript
// Runs every minute — O(1) scheduling check
cron.schedule("* * * * *", async () => {
  // Fetch top N emails with earliest scheduled_time
  const result = await client.query(`
    SELECT ... FROM scheduled_emails 
    WHERE scheduled_time <= NOW()
    ORDER BY scheduled_time ASC
    LIMIT 10
  `);
  // Process each email (FIFO with priority = scheduled_time)
});
```

**Algorithm characteristics:**
- Priority: `scheduled_time` (earliest first)
- Batch size: 10 emails per tick
- Retry logic: `attempts < max_attempts` with exponential backoff implicit

### 2.7 Pagination / Windowing Algorithms

| Location | Implementation | Purpose |
|----------|----------------|---------|
| `AdminUpload.js` | `slice(0, 10)` | Show max 10 upload history items |
| `UpdatePage.js` | `slice(0, 10)` | Show max 10 dropdown search results |
| `hrController.js` | `slice(0, 10)` | Limit skipped employees in response |
| `hrController.js` | `LIMIT 20`, `LIMIT 10`, `LIMIT 5` | SQL-level pagination |
| `TrainingReport.js` | `uploadPreview.slice(0, 10)` | Preview first 10 rows |

### 2.8 Validation Algorithms

#### UUID Validation
```javascript
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
```

#### Delay Validation (Range Checking)
```javascript
function validateDelay(value, unit, isReminder = false) {
  const numValue = parseInt(value);
  if (isNaN(numValue)) return false;
  switch (unit?.toLowerCase()) {
    case 'minutes': 
      return isReminder ? numValue >= 1 && numValue <= 10080 
                        : numValue >= 0 && numValue <= 1440;
    // ... similar for hours, days
  }
}
```

### 2.9 Greedy Algorithm Patterns

| Location | Pattern |
|----------|---------|
| `scheduler.js` | Process up to 10 emails per minute (batch greedy) |
| `adminController.js` | Process employees one-by-one, skip on error and continue |
| `hrController.js` | Assign employees in batch, skip invalid UUIDs and continue |

### 2.10 Two-Pointer Technique

| Location | Implementation |
|----------|----------------|
| `parseCSVLine()` | Single pointer `i` traverses string, building fields |
| `CreateTrainingWithAssignment.js` | Header row index found in Pass 1, data extraction starts at `headerRowIndex + 1` |

### 2.11 Memoization / Caching Patterns

| Location | Pattern |
|----------|---------|
| `Dashboard.js` | `useEffect` with dependency array caches auth state |
| `TrainingReport.js` | `recentSearches` caches last 5 training IDs |
| `authMiddleware.js` | JWT verification caches decoded token on `req.user` |
| `db.js` | PostgreSQL connection pool caches/reuses connections |

---

## 3. COMPLEXITY ANALYSIS SUMMARY

| Operation | Data Structure | Time Complexity | Space Complexity |
|-----------|---------------|-----------------|------------------|
| Employee lookup by code | Array + Linear Search | O(n) | O(1) |
| Employee deduplication | Set | O(n) | O(n) |
| Training metadata access | Object/Hash Map | O(1) avg | O(1) |
| CSV parsing | String + Array | O(n) | O(n) |
| Average rating calculation | Array + Reduce | O(n) | O(1) |
| Filter employees by name | Array + Filter | O(n) | O(k) |
| Email scheduling dequeue | Priority Queue (SQL) | O(n log n) | O(n) |
| UUID generation | SHA-1 Hash | O(1) | O(1) |
| Password hashing | bcrypt | O(2^rounds) | O(1) |
| Excel data traversal | 2D Array | O(rows × cols) | O(rows × cols) |

---

## 4. DESIGN PATTERNS (Related to DSA)

| Pattern | Location | Description |
|---------|----------|-------------|
| **Batch Processing** | `adminController.js`, `hrController.js` | Process employees in batches with error isolation |
| **Retry with Backoff** | `scheduler.js` | Email retries with `attempts` counter and `max_attempts` limit |
| **Circuit Breaker** | `scheduler.js` | Cancel emails after max attempts reached |
| **Observer Pattern** | `scheduler.js` | Cron job observes time and triggers processing |
| **Factory Pattern** | `hrController.js` | `getOrCreateTraining()`, `getOrCreateEmployee()` |
| **State Machine** | `parseCSVLine()` | `inQuotes` boolean manages parser state |

---

*Document generated from DSA analysis of the codebase.*

