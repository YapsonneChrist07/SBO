import request from './client'

export const registerUser = (payload) =>
  request('/auth/register', { method: 'POST', body: payload })

export const loginUser = (payload) =>
  request('/auth/login', { method: 'POST', body: payload })

export const fetchMe = (token) => request('/auth/me', { token })

export const updateProfile = (payload, token) =>
  request('/auth/me', { method: 'PUT', body: payload, token })

export const changePassword = (payload, token) =>
  request('/auth/me/password', { method: 'PUT', body: payload, token })

export const forgotPassword = (email) =>
  request('/auth/forgot-password', { method: 'POST', body: { email } })

export const resetPassword = (token, newPassword) =>
  request('/auth/reset-password', { method: 'POST', body: { token, newPassword } })
