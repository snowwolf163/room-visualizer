import { format, parse } from "date-fns";
import { COLOR_PALETTE } from "./constants";
import type { Row, SessionInstance } from "./types";

export function parseExcelDate(v: any): Date | null {
  if (v == null || v === "") return null;

  if (typeof v === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + v * 24 * 60 * 60 * 1000);
  }

  if (typeof v === "string") {
    const fmts = ["M/d/yyyy", "MM/dd/yyyy", "M/d/yy", "MM/dd/yy", "yyyy-MM-dd"];
    for (const f of fmts) {
      try {
        const d = parse(v.trim(), f, new Date());
        if (!isNaN(d.getTime())) return d;
      } catch {}
    }

    const d2 = new Date(v);
    if (!isNaN(d2.getTime())) return d2;
  }

  return null;
}

export function parseTimeOnDate(date: Date, timeValue: string | number): Date {
  const d = new Date(date);

  if (typeof timeValue === "number" && !isNaN(timeValue)) {
    const totalMinutes = Math.round(timeValue * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  const s = String(timeValue).trim();
  const fmts = ["h:mm a", "h a", "HH:mm", "H:mm", "h.mm a"];

  for (const f of fmts) {
    const parsed = parse(s, f, date);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3]?.toUpperCase();

    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;

    d.setHours(h, min, 0, 0);
    return d;
  }

  return d;
}

export function normalizeDays(daysMet: string): string[] {
  if (!daysMet) return [];

  let s = daysMet.replace(/\s|,/g, "").trim();
  s = s.replace(/Th/gi, "R");
  s = s.replace(/Tu/gi, "T");
  s = s.replace(/Su/gi, "U");
  s = s.replace(/Sa/gi, "S");

  const tokens: string[] = [];
  for (const ch of s) {
    if ("MTWRFSU".includes(ch.toUpperCase())) tokens.push(ch.toUpperCase());
  }

  return tokens;
}

export function distinct<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function assignColors(names: string[]): Map<string, string> {
  const m = new Map<string, string>();
  names.forEach((n, idx) => {
    m.set(n, COLOR_PALETTE[idx % COLOR_PALETTE.length]);
  });
  return m;
}

export function timeToMinutes(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function getBaseCourse(courseSection: string): string {
  return courseSection.replace(/\/\d+/, "").replace(/\s+/g, " ").trim();
}

export function getSectionNumber(courseSection: string): string | null {
  const match = courseSection.match(/\/(\d+)/);
  return match ? match[1] : null;
}

export function formatSectionLabel(session: SessionInstance): string {
  if (session.sections.length <= 1) return session.courseSection;
  return `${session.baseCourse} (${session.sections.join(", ")})`;
}

export function formatDisplayDate(value: string | number): string {
  const d = parseExcelDate(value);
  return d ? format(d, "M/d/yyyy") : String(value || "—");
}

export function timeRangesOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA < endB && startB < endA;
}

export const WEEKDAY_COLUMNS = ["U", "M", "T", "W", "R", "F", "S"] as const;

export const WEEKDAY_LABELS: Record<string, string> = {
  M: "Mon",
  T: "Tue",
  W: "Wed",
  R: "Thu",
  F: "Fri",
  S: "Sat",
  U: "Sun",
};

export function getReferenceDateForDay(dayCode: string): Date | null {
  switch (dayCode) {
    case "M": return new Date(2026, 0, 5);
    case "T": return new Date(2026, 0, 6);
    case "W": return new Date(2026, 0, 7);
    case "R": return new Date(2026, 0, 8);
    case "F": return new Date(2026, 0, 9);
    case "S": return new Date(2026, 0, 10);
    case "U": return new Date(2026, 0, 11);
    default: return null;
  }
}

export function generateWeeklyOccurrences(row: Row): { dayCode: string; date: Date }[] {
  const start = parseExcelDate(row.startDate);
  const end = parseExcelDate(row.endDate);
  if (!start || !end) return [];

  const days = normalizeDays(row.daysMet);
  if (!days.length) return [];

  return days
    .map((dayCode) => {
      const date = getReferenceDateForDay(dayCode);
      return date ? { dayCode, date } : null;
    })
    .filter((x): x is { dayCode: string; date: Date } => x !== null);
}

export function getContrastTextColor(hex: string): string {
  const clean = hex.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return "#111111";
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#f8fafc";
}