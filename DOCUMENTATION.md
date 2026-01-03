# Haris & Co Academy - Batch Ascent Documentation

## � Table of Contents
1. [Project Overview](#project-overview)
2. [User Guide (Walkthrough)](#user-guide-walkthrough)
3. [Core Features & Technical Details](#core-features--technical-details)
4. [Authentication & Roles](#authentication--roles)
5. [Database Schema](#database-schema)
6. [Automation Workflows (n8n)](#automation-workflows-n8n)
7. [Project Structure](#project-structure)
8. [Deployment & Setup](#deployment--setup)

---

## 1. Project Overview

**Batch Ascent** is designed to streamline the lifecycle of a student from **Lead** (Sales) to **Enrolled** (Batch) to **Onboarded** (Student Registry). It connects distinct teams (Sales, Academic, Admin) through a unified dashboard.

**Tech Stack:**
- **Frontend**: Next.js 15 (App Router), TypeScript, Vanilla CSS Modules (Glassmorphism).
- **Backend**: Supabase (PostgreSQL, Auth, RLS).
- **Automation**: n8n (Webhooks).

---

## 2. User Guide (Walkthrough)

### 👤 For Admins
- **Approve New Users**:
  - Navigate to `/dashboard/admin/approve-users`.
  - Review "Pending" signups.
  - Assign valid **Role** and **School** from dropdowns.
  - Click **Approve**.
- **Manage Users**: Invite, delete, or update roles.

### 🎓 For Academic Leads
- **Create Batches**:
  - Go to **Create Batch**.
  - Enter Batch Name (e.g., `TS-AA-01`), Course, Start Date.
  - Select "Cliq ID" from your user profile (auto-fetched) or refresh it.
- **Onboard Students**:
  - Open a Batch.
  - Verify student is "Verified" (Green/Yellow border).
  - Toggle **"Onboarding Completed"**.
  - *Behind the scenes*: This triggers the Student ID generation workflow.

### 💼 For Sales Team
- **Enroll Students**:
  - Use the **Sales Intimation Form** (External Tally/Web Form).
  - Enter your **Sales ID** (e.g., `TS001`).
- **Track Performance**:
  - Login to Dashboard.
  - View "My Student Enrollments" count.
  - See list of pending/verified students linked to you.

### 📞 For SHOs / SSHOs
- **Verify Enrollments**:
  - Open Batch Details.
  - Click **"Verify"** on a student card.
  - This confirms the student's entry in the batch.
- **Call Tracking**:
  - Click **"Call Student"**.
  - The system logs the timestamp (`Called on DD/MM/YYYY, HH:MM`).
- **Refresh Cliq ID**:
  - If Cliq ID is missing/N/A, click the Refresh Icon next to the ID to fetch it from the profile.

---

## 3. Core Features & Technical Details

### Student Card UI
- **Design**: Vibrant, card-based layout with glassmorphism effects.
- **Status Indication**:
  - **Left Border**: Orange (Pending), Yellow (Verified), Green (Onboarded).
  - **Badges**: Distinct colored pills for statuses.
- **Actions**:
  - **Call**: Updates `called_at` timestamp.
  - **Verify**: Updates `status`.
  - **Onboard**: Inserts into `students` registry.

### Sales Dashboard
- Displays **Total Enrollments** dynamically fetched from `student_batches`.
- Lists students with their current status.
- Uses `sales_id` to filter data (RLS protected).

---

## 4. Authentication & Roles

### Flows
- **Login**: Checks `users` table. If `role === 'PENDING'`, access is blocked.
- **Sign Up**:
  - User selects Name, Email, Password, **Role**, and **School**.
  - Account created with `role: 'PENDING'`.
  - Must be approved by Admin.
- **Reset Password**:
  - Request link via `/forgot-password`.
  - Receive email with link.
  - Reset via `/update-password`.
  - *Logic checks DB profile to preserve Sales ID/Phone.*

### Roles
- **ADMIN**: Full System Access.
- **SHO (Student Happiness Officer) / SSHO (Senior SHO)**: Batch & Student Verification. [See Detailed Guide](./USER_GUIDE_ACADEMIC_OPS.md)
- **ACADEMIC_LEAD**: Batch Creation & Onboarding.
- **SALES / SALES_HEAD**: Enrollment Tracking.
- **PROJECT_LEAD**: Project Management.

---

## 5. Database Schema

### `users`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary Key (matches Auth) |
| email | Text | |
| name | Text | |
| role | Text | 'ADMIN', 'SHO', 'SALES', etc. |
| sales_id | Text | Unique ID (e.g., TS001) |
| school | Text | Linked School |
| cliq_id | Text | Chat ID |
| requested_role | Text | Role from Signup (Pending) |

### `batches`
| Column | Type | Description |
|--------|------|-------------|
| id | Text | Custom ID (BATCH-001) |
| name | Text | |
| course | Text | |
| school | Text | |
| academic_lead | Text | |
| cliq_id | Text | |

### `student_batches` (Lead/Enrollment)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | |
| student_email | Text | |
| batch_id | Text | FK to Batches |
| sales_id | Text | Tracking Sales Exec |
| status | Text | 'Verified', 'Pending' |
| onboarding_completed | Boolean | True = Moved to Registry |
| called_at | Timestamp | |

### `students` (Official Registry)
| Column | Type | Description |
|--------|------|-------------|
| student_id | Text | Official ID (TSAA0001) |
| full_name | Text | |
| school_code | Text | TS, DS, MS, FS |
| course_code | Text | AA, NN, DA, etc. |
| joined_at | Timestamp | |

---

## 6. Automation Workflows (n8n)

### Workflow 1: Student Onboarding (Tally -> ID Gen)
**Trigger**: Tally Form Submission ("HACA Learner's Playbook").
**Logic**:
1.  **Extract Fields**: Javascript node extracts Name, Phone, Email, School, Course from Tally JSON.
    - *Note*: Extracts strictly the text value of the School dropdown.
2.  **Map Codes**:
    - Maps School Name to Code (e.g., "Tech School" -> "TS").
    - Maps Course Name to Code (e.g., "Applied AI" -> "AA").
3.  **Generate ID (RPC)**:
    - Calls Supabase function `increment_school_counter_sd(school_code)`.
    - Returns next sequence (e.g., 5).
4.  **Format ID**:
    - **Sticky Note Rule**: `{SchoolCode}{CourseCode}{Sequence}`.
    - **Example**: `TSAA0001` (Sequence padded to 4 digits).
5.  **Database Updates**:
    - Inserts into `students` table.
    - Updates `student_batches` -> `onboarding_completed = True`.
    - Posts to Zoho for external logs.

### Workflow 2: New Sales Enrollment
**Trigger**: Sales Intimation Form Webhook.
**Logic**:
1.  **Receive Data**: Sales ID, Batch ID, Student Info.
2.  **Extract Details**: Parses payment mode, amount, executive info.
3.  **Add to DB**: Inserts into `student_batches` (Status: Pending/Verified).
4.  **Notifications**:
    - **Email 1 (Student)**: "Welcome to HACA" + Link to Playbook.
    - **Email 2 (Accounts)**: "New Student Enrollment" details.
5.  **Sales Response**: Respond to webhook with Success status.
6.  **Auto-Verify**: Logic to update status to "Verified" if conditions met.

---

## 7. Project Structure

```bash
/src
  /app
    /api              # Backend API Routes
    /dashboard        # Main Application Dashboard
      /admin          # Admin Management
      /batch/[id]     # Batch Details & Student Cards
      /sales          # Sales Dashboard
    /login            # Login Page
    /signup           # New Signup Page
    /forgot-password  # Reset Request
    /update-password  # Set Password
  /lib                # Supabase Client
/migrations           # SQL Scripts
/public               # Assets & Templates
```

---

## 8. Deployment & Setup

1.  **Database**:
    - Run all scripts in `migrations/` folder via Supabase SQL Editor.
    - **Crucial**: Run `enable_signup.sql` to support new Signup flow.
2.  **Email**:
    - Use `public/reset_password_email.html` for the Reset Password template.
3.  **Run Locally**:
    ```bash
    npm install
    npm run dev
    ```
