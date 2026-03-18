import "./index.css";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import RoomScheduleVisualizer from "./RoomScheduleVisualizer";
import CreditPage from "./CreditPage";
import GuidePage from "./GuidePage";

function Sidebar({
  theme,
  setTheme,
}: {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
}) {
  const location = useLocation();

  const linkClass = (path: string) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      location.pathname === path
        ? "bg-blue-600 text-white"
        : "text-foreground hover:bg-muted"
    }`;

  return (
    <aside className="w-56 h-screen shrink-0 border-r bg-background text-foreground p-4 flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Room Visualizer</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Weekly room schedule viewer
        </p>
      </div>

      <nav className="flex flex-col gap-2">
        <Link to="/" className={linkClass("/")}>
          Home
        </Link>
        <Link to="/guide" className={linkClass("/guide")}>
          Guide
        </Link>
        <Link to="/credits" className={linkClass("/credits")}>
          Credits
        </Link>
      </nav>

      <div className="mt-auto">
        <button
          className="w-full rounded-md border px-3 py-2 text-sm bg-background text-foreground hover:bg-muted transition-colors"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}

function AppShell() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("rsv-theme");
    if (saved === "light" || saved === "dark") return saved;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("rsv-theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground">
      <div className="min-h-screen flex">
        <Sidebar theme={theme} setTheme={setTheme} />

        <main className="flex-1 min-w-0 h-screen overflow-auto bg-background">
          <Routes>
            <Route path="/" element={<RoomScheduleVisualizer theme={theme} />} />
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