import "./index.css";
import { HashRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import RoomScheduleVisualizer from "./RoomScheduleVisualizer";
import CreditPage from "./CreditPage";
import GuidePage from "./GuidePage";

function AppNav() {
  const location = useLocation();

  const linkClass = (path: string) =>
    `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      location.pathname === path
        ? "bg-blue-600 text-white"
        : "text-foreground hover:bg-muted"
    }`;

  return (
    <nav className="p-4 border-b bg-background text-foreground flex gap-2 shrink-0">
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
  );
}

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen w-full flex flex-col bg-background text-foreground">
        <AppNav />

        <div className="flex-1 min-h-0 overflow-auto bg-background">
          <Routes>
            <Route path="/" element={<RoomScheduleVisualizer />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/credits" element={<CreditPage />} />
          </Routes>
        </div>
      </div>
    </HashRouter>
  );
}

export default App;