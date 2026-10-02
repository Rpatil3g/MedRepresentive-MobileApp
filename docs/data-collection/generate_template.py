# -*- coding: utf-8 -*-
"""
Generates the client data-collection workbook for EterniRo Field Force.
Sheet order == import order (each sheet references the ones above it by business key).

Run:  python docs/data-collection/generate_template.py
"""
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "EterniRo_Field_Force_Master_Data_Template.xlsx")

# ---- styling -----------------------------------------------------------------
REQ_FILL  = PatternFill("solid", fgColor="C00000")   # dark red  = mandatory
REC_FILL  = PatternFill("solid", fgColor="ED7D31")   # orange    = strongly recommended
OPT_FILL  = PatternFill("solid", fgColor="808080")   # grey      = optional
HDR_FONT  = Font(color="FFFFFF", bold=True, size=10)
HINT_FONT = Font(color="595959", italic=True, size=9)
HINT_FILL = PatternFill("solid", fgColor="F2F2F2")
EX_FILL   = PatternFill("solid", fgColor="FFF2CC")   # sample row
EX_FONT   = Font(color="7F6000", italic=True, size=10)
THIN      = Side(style="thin", color="BFBFBF")
BORDER    = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

FILLS = {"R": REQ_FILL, "S": REC_FILL, "O": OPT_FILL}
MARK  = {"R": " *", "S": " *", "O": ""}


def add_sheet(wb, title, cols, examples, validations=None):
    """cols = list of (name, req_flag R/S/O, hint, width)"""
    ws = wb.create_sheet(title)
    ws.sheet_properties.tabColor = "1F4E79"

    for i, (name, flag, hint, width) in enumerate(cols, start=1):
        c = ws.cell(row=1, column=i, value=name + MARK[flag])
        c.fill, c.font, c.border = FILLS[flag], HDR_FONT, BORDER
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

        h = ws.cell(row=2, column=i, value=hint)
        h.fill, h.font, h.border = HINT_FILL, HINT_FONT, BORDER
        h.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

        ws.column_dimensions[get_column_letter(i)].width = width

    ws.row_dimensions[1].height = 30
    ws.row_dimensions[2].height = 46

    for r, row in enumerate(examples, start=3):
        for i, val in enumerate(row, start=1):
            c = ws.cell(row=r, column=i, value=val)
            c.fill, c.font, c.border = EX_FILL, EX_FONT, BORDER

    ws.freeze_panes = "A3"
    ws.auto_filter.ref = "A1:%s1" % get_column_letter(len(cols))

    for col_letter, options in (validations or {}).items():
        dv = DataValidation(type="list",
                            formula1='"%s"' % ",".join(options),
                            allow_blank=True)
        dv.error = "Pick one of: " + ", ".join(options)
        dv.errorTitle = "Invalid value"
        ws.add_data_validation(dv)
        dv.add("%s3:%s2000" % (col_letter, col_letter))

    return ws


wb = Workbook()
wb.remove(wb.active)

# =============================== READ ME ======================================
readme = wb.create_sheet("READ ME")
readme.sheet_properties.tabColor = "C00000"
readme.column_dimensions["A"].width = 4
readme.column_dimensions["B"].width = 34
readme.column_dimensions["C"].width = 96

