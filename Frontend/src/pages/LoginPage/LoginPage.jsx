import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import RoleSelector from '../../components/RoleSelector/RoleSelector'
import './LoginPage.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const redirectTo = location.state?.from || '/'
  const [role, setRole] = useState('client')
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(form.username, form.password, role)
      // Only follow the "from" redirect if it belongs to the space being logged into
      // (e.g. checkout for clients, /supplier/… for suppliers); otherwise go home.
      const partnerPrefix = `/${role}/`
      const followRedirect = role === 'client'
        ? !['/supplier/', '/transporter/'].some((p) => redirectTo.startsWith(p))
        : redirectTo.startsWith(partnerPrefix)
      navigate(followRedirect ? redirectTo : '/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Bon retour</h1>
        <p className="auth-card__subtitle">Connectez-vous à votre compte SBO</p>

        {error && <div className="auth-card__error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <RoleSelector value={role} onChange={setRole} legend="Se connecter en tant que" />

          <label className="auth-form__field">
            <span>Nom d'utilisateur</span>
            <input name="username" value={form.username} onChange={handleChange} required autoFocus />
          </label>

          <label className="auth-form__field">
            <span>Mot de passe</span>
            <input name="password" type="password" value={form.password} onChange={handleChange} required />
          </label>

          <Link to="/forgot-password" className="auth-form__forgot">Mot de passe oublié ?</Link>

          <button className="auth-form__submit" type="submit" disabled={submitting}>
            {submitting ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="auth-card__footer">
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </p>
      </div>
    </main>
  )
}
