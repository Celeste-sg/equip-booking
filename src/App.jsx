import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'
import Navbar from './components/Navbar'
import ResetPassword from './pages/ResetPassword'

// Grab is Supabase-only; lazy-loaded so it never runs unless /grab is opened.
const GrabApp = lazy(() => import('./grab/GrabApp'))

function PrivateRoute({ children }) {
  const { currentUser } = useAuth()
  return currentUser ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { currentUser, isAdmin } = useAuth()
  if (!currentUser) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { currentUser, recovery } = useAuth()
  const { pathname } = useLocation()
  if (recovery) return <ResetPassword />
  const inGrab = pathname.startsWith('/grab')
  return (
    <div className="min-h-screen bg-gray-50">
      {currentUser && !inGrab && <Navbar />}
      <Routes>
        <Route path="/grab/*" element={<Suspense fallback={null}><GrabApp /></Suspense>} />
        <Route path="/login" element={currentUser ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/register" element={currentUser ? <Navigate to="/" replace /> : <Register />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  )
}