rows = [
    ("title", "EterniRo Field Force - Master Data Collection Template", ""),
    ("", "", ""),
    ("h",  "How to read the headers", ""),
    ("kv", "RED header + *",  "MANDATORY. The row cannot be imported without this value."),
    ("kv", "ORANGE header + *", "STRONGLY RECOMMENDED. The import works without it, but a feature in the app is degraded - the grey hint row says which one."),
    ("kv", "GREY header",     "Optional. Leave blank if not available."),
    ("kv", "Row 2 (grey italic)", "Format, allowed values, and what the field drives in the app. Do NOT delete this row."),
    ("kv", "Row 3 (yellow)",  "A filled-in SAMPLE row so you can see the expected format. DELETE all yellow rows before sending the file back."),
    ("", "", ""),
    ("h",  "Rules that apply to every sheet", ""),
    ("kv", "Do not rename or reorder",  "Do not rename sheets, rename column headers, or change the column order. Add rows only."),
    ("kv", "Dates",       "Always DD-MM-YYYY (e.g. 15-04-2024). If Excel keeps reformatting them, set the column format to Text."),
    ("kv", "Mobile numbers", "10 digits. No +91, no spaces, no dashes. Set the column format to Text so leading zeros survive."),
    ("kv", "Amounts",     "Plain numbers only - no currency symbol and no thousand separators. Decimals are fine (e.g. 145.50)."),
    ("kv", "Yes / No",    "Type exactly YES or NO."),
    ("kv", "Linking sheets", "Sheets refer to each other by a business key (HQ Name, Territory Code, Employee Code, Product Name). The spelling must match EXACTLY, including case and spacing."),
    ("kv", "Blank rows",  "No blank rows in the middle of a sheet - the importer stops at the first empty row."),
    ("kv", "Duplicates",  "Email, Mobile Number, Employee Code, Territory Code and Product Name must each be unique across the whole file."),
    ("kv", "Partial data is fine", "If a sheet is not ready, send the file with that sheet empty rather than holding everything back. We can load it in a second pass."),
    ("", "", ""),
    ("h",  "Fill the sheets in this order - each one depends on the ones above it", ""),
    ("n",  "1. Headquarters",   "Base locations / depots. Everything else hangs off these."),
    ("n",  "2. Territories",    "Geographic areas. Doctors and chemists belong to a territory, and an MR only sees the doctors in the territories assigned to them."),
    ("n",  "3. Routes",         "Daily beats / patches inside an HQ. Used by the Monthly Tour Plan day form."),
    ("n",  "4. Employees",      "Admins, Managers and MRs - one row per person. This is what creates their app login."),
    ("n",  "5. MR Territory Map", "Which MR covers which territory. WITHOUT THIS AN MR SEES ZERO DOCTORS IN THE APP."),
    ("n",  "6. Doctors",        "The primary customers. Visits, daily call reports and tour plans are all built around these."),
    ("n",  "7. Chemists",       "Pharmacies / retailers. The app supports chemist calls as well as doctor calls."),
    ("n",  "8. Stockists",      "Distributors, each attached to one HQ."),
    ("n",  "9. Products",       "The promoted catalogue, including the current campaign / focus list."),
    ("n",  "10. Sample Inventory", "Needed for every product an MR may hand out as a sample. Without a row here the app BLOCKS visit check-out when the MR adds that sample, so skip it only for products you never sample."),
    ("n",  "11. Targets",       "Optional. Call and sales targets per MR - these drive the dashboard progress bars."),
    ("n",  "12. Dropdown Values", "Optional. The exact wording you want inside the app dropdowns."),
    ("n",  "13. Holidays",      "Optional. Company holiday calendar shown on the tour-plan calendar."),
    ("", "", ""),
    ("h",  "What we do NOT need from you", ""),
    ("kv", "Passwords",   "Do not put any password in this file. We generate a temporary password per user and the app forces a change at first login."),
    ("kv", "Internal IDs", "Leave all database IDs to us - the business keys in this file are enough."),
    ("kv", "Transaction history", "Master data only. Past visits, call reports, attendance and expenses are not imported."),
    ("", "", ""),
    ("h",  "How much data we are asking for (pilot load)", ""),
    ("kv", "Suggested volume", "2-3 HQs, 4-6 territories, 8-12 routes, 2 managers and 4-6 MRs, 100-200 doctors, 40-60 chemists, 5-10 stockists, 30-60 products. That is enough to make every screen look real without a full migration."),
    ("kv", "Keep it realistic", "Please use real names, real addresses and real co-ordinates for at least one full territory - dummy data hides problems that only show up with the real thing."),
    ("", "", ""),
    ("h",  "Points to confirm with us", ""),
    ("n",  "Geo co-ordinates", "Doctor and chemist latitude / longitude drive the check that the MR was actually at the clinic (100 m radius at check-in). If you cannot supply them, tell us and we will have the MRs capture the location on their first visit instead."),
    ("n",  "Expense heads", "The app currently offers Travel, Food and Other. Tell us if you need more heads (Lodging, Daily Allowance, Phone, and so on) and the per-head daily limits."),
    ("n",  "Doctor grading", "Confirm the grades you actually use - A/B/C, or Core / Super Core - and list them on the Dropdown Values sheet."),
    ("n",  "Product artwork", "Visual aids, brochures and pack shots can come as a zip of files named after the product instead of URLs. Tell us which you prefer."),
    ("n",  "Divisions", "If your MRs are split across divisions and each division promotes a different product list, tell us - the current build assumes one shared catalogue."),
]

