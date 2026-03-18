# Room Schedule Visualizer

A web app for visualizing room schedules from Excel files in a clean weekly layout.

Everything runs entirely in the browser — no data is uploaded or stored.

![Deploy](https://github.com/snowwolf163/room-visualizer/actions/workflows/deploy.yml/badge.svg)

---

## 🌐 Live Demo

👉 https://snowwolf163.github.io/room-visualizer/

---

## ✨ Features

### 📊 Schedule Visualization
- Weekly layout from **Sunday → Saturday**
- Time-based grid with adjustable visible hours
- Automatically groups overlapping sessions into lanes
- Deduplicates multi-section courses

### 🎯 Smart Interaction
- Hover a block → highlights related sessions across the week
- Click a block → shows detailed tooltip (click again to close)
- Tooltip includes:
  - Instructor
  - Days met
  - Date range
  - Time
  - Room
  - Term

### 🎨 UI & UX
- Light mode / Dark mode
- Responsive layout with collapsible sidebar
- Color-coded instructors (per selected room)
- Clean empty-state messaging when no sessions match filters

### 🔍 Filtering
- Filter by **Room**
- Filter by **Status**:
  - All
  - Scheduled
  - Unassigned

### ⚠️ Validation System
- Detects:
  - Missing required fields
  - Room conflicts
  - Instructor double-booking
- Displays errors and notices in a dedicated tab

### 📤 Export
- Export the current view as a PNG
- Includes:
  - Room name + status
  - Instructor legend
- Filename automatically reflects filters:
  - `room-EABB-113-Scheduled.png`

### 🔒 Privacy-first
- Files are processed entirely in-browser
- No uploads, no storage, no tracking
- Data is cleared on refresh or tab close

---

## 📥 Input Format

Your Excel file must include these columns (order does not matter):
- Course/Section
- Course Offering Id
- Start Date
- End Date
- Days Met
- Start Time
- End Time
- Instructor
- Room
- Max Enrollment
- Status
- Term


### Supported formats
- Dates: `1/12/2026`, `2026-01-12`, or Excel date cells
- Times: `8:00 AM`, `13:00`, or Excel time cells
- Days: `M`, `T`, `W`, `R`, `F`, `S`, `U` (also supports `Th`, `Tu`, `Sa`, `Su`)

---

## 🧠 How It Works

- Converts term-based schedules into a **weekly pattern view**
- Maps days (`M, T, W, R, F, S, U`) to fixed weekday columns
- Computes overlapping sessions and assigns lanes
- Uses SVG rendering for precise layout and export compatibility
- Applies filtering before rendering for performance and clarity

---

## 🛠️ Tech Stack

- React + TypeScript
- Vite
- TailwindCSS + shadcn/ui
- date-fns
- xlsx (Excel parsing)
- GitHub Pages (HashRouter)

---

## 🚀 Run Locally

### Option 1 — From build output
```bash
cd dist
python -m http.server 5173
# or
serve -s dist -l 5173
```
- Open: http://localhost:5173

### Option 2 — From source
```bash
npm install
npm run dev
```
- Open: http://localhost:5173

## 📌 Notes

- Only rows with valid room, dates, and times are rendered
- Invalid or incomplete rows appear in the Validation tab
- The graph shows a weekly schedule, not the full date range
- The tooltip preserves the original term date range

## 👤 Author

- Created by Hoang Khuong Tang

- GitHub: https://github.com/snowwolf163