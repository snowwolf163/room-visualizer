import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { format, isAfter, isEqual } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Download, Upload, Calendar as CalendarIcon } from "lucide-react";
import { HEADER_MAP, REQUIRED_HEADERS } from "./room-visualizer/constants";
import type { Row, SessionInstance, ValidationSchedRow } from "./room-visualizer/types";
import {
  assignColors,
  distinct,
  formatDisplayDate,
  formatSectionLabel,
  generateOccurrences,
  getBaseCourse,
  getSectionNumber,
  normalizeDays,
  parseExcelDate,
  parseTimeOnDate,
  timeRangesOverlap,
  timeToMinutes,
} from "./room-visualizer/utils";
import ValidationPanel from "./room-visualizer/ValidationPanel";


/**
 * Room Schedule Visualizer
 * - Upload a .xlsx exported as described
 * - Choose a Room
 * - See an SVG grid: X-axis = date, Y-axis = time; blocks colored by Instructor
 *
 * Expected columns (case-insensitive match by header text):
 * 1. Course/Section
 * 2. Course Offering Id
 * 3. Start Date
 * 4. End Date
 * 5. Days Met
 * 6. Start Time
 * 7. End Time
 * 8. Instructor
 * 9. Room
 * 10. Max Enrollment
 * 11. Status
 * 12. Term
 */

