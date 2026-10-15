import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Profile() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div>
            <div className="page-header">
                <h2>👤 My Profile</h2>
                <p>Your account information.</p>
            </div>

            <div className="card" style={{ maxWidth: 520 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    marginBottom: '1.5rem', paddingBottom: '1.5rem',
                    borderBottom: '1px solid var(--border)'
                }}>
                    <div style={{
                        width: 60, height: 60, borderRadius: '50%',
                        background: 'var(--primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 700
                    }}>
                        {user?.firstname?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                            {user?.firstname} {user?.lastname}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            @{user?.username}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                        { label: 'First Name', value: user?.firstname },
                        { label: 'Last Name', value: user?.lastname },
                        { label: 'Username', value: `@${user?.username}` },
                        { label: 'Email', value: user?.email },
                        { label: 'Phone', value: user?.phone },
                        {
                            label: 'Member Since', value: user?.created_at
                                ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                : '—'
                        },
                        { label: 'Account Status', value: user?.is_active ? '✅ Active' : '❌ Inactive' },
                    ].map(({ label, value }) => (
                        <div key={label} style={{
                            display: 'flex', justifyContent: 'space-between',
                            padding: '0.6rem 0', borderBottom: '1px solid var(--border)'
                        }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{label}</span>
                            <span style={{ fontWeight: 500 }}>{value}</span>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <button className="btn btn-danger btn-full" onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    )
}
