export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Guide</h1>
          <p className="text-muted-foreground mt-2">
            This tool visualizes room schedules from an Excel file. To work correctly,
            your file must include the required columns and valid schedule data.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Required columns</h2>
          <p>
            Your Excel file must include a header row with these column names somewhere
            in the sheet:
          </p>

          <div className="rounded-lg border p-4 bg-muted/30 overflow-auto">
            <code className="text-sm whitespace-pre-wrap text-foreground">
              Course/Section{"\n"}
              Course Offering Id{"\n"}
              Start Date{"\n"}
              End Date{"\n"}
              Days Met{"\n"}
              Start Time{"\n"}
              End Time{"\n"}
              Instructor{"\n"}
              Room{"\n"}
              Max Enrollment{"\n"}
              Status{"\n"}
              Term
            </code>
          </div>

          <p className="text-sm text-muted-foreground">
            Column order does not matter. Extra columns are allowed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">What each important column means</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Course/Section</strong>: the course name, such as{" "}
              <code>MMET 181/501 LEC</code>
            </li>
            <li>
              <strong>Start Date</strong> and <strong>End Date</strong>: the full date
              range for the course
            </li>
            <li>
              <strong>Days Met</strong>: meeting days such as <code>M (Monday)</code>,{" "}
              <code>T (Tuesday)</code>, <code>W (Wednesday)</code>,{" "}
              <code>R (Thursday)</code>, <code>F (Friday)</code>,{" "}
              <code>S (Saturday)</code>, <code>U (Sunday)</code>
            </li>
            <li>
              <strong>Start Time</strong> and <strong>End Time</strong>: class meeting
              times
            </li>
            <li>
              <strong>Instructor</strong>: used for color coding in the schedule
            </li>
            <li>
              <strong>Room</strong>: used to group classes by room
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Accepted date and time formats</h2>
          <p>The tool supports both normal text values and native Excel date/time cells.</p>

          <ul className="list-disc pl-6 space-y-2">
            <li>
              Text examples: <code>1/12/2026</code>, <code>5/8/2026</code>,{" "}
              <code>8:00 AM</code>, <code>1:50 PM</code>
            </li>
            <li>
              Excel date/time cells are also supported, so you do not need to convert
              them manually
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Example of a valid row</h2>
          <div className="rounded-lg border overflow-auto bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2 border">Course/Section</th>
                  <th className="text-left p-2 border">Course Offering Id</th>
                  <th className="text-left p-2 border">Start Date</th>
                  <th className="text-left p-2 border">End Date</th>
                  <th className="text-left p-2 border">Days Met</th>
                  <th className="text-left p-2 border">Start Time</th>
                  <th className="text-left p-2 border">End Time</th>
                  <th className="text-left p-2 border">Instructor</th>
                  <th className="text-left p-2 border">Room</th>
                  <th className="text-left p-2 border">Max Enrollment</th>
                  <th className="text-left p-2 border">Status</th>
                  <th className="text-left p-2 border">Term</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border">MMET 181/501 LEC</td>
                  <td className="p-2 border">24072</td>
                  <td className="p-2 border">1/12/2026</td>
                  <td className="p-2 border">5/8/2026</td>
                  <td className="p-2 border">MWF</td>
                  <td className="p-2 border">8:00 AM</td>
                  <td className="p-2 border">8:50 AM</td>
                  <td className="p-2 border">John A</td>
                  <td className="p-2 border">EABB 113</td>
                  <td className="p-2 border">24</td>
                  <td className="p-2 border">Scheduled</td>
                  <td className="p-2 border">202611 (CS Spring)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Why some files do not work</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>No header row</strong>: the first row must contain column names,
              not data
            </li>
            <li>
              <strong>Wrong header names</strong>: required headers must match the
              expected names
            </li>
            <li>
              <strong>Missing Start Date or End Date</strong>: the app needs a date
              range to generate schedule blocks
            </li>
            <li>
              <strong>Missing Room</strong>: rows without a room are skipped
            </li>
            <li>
              <strong>Missing Days or Times</strong>: rows without meeting days or times
              cannot be displayed
            </li>
            <li>
              <strong>Different export format</strong>: some school exports omit required
              fields or rename columns
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Important notes</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Rows missing <strong>Room</strong>, <strong>Start Date</strong>,{" "}
              <strong>End Date</strong>, <strong>Start Time</strong>, or{" "}
              <strong>End Time</strong> will be ignored
            </li>
            <li>Column order does not matter, as long as the required headers are present</li>
            <li>Extra columns are okay and will be ignored</li>
            <li>The app reads the first worksheet in the uploaded Excel file</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Recommended workflow</h2>
          <ol className="list-decimal pl-6 space-y-2">
            <li>Download the sample file below</li>
            <li>Use it as a template</li>
            <li>Keep the header row unchanged</li>
            <li>Make sure each scheduled class has valid dates, days, times, and room</li>
            <li>Upload the file on the Home page</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Sample file</h2>
          <p>Download a sample Excel file with the correct structure:</p>
          <a
            href={`${import.meta.env.BASE_URL}sample-room-visualizer.xlsx`}
            download
            className="inline-flex items-center rounded-md border bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Download Sample File
          </a>
        </section>
      </div>
    </div>
  );
}