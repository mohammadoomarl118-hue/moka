import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/useAuth'

import './Auth.css'

export default function Auth() {
  const navigate = useNavigate()

  const {
    user,
    loading: authLoading,
    signIn,
    signUp,
  } = useAuth()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] =
    useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (authLoading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p>جاري التحقق من الحساب...</p>
        </div>
      </main>
    )
  }

  if (user) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <span className="auth-kicker">
            MOKA ACCOUNT
          </span>

          <h1>أنت مسجل دخول بالفعل</h1>

          <p>
            الحساب الحالي:
            <br />
            <strong>{user.email}</strong>
          </p>

          <button
            type="button"
            className="auth-button"
            onClick={() => navigate('/')}
          >
            العودة للرئيسية
          </button>
        </div>
      </main>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const cleanEmail = email.trim()

    if (!cleanEmail || !password) {
      setError(
        'يرجى إدخال البريد الإلكتروني وكلمة المرور'
      )
      return
    }

    if (
      mode === 'register' &&
      password !== confirmPassword
    ) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }

    if (
      mode === 'register' &&
      password.length < 6
    ) {
      setError(
        'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      )
      return
    }

    try {
      setLoading(true)

      if (mode === 'login') {
        await signIn(
          cleanEmail,
          password
        )

        navigate('/')
        return
      }

      const data = await signUp(
        cleanEmail,
        password
      )

      if (data?.session) {
        navigate('/')
        return
      }

      setSuccess(
        'تم إنشاء الحساب، تحقق من بريدك الإلكتروني لتأكيد الحساب'
      )

      setMode('login')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error(
        'AUTH ERROR:',
        err
      )

      setError(
        err?.message ||
        'حدث خطأ أثناء تنفيذ العملية'
      )
    } finally {
      setLoading(false)
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <main className="auth-page">
      <div className="auth-background" />

      <div className="auth-card">
        <Link
          to="/"
          className="auth-logo"
        >
          <span className="auth-logo-mark">
            M
          </span>

          <span>
            <strong>MOKA</strong>
            <small>
              Coffee & More
            </small>
          </span>
        </Link>

        <div className="auth-header">
          <span className="auth-kicker">
            {mode === 'login'
              ? 'WELCOME BACK'
              : 'JOIN MOKA'}
          </span>

          <h1>
            {mode === 'login'
              ? 'أهلًا بعودتك'
              : 'أنشئ حسابك'}
          </h1>

          <p>
            {mode === 'login'
              ? 'سجّل دخولك لمتابعة طلباتك وتجربتك في MOKA'
              : 'أنشئ حسابًا واحفظ طلباتك القادمة بسهولة'}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={
              mode === 'login'
                ? 'active'
                : ''
            }
            onClick={() =>
              switchMode('login')
            }
          >
            تسجيل الدخول
          </button>

          <button
            type="button"
            className={
              mode === 'register'
                ? 'active'
                : ''
            }
            onClick={() =>
              switchMode('register')
            }
          >
            إنشاء حساب
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={handleSubmit}
        >
          <label>
            البريد الإلكتروني

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="name@example.com"
              autoComplete="email"
              dir="ltr"
              required
            />
          </label>

          <label>
            كلمة المرور

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="••••••••"
              autoComplete={
                mode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }
              dir="ltr"
              required
            />
          </label>

          {mode === 'register' && (
            <label>
              تأكيد كلمة المرور

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="••••••••"
                autoComplete="new-password"
                dir="ltr"
                required
              />
            </label>
          )}

          {error && (
            <div className="auth-message auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-message auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading
              ? 'جاري التنفيذ...'
              : mode === 'login'
                ? 'تسجيل الدخول'
                : 'إنشاء الحساب'}
          </button>
        </form>

        <Link
          to="/"
          className="auth-back"
        >
          ← العودة إلى MOKA
        </Link>
      </div>
    </main>
  )
}