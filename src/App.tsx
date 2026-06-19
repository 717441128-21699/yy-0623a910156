import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import ReviewPage from '@/pages/ReviewPage'
import ExceptionsPage from '@/pages/ExceptionsPage'
import DetailPage from '@/pages/DetailPage'
import ReviewDashboard from '@/pages/ReviewDashboard'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/review" replace />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/exceptions" element={<ExceptionsPage />} />
          <Route path="/detail/:id" element={<DetailPage />} />
          <Route path="/dashboard" element={<ReviewDashboard />} />
        </Route>
      </Routes>
    </Router>
  )
}
