import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import logo from '../../public/logo.jpeg'

export default function Login() {
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPwd, setShow] = useState(false)
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { data } = await api.post('/auth/login', form)
            login(data.user, data.access_token)
            toast.success(`Welcome back, ${data.user.firstname}!`)
            navigate('/dashboard')
        } catch (err) {
            const msg = err.response?.data?.detail || 'Login failed. Please try again.'
            toast.error(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-wrapper">
            <div className="auth-card">
                {/* Header */}
                <div className="auth-logo">
                    <img src={logo} alt="ABATAGAWA" />
                    <h1>ABATAGAWA</h1>
                    <p>Savings &amp; Loan Cooperative</p>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    {/* Email */}
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <span style={iconStyle}>✉️</span>
                            <input
                                id="email" name="email" type="email"
                                placeholder="your@email.com"
                                value={form.email} onChange={handleChange}
                                required autoFocus
                                style={inputWithIcon}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div style={{ position: 'relative' }}>
                            <span style={iconStyle}>🔒</span>
                            <input
                                id="password" name="password"
                                type={showPwd ? 'text' : 'password'}
                                placeholder="Enter your password"
                                value={form.password} onChange={handleChange}
                                required
                                style={{ ...inputWithIcon, paddingRight: '2.8rem' }}
                            />
                            <button type="button" onClick={() => setShow(!showPwd)}
                                style={eyeBtn} title={showPwd ? 'Hide' : 'Show'}>
                                {showPwd ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-full"
                        disabled={loading} style={{ marginTop: '0.5rem', height: 46 }}>
                        {loading
                            ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                <Spinner /> Signing in…
                            </span>
                            : 'Sign In'}
                    </button>
                </form>

                <div className="auth-footer" style={{ marginTop: '1.25rem' }}>
                    Don't have an account? <Link to="/register">Create one</Link>
                </div>
            </div>
        </div>
    )
}

/* ── tiny helpers ── */
const iconStyle = {
    position: 'absolute', left: '0.9rem', top: '50%',
    transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none',
}
const inputWithIcon = { paddingLeft: '2.6rem', width: '100%' }
const eyeBtn = {
    position: 'absolute', right: '0.75rem', top: '50%',
    transform: 'translateY(-50%)', background: 'none',
    border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0,
}

function Spinner() {
    return (
        <span style={{
            width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
            borderTop: '2px solid #fff', borderRadius: '50%',
            display: 'inline-block', animation: 'spin 0.7s linear infinite',
        }} />
    )
}
