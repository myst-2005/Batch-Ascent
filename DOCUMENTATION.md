# Haris & Co Academy - Batch Ascent

## 📖 Project Overview
Batch Ascent is a comprehensive batch management system designed for Haris & Co Academy. It streamlines the process of managing student batches, tracking enrollments, and handling user roles (SHOs, Academic Leads, Admins).

## 🛠 Tech Stack
- **Frontend:** Next.js 15 (App Router), React, TypeScript, Vanilla CSS (Modules)
- **Backend:** Supabase (PostgreSQL, Auth, Realtime)
- **Integration:** n8n (Webhook for Student Enrollment)
- **Deployment:** Vercel (Recommended)

## 📂 Project Structure
```
/src
  /app
    /api              # Backend API Routes (Invite, Delete User, Webhooks)
    /dashboard        # Protected Dashboard Pages
      /admin          # Admin-only pages (User Management)
      /batch/[id]     # Dynamic Batch Details & Edit Pages
      /create-batch   # Batch Creation Page
    /auth             # Authentication Pages (Login, Callback)
  /lib                # Utility functions & Supabase Client
  /components         # Reusable UI Components (if any)
```

## 🗄 Database Schema

### 1. `users` Table
Stores profile information for all users.
- `id` (UUID, Primary Key) - Linked to Supabase Auth ID
- `email` (Text)
- `name` (Text)
- `role` (Text) - Enum: 'SHO', 'ACADEMIC_LEAD', 'ADMIN'
- `school` (Text) - The school/department the user belongs to

### 2. `batches` Table
Stores details about each batch.
- `id` (Text, Primary Key) - Custom Batch ID (e.g., BATCH-001)
- `name` (Text)
- `course` (Text)
- `strength` (Numeric) - Total capacity
- `start_date` (Date)
- `academic_lead` (Text)
- `sho_name` (Text)
- `school` (Text)
- `mode` (Text) - 'Online' or 'Offline'

### 3. `student_batches` Table
Tracks student enrollments.
- `id` (UUID, Primary Key)
- `student_email` (Text)
- `student_name` (Text)
- `student_phone` (Text)
- `batch_id` (Text, Foreign Key)

### 4. `batch_history` Table
Logs all edits made to a batch.
- `id` (UUID, Primary Key)
- `batch_id` (Text, Foreign Key)
- `edited_by` (Text)
- `edited_at` (Timestamp)
- `changes` (JSONB) - Stores "Before -> After" values

## 🔐 Authentication & Roles
- **Supabase Auth:** Handles login/signup securely.
- **Role-Based Access Control (RBAC):**
  - **ADMIN:** Can manage users (invite/delete) and see all batches.
  - **ACADEMIC_LEAD:** Can create batches, edit their own batches, and view history.
  - **SHO:** Can view batches assigned to their school.

## 🚀 Deployment Guide
1. **Push to GitHub:** Ensure your code is in a private GitHub repository.
2. **Connect to Vercel:**
   - Go to Vercel Dashboard -> New Project.
   - Import your repository.
3. **Environment Variables:**
   - Add the following variables in Vercel Project Settings:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_APP_URL` (e.g., https://your-app.vercel.app)
4. **Deploy:** Click "Deploy".

## 🔮 Future Roadmap & Features
1. **Attendance Tracking:** Add a module to mark and track daily student attendance.
2. **Certificate Generation:** Automatically generate PDF certificates for students upon batch completion.
3. **Email Notifications:** Send automated emails to students/leads when a batch is updated (using Supabase Edge Functions or n8n).
4. **Analytics Dashboard:** A visual chart view for Admins to see enrollment trends over time.

## ⚠️ Production Checklist
- [x] Remove hardcoded API keys.
- [x] Set up strict RLS policies in Supabase.
- [x] Configure SMTP for emails (Zoho Mail).
- [ ] Enable 2FA for Admin accounts (Recommended).
