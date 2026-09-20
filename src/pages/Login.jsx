import { useState } from 'react'
import { AppLink, navigate } from '../App.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import GoogleButton from '../components/GoogleButton.jsx'
import { API_URL, signIn, apiError } from '../api.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setEmailError('Enter a valid email address.')
    setLoading(true); setFormError('')
    try {
      await signIn(email.trim(), password)
      navigate('/dashboard')
    } catch (error) {
      setFormError(apiError(error, 'Unable to sign in. Please try again.'))
    } finally { setLoading(false) }
  }
  const signInWithGoogle = () => { window.location.assign(`${API_URL}/api/auth/google`) }
  return <AuthLayout><form className="signin-card" noValidate onSubmit={handleSubmit}><header><h1>Sign in</h1><p>Please login to continue to your account.</p></header>
    <div className={`field focused ${emailError ? 'field-error' : ''}`}><label htmlFor="email">Email</label><input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError('') }} autoComplete="email" aria-invalid={Boolean(emailError)} required /></div>
    {emailError && <p className="input-error">{emailError}</p>}
    <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
    {formError && <p className="form-error" role="alert">{formError}</p>}
    <label className="remember"><input type="checkbox" /><span>Keep me logged in</span></label><button className="sign-in" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
    <div className="divider"><span>or</span></div><GoogleButton label="Sign in with Google" onClick={signInWithGoogle} disabled={loading} />
    <p className="create-account">Need an account? <AppLink to="/signup">Create one</AppLink></p>
  </form></AuthLayout>
}
