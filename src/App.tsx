import './index.css'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import RoomScheduleVisualizer from './RoomScheduleVisualizer'
import CreditPage from './CreditPage'
import GuidePage from './GuidePage'

function App() {
  return (
    <BrowserRouter basename="/room-visualizer">
      <div className="h-screen w-screen flex flex-col bg-white">
        <nav className="p-4 border-b flex gap-4 shrink-0">
          <Link to="/" className="text-blue-600 hover:underline">Home</Link>
          <Link to="/guide" className="text-blue-600 hover:underline">Guide</Link>
          <Link to="/credits" className="text-blue-600 hover:underline">Credits</Link>
        </nav>

        <div className="flex-1 min-h-0 overflow-auto bg-white">
          <Routes>
            <Route path="/" element={<RoomScheduleVisualizer />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/credits" element={<CreditPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App