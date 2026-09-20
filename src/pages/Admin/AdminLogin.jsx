import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import './AdminLogin.css'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')

    if (!email.trim() || !password) {
      setError('أدخل البريد الإلكتروني وكلمة المرور')
      return
    }

    setLoading(true)

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      if (loginError) {
        throw loginError
      }

      if (!data.user) {
        throw new Error('تعذر تسجيل الدخول')
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc('is_admin')

      if (adminError) {
        await supabase.auth.signOut()
        throw adminError
      }

      if (!isAdmin) {
        await supabase.auth.signOut()
        setError('هذا الحساب لا يملك صلاحية الإدارة')
        return
      }

      window.location.href = '/admin'
    } catch (err) {
      console.error(err)

      setError(
        'تعذر تسجيل الدخول. تحقق من البريد وكلمة المرور'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-page">
      <div className="admin-login-card">

        <div className="admin-login-logo">
          M
        </div>

        <span className="admin-login-kicker">
          MOKA ADMIN
        </span>

        <h1>
          لوحة الإدارة
        </h1>

        <p>
          سجّل الدخول للوصول إلى إدارة MOKA
        </p>

        <form onSubmit={handleSubmit}>

          <label>
            <span>البريد الإلكتروني</span>

            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
              }}
              placeholder="admin@example.com"
              autoComplete="username"
              disabled={loading}
            />
          </label>

          <label>
            <span>كلمة المرور</span>

            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
              }}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          {error && (
            <div className="admin-login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'جاري التحقق...'
              : 'تسجيل الدخول'}
          </button>

        </form>

        <a
          href="/"
          className="admin-back-home"
        >
          العودة إلى MOKA
        </a>

      </div>
    </main>
  )
}