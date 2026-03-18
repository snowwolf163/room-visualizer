import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { format, isAfter, isEqual } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { HEADER_MAP, REQUIRED_HEADERS } from "./room-visualizer/constants";
import type { Row, SessionInstance, ValidationSchedRow } from "./room-visualizer/types";
import {
  assignColors,
  distinct,
  formatDisplayDate,
  formatSectionLabel,
  generateWeeklyOccurrences,
  WEEKDAY_COLUMNS,
  getBaseCourse,
  getSectionNumber,
  normalizeDays,
  parseExcelDate,
  parseTimeOnDate,
  timeRangesOverlap,
  timeToMinutes,
} from "./room-visualizer/utils";
import ValidationPanel from "./room-visualizer/ValidationPanel";
import ScheduleSvg from "./room-visualizer/ScheduleSvg";
import UploadControls from "./room-visualizer/UploadControls";

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

type RoomScheduleVisualizerProps = {
  theme: "light" | "dark";
  rows: Row[];
  setRows: React.Dispatch<React.SetStateAction<Row[]>>;
  room: string;
  setRoom: React.Dispatch<React.SetStateAction<string>>;
  minHour: number;
  maxHour: number;
  setMinHour: React.Dispatch<React.SetStateAction<number>>;
  setMaxHour: React.Dispatch<React.SetStateAction<number>>;
  detectedHeaders: string[];
  setDetectedHeaders: React.Dispatch<React.SetStateAction<string[]>>;
  formatErrors: string[];
  setFormatErrors: React.Dispatch<React.SetStateAction<string[]>>;
};