export default function RoomScheduleVisualizer() {
  const [rows, setRows] = useState<Row[]>([]);
  const [room, setRoom] = useState<string>("");
  const [minHour, setMinHour] = useState<number>(7);  // default 7:00
  const [maxHour, setMaxHour] = useState<number>(22); // default 22:00
  const fileRef = useRef<HTMLInputElement>(null);
  
  //Checking validation const
  const [activeTab, setActiveTab] = useState<"schedule" | "validation">("schedule");
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [formatErrors, setFormatErrors] = useState<string[]>([]);

  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    session: SessionInstance | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    session: null,
  });

  const hoverTimeoutRef = useRef<number | null>(null);


  const rooms = useMemo(
    () => distinct(rows.map(r => r.room).filter(Boolean)).sort(),
    [rows]
  );
  
  //Schedulable rows for validation
  const schedulableRows = useMemo<ValidationSchedRow[]>(() => {
    const out: ValidationSchedRow[] = [];

    for (const r of rows) {
      const startDateObj = parseExcelDate(r.startDate);
      const endDateObj = parseExcelDate(r.endDate);

      if (!startDateObj || !endDateObj) continue;
      if (!r.startTime || !r.endTime) continue;
      if (!r.daysMet) continue;
      if (!r.term) continue;
      if (!r.status) continue;

      const startTimeObj = parseTimeOnDate(startDateObj, r.startTime);
      const endTimeObj = parseTimeOnDate(startDateObj, r.endTime);

      if (isNaN(startTimeObj.getTime()) || isNaN(endTimeObj.getTime())) continue;
      if (isAfter(startTimeObj, endTimeObj) || isEqual(startTimeObj, endTimeObj)) continue;

      out.push({
        row: r,
        startDateObj,
        endDateObj,
        startTimeObj,
        endTimeObj,
        instructor: r.instructor || "Unknown",
        room: r.room || "",
        term: r.term || "",
        status: r.status || "",
        courseSection: r.courseSection || "",
        daysMet: r.daysMet || "",
      });
    }

    return out;
  }, [rows]);

  const sessions: SessionInstance[] = useMemo(() => {
	const out: SessionInstance[] = [];

	for (const r of rows) {
	  if (!room || r.room === room) {
		const dates = generateOccurrences(r);

		for (const d of dates) {
		  const start = parseTimeOnDate(d, r.startTime);
		  const end = parseTimeOnDate(d, r.endTime);

		  if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
		  if (isAfter(start, end) || isEqual(start, end)) continue;

		  const courseSection = r.courseSection || "";
		  const sectionNumber = getSectionNumber(courseSection);

		  out.push({
			date: d,
			start,
			end,
			instructor: r.instructor || "Unknown",
			courseSection,
			room: r.room || "",
			baseCourse: getBaseCourse(courseSection),
			sections: sectionNumber ? [sectionNumber] : [],
			daysMet: r.daysMet || "",
			startDate: r.startDate || "",
			endDate: r.endDate || "",
			term: r.term || "",
			status: r.status || "",
			courseOfferingIds: r.courseOfferingId ? [String(r.courseOfferingId)] : [],
		  });
		}
	  }
	}

	const merged = new Map<string, SessionInstance>();

	for (const session of out) {
	  const key = [
		session.baseCourse,
		format(session.date, "yyyy-MM-dd"),
		session.start.getTime(),
		session.end.getTime(),
		session.room,
		session.instructor,
	  ].join("|");

	  const existing = merged.get(key);

	  if (existing) {
		existing.sections.push(...session.sections);
		existing.courseOfferingIds.push(...session.courseOfferingIds);
	  } else {
		merged.set(key, {
		  ...session,
		  sections: [...session.sections],
		  courseOfferingIds: [...session.courseOfferingIds],
		});
	  }
	}

	const deduped = Array.from(merged.values()).map(session => ({
	  ...session,
	  sections: Array.from(new Set(session.sections)).sort(
		(a, b) => Number(a) - Number(b)
	  ),
	  courseOfferingIds: Array.from(new Set(session.courseOfferingIds)).sort(),
	}));

	deduped.sort(
	  (a, b) =>
		a.date.getTime() - b.date.getTime() ||
		a.start.getTime() - b.start.getTime()
	);

	return deduped;
}, [rows, room]);

  const visibleInstructors = useMemo(
    () => distinct(sessions.map(s => s.instructor).filter(Boolean)),
    [sessions]
  );

  const colorByInstructor = useMemo(
    () => assignColors(visibleInstructors),
    [visibleInstructors]
  );

  const dateColumns = useMemo(() => distinct(sessions.map(s => format(s.date, "yyyy-MM-dd"))), [sessions]);

  const validationResults = useMemo(() => {
    const errors: string[] = [];
    const infos: string[] = [];

    errors.push(...formatErrors);

    rows.forEach((r, idx) => {
      const missing: string[] = [];

      if (!r.courseSection) missing.push("Course/Section");
      if (!r.startDate) missing.push("Start Date");
      if (!r.endDate) missing.push("End Date");
      if (!r.daysMet) missing.push("Days Met");
      if (!r.startTime) missing.push("Start Time");
      if (!r.endTime) missing.push("End Time");
      if (!r.room) missing.push("Room");
      if (!r.instructor) missing.push("Instructor");
      if (!r.term) missing.push("Term");
      if (!r.status) missing.push("Status");

      if (missing.length > 0) {
        infos.push(
          `Row ${idx + 2} (${r.courseSection || "Unknown course"}): missing ${missing.join(", ")}`
        );
      }
    });

    for (let i = 0; i < schedulableRows.length; i++) {
      for (let j = i + 1; j < schedulableRows.length; j++) {
        const a = schedulableRows[i];
        const b = schedulableRows[j];

        if (a.term !== b.term) continue;
        if (a.status !== "Scheduled" || b.status !== "Scheduled") continue;

        const aDays = new Set(normalizeDays(a.daysMet));
        const bDays = new Set(normalizeDays(b.daysMet));
        const sharedDays = [...aDays].some(day => bDays.has(day));
        if (!sharedDays) continue;

        const dateRangesOverlap =
          a.startDateObj <= b.endDateObj && b.startDateObj <= a.endDateObj;
        if (!dateRangesOverlap) continue;

        const timesOverlap = timeRangesOverlap(
          a.startTimeObj,
          a.endTimeObj,
          b.startTimeObj,
          b.endTimeObj
        );
        if (!timesOverlap) continue;

        if (
          a.room &&
          b.room &&
          a.room === b.room &&
          a.instructor !== b.instructor
        ) {
          errors.push(
            `Room conflict in ${a.term}: room ${a.room} has overlapping scheduled classes "${a.courseSection}" (${a.instructor}) and "${b.courseSection}" (${b.instructor}).`
          );
        }

        if (
          a.instructor &&
          b.instructor &&
          a.instructor === b.instructor &&
          a.room &&
          b.room &&
          a.room !== b.room
        ) {
          errors.push(
            `Instructor conflict in ${a.term}: ${a.instructor} has overlapping scheduled classes in different rooms (${a.room} and ${b.room}).`
          );
        }
      }
    }

    return {
      errors: Array.from(new Set(errors)),
      infos: Array.from(new Set(infos)),
    };
  }, [rows, schedulableRows, formatErrors]);

  // Determine Y scale domain
  const [autoMinHour, autoMaxHour] = useMemo(() => {
    if (!sessions.length) return [7, 22];
    let minM = Infinity, maxM = -Infinity;
    for (const s of sessions) {
      minM = Math.min(minM, timeToMinutes(s.start));
      maxM = Math.max(maxM, timeToMinutes(s.end));
    }
    // Pad 30 minutes each side
    minM = Math.floor(Math.max(0, minM - 30) / 60);
    maxM = Math.ceil(Math.min(24 * 60, maxM + 30) / 60);
    return [minM, maxM];
  }, [sessions]);

  const effectiveMin = Math.min(minHour, autoMinHour);
  const effectiveMax = Math.max(maxHour, autoMaxHour);

  // ---- Handlers ----
  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
    const data = new Uint8Array(e.target?.result as ArrayBuffer);
    const wb = XLSX.read(data, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const headers = json.length ? Object.keys(json[0]) : [];
    setDetectedHeaders(headers);

    const missingHeaders = REQUIRED_HEADERS.filter(
      required =>
        !headers.some(h => String(h).trim().toLowerCase() === required.toLowerCase())
    );

    if (missingHeaders.length > 0) {
      setFormatErrors([
        `Missing required header(s): ${missingHeaders.join(", ")}`
      ]);
    } else {
      setFormatErrors([]);
    }

    const mapped: Row[] = json.map((row: any) => {
      const out: any = {};
      for (const [k, v] of Object.entries(row)) {
        const key = HEADER_MAP[String(k).trim().toLowerCase()];
        if (key) out[key] = v;
      }
      return out as Row;
    });

    setRows(mapped);

    const firstRoom = mapped.find(r => r.room)?.room || "";
    setRoom(firstRoom);
    };
    reader.readAsArrayBuffer(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function downloadPNG() {
    // Export the SVG as PNG
    const svg = document.getElementById("schedule-svg") as SVGSVGElement | null;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const image64 = `data:image/svg+xml;base64,${svg64}`;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svg.clientWidth * 2;
      canvas.height = svg.clientHeight * 2;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(2, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `room-${room || "schedule"}.png`;
      a.click();
    };
    img.src = image64;
  }
  
  //Add tooltip functions
  function showTooltipWithDelay(
	e: React.MouseEvent<SVGGElement, MouseEvent>,
	session: SessionInstance
  ) {
	if (hoverTimeoutRef.current) {
	  window.clearTimeout(hoverTimeoutRef.current);
	}

	const x = e.clientX;
	const y = e.clientY;

	hoverTimeoutRef.current = window.setTimeout(() => {
	  setTooltip({
		visible: true,
		x,
		y,
		session,
	  });
	}, 500);
  }

  function hideTooltip() {
	if (hoverTimeoutRef.current) {
	  window.clearTimeout(hoverTimeoutRef.current);
	  hoverTimeoutRef.current = null;
	}

	setTooltip(prev => ({
	  ...prev,
	  visible: false,
	  session: null,
	}));
  }

  function moveTooltip(e: React.MouseEvent<SVGGElement, MouseEvent>) {
	setTooltip(prev => ({
	  ...prev,
	  x: e.clientX,
	  y: e.clientY,
	}));
  }

  // ---- Layout constants ----
  const colWidth = 140;
  const gutter = 16;
  const hourHeight = 50; // px per hour
  const headerH = 32;
  const labelW = 80; // y-axis label width

  const width = labelW + (colWidth + gutter) * dateColumns.length + gutter;
  const height = headerH + (effectiveMax - effectiveMin) * hourHeight + gutter * 2;

  function yFor(date: Date) {
    const minutes = (date.getHours() - effectiveMin) * 60 + date.getMinutes();
    return headerH + gutter + (minutes / 60) * hourHeight;
  }

  // Build hour ticks
  const hourTicks: number[] = [];
  for (let h = effectiveMin; h <= effectiveMax; h++) hourTicks.push(h);

  // Group sessions by date string for collision handling
  const byDate = new Map<string, SessionInstance[]>();
  for (const s of sessions) {
    const key = format(s.date, "yyyy-MM-dd");
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(s);
  }

  // Within each date, handle overlaps by simple lane assignment
  type Placed = SessionInstance & { lane: number; lanes: number };

  const lanesByDate = new Map<string, Placed[]>();

  for (const [d, list] of byDate.entries()) {
    const items = [...list].sort((a, b) => a.start.getTime() - b.start.getTime());
    const lanes: Date[] = []; // end time per lane
    const placed: Placed[] = [];
    for (const it of items) {
      let lane = lanes.findIndex(end => end.getTime() <= it.start.getTime());
      if (lane === -1) { lane = lanes.length; lanes.push(it.end); } else { lanes[lane] = it.end; }
      placed.push({ ...it, lane, lanes: 0 });
    }
    const total = Math.max(1, lanes.length);
    for (const p of placed) p.lanes = total;
    lanesByDate.set(d, placed);
  }


  return (
  <div className="h-full w-full flex flex-col">
    <div className="shrink-0 p-4 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Room Schedule Visualizer</h1>

      <div className="flex gap-2">
        <button
          className={`px-4 py-2 rounded-md border text-sm ${
            activeTab === "schedule" ? "bg-blue-600 text-white" : "bg-white"
          }`}
          onClick={() => setActiveTab("schedule")}
        >
          Schedule
        </button>
        <button
          className={`px-4 py-2 rounded-md border text-sm ${
            activeTab === "validation" ? "bg-blue-600 text-white" : "bg-white"
          }`}
          onClick={() => setActiveTab("validation")}
        >
          Validation
        </button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input type="file" accept=".xlsx" ref={fileRef} onChange={onFileChange} className="max-w-sm" />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4" /> Upload .xlsx
            </Button>

            <a
              href={`${import.meta.env.BASE_URL}sample-room-visualizer.xlsx`}
              download
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-muted"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Sample File
            </a>

            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadPNG} disabled={!sessions.length} className="gap-2">
                <Download className="w-4 h-4" /> Export PNG
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="w-64">
              <label className="text-sm text-muted-foreground">Room</label>
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger>
                  <SelectValue placeholder={rooms.length ? "Select a room" : "Upload a file first"} />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-48">
                <label className="text-sm text-muted-foreground">Visible time: start (hour)</label>
                <Slider min={0} max={23} step={1} value={[minHour]} onValueChange={v => setMinHour(v[0])} />
                <div className="text-xs">Auto min: {autoMinHour}:00</div>
              </div>
              <div className="w-48">
                <label className="text-sm text-muted-foreground">Visible time: end (hour)</label>
                <Slider min={1} max={24} step={1} value={[maxHour]} onValueChange={v => setMaxHour(v[0])} />
                <div className="text-xs">Auto max: {autoMaxHour}:00</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {activeTab === "schedule" && (
        <>
          {visibleInstructors.length > 0 && (
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm text-muted-foreground">Instructors in this room:</span>
              {visibleInstructors.map(name => (
                <div key={name} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block w-3 h-3 rounded"
                    style={{ background: colorByInstructor.get(name) }}
                  />
                  <span>{name || "Unknown"}</span>
                </div>
              ))}
            </div>
          )}

          {!rows.length && (
            <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Upload your .xlsx file to begin, or download the sample file to see the correct format.
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Tip: We auto-detect days like M, T, W, R (Thu), F, S, U and also parse Th/Tu/Sa/Su. Only rows with a Room and valid Start/End dates & times are rendered.
          </p>
        </>
      )}

      {activeTab === "validation" && (
		<ValidationPanel
		  errors={validationResults.errors}
		  infos={validationResults.infos}
		  detectedHeaders={detectedHeaders}
		/>
	  )}
    </div>

    {activeTab === "schedule" && (
      <div className="flex-1 min-h-0 px-4 pb-4">
        <div className="h-full w-full overflow-auto rounded-2xl border bg-white shadow-sm">
          <svg id="schedule-svg" width={width} height={height} className="block min-w-full">
            {/* Column headers (dates) */}
            {dateColumns.map((d, i) => {
              const x = labelW + gutter + i * (colWidth + gutter);
              return (
                <g key={d}>
                  <text x={x + colWidth / 2} y={20} textAnchor="middle" fontSize={12} fontWeight={600} fill="#111">
                    {format(new Date(d), "EEE MMM d")}
                  </text>
                </g>
              );
            })}

            {/* Hour grid lines and labels */}
            {hourTicks.map((h, idx) => {
              const y = headerH + gutter + (h - effectiveMin) * hourHeight;
              return (
                <g key={idx}>
                  <text x={labelW - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#555">
                    {format(new Date(2020, 0, 1, h, 0), "h a")}
                  </text>
                  <line x1={labelW} y1={y} x2={width - gutter} y2={y} stroke="#e5e7eb" />
                </g>
              );
            })}

            {/* Vertical dividers */}
            {dateColumns.map((d, i) => {
              const x = labelW + gutter + i * (colWidth + gutter);
              return (
                <g key={`v-${d}`}>
                  <rect
                    x={x}
                    y={headerH + gutter}
                    width={colWidth}
                    height={(effectiveMax - effectiveMin) * hourHeight}
                    fill={i % 2 === 0 ? "#fafafa" : "#ffffff"}
                  />
                  <line x1={x} y1={headerH + gutter} x2={x} y2={height - gutter} stroke="#e5e7eb" />
                </g>
              );
            })}

            {/* Session blocks */}
            {dateColumns.map((d, i) => {
              const x = labelW + gutter + i * (colWidth + gutter);
              const list = lanesByDate.get(d) ?? [];
              return (
                <g key={`blocks-${d}`}>
                  {list.map((s, idx) => {
                    const y1 = yFor(s.start);
                    const y2 = yFor(s.end);
                    const h = y2 - y1;
                    const lanes = s.lanes;
                    const lane = s.lane;
                    const w = (colWidth - 6) / lanes;
                    const bx = x + 3 + lane * w;

                    return (
                      <g
                        key={idx}
                        onMouseEnter={(e) => showTooltipWithDelay(e, s)}
                        onMouseLeave={hideTooltip}
                        onMouseMove={moveTooltip}
                      >
                        <rect
                          x={bx}
                          y={y1 + 2}
                          rx={8}
                          ry={8}
                          width={w - 6}
                          height={Math.max(14, h - 4)}
                          fill={colorByInstructor.get(s.instructor) || "#94a3b8"}
                          opacity={0.85}
                        />
                        <text x={bx + 8} y={y1 + 18} fontSize={11} fill="#111" style={{ pointerEvents: "none" }}>
                          {s.baseCourse}
                        </text>
                        <text x={bx + 8} y={y1 + 32} fontSize={10} fill="#111" style={{ pointerEvents: "none" }}>
                          {format(s.start, "h:mm a")}–{format(s.end, "h:mm a")}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Axis titles */}
            <text x={labelW / 2} y={16} textAnchor="middle" fontSize={12} fill="#6b7280">Time</text>
            <text x={width - 60} y={16} textAnchor="end" fontSize={12} fill="#6b7280" className="select-none">Dates</text>
          </svg>
        </div>
      </div>
    )}

    {activeTab === "schedule" && tooltip.visible && tooltip.session && (
      <div
        className="fixed z-50 max-w-sm rounded-lg border bg-white p-4 shadow-xl text-sm"
        style={{
          left: tooltip.x + 12,
          top: tooltip.y + 12,
          pointerEvents: "none",
        }}
      >
        <div className="font-semibold text-base mb-2">
          {formatSectionLabel(tooltip.session)}
        </div>

        <div className="space-y-1">
          <div><strong>Instructor:</strong> {tooltip.session.instructor}</div>
          <div><strong>Days Met:</strong> {tooltip.session.daysMet || "—"}</div>
          <div>
            <strong>Date Range:</strong>{" "}
            {formatDisplayDate(tooltip.session.startDate)} to {formatDisplayDate(tooltip.session.endDate)}
          </div>
          <div>
            <strong>Time:</strong> {format(tooltip.session.start, "h:mm a")}–{format(tooltip.session.end, "h:mm a")}
          </div>
          <div><strong>Room:</strong> {tooltip.session.room || "—"}</div>
          <div><strong>Term:</strong> {tooltip.session.term || "—"}</div>
          <div><strong>Status:</strong> {tooltip.session.status || "—"}</div>
          <div>
            <strong>Course Offering Ids:</strong>{" "}
            {tooltip.session.courseOfferingIds.length
              ? tooltip.session.courseOfferingIds.join(", ")
              : "—"}
          </div>
        </div>
      </div>
    )}
  </div>
);
}