r = 1
for kind, a, b in rows:
    if kind == "title":
        c = readme.cell(row=r, column=2, value=a)
        c.font = Font(bold=True, size=16, color="1F4E79")
        readme.row_dimensions[r].height = 24
    elif kind == "h":
        c = readme.cell(row=r, column=2, value=a)
        c.font = Font(bold=True, size=11, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="1F4E79")
        c2 = readme.cell(row=r, column=3, value="")
        c2.fill = PatternFill("solid", fgColor="1F4E79")
        readme.row_dimensions[r].height = 18
    else:
        ca = readme.cell(row=r, column=2, value=a)
        ca.font = Font(bold=(kind == "kv"), size=10)
        ca.alignment = Alignment(vertical="top")
        cb = readme.cell(row=r, column=3, value=b)
        cb.font = Font(size=10)
        cb.alignment = Alignment(wrap_text=True, vertical="top")
        readme.row_dimensions[r].height = 30 if len(b) > 95 else 15
    r += 1

readme.sheet_view.showGridLines = False

YN = ["YES", "NO"]

# =============================== 1. HEADQUARTERS ==============================
add_sheet(wb, "1. Headquarters",
  [("HQ Name", "R", "Unique. Other sheets refer to this exact text.", 24),
   ("City", "S", "", 18),
   ("State", "S", "", 18),
   ("Country", "O", "Defaults to India if left blank.", 14)],
  [("Pune HQ", "Pune", "Maharashtra", "India")])

# =============================== 2. TERRITORIES ===============================
add_sheet(wb, "2. Territories",
  [("Territory Name", "R", "e.g. Pune West", 24),
   ("Territory Code", "R", "Unique short code, e.g. PN-W. Other sheets refer to this exact code.", 18),
   ("Region", "S", "e.g. West / North", 16),
   ("State", "S", "", 18),
   ("District", "S", "", 18),
   ("Description", "O", "", 30)],
  [("Pune West", "PN-W", "West", "Maharashtra", "Pune", "Kothrud, Baner and Aundh belt")])

# =============================== 3. ROUTES ====================================
add_sheet(wb, "3. Routes",
  [("Route Name", "R", "e.g. Kothrud Beat", 26),
   ("HQ Name", "R", "Must match a row in sheet '1. Headquarters' exactly.", 24),
   ("Description", "O", "Landmarks or areas covered.", 40)],
  [("Kothrud Beat", "Pune HQ", "Karve Road to Paud Road")])

# =============================== 4. EMPLOYEES =================================
add_sheet(wb, "4. Employees",
  [("Full Name", "R", "", 24),
   ("Email", "R", "Unique. This is the LOGIN ID for the app.", 28),
   ("Mobile Number", "R", "Unique. 10 digits, no +91.", 16),
   ("Role", "R", "ADMIN, MANAGER or MR - pick from the dropdown.", 14),
   ("Employee Code", "R", "Unique, e.g. MR001. Other sheets refer to this exact code.", 16),
   ("HQ Name", "R", "Must match sheet '1. Headquarters'. Decides which routes and stockists this person sees.", 22),
   ("Reporting Manager Employee Code", "S", "For an MR, the Employee Code of their manager, who must also appear in this sheet with Role = MANAGER. Blank for ADMIN. Without it, tour plans and expenses have nobody to approve them.", 28),
   ("Designation", "O", "e.g. Medical Representative / Area Sales Manager", 26),
   ("Department", "O", "e.g. Cardiac Division", 20),
   ("Date of Joining", "O", "DD-MM-YYYY", 16),
   ("Date of Birth", "O", "DD-MM-YYYY", 16),
   ("Gender", "O", "Male / Female / Other", 12),
   ("Region", "O", "Managers only - the region they head.", 16),
   ("Address", "O", "", 30),
   ("City", "O", "", 16),
   ("State", "O", "", 16),
   ("Pincode", "O", "6 digits", 12),
   ("Emergency Contact Name", "O", "", 22),
   ("Emergency Contact Phone", "O", "10 digits", 20)],
  [("Rahul Deshmukh", "rahul.d@example.com", "9876543210", "MR", "MR001", "Pune HQ",
    "MGR001", "Medical Representative", "Cardiac Division", "15-04-2024", "02-08-1996",
    "Male", "", "12 Shivaji Nagar", "Pune", "Maharashtra", "411005", "Sunita Deshmukh", "9876500011"),
   ("Anil Kulkarni", "anil.k@example.com", "9876543211", "MANAGER", "MGR001", "Pune HQ",
    "", "Area Sales Manager", "Cardiac Division", "01-02-2020", "10-05-1985",
    "Male", "West", "5 FC Road", "Pune", "Maharashtra", "411004", "", "")],
  validations={"D": ["ADMIN", "MANAGER", "MR"], "L": ["Male", "Female", "Other"]})

