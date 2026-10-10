import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import RoleSelector from '../../components/RoleSelector/RoleSelector'
import './RegisterPage.css'

const COMPANY_LABELS = {
  supplier: { name: "Nom de l'entreprise fournisseur", description: 'Ce que vous fournissez' },
  transporter: { name: "Nom de l'entreprise de transport", description: 'Zones et type de transport' },
}

const initialForm = {
  role: 'client',
  companyName: '',
  businessDescription: '',
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
  const isCompany = form.role !== 'client'

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
    if (isCompany && !form.companyName.trim()) {
      setError("Le nom de l'entreprise est obligatoire.")
      return
    }

    setSubmitting(true)
    try {
      const { confirmPassword, companyName, businessDescription, ...payload } = form
      await register(isCompany ? { ...payload, companyName, businessDescription } : payload)
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
          <RoleSelector
            value={form.role}
            onChange={(role) => setForm(prev => ({ ...prev, role }))}
            legend="Je crée un compte"
          />

          {isCompany && (
            <>
              <label className="auth-form__field">
                <span>{COMPANY_LABELS[form.role].name}</span>
                <input name="companyName" value={form.companyName} onChange={handleChange} required maxLength={45} />
              </label>
              <label className="auth-form__field">
                <span>{COMPANY_LABELS[form.role].description} <em>(facultatif)</em></span>
                <textarea name="businessDescription" value={form.businessDescription} onChange={handleChange} rows={2} maxLength={250} />
              </label>
            </>
          )}

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
