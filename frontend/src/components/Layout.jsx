import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logo from '../../public/logo.jpeg'

const COMMITTEE_ROLES = ['president', 'vice_president', 'secretary', 'accountant']

const ROLE_LABELS = {
    member: 'Member',
    president: 'President',
    vice_president: 'Vice President',
    secretary: 'Secretary',
    accountant: 'Accountant',
}

export default function Layout() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const isCommittee = COMMITTEE_ROLES.includes(user?.role)

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    const navItems = [
        { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
        { to: '/savings', icon: '💰', label: 'Savings' },
        { to: '/loans', icon: '📋', label: 'Loans' },
        ...(isCommittee ? [{ to: '/committee', icon: '🏛', label: 'Committee' }] : []),
        { to: '/profile', icon: '👤', label: 'Profile' },
    ]

    return (
        <>
            <nav className="navbar">
                <div className="navbar-brand">
                    <img src={logo} alt="ABATAGAWA logo" />
                    <span>ABATAGAWA</span>
                </div>
                <div className="navbar-links" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>
                            {user?.firstname} {user?.lastname}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: isCommittee ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isCommittee ? 600 : 400 }}>
                            {ROLE_LABELS[user?.role] || user?.role}
                        </div>
                    </div>
                    <button className="btn btn-outline" onClick={handleLogout} style={{ padding: '0.4rem 1rem' }}>
                        Logout
                    </button>
                </div>
            </nav>

            <div className="dashboard-layout">
                <aside className="sidebar">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </aside>

                <main className="main-content">
                    <Outlet />
                </main>
            </div>
        </>
    )
}
