import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'

function Modal({ title, label, onSubmit, onClose, loading }) {
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Enter a valid amount')
            return
        }
        onSubmit({ amount: parseFloat(amount), description })
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>{title}</h3>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Amount (RWF)</label>
                        <input
                            type="number" min="1" step="any"
                            placeholder="e.g. 5000"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Description (optional)</label>
                        <input
                            type="text" placeholder="e.g. Monthly savings"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Processing…' : label}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default function Savings() {
    const [account, setAccount] = useState(null)
    const [transactions, setTxns] = useState([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionL] = useState(false)
    const [modal, setModal] = useState(null) // 'deposit' | 'withdraw' | null

    const fetchData = async () => {
        try {
            const [accRes, txnRes] = await Promise.all([
                api.get('/savings/'),
                api.get('/savings/transactions'),
            ])
            setAccount(accRes.data)
            setTxns(txnRes.data)
        } catch {
            toast.error('Could not load savings data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => { fetchData() }, [])

    const handleDeposit = async (body) => {
        setActionL(true)
        try {
            await api.post('/savings/deposit', body)
            toast.success('Deposit successful!')
            setModal(null)
            fetchData()
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Deposit failed')
        } finally {
            setActionL(false)
        }
    }

    const handleWithdraw = async (body) => {
        setActionL(true)
        try {
            await api.post('/savings/withdraw', body)
            toast.success('Withdrawal successful!')
            setModal(null)
            fetchData()
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Withdrawal failed')
        } finally {
            setActionL(false)
        }
    }

    return (
        <div>
            <div className="page-header">
                <h2>💰 Savings Account</h2>
                <p>Manage your deposits and withdrawals.</p>
            </div>

            {loading ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
            ) : (
                <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '1.5rem' }}>
                        <div className="stat-card">
                            <div className="label">Current Balance</div>
                            <div className="value">
                                RWF {parseFloat(account?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: '#38a169' }}>
                            <div className="label">Total Deposits</div>
                            <div className="value" style={{ color: '#38a169' }}>
                                {transactions.filter((t) => t.transaction_type === 'deposit').length}
                            </div>
                        </div>
                        <div className="stat-card" style={{ borderLeftColor: '#e53e3e' }}>
                            <div className="label">Total Withdrawals</div>
                            <div className="value" style={{ color: '#e53e3e' }}>
                                {transactions.filter((t) => t.transaction_type === 'withdrawal').length}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <button className="btn btn-primary" onClick={() => setModal('deposit')}>
                            ➕ Deposit
                        </button>
                        <button className="btn btn-outline" onClick={() => setModal('withdraw')}>
                            ➖ Withdraw
                        </button>
                    </div>

                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Amount (RWF)</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4}>
                                            <div className="empty-state">
                                                <div className="icon">💳</div>
                                                <p>No transactions yet. Make your first deposit!</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map((txn) => (
                                        <tr key={txn.id}>
                                            <td>{new Date(txn.created_at).toLocaleString()}</td>
                                            <td>
                                                <span className={`badge badge-${txn.transaction_type}`}>
                                                    {txn.transaction_type}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {txn.transaction_type === 'deposit' ? '+' : '-'}
                                                {parseFloat(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td>{txn.description || '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {modal === 'deposit' && (
                <Modal
                    title="Deposit Funds"
                    label="Deposit"
                    onSubmit={handleDeposit}
                    onClose={() => setModal(null)}
                    loading={actionLoading}
                />
            )}
            {modal === 'withdraw' && (
                <Modal
                    title="Withdraw Funds"
                    label="Withdraw"
                    onSubmit={handleWithdraw}
                    onClose={() => setModal(null)}
                    loading={actionLoading}
                />
            )}
        </div>
    )
}
