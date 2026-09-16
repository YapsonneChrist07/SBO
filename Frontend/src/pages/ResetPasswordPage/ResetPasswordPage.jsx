import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './ResetPasswordPage.css'

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.')
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }

    setSubmitting(true)
    try {
      await resetPassword(token, password)
      setDone(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <main className="auth-page auth-page--static">
        <div className="auth-card">
          <h1 className="auth-card__title">Lien invalide</h1>
          <p className="auth-card__subtitle">
            Ce lien de réinitialisation est incomplet ou invalide. Demandez-en un nouveau.
          </p>
          <p className="auth-card__footer">
            <Link to="/forgot-password">Demander un nouveau lien</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="auth-page auth-page--static">
      <div className="auth-card">
        <h1 className="auth-card__title">Nouveau mot de passe</h1>
        <p className="auth-card__subtitle">Choisissez un nouveau mot de passe pour votre compte.</p>

        {done ? (
          <div className="auth-card__success">
            Mot de passe réinitialisé avec succès. Redirection vers la connexion...
          </div>
        ) : (
          <>
            {error && <div className="auth-card__error">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-form__field">
                <span>Nouveau mot de passe</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </label>

              <label className="auth-form__field">
                <span>Confirmer</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>

              <button className="auth-form__submit" type="submit" disabled={submitting}>
                {submitting ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
              </button>
            </form>
          </>
        )}

        <p className="auth-card__footer">
          <Link to="/login">Retour à la connexion</Link>
        </p>
      </div>
    </main>
  )
}
