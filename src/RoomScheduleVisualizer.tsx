import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { format, parse, isAfter, isEqual, eachDayOfInterval } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Download, Upload, Calendar as CalendarIcon } from "lucide-react";

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
 
// Define a palette of visually distinct colors
const COLOR_PALETTE = [
  "#ef4444", // red
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#22c55e", // emerald
  "#6366f1", // indigo
];

// ---- Utilities ----
const HEADER_MAP: Record<string, string> = {
  "course/section": "courseSection",
  "course section": "courseSection",
  "course offering id": "courseOfferingId",
  "start date": "startDate",
  "end date": "endDate",
  "days met": "daysMet",
  "start time": "startTime",
  "end time": "endTime",
  "instructor": "instructor",
  "room": "room",
  "max enrollment": "maxEnrollment",
  "status": "status",
  "term": "term",
};

type Row = {
  courseSection: string;
  courseOfferingId: string;
  startDate: string; // e.g., 8/25/2025
  endDate: string; // e.g., 12/16/2025
  daysMet: string; // e.g., MWF or TR or T or Th
  startTime: string; // e.g., 12:00 PM
  endTime: string; // e.g., 2:50 PM
  instructor: string;
  room: string;
  maxEnrollment?: string | number;
  status?: string;
  term?: string;
};

type SessionInstance = {
  date: Date; // specific meeting date
  start: Date; // same date with time
  end: Date;   // same date with time
  instructor: string;
  courseSection: string;
  room: string;
  color: string; // assigned by instructor
};

function parseExcelDate(v: any): Date | null {
  // Handle date strings like "8/25/2025" or Excel serial numbers
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    // Excel serial date (days since 1899-12-30)
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 24 * 60 * 60 * 1000);
    return d;
  }
  if (typeof v === "string") {
    // Try MM/dd/yyyy and M/d/yyyy varieties
    const fmts = ["M/d/yyyy", "MM/dd/yyyy", "M/d/yy", "MM/dd/yy", "yyyy-MM-dd"]; 
    for (const f of fmts) {
      try {
        const d = parse(v.trim(), f, new Date());
        if (!isNaN(d.getTime())) return d;
      } catch {}
    }
    // Fallback: Date.parse
    const d2 = new Date(v);
    if (!isNaN(d2.getTime())) return d2;
  }
  return null;
}

function parseTimeOnDate(date: Date, timeStr: string): Date {
  // Accept formats like "12:00 PM", "2:50 PM", "14:30", "2 PM"
  const s = String(timeStr).trim();
  const fmts = ["h:mm a", "h a", "HH:mm", "H:mm", "h.mm a"]; // include a few loose formats
  for (const f of fmts) {
    const d = parse(s, f, date);
    if (!isNaN(d.getTime())) return d;
  }
  // as last resort, split manually
  const d2 = new Date(date);
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3]?.toUpperCase();
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    d2.setHours(h, min, 0, 0);
    return d2;
  }
  return d2; // may be invalid; caller should check
}

function normalizeDays(daysMet: string): string[] {
  // Convert strings like "MWF", "TR", "T", "Th", "M, W", "TuTh" into tokens M,T,W,R,F,S,U
  if (!daysMet) return [];
  let s = daysMet.replace(/\s|,/g, "").trim();
  // Handle common multi-letter tokens first to avoid T+H ambiguity
  s = s.replace(/Th/gi, "R"); // Thursday as R
  s = s.replace(/Tu/gi, "T"); // Tuesday
  s = s.replace(/Su/gi, "U"); // Sunday
  s = s.replace(/Sa/gi, "S"); // Saturday
  // Some exports use R for Thu already, keep as is
  const tokens: string[] = [];
  for (const ch of s) {
    if ("MTWRFSU".includes(ch.toUpperCase())) tokens.push(ch.toUpperCase());
  }
  return tokens;
}

function dayToIndex(d: string): number {
  // Sunday=0 ... Saturday=6 (JS default)
  switch (d) {
    case "U": return 0; // Sunday
    case "M": return 1;
    case "T": return 2;
    case "W": return 3;
    case "R": return 4; // Thursday
    case "F": return 5;
    case "S": return 6; // Saturday
    default: return -1;
  }
}

function generateOccurrences(row: Row): Date[] {
  const start = parseExcelDate(row.startDate);
  const end = parseExcelDate(row.endDate);
  if (!start || !end) return [];
  const days = normalizeDays(row.daysMet);
  if (!days.length) return [];

  // Iterate all days in interval and select matching weekdays
  const allDays = eachDayOfInterval({ start, end });
  const wanted = new Set(days.map(dayToIndex));
  return allDays.filter(d => wanted.has(d.getDay()));
}

function distinct<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }

//Assign Color to Instructor
function assignColors(names: string[]): Map<string, string> {
  const m = new Map<string, string>();
  names.forEach((n, idx) => {
    m.set(n, COLOR_PALETTE[idx % COLOR_PALETTE.length]);
  });
  return m;
}

