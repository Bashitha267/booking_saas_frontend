import React, { createContext, useEffect, useState } from 'react'
import api from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }){
  const [user, setUser] = useState(() => {
    try{
      return JSON.parse(localStorage.getItem('user')) || null
    }catch(e){ return null }
  })
  const [token, setToken] = useState(() => localStorage.getItem('token') || null)

  useEffect(() => {
    if(token){
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete api.defaults.headers.common['Authorization']
    }
  }, [token])

  async function login(username, password){
    const res = await api.post('/auth/login', { username, password })
    const { token, user } = res.data
    setToken(token)
    setUser(user)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    return res.data
  }

  async function logout(){
    try {
      await api.post('/auth/logout')
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      setToken(null)
      setUser(null)
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  async function register(payload){
    const res = await api.post('/auth/register', payload)
    return res.data
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
