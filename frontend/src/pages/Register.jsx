import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../api'
import logo from '../../public/logo.jpeg'

// ─── Role definitions ─────────────────────────────────────────────────────────
const ROLES = [
    {
        value: 'member',
        label: 'Member',
        description: 'Regular cooperative member with savings and loan access.',
        approval: 'Requires president approval',
        color: '#1a6b3c',
        approved: false,
    },
    {
        value: 'president',
        label: 'President',
        description: 'Leads the cooperative. Approves members and manages roles.',
        approval: 'Automatically activated — one president only',
        color: '#b7791f',
        approved: true,
    },
    {
        value: 'vice_president',
        label: 'Vice President',
        description: 'Supports the president and votes on loan requests.',
        approval: 'Requires president approval',
        color: '#2b6cb0',
        approved: false,
    },
    {
        value: 'secretary',
        label: 'Secretary',
        description: 'Manages records and votes on loan requests.',
        approval: 'Requires president approval',
        color: '#6b46c1',
        approved: false,
    },
    {
        value: 'accountant',
        label: 'Accountant',
        description: 'Oversees finances and votes on loan requests.',
        approval: 'Requires president approval',
        color: '#c53030',
        approved: false,
    },
]

// ─── Password strength ────────────────────────────────────────────────────────
const PWD_CHECKS = [
    { label: '8+ characters', test: (p) => p.length >= 8 },
    { label: 'Uppercase', test: (p) => /[A-Z]/.test(p) },
    { label: 'Lowercase', test: (p) => /[a-z]/.test(p) },
    { label: 'Number', test: (p) => /\d/.test(p) },
    { label: 'Special character', test: (p) => /[!@#$%^&*()\-_=+\[\]{}|;':",./<>?]/.test(p) },
]

function PasswordStrength({ password }) {
    if (!password) return null
    const results = PWD_CHECKS.map(c => ({ ...c, ok: c.test(password) }))
    const score = results.filter(r => r.ok).length
    const pct = (score / PWD_CHECKS.length) * 100
    const color = score <= 2 ? '#e53e3e' : score <= 3 ? '#f5a623' : '#38a169'
    const label = score <= 1 ? 'Very weak' : score === 2 ? 'Weak' : score === 3 ? 'Fair' : score === 4 ? 'Good' : 'Strong'

    return (
        <div style={{ marginTop: '0.6rem' }}>
            {/* Progress bar */}
            <div style={{ height: 5, borderRadius: 4, background: 'var(--border)', overflow: 'hidden', marginBottom: '0.4rem' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'all 0.3s' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color }}>{label}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{score}/{PWD_CHECKS.length}</span>
            </div>
            {/* Checklist */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.2rem 0.5rem' }}>
                {results.map(r => (
                    <span key={r.label} style={{ fontSize: '0.77rem', color: r.ok ? '#38a169' : '#a0aec0', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem' }}>{r.ok ? '✔' : '○'}</span> {r.label}
                    </span>
                ))}
            </div>
        </div>
    )
}

// ─── Role card ────────────────────────────────────────────────────────────────
function RoleCard({ role, selected, onSelect }) {
    return (
        <button type="button" onClick={() => onSelect(role.value)}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                padding: '0.9rem 1rem', borderRadius: 10, cursor: 'pointer',
                border: `2px solid ${selected ? role.color : 'var(--border)'}`,
                background: selected ? `${role.color}0f` : 'var(--white)',
                textAlign: 'left', width: '100%', transition: 'all 0.15s',
                boxShadow: selected ? `0 0 0 3px ${role.color}22` : 'none',
            }}>
            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.92rem', color: selected ? role.color : 'var(--text)' }}>
                    {role.label}
                </span>
                {/* Radio dot */}
                <span style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${selected ? role.color : '#cbd5e0'}`,
                    background: selected ? role.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {selected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                </span>
            </div>
            {/* Description */}
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                {role.description}
            </p>
            {/* Approval badge */}
            <span style={{
                marginTop: '0.5rem', fontSize: '0.72rem', fontWeight: 600,
                padding: '0.2rem 0.5rem', borderRadius: 20,
                background: role.approved ? '#c6f6d533' : '#fef3c733',
                color: role.approved ? '#276749' : '#92400e',
                border: `1px solid ${role.approved ? '#9ae6b4' : '#fcd34d'}`,
            }}>
                {role.approved ? '✓ Auto-approved' : '⏳ Needs approval'}
            </span>
        </button>
    )
}

// ─── Register page ────────────────────────────────────────────────────────────
export default function Register() {
    const [step, setStep] = useState(1) // 1=role, 2=details
    const [form, setForm] = useState({
        firstname: '', lastname: '', phone: '', email: '',
        role: '', password: '', confirmPassword: '',
    })
    const [showPwd, setShowPwd] = useState(false)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })
    const selectedRoleObj = ROLES.find(r => r.value === form.role)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (form.password !== form.confirmPassword) {
            toast.error('Passwords do not match')
            return
        }
        setLoading(true)
        try {
            const { confirmPassword, ...payload } = form
            await api.post('/auth/register', payload)
            toast.success(
                form.role === 'president'
                    ? 'President account created! You can log in now.'
                    : 'Account created! Awaiting President approval.'
            )
            navigate('/login')
        } catch (err) {
            const detail = err.response?.data?.detail
            toast.error(Array.isArray(detail) ? detail.map(d => d.msg).join(' ') : detail || 'Registration failed.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-wrapper" style={{ padding: '2rem 1rem' }}>
            <div className="auth-card" style={{ maxWidth: 560 }}>

                {/* Logo */}
                <div className="auth-logo" style={{ marginBottom: '1.25rem' }}>
                    <img src={logo} alt="ABATAGAWA" />
                    <h1>Create Account</h1>
                    <p>ABATAGAWA Savings &amp; Loan Cooperative</p>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {[{ n: 1, label: 'Select Role' }, { n: 2, label: 'Your Details' }].map(s => (
                        <div key={s.n} style={{ flex: 1 }}>
                            <div style={{
                                height: 4, borderRadius: 4,
                                background: step >= s.n ? 'var(--primary)' : 'var(--border)',
                                marginBottom: '0.3rem', transition: 'background 0.2s',
                            }} />
                            <span style={{ fontSize: '0.75rem', color: step >= s.n ? 'var(--primary)' : 'var(--text-muted)', fontWeight: step === s.n ? 700 : 400 }}>
                                Step {s.n}: {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                {/* ── STEP 1: Role selection ── */}
                {step === 1 && (
                    <div>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Choose the role that best describes your position in the cooperative.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.25rem' }}>
                            {ROLES.map(r => (
                                <RoleCard key={r.value} role={r} selected={form.role === r.value}
                                    onSelect={(v) => setForm({ ...form, role: v })} />
                            ))}
                        </div>
                        <button className="btn btn-primary btn-full" disabled={!form.role}
                            style={{ height: 46 }} onClick={() => setStep(2)}>
                            Continue →
                        </button>
                        <div className="auth-footer" style={{ marginTop: '1rem' }}>
                            Already have an account? <Link to="/login">Sign in</Link>
                        </div>
                    </div>
                )}

                {/* ── STEP 2: Personal details ── */}
                {step === 2 && (
                    <form onSubmit={handleSubmit} noValidate>
                        {/* Selected role recap */}
                        {selectedRoleObj && (
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.65rem 1rem', borderRadius: 8, marginBottom: '1.25rem',
                                background: `${selectedRoleObj.color}0f`,
                                border: `1.5px solid ${selectedRoleObj.color}44`,
                            }}>
                                <div>
                                    <span style={{ fontWeight: 700, color: selectedRoleObj.color, fontSize: '0.9rem' }}>
                                        {selectedRoleObj.label}
                                    </span>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                        {selectedRoleObj.approval}
                                    </span>
                                </div>
                                <button type="button" onClick={() => setStep(1)}
                                    style={{ fontSize: '0.78rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                                    Change
                                </button>
                            </div>
                        )}

                        {/* Name */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="firstname">First Name</label>
                                <input id="firstname" name="firstname" type="text"
                                    placeholder="Jean" value={form.firstname}
                                    onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastname">Last Name</label>
                                <input id="lastname" name="lastname" type="text"
                                    placeholder="Dupont" value={form.lastname}
                                    onChange={handleChange} required />
                            </div>
                        </div>

                        {/* Phone + Email */}
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input id="phone" name="phone" type="tel"
                                    placeholder="+250788000000" value={form.phone}
                                    onChange={handleChange} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email Address</label>
                                <input id="email" name="email" type="email"
                                    placeholder="you@email.com" value={form.email}
                                    onChange={handleChange} required />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input id="password" name="password"
                                    type={showPwd ? 'text' : 'password'}
                                    placeholder="Create a strong password"
                                    value={form.password} onChange={handleChange}
                                    required minLength={8}
                                    style={{ paddingRight: '2.8rem' }} />
                                <button type="button" onClick={() => setShowPwd(!showPwd)}
                                    style={eyeBtn}>{showPwd ? '🙈' : '👁️'}</button>
                            </div>
                            <PasswordStrength password={form.password} />
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <input id="confirmPassword" name="confirmPassword" type="password"
                                placeholder="Repeat your password"
                                value={form.confirmPassword} onChange={handleChange}
                                required minLength={8} />
                            {form.confirmPassword && form.password !== form.confirmPassword && (
                                <span style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.25rem', display: 'block' }}>
                                    Passwords do not match
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                            <button type="button" className="btn btn-outline" style={{ flex: '0 0 auto', height: 46 }}
                                onClick={() => setStep(1)}>
                                ← Back
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1, height: 46 }} disabled={loading}>
                                {loading
                                    ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}><Spinner /> Creating…</span>
                                    : 'Create Account'}
                            </button>
                        </div>

                        <div className="auth-footer" style={{ marginTop: '1rem' }}>
                            Already have an account? <Link to="/login">Sign in</Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

const eyeBtn = {
    position: 'absolute', right: '0.75rem', top: '50%',
    transform: 'translateY(-50%)', background: 'none',
    border: 'none', cursor: 'pointer', fontSize: '1rem', padding: 0,
}

function Spinner() {
    return (
        <span style={{
            width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)',
            borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block',
            animation: 'spin 0.7s linear infinite',
        }} />
    )
}
