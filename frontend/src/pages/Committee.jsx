import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const ROLE_LABELS = {
    member: 'Member',
    president: 'President',
    vice_president: 'Vice President',
    secretary: 'Secretary',
    accountant: 'Accountant',
}

const COMMITTEE_ROLES = ['president', 'vice_president', 'secretary', 'accountant']

// ─── Pending members tab ──────────────────────────────────────────────────────
function PendingMembers() {
    const [pending, setPending] = useState([])
    const [loading, setLoading] = useState(true)
    const [acting, setActing] = useState(null)

    const fetch = async () => {
        try {
            const { data } = await api.get('/committee/pending-members')
            setPending(data)
        } catch {
            toast.error('Could not load pending members')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetch() }, [])

    const approve = async (userId, username) => {
        setActing(userId)
        try {
            await api.post('/committee/approve-member', { user_id: userId })
            toast.success(`${username} approved!`)
            fetch()
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed')
        } finally {
            setActing(null)
        }
    }

    const reject = async (userId, username) => {
        if (!confirm(`Reject ${username}?`)) return
        setActing(userId)
        try {
            await api.post('/committee/reject-member', { user_id: userId })
            toast.success(`${username} rejected`)
            fetch()
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed')
        } finally {
            setActing(null)
        }
    }

    if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>

    return (
        <div className="table-wrapper">
            <table>
                <thead>
                    <tr>
                        <th>Name</th><th>Username</th><th>Phone</th><th>Email</th><th>Registered</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {pending.length === 0 ? (
                        <tr><td colSpan={6}><div className="empty-state"><div className="icon">✅</div><p>No pending approvals</p></div></td></tr>
                    ) : pending.map(u => (
                        <tr key={u.id}>
                            <td>{u.firstname} {u.lastname}</td>
                            <td>@{u.username}</td>
                            <td>{u.phone}</td>
                            <td>{u.email}</td>
                            <td>{new Date(u.created_at).toLocaleDateString()}</td>
                            <td style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                                    onClick={() => approve(u.id, u.username)} disabled={acting === u.id}>
                                    Approve
                                </button>
                                <button className="btn btn-danger" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                                    onClick={() => reject(u.id, u.username)} disabled={acting === u.id}>
                                    Reject
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ─── All members + role assignment tab ───────────────────────────────────────
function AllMembers() {
    const [members, setMembers] = useState([])
    const [loading, setLoading] = useState(true)
    const [roleModal, setRoleModal] = useState(null) // user object
    const [newRole, setNewRole] = useState('member')
    const [acting, setActing] = useState(false)

    const fetch = async () => {
        try {
            const { data } = await api.get('/committee/members')
            setMembers(data)
        } catch {
            toast.error('Could not load members')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetch() }, [])

    const assignRole = async () => {
        setActing(true)
        try {
            await api.post('/committee/assign-role', { user_id: roleModal.id, role: newRole })
            toast.success(`Role updated for ${roleModal.username}`)
            setRoleModal(null)
            fetch()
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed')
        } finally {
            setActing(false)
        }
    }

    if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>

    return (
        <>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr><th>Name</th><th>Username</th><th>Phone</th><th>Role</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {members.map(u => (
                            <tr key={u.id}>
                                <td>{u.firstname} {u.lastname}</td>
                                <td>@{u.username}</td>
                                <td>{u.phone}</td>
                                <td><span className={`badge ${COMMITTEE_ROLES.includes(u.role) ? 'badge-approved' : 'badge-pending'}`}>{ROLE_LABELS[u.role] || u.role}</span></td>
                                <td><span className={`badge ${u.is_active ? 'badge-approved' : 'badge-rejected'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                                <td>
                                    <button className="btn btn-outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                                        onClick={() => { setRoleModal(u); setNewRole(u.role) }}>
                                        Assign Role
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {roleModal && (
                <div className="modal-overlay" onClick={() => setRoleModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h3>Assign Role — @{roleModal.username}</h3>
                        <div className="form-group">
                            <label>New Role</label>
                            <select value={newRole} onChange={e => setNewRole(e.target.value)}
                                style={{ width: '100%', padding: '0.65rem', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: '0.95rem' }}>
                                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setRoleModal(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={assignRole} disabled={acting}>
                                {acting ? 'Saving…' : 'Save Role'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// ─── Pending loans tab ────────────────────────────────────────────────────────
function PendingLoans() {
    const [loans, setLoans] = useState([])
    const [loading, setLoading] = useState(true)
    const [modal, setModal] = useState(null)
    const [vote, setVote] = useState('approved')
    const [comment, setComment] = useState('')
    const [acting, setActing] = useState(false)

    const fetch = async () => {
        try {
            const { data } = await api.get('/loans/pending')
            setLoans(data)
        } catch {
            toast.error('Could not load pending loans')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetch() }, [])

    const submitVote = async () => {
        setActing(true)
        try {
            await api.post(`/loans/${modal.id}/vote`, { vote, comment })
            toast.success(`Vote '${vote}' submitted!`)
            setModal(null)
            setComment('')
            fetch()
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Vote failed')
        } finally {
            setActing(false)
        }
    }

    if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>

    return (
        <>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr><th>Date</th><th>Member</th><th>Amount (RWF)</th><th>Purpose</th><th>Period</th><th>Votes</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        {loans.length === 0 ? (
                            <tr><td colSpan={7}><div className="empty-state"><div className="icon">📋</div><p>No pending loans</p></div></td></tr>
                        ) : loans.map(loan => (
                            <tr key={loan.id}>
                                <td>{new Date(loan.created_at).toLocaleDateString()}</td>
                                <td>{loan.user_id.slice(0, 8)}…</td>
                                <td style={{ fontWeight: 600 }}>{parseFloat(loan.amount).toLocaleString()}</td>
                                <td>{loan.purpose || '—'}</td>
                                <td>{loan.repayment_period_months ? `${loan.repayment_period_months} mo` : '—'}</td>
                                <td>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                                        {loan.approvals?.map(a => (
                                            <span key={a.id} className={`badge badge-${a.vote}`} style={{ fontSize: '0.72rem' }}>
                                                {ROLE_LABELS[a.role]?.split(' ')[0]}
                                            </span>
                                        ))}
                                        {!loan.approvals?.length && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>None yet</span>}
                                    </div>
                                </td>
                                <td>
                                    <button className="btn btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}
                                        onClick={() => { setModal(loan); setVote('approved'); setComment('') }}>
                                        Vote
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
                        <h3>Vote on Loan Request</h3>
                        <div style={{ background: 'var(--primary-light)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                            <strong>Amount:</strong> RWF {parseFloat(modal.amount).toLocaleString()}<br />
                            <strong>Purpose:</strong> {modal.purpose || '—'}<br />
                            <strong>Period:</strong> {modal.repayment_period_months ? `${modal.repayment_period_months} months` : '—'}
                        </div>
                        <div className="form-group">
                            <label>Your Vote</label>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                {['approved', 'rejected'].map(v => (
                                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: vote === v ? 700 : 400, color: v === 'approved' ? '#38a169' : '#e53e3e' }}>
                                        <input type="radio" name="vote" value={v} checked={vote === v} onChange={() => setVote(v)} />
                                        {v.charAt(0).toUpperCase() + v.slice(1)}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Comment (optional)</label>
                            <input type="text" placeholder="Reason for your vote…" value={comment} onChange={e => setComment(e.target.value)} />
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-outline" onClick={() => setModal(null)}>Cancel</button>
                            <button className={`btn ${vote === 'approved' ? 'btn-primary' : 'btn-danger'}`} onClick={submitVote} disabled={acting}>
                                {acting ? 'Submitting…' : `Submit ${vote}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// ─── Main Committee page ──────────────────────────────────────────────────────
export default function Committee() {
    const { user } = useAuth()
    const [tab, setTab] = useState('loans')

    const isPresident = user?.role === 'president'

    const tabs = [
        { key: 'loans', label: '📋 Pending Loans' },
        ...(isPresident ? [
            { key: 'pending', label: '⏳ Pending Members' },
            { key: 'members', label: '👥 All Members' },
        ] : [
            { key: 'members', label: '👥 All Members' },
        ]),
    ]

    return (
        <div>
            <div className="page-header">
                <h2>🏛 Committee Panel</h2>
                <p>Manage member approvals, roles, and loan votes.</p>
            </div>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)', paddingBottom: '0' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        style={{
                            padding: '0.6rem 1.2rem', border: 'none', background: 'none', cursor: 'pointer',
                            fontWeight: tab === t.key ? 700 : 400,
                            color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
                            borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent',
                            marginBottom: -2, fontSize: '0.95rem',
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'loans' && <PendingLoans />}
            {tab === 'pending' && isPresident && <PendingMembers />}
            {tab === 'members' && <AllMembers />}
        </div>
    )
}
