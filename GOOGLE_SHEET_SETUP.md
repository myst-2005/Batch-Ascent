# How to Set Up Google Sheet for Sales Intimation

Follow these steps to connect your Sales Intimation Form to a Google Sheet.

## 1. Create a New Google Sheet
1.  Go to [Google Sheets](https://sheets.google.com).
2.  Create a **Blank spreadsheet**.
3.  Name it (e.g., "Sales Intimation Data").
4.  In the first row (Row 1), add the following headers (order doesn't matter, but having them helps you see data):
    *   Submitted At
    *   Student Name
    *   Contact Number
    *   Email
    *   Date of Admission
    *   Date of Lead Creation
    *   Lead Source
    *   School
    *   Batch Code
    *   Verified Seats
    *   Payment Mode
    *   EMI Partner
    *   Total Sale Value
    *   Amount Paid
    *   Scholarships/Notes
    *   Sales Executive Code
    *   Sales Executive Number
    *   Sales User ID

## 2. Open Apps Script
1.  In your Google Sheet, go to **Extensions** > **Apps Script**.
2.  A new tab will open with a code editor.

## 3. Add the Script
1.  Delete any code currently in the `Code.gs` file.
2.  Paste the following code:

```javascript
function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Parse the JSON data sent from the form
  var data = JSON.parse(e.postData.contents);
  
  // Prepare the row data
  var rowData = [
    data.submitted_at || new Date(),
    data.student_name,
    data.contact_number,
    data.email,
    data.admission_date,
    data.lead_creation_date,
    data.lead_source,
    data.school,
    data.batch_code,
    data.verified_seats ? 'Yes' : 'No',
    data.payment_mode,
    data.emi_partner || '',
    data.total_sale_value,
    data.amount_paid,
    data.scholarships_notes || '',
    data.sales_executive_code,
    data.sales_executive_number || '',
    data.sales_user_id || ''
  ];
  
  // Append the data to the sheet
  sheet.appendRow(rowData);
  
  // Return a success response
  return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' })).setMimeType(ContentService.MimeType.JSON);
}
```

3.  Click the **Save** icon (floppy disk).

## 4. Deploy as Web App
1.  Click the blue **Deploy** button > **New deployment**.
2.  Click the **Select type** gear icon > **Web app**.
3.  Fill in the details:
    *   **Description**: Sales Intimation Webhook
    *   **Execute as**: **Me** (your email address)
    *   **Who has access**: **Anyone** (This is important so your app can send data without login screens)
4.  Click **Deploy**.
5.  **Authorize Access**: You will be asked to authorize the script.
    *   Click "Review Permissions".
    *   Choose your account.
    *   You might see a warning "Google hasn't verified this app" (since you just wrote it). Click **Advanced** > **Go to ... (unsafe)**.
    *   Click **Allow**.
6.  Copy the **Web App URL** provided (it ends in `/exec`).

## 5. Add to Your Project
1.  Open your project's `.env.local` file (or create one if it doesn't exist).
2.  Add the URL you copied:

```env
NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/YOUR_LONG_SCRIPT_ID/exec
```

3.  Restart your development server (`npm run dev`) for the changes to take effect.