# =============================== 5. MR TERRITORY MAP ==========================
add_sheet(wb, "5. MR Territory Map",
  [("MR Employee Code", "R", "Must match an Employee Code from sheet '4. Employees' with Role = MR.", 22),
   ("Territory Code", "R", "Must match sheet '2. Territories'. One row per MR per territory - repeat the MR code for multiple territories.", 18),
   ("Is Primary", "R", "YES for the MR's main territory - exactly one YES per MR - and NO for the others.", 14),
   ("Assigned From Date", "O", "DD-MM-YYYY. Defaults to the go-live date.", 18)],
  [("MR001", "PN-W", "YES", "15-04-2024"),
   ("MR001", "PN-C", "NO", "15-04-2024")],
  validations={"C": YN})

# =============================== 6. DOCTORS ===================================
add_sheet(wb, "6. Doctors",
  [("Doctor Name", "R", "Include the prefix, e.g. Dr. Suresh Mehta", 26),
   ("Territory Code", "S", "Must match sheet '2. Territories'. AN MR ONLY SEES DOCTORS IN THEIR ASSIGNED TERRITORY - a blank here makes this doctor invisible in the app.", 18),
   ("Route Name", "S", "Must match sheet '3. Routes'. Used to plan a day's beat in the tour plan.", 22),
   ("HQ Name", "S", "Only needed if the same Route Name exists under two different HQs.", 20),
   ("Specialty", "S", "e.g. Cardiologist, Physician, Paediatrician. Keep the wording consistent across rows.", 20),
   ("Doctor Category", "S", "Grade or class, e.g. A / B / C, or Core / Super Core. Used to prioritise visits.", 16),
   ("Qualification", "O", "e.g. MBBS, MD", 20),
   ("Registration Number", "O", "Medical council registration number.", 20),
   ("Mobile Number", "O", "10 digits", 16),
   ("Email", "O", "", 26),
   ("Clinic / Hospital Name", "S", "Shown to the MR on the visit screen.", 28),
   ("Address", "S", "", 34),
   ("City", "O", "", 16),
   ("State", "O", "", 16),
   ("Pincode", "O", "6 digits", 12),
   ("Latitude", "S", "Decimal degrees, e.g. 18.516726. Drives the 100 m geofence check at visit check-in. Blank means we cannot verify the MR was on site.", 16),
   ("Longitude", "S", "Decimal degrees, e.g. 73.856255", 16),
   ("Avg Patients Per Day", "O", "Whole number.", 18),
   ("Best Time To Visit", "O", "e.g. 11:00 AM - 1:00 PM", 22),
   ("Notes", "O", "Anything the MR should know before the call.", 34)],
  [("Dr. Suresh Mehta", "PN-W", "Kothrud Beat", "Pune HQ", "Cardiologist", "A", "MBBS, MD",
    "MH-2004-45612", "9822011223", "dr.mehta@example.com", "Mehta Heart Clinic",
    "202 Karve Road, Kothrud", "Pune", "Maharashtra", "411038", "18.507300", "73.807600",
    "45", "11:00 AM - 1:00 PM", "Prefers morning calls. No calls on Thursday.")])

