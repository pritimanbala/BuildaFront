import { useState } from 'react'

export default function PasswordInput({ id, placeholder = 'Password', autoComplete, value, onChange }) {
  const [visible, setVisible] = useState(false)
  return <div className="field password-field"><input id={id} type={visible ? 'text' : 'password'} placeholder={placeholder} autoComplete={autoComplete} value={value} onChange={onChange} minLength="8" required />
    <button type="button" className="eye-button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /><path className={visible ? 'hidden' : ''} d="m4 4 16 16" /></svg>
    </button></div>
}
