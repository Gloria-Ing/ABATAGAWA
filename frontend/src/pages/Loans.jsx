import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'

function LoanRequestModal({ onSubmit, onClose, loading }) {
    const [form, setForm] = useState({ amount: '', purpose: '', repayment_period_months: '' })
    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!form.amount || parseFloat(form.amount) <= 0) {
            toast.error('Enter a valid loan amount')
            return
        }
        onSubmit({ ...form, amount: parseFloat(form.amount) })
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                <h3>📋 Request a Loan</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Loan Amount (RWF)</label>
                        <input
                            type="number" name="amount" min="1" step="any"
                            placeholder="e.g. 100000"
                            value={form.amount} onChange={handleChange}
                            required autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Purpose (optional)</label>
                        <input
                            type="text" name="purpose"
                            placeholder="e.g. Business capital"
                            value={form.purpose} onChange={handleChange}
                        />
                    </div>
                    <div className="form-group">
                        <label>Repayment Period (months, optional)</label>
                        <input
                            type="number" name="repayment_period_months" min="1"
                            placeholder="e.g. 12"
                            value={form.repayment_period_months} onChange={handleChange}
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Submitting…' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function Loans() {
    const [loans, setLoans] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [actionLoading, setActionL] = useState(false)

    const fetchLoans = async () => {
        try {
            const { data } = await api.get('/loans/')
            setLoans(data)
        } catch {
            toast.error('Could not load loans')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchLoans() }, [])

    const handleRequest = async (body) => {
        setActionL(true)
        try {
            await api.post('/loans/request', body)
            toast.success('Loan request submitted successfully!')
            setShowModal(false)
            fetchLoans()
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Loan request failed')
        } finally {
            setActionL(false)
        }
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2>📋 My Loans</h2>
                    <p>Track and manage your loan requests.</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    + Request Loan
                </button>
            </div>

            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Amount (RWF)</th>
                                <th>Purpose</th>
                                <th>Period (months)</th>
                                <th>Interest Rate</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loans.length === 0 ? (
                                <tr>
                                    <td colSpan={6}>
                                        <div className="empty-state">
                                            <div className="icon">📄</div>
                                            <p>No loan requests yet. Click "Request Loan" to get started.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                loans.map((loan) => (
                                    <tr key={loan.id}>
                                        <td>{new Date(loan.created_at).toLocaleDateString()}</td>
                                        <td style={{ fontWeight: 600 }}>
                                            {parseFloat(loan.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td>{loan.purpose || '—'}</td>
                                        <td>{loan.repayment_period_months || '—'}</td>
                                        <td>{parseFloat(loan.interest_rate).toFixed(2)}%</td>
                                        <td>
                                            <span className={`badge badge-${loan.status}`}>{loan.status}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <LoanRequestModal
                    onSubmit={handleRequest}
                    onClose={() => setShowModal(false)}
                    loading={actionLoading}
                />
            )}
        </div>
    )
}
