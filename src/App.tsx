import "./index.css";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import RoomScheduleVisualizer from "./RoomScheduleVisualizer";
import CreditPage from "./CreditPage";
import GuidePage from "./GuidePage";
import type { Row } from "./room-visualizer/types";

type ThemeMode = "light" | "dark";

type StatusFilter = "All" | "Scheduled" | "Unassigned";

function Sidebar({
  theme,
  setTheme,
  isOpen,
  closeSidebar,
}: {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isOpen: boolean;
  closeSidebar: () => void;
}) {
  const location = useLocation();

  const linkClass = (path: string) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      location.pathname === path
        ? "bg-blue-600 text-white"
        : "text-foreground hover:bg-muted"
    }`;

  return (
    <>
      {/* Overlay */}
      <button
        type="button"
        aria-label="Close sidebar overlay"
        onClick={closeSidebar}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 h-screen w-64 shrink-0 border-r bg-background text-foreground p-4 flex flex-col gap-4 shadow-xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Room Visualizer</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Weekly room schedule viewer
            </p>
          </div>

          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-md border p-2 text-foreground hover:bg-muted transition-colors"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-2">
          <Link to="/" className={linkClass("/")} onClick={closeSidebar}>
            Home
          </Link>
          <Link to="/guide" className={linkClass("/guide")} onClick={closeSidebar}>
            Guide
          </Link>
          <Link to="/credits" className={linkClass("/credits")} onClick={closeSidebar}>
            Credits
          </Link>
        </nav>

        <div className="mt-auto">
          <button
            type="button"
            className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground hover:bg-muted transition-colors"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>
    </>
  );
}

function AppShell() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("rsv-theme");
    if (saved === "light" || saved === "dark") return saved;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("rsv-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const [rows, setRows] = useState<Row[]>([]);
  const [room, setRoom] = useState("");
  const [minHour, setMinHour] = useState(7); //Default time 7AM
  const [maxHour, setMaxHour] = useState(22); //Default time 22 or 10PM
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [formatErrors, setFormatErrors] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All"); //Status filter
  
  return (
    <div className="h-screen w-full bg-background text-foreground">
      <div className="h-screen overflow-hidden">
        <Sidebar
          theme={theme}
          setTheme={setTheme}
          isOpen={sidebarOpen}
          closeSidebar={() => setSidebarOpen(false)}
        />

        <main className="h-screen overflow-auto bg-background">
          <div className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-md border p-2 text-foreground hover:bg-muted transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>

            <span className="text-sm font-medium text-muted-foreground">
              Room Schedule Visualizer
            </span>
          </div>

          <Routes>
            <Route
			  path="/"
			  element={
				<RoomScheduleVisualizer
				  theme={theme}
				  rows={rows}
				  setRows={setRows}
				  room={room}
				  setRoom={setRoom}
				  minHour={minHour}
				  maxHour={maxHour}
				  setMinHour={setMinHour}
				  setMaxHour={setMaxHour}
				  detectedHeaders={detectedHeaders}
				  setDetectedHeaders={setDetectedHeaders}
				  formatErrors={formatErrors}
				  setFormatErrors={setFormatErrors}
				  statusFilter={statusFilter}
				  setStatusFilter={setStatusFilter}
				/>
			  }
			/>
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/credits" element={<CreditPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}