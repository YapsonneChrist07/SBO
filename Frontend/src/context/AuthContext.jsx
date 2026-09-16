import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  loginUser,
  registerUser,
  fetchMe,
  updateProfile as updateProfileApi,
  changePassword as changePasswordApi,
  forgotPassword as forgotPasswordApi,
  resetPassword as resetPasswordApi,
} from '../api/auth'

const STORAGE_KEY = 'sbo_token'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    fetchMe(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem(STORAGE_KEY)
        setToken(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const login = async (username, password) => {
    const { token: newToken, user: loggedInUser } = await loginUser({ username, password })
    localStorage.setItem(STORAGE_KEY, newToken)
    setToken(newToken)
    setUser(loggedInUser)
  }

  const register = (payload) => registerUser(payload)

  const updateProfile = async (payload) => {
    const updated = await updateProfileApi(payload, token)
    setUser(updated)
    return updated
  }

  const changePassword = (payload) => changePasswordApi(payload, token)

  const forgotPassword = (email) => forgotPasswordApi(email)

  const resetPassword = (resetToken, newPassword) => resetPasswordApi(resetToken, newPassword)

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout, updateProfile, changePassword, forgotPassword, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