export default function RoomScheduleVisualizer({
  theme,
  rows,
  setRows,
  room,
  setRoom,
  minHour,
  maxHour,
  setMinHour,
  setMaxHour,
  detectedHeaders,
  setDetectedHeaders,
  formatErrors,
  setFormatErrors,
}: RoomScheduleVisualizerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null); //tooltip reference
  //Container ref 
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  
  //Checking validation const
  const [activeTab, setActiveTab] = useState<"schedule" | "validation">("schedule");
  
  //Hover state
  const [hoveredGroupKey, setHoveredGroupKey] = useState<string | null>(null);
  
  //Tooltip const
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
  
  //Track container with ResizeObserver
  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;

    const updateWidth = () => {
      setContainerWidth(el.clientWidth);
    };

    const frame = requestAnimationFrame(() => {
      updateWidth();
    });

    const observer = new ResizeObserver(() => {
      updateWidth();
    });

    observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [activeTab]);

  //Close Tooltip when Click Outside
  useEffect(() => {
  function handleWindowClick() {
    setTooltip(prev => ({
      ...prev,
      visible: false,
      session: null,
    }));
  }

  window.addEventListener("click", handleWindowClick);
  return () => window.removeEventListener("click", handleWindowClick);
}, []);

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
        const weeklyDates = generateWeeklyOccurrences(r);

        for (const { dayCode, date } of weeklyDates) {
          const start = parseTimeOnDate(date, r.startTime);
          const end = parseTimeOnDate(date, r.endTime);

          if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
          if (isAfter(start, end) || isEqual(start, end)) continue;

          const courseSection = r.courseSection || "";
          const sectionNumber = getSectionNumber(courseSection);

          out.push({
            date,
            dayCode,
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
        session.dayCode,
        session.start.getHours(),
        session.start.getMinutes(),
        session.end.getHours(),
        session.end.getMinutes(),
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
      sections: Array.from(new Set(session.sections)).sort((a, b) => Number(a) - Number(b)),
      courseOfferingIds: Array.from(new Set(session.courseOfferingIds)).sort(),
    }));

    deduped.sort(
      (a, b) =>
        WEEKDAY_COLUMNS.indexOf(a.dayCode as (typeof WEEKDAY_COLUMNS)[number]) - WEEKDAY_COLUMNS.indexOf(b.dayCode as (typeof WEEKDAY_COLUMNS)[number]) ||
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

  const dateColumns = [...WEEKDAY_COLUMNS];

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
	  const svg = document.getElementById("schedule-svg") as SVGSVGElement | null;
	  if (!svg) return;

	  const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
	  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

	  const svgWidth =
		Number(svg.getAttribute("width")) || svg.clientWidth || 1200;
	  const svgHeight =
		Number(svg.getAttribute("height")) || svg.clientHeight || 800;

	  const exportBg = theme === "dark" ? "#09090b" : "#ffffff";
	  const exportText = theme === "dark" ? "#f4f4f5" : "#111111";
	  const exportBorder = theme === "dark" ? "#27272a" : "#e4e4e7";

	  const legendItems = visibleInstructors.filter(Boolean);
	  const legendPadding = 16;
	  const legendTitleH = 0;
	  const legendItemH = 22;
	  const legendItemMinW = 220;
	  const legendCols = Math.max(
		1,
		Math.floor((svgWidth - legendPadding * 2) / legendItemMinW)
	  );
	  const legendRows = Math.max(1, Math.ceil(legendItems.length / legendCols));
	  const roomTitleH = room ? 26 : 0;
	  const legendHeight =
		legendPadding +
		roomTitleH +
		legendTitleH +
		legendRows * legendItemH +
		legendPadding;

	  const totalHeight = svgHeight + legendHeight;

	  clonedSvg.setAttribute("width", String(svgWidth));
	  clonedSvg.setAttribute("height", String(totalHeight));
	  clonedSvg.setAttribute("viewBox", `0 0 ${svgWidth} ${totalHeight}`);

	  const NS = "http://www.w3.org/2000/svg";

	  const bgRect = document.createElementNS(NS, "rect");
	  bgRect.setAttribute("x", "0");
	  bgRect.setAttribute("y", "0");
	  bgRect.setAttribute("width", String(svgWidth));
	  bgRect.setAttribute("height", String(totalHeight));
	  bgRect.setAttribute("fill", exportBg);
	  clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

	  const legendGroup = document.createElementNS(NS, "g");
	  legendGroup.setAttribute("transform", `translate(0, ${svgHeight})`);

	  const divider = document.createElementNS(NS, "line");
	  divider.setAttribute("x1", "0");
	  divider.setAttribute("y1", "0");
	  divider.setAttribute("x2", String(svgWidth));
	  divider.setAttribute("y2", "0");
	  divider.setAttribute("stroke", exportBorder);
	  legendGroup.appendChild(divider);

	  let currentY = legendPadding + 6;

	  if (room) {
		const roomText = document.createElementNS(NS, "text");
		roomText.setAttribute("x", String(legendPadding));
		roomText.setAttribute("y", String(currentY + 14));
		roomText.setAttribute("font-size", "16");
		roomText.setAttribute("font-weight", "600");
		roomText.setAttribute("fill", exportText);
		roomText.textContent = `Room: ${room}`;
		legendGroup.appendChild(roomText);
		currentY += roomTitleH;
	  }

	  const usableWidth = svgWidth - legendPadding * 2;
	  const itemWidth = usableWidth / legendCols;

	  legendItems.forEach((name, idx) => {
		const col = idx % legendCols;
		const row = Math.floor(idx / legendCols);

		const itemX = legendPadding + col * itemWidth;
		const itemY = currentY + row * legendItemH;

		const swatch = document.createElementNS(NS, "rect");
		swatch.setAttribute("x", String(itemX));
		swatch.setAttribute("y", String(itemY));
		swatch.setAttribute("width", "12");
		swatch.setAttribute("height", "12");
		swatch.setAttribute("rx", "3");
		swatch.setAttribute("ry", "3");
		swatch.setAttribute("fill", colorByInstructor.get(name) || "#94a3b8");
		legendGroup.appendChild(swatch);

		const label = document.createElementNS(NS, "text");
		label.setAttribute("x", String(itemX + 18));
		label.setAttribute("y", String(itemY + 10));
		label.setAttribute("font-size", "12");
		label.setAttribute("fill", exportText);
		label.textContent = name;
		legendGroup.appendChild(label);
	  });

	  clonedSvg.appendChild(legendGroup);

	  const svgString = new XMLSerializer().serializeToString(clonedSvg);
	  const blob = new Blob([svgString], {
		type: "image/svg+xml;charset=utf-8",
	  });
	  const url = URL.createObjectURL(blob);

	  const img = new Image();
	  img.onload = () => {
		const scale = 2;
		const canvas = document.createElement("canvas");
		canvas.width = svgWidth * scale;
		canvas.height = totalHeight * scale;

		const ctx = canvas.getContext("2d");
		if (!ctx) {
		  URL.revokeObjectURL(url);
		  return;
		}

		ctx.scale(scale, scale);
		ctx.fillStyle = exportBg;
		ctx.fillRect(0, 0, svgWidth, totalHeight);
		ctx.drawImage(img, 0, 0);

		const a = document.createElement("a");
		a.href = canvas.toDataURL("image/png");
		a.download = `room-${room || "schedule"}.png`;
		a.click();

		URL.revokeObjectURL(url);
	  };

	  img.onerror = () => {
		URL.revokeObjectURL(url);
	  };

	  img.src = url;
	}
  
	
	function getTooltipSessionKey(session: SessionInstance) {
	  return [
		session.baseCourse,
		session.instructor,
		session.room,
		session.date.getTime(),
		session.start.getTime(),
		session.end.getTime(),
		session.courseOfferingIds.join(","),
	  ].join("|");
	}
  
  //Show tooltup on click
	function toggleTooltip(
	  e: React.MouseEvent<SVGGElement, MouseEvent>,
	  session: SessionInstance
	) {
	  const clickedKey = getTooltipSessionKey(session);
	  const currentKey = tooltip.session ? getTooltipSessionKey(tooltip.session) : null;

	  if (tooltip.visible && currentKey === clickedKey) {
		setTooltip({
		  visible: false,
		  x: 0,
		  y: 0,
		  session: null,
		});
		return;
	  }

	  const { left, top } = getClampedTooltipPosition(e.clientX, e.clientY);

	  setTooltip({
		visible: true,
		x: left,
		y: top,
		session,
	  });
	}

  function hideTooltip() {
	setTooltip(prev => ({
	  ...prev,
	  visible: false,
	  session: null,
	}));
  }

  //To clamp the tooltip position
  function getClampedTooltipPosition(x: number, y: number) {
	const margin = 12;
	const tooltipWidth = tooltipRef.current?.offsetWidth ?? 320;
	const tooltipHeight = tooltipRef.current?.offsetHeight ?? 220;

	let left = x + margin;
	let top = y + margin;

	if (left + tooltipWidth > window.innerWidth - margin) {
	  left = x - tooltipWidth - margin;
	}

	if (top + tooltipHeight > window.innerHeight - margin) {
	  top = y - tooltipHeight - margin;
	}

	if (left < margin) left = margin;
	if (top < margin) top = margin;

	return { left, top };
  }


  // ---- Layout constants ----
  const gutter = 8;
  const hourHeight = 50; // px per hour
  const headerH = 32;
  const labelW = 80; // y-axis label width
  const minColWidth = 140;

  const availableGraphWidth = Math.max(
    0,
    containerWidth - labelW - gutter * 2 - gutter * (dateColumns.length - 1)
  );

  const colWidth =
    dateColumns.length > 0
      ? Math.max(minColWidth, Math.floor(availableGraphWidth / dateColumns.length))
      : minColWidth;

  function yFor(date: Date) {
    const minutes = (date.getHours() - effectiveMin) * 60 + date.getMinutes();
    return headerH + gutter + (minutes / 60) * hourHeight;
  }

  // Build hour ticks
  const hourTicks: number[] = [];
  for (let h = effectiveMin; h <= effectiveMax; h++) hourTicks.push(h);
  
  //Layout const with hour ticks
  const contentWidth = labelW + gutter + dateColumns.length * colWidth + (dateColumns.length - 1) * gutter + gutter;
  const width = Math.max(containerWidth, contentWidth);
  const height = headerH + (hourTicks[hourTicks.length - 1] - effectiveMin) * hourHeight + gutter * 2;

  // Group sessions by date string for collision handling
  const byDate = new Map<string, SessionInstance[]>();
  for (const day of dateColumns) {
	byDate.set(day, []);
  }
  for (const s of sessions) {
    const key = s.dayCode;
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
    <div className="h-full w-full flex flex-col bg-background text-foreground">
	  <div className="shrink-0 p-4 space-y-4">

        <div className="flex gap-2">
          <button
            className={`px-4 py-2 rounded-md border text-sm transition-colors ${
              activeTab === "schedule"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-background text-foreground hover:bg-muted"
            }`}
            onClick={() => setActiveTab("schedule")}
          >
            Schedule
          </button>
          <button
            className={`px-4 py-2 rounded-md border text-sm transition-colors ${
              activeTab === "validation"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-background text-foreground hover:bg-muted"
            }`}
            onClick={() => setActiveTab("validation")}
          >
            Validation
          </button>
        </div>

        <UploadControls
          fileRef={fileRef}
          onFileChange={onFileChange}
          onUploadClick={() => fileRef.current?.click()}
          onDownloadPng={downloadPNG}
          sessionsLength={sessions.length}
          room={room}
          rooms={rooms}
          setRoom={setRoom}
          minHour={minHour}
          maxHour={maxHour}
          setMinHour={setMinHour}
          setMaxHour={setMaxHour}
          autoMinHour={autoMinHour}
          autoMaxHour={autoMaxHour}
        />

        {activeTab === "schedule" && (
          <>
            {visibleInstructors.length > 0 && (
              <div className="flex flex-wrap gap-3 items-center">
                <span className="text-sm text-muted-foreground">
                  Instructors in this room:
                </span>
                {visibleInstructors.map((name) => (
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
              Tip: We auto-detect days like M, T, W, R (Thu), F, S, U and also parse
              Th/Tu/Sa/Su. Schedules are rendered in a weekly Monday–Sunday layout
              using valid schedule data, while the tooltip keeps the original term
              date range.
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
        <div
		  ref={graphContainerRef}
		  className="h-full w-full overflow-auto rounded-2xl border bg-card text-card-foreground shadow-sm"
		>
          <ScheduleSvg
		    width={width}
		    height={height}
		    dateColumns={dateColumns}
		    hourTicks={hourTicks}
		    effectiveMin={effectiveMin}
		    hourHeight={hourHeight}
		    headerH={headerH}
		    gutter={gutter}
		    labelW={labelW}
		    colWidth={colWidth}
		    lanesByDate={lanesByDate}
		    yFor={yFor}
		    colorByInstructor={colorByInstructor}
			theme={theme}
			hoveredGroupKey={hoveredGroupKey}
			setHoveredGroupKey={setHoveredGroupKey}
		    toggleTooltip={toggleTooltip}
		  />
        </div>
      </div>
    )}

    {activeTab === "schedule" && tooltip.visible && tooltip.session && (
      <div
		ref={tooltipRef}
		className="fixed z-50 max-w-sm rounded-lg border bg-popover text-popover-foreground p-4 shadow-xl text-sm"
		style={{
		  left: tooltip.x,
		  top: tooltip.y,
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
