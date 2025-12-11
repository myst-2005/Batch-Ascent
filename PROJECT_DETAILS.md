# Project Technical Overview & Architecture

This document provides a deep dive into the technical architecture, database schema, and design decisions behind **Batch Ascent**. It is intended for developers and technical stakeholders.

## 🏗️ Architecture

The project is built on a modern **Next.js 15** stack using the **App Router** for routing and **Supabase** for the backend (Database + Auth).

### Key Architectural Decisions
1. **Server-Side Rendering (SSR) & Client Components**:
   - We utilize Next.js Server Components for data fetching where possible to improve performance and SEO.
   - Client Components (`'use client'`) are used for interactive elements (forms, toggles, dashboards).

2. **Supabase as Backend-as-a-Service (BaaS)**:
   - **PostgreSQL**: The core database.
   - **RLS (Row Level Security)**: Security logic is pushed to the database layer. This ensures that even if the frontend code is bypassed, the data remains secure.
   - **Auth**: Supabase Auth handles user sessions and JWTs.

3. **Role-Based Routing**:
   - The application checks user roles upon login and redirects to role-specific dashboards (`/dashboard/sales`, `/dashboard/admin`, etc.).
   - Middleware or layout-level checks ensure users cannot access unauthorized routes.

## 🗄️ Database Schema

The database is normalized and uses foreign keys to maintain data integrity.

### Core Tables

1. **`users`**
   - Extends Supabase Auth.
   - Stores: `id`, `email`, `name`, `role` (admin, sales, academic_lead, sho), `phone`, `sales_id`, `cliq_id`.
   - **Security**: RLS policies ensure users can only read relevant data.

2. **`batches`**
   - Stores batch information.
   - Fields: `id` (UUID), `name`, `course`, `start_date`, `strength`, `mode`, `school`, `academic_lead`, `sho_name`, `cliq_id`.
   - **Logic**: `cliq_id` is used for internal referencing (e.g., DA03).

3. **`student_batches` (Enrollments)**
   - Link table between students and batches (Many-to-Many concept, though currently stores student details directly for flexibility).
   - Fields: `id`, `student_email`, `student_name`, `student_phone`, `batch_id`, `sales_id`, `linked_at`.
   - **Purpose**: Tracks *intent* to enroll or initial sign-up. Used by Sales to track leads.

4. **`students` (Official Registry)**
   - The "Single Source of Truth" for onboarded students.
   - Fields: `id`, `full_name`, `email`, `phone` (bigint), `batch_id`, `student_id` (Official ID), `joined_at`.
   - **Workflow**: A student moves from `student_batches` -> `students` when "Mark as Done" is clicked.

### Security (RLS Policies)
- **Sales Isolation**: Sales executives can only `INSERT` or `DELETE` rows in `student_batches` where `sales_id` matches their own ID.
- **Public Read**: Batches are generally readable by authenticated users to allow browsing.
- **Admin Override**: Admins have full access to all tables.

## 📂 Project Structure

```
src/
├── app/
│   ├── api/              # Next.js API Routes (Webhooks, custom logic)
│   ├── dashboard/        # Main application area
│   │   ├── admin/        # Admin-specific pages
│   │   ├── batch/        # Batch details & management
│   │   ├── sales/        # Sales dashboard
│   │   └── create-batch/ # Batch creation form
│   ├── login/            # Login page
│   └── layout.tsx        # Root layout (Fonts, Metadata)
├── lib/
│   └── supabaseClient.ts # Singleton Supabase client
└── components/           # Reusable UI components (if any)
```

## 🔄 Key Workflows

### 1. Student Enrollment Flow
1. **Sales Action**: Sales Exec adds a student via a form.
2. **Database**: Record inserted into `student_batches` with `sales_id`.
3. **UI Update**: Sales Dashboard updates "My Enrollments" count.

### 2. Onboarding Flow
1. **Trigger**: Academic Lead/Admin views Batch Details.
2. **Action**: Clicks "Mark as Done".
3. **Backend**:
   - Inserts record into `students` table.
   - (Optional) n8n workflow triggers to generate `student_id` and send welcome email.
4. **UI Update**: Badge changes to "Onboarded" (Green).

### 3. Batch Creation
1. **Form**: User inputs batch details.
2. **Validation**: Checks for required fields.
3. **Database**: Inserts into `batches`.

## 🛡️ Stability & Error Handling
- **Try-Catch Blocks**: All async operations (DB fetches) are wrapped in try-catch blocks to prevent UI crashes.
- **Loading States**: UI shows loading spinners/skeletons while fetching data.
- **Form Validation**: Inputs are validated before submission.
- **Type Safety**: TypeScript interfaces (`Student`, `Batch`, `User`) ensure data consistency across the app.

## 🚀 Future Scalability
- **Pagination**: As student lists grow, server-side pagination can be implemented.
- **Webhooks**: The API routes are set up to handle webhooks from external forms (e.g., Tally, Typeform).
- **Analytics**: The schema supports aggregating data for advanced analytics (conversion rates, batch fill rates).
