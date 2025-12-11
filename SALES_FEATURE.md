# Sales Feature Documentation

## Overview
The Sales feature allows sales team members to enroll students into batches and track their performance. Each sales person has a unique Sales ID that they use when filling enrollment forms.

## Database Changes

### 1. Updated `users` Table
- Added `sales_id` column (TEXT, UNIQUE) to store the unique identifier for each sales person
- Example: `SALES-001`, `SALES-002`, etc.

### 2. New `sales_enrollments` Table
Tracks which sales person enrolled which student:
- `id` (UUID) - Primary key
- `student_email` (TEXT) - Student's email
- `student_name` (TEXT) - Student's name
- `student_phone` (TEXT) - Student's phone
- `batch_id` (TEXT) - Reference to batches table
- `sales_id` (TEXT) - Reference to users.sales_id
- `enrolled_at` (TIMESTAMP) - When the enrollment happened

## How It Works

### 1. Creating a Sales User
When an Admin creates a new user with the SALES role:
1. Go to **Manage Users** (Admin only)
2. Fill in: Name, Email, School
3. Select Role: **SALES**
4. System auto-generates a unique Sales ID (e.g., SALES-001)
5. Sales person receives invitation email

### 2. Sales Dashboard
Sales users see:
- **Total Enrollments**: All-time count of students they've enrolled
- **This Month**: Enrollments in the current month
- **Sales ID**: Their unique ID to use in forms
- **Available Batches**: All batches from their school with:
  - Batch ID, Name, Course
  - Start Date
  - Enrollment progress (visual bar)
  - Status (Open/Full)

### 3. Enrollment Process
**Via n8n Webhook:**

1. Sales person fills a form (in n8n or external system) with:
   - Their **Sales ID** (e.g., SALES-001)
   - Student Name
   - Student Email
   - Student Phone
   - Batch ID

2. Form sends data to webhook: `/api/webhooks/sales-enroll`

3. System validates:
   - Sales ID exists and belongs to a SALES user
   - Batch exists and has capacity
   - Student email is valid

4. If valid:
   - Student is enrolled in `student_batches`
   - Enrollment is recorded in `sales_enrollments`
   - Sales person gets credit for the enrollment

## API Endpoint

### POST `/api/webhooks/sales-enroll`

**Request Body:**
```json
{
  "sales_id": "SALES-001",
  "student_name": "John Doe",
  "student_email": "john@example.com",
  "student_phone": "+1234567890",
  "batch_id": "BATCH-001"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Student enrolled successfully",
  "sales_person": "Jane Smith"
}
```

**Error Responses:**
- `400`: Invalid Sales ID, Batch full, or missing required fields
- `404`: Batch not found
- `500`: Server error

## Setup Instructions

### 1. Run SQL Schema
Execute `sales_schema.sql` in your Supabase SQL Editor to create the necessary tables and policies.

### 2. Create Sales Users
1. Login as Admin
2. Navigate to Manage Users
3. Create users with SALES role
4. Note their auto-generated Sales IDs

### 3. Configure n8n Webhook
1. Create a new workflow in n8n
2. Add a Webhook trigger
3. Add form fields: sales_id, student_name, student_email, student_phone, batch_id
4. Add HTTP Request node:
   - Method: POST
   - URL: `https://your-app.vercel.app/api/webhooks/sales-enroll`
   - Body: JSON with form data

### 4. Share Form with Sales Team
- Provide sales team with the n8n form link
- Ensure they know their Sales ID
- Train them on which Batch IDs to use

## Benefits

1. **Accountability**: Track which sales person enrolled each student
2. **Performance Metrics**: See individual and team performance
3. **Simplified Process**: Sales only need to remember their Sales ID
4. **Real-time Updates**: Dashboard updates immediately after enrollment
5. **School Isolation**: Sales can only see batches from their school

## Future Enhancements

1. **Leaderboard**: Rank sales team by enrollments
2. **Commission Tracking**: Calculate commissions based on enrollments
3. **Email Notifications**: Alert sales when their student is enrolled
4. **Bulk Enrollment**: Allow uploading CSV of multiple students
5. **Analytics**: Detailed charts showing enrollment trends
