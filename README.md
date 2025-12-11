# Batch Ascent - Streamlined Batch Management System

Batch Ascent is a comprehensive batch management and student enrollment system designed for educational institutions (specifically Haris & Co Academy). It streamlines the process of managing batches, tracking student enrollments, and coordinating between different roles like Admins, Academic Leads, Sales Executives, and Student Happiness Officers (SHOs).

## 🚀 Key Features

### 1. Role-Based Access Control (RBAC)
The system provides tailored dashboards and functionalities for different user roles:
- **Admin**: Full control over users, batches, and system settings. Can manage user IDs (Cliq ID) and roles.
- **Academic Lead**: Create and manage batches, view overall enrollment stats, and oversee academic operations.
- **Sales Executive**: Dedicated dashboard to track their specific enrollments, view available batches, and manage their student leads.
- **Student Happiness Officer (SHO)**: Monitor batch health, student onboarding status, and ensure student success.

### 2. Batch Management
- **Create & Edit Batches**: comprehensive form to define batch details (Course, Start Date, Strength, Mode, School, etc.).
- **Batch List**: Filterable and sortable list of all batches with real-time enrollment status (Open/Full).
- **Batch Details**: Detailed view of a batch including assigned Academic Lead, SHO, and enrolled students.

### 3. Student Enrollment & Onboarding
- **Enrollment Tracking**: Track which sales executive enrolled which student.
- **Onboarding Status**: Mark students as "Onboarded" (Official) or "Pending".
- **Official Student List**: Automatically syncs onboarded students to the official registry.
- **Student ID**: Displays official Student IDs for onboarded students.

### 4. Sales Dashboard
- **Personalized Stats**: Sales executives see their total enrollments and monthly performance.
- **Batch Availability**: View real-time seat availability in batches to guide sales.
- **Lead Management**: Add and remove students from their personal enrollment list.

### 5. User Management
- **Cliq ID System**: Custom ID system (e.g., TS001, DA03) for users and batches.
- **User Directory**: Admin view to manage all system users and their roles.

## 🛠️ Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript
- **Styling**: CSS Modules, Lucide React (Icons)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd academix
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Usage Guide

### Logging In
Use your credentials to log in. The system automatically redirects you to the appropriate dashboard based on your assigned role.

### For Sales Executives
1. **Check Availability**: Look at the "Available Batches" table to see open slots.
2. **Enroll Students**: Use the enrollment form (external or internal) using your **Sales ID**.
3. **Manage Leads**: Go to a batch to see your enrolled students. You can remove students if enrolled by mistake.

### For Academic Leads / Admins
1. **Create Batch**: Use the "Create Batch" button to define new academic batches.
2. **Manage Onboarding**: Go to a batch, view the student list, and toggle "Mark as Done" to finalize student onboarding.
3. **Monitor Health**: Check enrollment percentages and batch status (Open/Full).

## 🔒 Security
- **Row Level Security (RLS)**: Data access is strictly controlled at the database level. Sales executives can only modify their own records.
- **Secure Authentication**: Powered by Supabase Auth.

## 📄 License
[Your License Here]
