import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './ForgotPasswordPage.css'

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page auth-page--static">
      <div className="auth-card">
        <h1 className="auth-card__title">Mot de passe oublié</h1>
        <p className="auth-card__subtitle">
          Entrez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

        {sent ? (
          <div className="auth-card__success">
            Si un compte existe avec cet email, un lien de réinitialisation vient de vous être envoyé.
            Vérifiez votre boîte de réception (et vos spams).
          </div>
        ) : (
          <>
            {error && <div className="auth-card__error">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-form__field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </label>

              <button className="auth-form__submit" type="submit" disabled={submitting}>
                {submitting ? 'Envoi...' : 'Envoyer le lien'}
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
