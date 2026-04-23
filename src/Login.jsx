import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'

export default function Login(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(() => { document.title = 'Login — BookingSaaS' }, [])
  useEffect(() => { if (auth?.user) navigate('/dashboard', { replace: true }) }, [auth, navigate])
  useEffect(() => { if (!error) return; const t = setTimeout(()=>setError(null),4000); return ()=>clearTimeout(t) }, [error])

  async function handleSubmit(e){
    e.preventDefault()
    setError(null)
    setLoading(true)
    try{
      await auth.login(username, password)
      navigate('/dashboard')
    }catch(err){
      setError(err.response?.data?.message || 'Invalid username or password')
    }finally{ setLoading(false) }
  }

  return (
    <div className="app-bg">
      <div className="app-card">
        <div className="brand">
          <div>
            <h1>BookingSaaS</h1>
            <div className="small muted">Sign in to your account</div>
          </div>
        </div>

        <h2 className="form-title">Welcome back</h2>

        <form className="form" onSubmit={handleSubmit} aria-label="login form">
          <div className="field">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" value={username} onChange={e=>setUsername(e.target.value)} required autoFocus />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>

          <div className="actions">
            <div className="small muted">Don't have an account? <Link className="link" to="/register">Register</Link></div>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          </div>

          {error && <div className="error" role="alert">{error}</div>}
        </form>
      </div>
    </div>
  )
}
