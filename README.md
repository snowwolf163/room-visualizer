# Room Schedule Visualizer

Upload an Excel (.xlsx) with columns:
Course/Section, Course Offering Id, Start Date, End Date, Days Met, Start Time, End Time, Instructor, Room, Max Enrollment, Status, Term.

Everything is processed in the browser (no data uploaded).

## Use online (recommended)
Visit: 

## Run locally without setup
1. Unzip `dist/`
2. Serve the folder:
   - Python: `cd dist && python -m http.server 5173`
   - Node: `npm i -g serve && serve -s dist -l 5173`
3. Open http://localhost:5173

## Run locally from source (requires Node)
   bash
   npm install
   npm run dev
# open http://localhost:5173