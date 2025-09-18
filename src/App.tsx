import './index.css'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import RoomScheduleVisualizer from './RoomScheduleVisualizer'
import CreditPage from './CreditPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white">
        {/* Navigation */}
        <nav className="p-4 border-b flex gap-4">
          <Link to="/" className="text-blue-600 hover:underline">Home</Link>
          <Link to="/credits" className="text-blue-600 hover:underline">Credits</Link>
        </nav>

        <Routes>
          <Route path="/" element={<RoomScheduleVisualizer />} />
          <Route path="/credits" element={<CreditPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