# =============================== 7. CHEMISTS ==================================
add_sheet(wb, "7. Chemists",
  [("Shop Name", "R", "", 26),
   ("Territory Code", "S", "Must match sheet '2. Territories'. Same visibility rule as doctors.", 18),
   ("Route Name", "S", "Must match sheet '3. Routes'.", 22),
   ("HQ Name", "S", "Only needed to tell apart a duplicate Route Name.", 20),
   ("Owner Name", "O", "", 22),
   ("Drug License Number", "O", "", 22),
   ("Chemist Category", "O", "A / B / C", 16),
   ("Mobile Number", "O", "10 digits", 16),
   ("Alternate Mobile", "O", "10 digits", 16),
   ("Email", "O", "", 24),
   ("Address", "S", "", 34),
   ("City", "O", "", 16),
   ("State", "O", "", 16),
   ("Pincode", "O", "6 digits", 12),
   ("Latitude", "S", "Decimal degrees. Geofence check at visit check-in.", 16),
   ("Longitude", "S", "Decimal degrees.", 16),
   ("Monthly Potential", "O", "Approximate monthly business value in Rs. Numbers only.", 18),
   ("Notes", "O", "", 30)],
  [("Sai Medical Store", "PN-W", "Kothrud Beat", "Pune HQ", "Ramesh Jadhav", "MH-DL-20-88231",
    "A", "9822033445", "", "sai.medical@example.com", "Shop 4, Paud Road", "Pune",
    "Maharashtra", "411038", "18.508900", "73.811200", "250000", "Stocks the full cardiac range")])

# =============================== 8. STOCKISTS =================================
add_sheet(wb, "8. Stockists",
  [("Stockist Name", "R", "", 26),
   ("HQ Name", "R", "Must match sheet '1. Headquarters'. A stockist belongs to exactly one HQ.", 22),
   ("Company / Firm Name", "O", "Registered firm name, if different from the trade name.", 28),
   ("GST Number", "O", "15 characters.", 20),
   ("Drug License Number", "O", "", 22),
   ("Contact Person", "O", "", 22),
   ("Mobile Number", "O", "10 digits", 16),
   ("Email", "O", "", 26),
   ("Address", "S", "", 34),
   ("City", "O", "", 16),
   ("State", "O", "", 16),
   ("Pincode", "O", "6 digits", 12),
   ("Latitude", "O", "Decimal degrees. Used to show the stockist on the map - no geofence check here.", 16),
   ("Longitude", "O", "Decimal degrees.", 16),
   ("Credit Limit", "O", "In Rs, numbers only.", 16),
   ("Payment Term Days", "O", "Whole number, e.g. 30", 18)],
  [("Shree Pharma Distributors", "Pune HQ", "Shree Pharma Pvt Ltd", "27AABCS1429B1ZX",
    "MH-DL-20-11045", "Vinod Shah", "9822044556", "orders@shreepharma.example.com",
    "Plot 11, Bhosari MIDC", "Pune", "Maharashtra", "411026", "18.621500", "73.848300",
    "500000", "30")])

# =============================== 9. PRODUCTS ==================================
add_sheet(wb, "9. Products",
  [("Product Name", "R", "Brand name as promoted. Unique - other sheets refer to it.", 24),
   ("PTR", "R", "Price To Retailer. Numbers only. Enter 0 if not applicable.", 12),
   ("PTS", "R", "Price To Stockist. Numbers only. Enter 0 if not applicable.", 12),
   ("MRP", "S", "Maximum Retail Price. Shown to the MR during the call.", 12),
   ("Pack Size", "S", "e.g. 10x10 Tablets, 60 ml Syrup", 20),
   ("Product Type", "S", "e.g. Ethical / Generic / OTC", 16),
   ("Product Category", "S", "Therapeutic group, e.g. Antibiotic, Cardiac, Derma. Drives the filter on the product list screen.", 20),
   ("Composition", "S", "Salt and strength, e.g. Amoxicillin 500mg + Clavulanic Acid 125mg", 40),
   ("HSN Code", "O", "", 14),
   ("GST Percentage", "O", "Number only, e.g. 12", 14),
   ("Is Campaign / Focus Product", "S", "YES for the products in the current focus list - they get a highlighted section on the app home screen. NO otherwise.", 20),
   ("Brand Image URL", "O", "Public link to the pack shot. You may instead send image files named exactly after the product.", 30),
   ("Visual Aid URL", "O", "Link to the detailing / visual-aid PDF or image the MR shows the doctor.", 30),
   ("Brochure URL", "O", "Link to the product brochure or LBL PDF.", 30),
   ("Product Video URL", "O", "Link to the promo video, if any.", 30)],
  [("Cardiomax 40", "78.50", "72.00", "110.00", "10x10 Tablets", "Ethical", "Cardiac",
    "Telmisartan 40mg", "30049099", "12", "YES", "", "", "", "")],
  validations={"K": YN})

