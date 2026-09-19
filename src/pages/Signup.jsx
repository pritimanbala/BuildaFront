import { useState } from 'react'
import { AppLink, navigate } from '../App.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import GoogleButton from '../components/GoogleButton.jsx'
import { API_URL, api, apiError } from '../api.js'

export default function Signup() {
  const [role, setRole] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const register = async (event) => {
    event.preventDefault()
    setLoading(true)
    setFormError('')
    try {
      await api.post('/api/auth/signup', {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      })
      navigate('/dashboard')
    } catch (error) {
      setFormError(apiError(error, 'Unable to create your account. Please try again.'))
    } finally {
      setLoading(false)
    }
  }

  const googleSignIn = () => window.location.assign(`${API_URL}/api/auth/google?role=${role}`)

  if (!role) {
    return <AuthLayout><section className="signin-card role-card"><header><h1>Register as</h1><p>Choose the account type for your workspace.</p></header>
      <button className="role-choice" type="button" onClick={() => setRole('ADMIN')}>Administrator</button>
      <button className="role-choice" type="button" onClick={() => setRole('EXE')}>Executive</button>
      <p className="create-account">Already have an account? <AppLink to="/login">Sign in</AppLink></p>
    </section></AuthLayout>
  }

  const roleName = role === 'ADMIN' ? 'Admin' : 'Executive'
  return <AuthLayout><form className="signin-card" noValidate onSubmit={register}><header><h1>Register as {roleName}</h1><p>Complete your details to create your account.</p></header>
    <div className="field"><input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" autoComplete="name" required /></div>
    <div className="field focused"><label htmlFor="signup-email">Email</label><input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
    <PasswordInput id="signup-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create password" autoComplete="new-password" />
    {formError && <p className="form-error" role="alert">{formError}</p>}
    <button className="sign-in" type="submit" disabled={loading}>{loading ? 'Creating account...' : `Register as ${roleName}`}</button>
    <div className="divider"><span>or</span></div><GoogleButton label="Continue with Google" onClick={googleSignIn} disabled={loading} />
    <button className="back-button" type="button" onClick={() => setRole(null)}>Choose a different role</button>
    <p className="create-account">Already have an account? <AppLink to="/login">Sign in</AppLink></p>
  </form></AuthLayout>
}
