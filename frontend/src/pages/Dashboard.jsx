import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
    const { user } = useAuth()
    const [savings, setSavings] = useState(null)
    const [loans, setLoans] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [savingsRes, loansRes] = await Promise.all([
                    api.get('/savings/'),
                    api.get('/loans/'),
                ])
                setSavings(savingsRes.data)
                setLoans(loansRes.data)
            } catch {
                // handled silently; user sees empty state
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const pendingLoans = loans.filter((l) => l.status === 'pending').length
    const approvedLoans = loans.filter((l) => l.status === 'approved').length

    return (
        <div>
            <div className="page-header">
                <h2>Welcome back, {user?.firstname}! 👋</h2>
                <p>Here's an overview of your account.</p>
            </div>

            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading your data…</p>
            ) : (
                <>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="label">Savings Balance</div>
                            <div className="value">
                                {savings
                                    ? `RWF ${parseFloat(savings.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                                    : '—'}
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: '#f5a623' }}>
                            <div className="label">Total Loans</div>
                            <div className="value" style={{ color: '#f5a623' }}>{loans.length}</div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: '#e53e3e' }}>
                            <div className="label">Pending Loans</div>
                            <div className="value" style={{ color: '#e53e3e' }}>{pendingLoans}</div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: '#38a169' }}>
                            <div className="label">Approved Loans</div>
                            <div className="value" style={{ color: '#38a169' }}>{approvedLoans}</div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Quick Actions</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <Link to="/savings" className="btn btn-primary">💰 Manage Savings</Link>
                                <Link to="/loans" className="btn btn-outline">📋 Request a Loan</Link>
                            </div>
                        </div>

                        <div className="card">
                            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Recent Loans</h3>
                            {loans.length === 0 ? (
                                <div className="empty-state" style={{ padding: '1rem' }}>
                                    <p>No loans yet.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {loans.slice(0, 4).map((loan) => (
                                        <div key={loan.id} style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'center', padding: '0.6rem 0',
                                            borderBottom: '1px solid var(--border)'
                                        }}>
                                            <span>RWF {parseFloat(loan.amount).toLocaleString()}</span>
                                            <span className={`badge badge-${loan.status}`}>{loan.status}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
