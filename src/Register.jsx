import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'

export default function Register(){
  const [form, setForm] = useState({ firstName:'', lastName:'', username:'', contact:'', whatsapp:'', address:'', password:'' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const auth = useAuth()
  const navigate = useNavigate()

  useEffect(()=>{ document.title = 'Register — BookingSaaS' }, [])

  async function submit(e){
    e.preventDefault()
    setError(null)
    setLoading(true)
    try{
      await auth.register(form)
      navigate('/login')
    }catch(err){
      setError(err.response?.data?.message || 'Registration failed')
    }finally{ setLoading(false) }
  }

  return (
    <div className="app-bg">
      <div className="app-card">
        <div className="brand">
          <div>
            <h1>BookingSaaS</h1>
            <div className="small muted">Create a new account</div>
          </div>
        </div>

        <h2 className="form-title">Register</h2>

        <form className="form" onSubmit={submit} aria-label="register form">
          <div className="field">
            <label htmlFor="r-username">Username</label>
            <input id="r-username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required />
          </div>

          <div className="field">
            <label>First name</label>
            <input value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} required />
          </div>

          <div className="field">
            <label>Last name</label>
            <input value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} />
          </div>

          <div className="field">
            <label>Contact</label>
            <input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} required />
          </div>

          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
          </div>

          <div className="actions">
            <div className="small muted">Already registered? <Link className="link" to="/login">Sign in</Link></div>
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create account'}</button>
          </div>

          {error && <div className="error" role="alert">{error}</div>}
        </form>
      </div>
    </div>
  )
}
