import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './RegisterPage.css'

const initialForm = {
  firstName: '',
  lastName: '',
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  phone: '',
}

export default function RegisterPage() {
  const { register, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.username.trim().length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères.")
      return
    }
    if (form.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    try {
      const { confirmPassword, ...payload } = form
      await register(payload)
      await login(form.username, form.password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page auth-page--static">
      <div className="auth-card auth-card--wide">
        <h1 className="auth-card__title">Créer un compte</h1>
        <p className="auth-card__subtitle">Rejoignez SBO en quelques secondes</p>

        {error && <div className="auth-card__error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__row">
            <label className="auth-form__field">
              <span>Prénom</span>
              <input name="firstName" value={form.firstName} onChange={handleChange} required autoFocus />
            </label>
            <label className="auth-form__field">
              <span>Nom</span>
              <input name="lastName" value={form.lastName} onChange={handleChange} required />
            </label>
          </div>

          <label className="auth-form__field">
            <span>Nom d'utilisateur</span>
            <input name="username" value={form.username} onChange={handleChange} required minLength={3} />
          </label>

          <label className="auth-form__field">
            <span>Email</span>
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </label>

          <label className="auth-form__field">
            <span>Téléphone</span>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </label>

          <div className="auth-form__row">
            <label className="auth-form__field">
              <span>Mot de passe</span>
              <input name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} />
            </label>
            <label className="auth-form__field">
              <span>Confirmer</span>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required minLength={6} />
            </label>
          </div>

          <button className="auth-form__submit" type="submit" disabled={submitting}>
            {submitting ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="auth-card__footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </main>
  )
}