function timeToMinutes(d: Date) { return d.getHours() * 60 + d.getMinutes(); }

export default function RoomScheduleVisualizer() {
  const [rows, setRows] = useState<Row[]>([]);
  const [room, setRoom] = useState<string>("");
  const [minHour, setMinHour] = useState<number>(7);  // default 7:00
  const [maxHour, setMaxHour] = useState<number>(22); // default 22:00
  const fileRef = useRef<HTMLInputElement>(null);

  const instructors = useMemo(() => distinct(rows.map(r => r.instructor).filter(Boolean)), [rows]);
  const rooms = useMemo(() => distinct(rows.map(r => r.room).filter(Boolean)).sort(), [rows]);

  const colorByInstructor = useMemo(() => assignColors(instructors), [instructors]);

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
          out.push({
            date: d,
            start,
            end,
            instructor: r.instructor || "Unknown",
            courseSection: r.courseSection || "",
            room: r.room || "",
            color: colorByInstructor.get(r.instructor || "Unknown")!,
          });
        }
      }
    }
    // sort by date then start time
    out.sort((a,b) => a.date.getTime() - b.date.getTime() || a.start.getTime() - b.start.getTime());
    return out;
  }, [rows, room, colorByInstructor]);

  const dateColumns = useMemo(() => distinct(sessions.map(s => format(s.date, "yyyy-MM-dd"))), [sessions]);

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

      // Map headers flexibly
      const mapped: Row[] = json.map((row: any) => {
        const out: any = {};
        for (const [k, v] of Object.entries(row)) {
          const key = HEADER_MAP[String(k).trim().toLowerCase()];
          if (key) out[key] = v;
        }
        return out as Row;
      }).filter(r => r.room && r.startDate && r.endDate && r.startTime && r.endTime);

      setRows(mapped);
      // Preselect first room if not chosen
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
    <div className="mx-auto max-w-[1200px] p-6 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Room Schedule Visualizer</h1>

      <Card>
        <CardContent className="p-4 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input type="file" accept=".xlsx" ref={fileRef} onChange={onFileChange} className="max-w-sm" />
            <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="w-4 h-4"/> Upload .xlsx
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadPNG} disabled={!sessions.length} className="gap-2">
                <Download className="w-4 h-4"/> Export PNG
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

      {/* Legend */}
      {instructors.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm text-muted-foreground">Instructors:</span>
          {instructors.map(name => (
            <div key={name} className="flex items-center gap-2 text-sm">
              <span className="inline-block w-3 h-3 rounded" style={{ background: colorByInstructor.get(name) }} />
              <span>{name || "Unknown"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Schedule Grid */}
      <div className="overflow-auto rounded-2xl border bg-white shadow-sm">
        <svg id="schedule-svg" width={width} height={height} className="block">
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
                {/* hour label */}
                <text x={labelW - 8} y={y + 4} textAnchor="end" fontSize={11} fill="#555">
                  {format(new Date(2020, 0, 1, h, 0), "h a")}
                </text>
                {/* grid line */}
                <line x1={labelW} y1={y} x2={width - gutter} y2={y} stroke="#e5e7eb" />
              </g>
            );
          })}

          {/* Vertical dividers */}
          {dateColumns.map((d, i) => {
            const x = labelW + gutter + i * (colWidth + gutter);
            return (
              <g key={`v-${d}`}>
                <rect x={x} y={headerH + gutter} width={colWidth} height={(effectiveMax - effectiveMin) * hourHeight} fill={i % 2 === 0 ? "#fafafa" : "#ffffff"} />
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
                    <g key={idx}>
                      <rect x={bx} y={y1 + 2} rx={8} ry={8} width={w - 6} height={Math.max(14, h - 4)} fill={s.color} opacity={0.85} />
                      <text x={bx + 8} y={y1 + 18} fontSize={11} fill="#111" style={{ pointerEvents: "none" }}>
                        {s.courseSection}
                      </text>
                      <text x={bx + 8} y={y1 + 32} fontSize={10} fill="#111" style={{ pointerEvents: "none" }}>
                        {s.instructor} · {format(s.start, "h:mm a")}–{format(s.end, "h:mm a")}
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

      {!rows.length && (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <CalendarIcon className="w-4 h-4"/> Upload your .xlsx to begin. Example row format:
          <code className="bg-muted px-2 py-1 rounded">MMET 320/502 LAB, 25286, 8/25/2025, 12/16/2025, T, 12:00 PM, 2:50 PM, A, THOM 107AC, 14, Scheduled, 202531</code>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Tip: We auto-detect days like M, T, W, R (Thu), F, S, U and also parse Th/Tu/Sa/Su. Only rows with a Room and valid Start/End dates & times are rendered.
      </p>
    </div>
  );
}
