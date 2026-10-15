import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Savings from './pages/Savings'
import Loans from './pages/Loans'
import Profile from './pages/Profile'
import Committee from './pages/Committee'
import Layout from './components/Layout'

const COMMITTEE_ROLES = ['president', 'vice_president', 'secretary', 'accountant']

function PrivateRoute({ children }) {
    const { isAuthenticated } = useAuth()
    return isAuthenticated ? children : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
    const { isAuthenticated } = useAuth()
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : children
}

function CommitteeRoute({ children }) {
    const { user } = useAuth()
    if (!user) return <Navigate to="/login" replace />
    if (!COMMITTEE_ROLES.includes(user.role)) return <Navigate to="/dashboard" replace />
    return children
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="savings" element={<Savings />} />
                <Route path="loans" element={<Loans />} />
                <Route path="profile" element={<Profile />} />
                <Route path="committee" element={<CommitteeRoute><Committee /></CommitteeRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    )
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    )
}