# =============================== 10. SAMPLE INVENTORY =========================
add_sheet(wb, "10. Sample Inventory",
  [("MR Employee Code", "R", "Must match sheet '4. Employees'.", 22),
   ("Product Name", "R", "Must match sheet '9. Products' exactly. One row per MR per product - the same pair must not repeat.", 24),
   ("Opening Balance", "R", "Units physically with the MR on day one. Whole number. Enter 0 if the MR holds none yet but may be issued stock later - a row with 0 still lets them check out a visit once stock is added.", 18),
   ("Received", "O", "Units issued to the MR since then. Whole number, defaults to 0.", 14),
   ("As On Date", "O", "DD-MM-YYYY", 16)],
  [("MR001", "Cardiomax 40", "50", "0", "01-04-2026")])

# =============================== 11. TARGETS ==================================
add_sheet(wb, "11. Targets",
  [("MR Employee Code", "R", "Must match sheet '4. Employees'.", 22),
   ("Target Type", "R", "Visits / Sales / NewDoctors", 16),
   ("Target Period", "R", "Monthly / Quarterly / Yearly", 16),
   ("Period Start Date", "R", "DD-MM-YYYY", 18),
   ("Period End Date", "R", "DD-MM-YYYY", 18),
   ("Target Value", "R", "Numbers only - number of calls for Visits, Rs for Sales.", 14),
   ("Unit", "O", "Count / Amount / Percentage", 14)],
  [("MR001", "Visits", "Monthly", "01-04-2026", "30-04-2026", "300", "Count"),
   ("MR001", "Sales", "Monthly", "01-04-2026", "30-04-2026", "450000", "Amount")],
  validations={"B": ["Visits", "Sales", "NewDoctors"],
               "C": ["Monthly", "Quarterly", "Yearly"],
               "G": ["Count", "Amount", "Percentage"]})

# =============================== 12. DROPDOWN VALUES ==========================
add_sheet(wb, "12. Dropdown Values",
  [("Category", "R", "Keep the pre-filled rows. Edit the wording in the next column if your terms differ, and add rows for your own values.", 20),
   ("Value / Label", "R", "Exactly as it should appear inside the app.", 30),
   ("Sort Order", "O", "1, 2, 3 ... controls the order in the dropdown.", 12),
   ("Notes", "O", "", 44)],
  [("VisitType", "Doctor / Clinic", "1", "Already configured - change only if your terminology differs"),
   ("VisitType", "Chemist / Pharmacy", "2", "Already configured"),
   ("CallType", "Routine", "1", "Already configured"),
   ("CallType", "Follow Up", "2", "Already configured"),
   ("CallType", "Campaign", "3", "Already configured"),
   ("CallType", "Cold Call", "4", "Already configured"),
   ("VisitOutcome", "Met", "1", "Already configured"),
   ("VisitOutcome", "Not Available", "2", "Already configured"),
   ("VisitOutcome", "Busy / Refused", "3", "Already configured"),
   ("VisitOutcome", "On Leave", "4", "Already configured"),
   ("DoctorSpecialty", "Cardiologist", "1", "ADD YOUR FULL LIST - it must cover every specialty used in sheet 6"),
   ("DoctorCategory", "A", "1", "ADD YOUR FULL GRADE LIST - it must cover every grade used in sheet 6"),
   ("ExpenseCategory", "Travel", "1", "The app currently ships Travel / Food / Other - tell us if you need more heads"),
   ("ExpenseCategory", "Food", "2", ""),
   ("ExpenseCategory", "Other", "3", "")])

# =============================== 13. HOLIDAYS =================================
add_sheet(wb, "13. Holidays",
  [("Date", "R", "DD-MM-YYYY", 16),
   ("Holiday Name", "R", "e.g. Independence Day", 26),
   ("Applies To HQ", "O", "An HQ Name from sheet '1. Headquarters', or ALL for a company-wide holiday.", 22)],
  [("15-08-2026", "Independence Day", "ALL"),
   ("19-09-2026", "Ganesh Chaturthi", "Pune HQ")])

wb.save(OUT)
print("written:", OUT)
