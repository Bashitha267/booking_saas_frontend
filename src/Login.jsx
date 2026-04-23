import React, { useState } from 'react'
import axios from 'axios'

export default function Login(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e){
    e.preventDefault()
    setError(null)
    setLoading(true)
    try{
      const res = await axios.post('http://localhost:4000/auth/login', { username, password })
      const { token, user } = res.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      alert('Login successful')
    }catch(err){
      setError(err.response?.data?.message || 'Login failed')
    }finally{
      setLoading(false)
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        Username
        <input value={username} onChange={e => setUsername(e.target.value)} required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
      </label>
      <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
      {error && <div className="error">{error}</div>}
    </form>
  )
}
