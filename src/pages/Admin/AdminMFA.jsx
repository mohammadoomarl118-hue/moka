import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminMFA.css'

export default function AdminMFA() {
  const navigate = useNavigate()
  const location = useLocation()

  const [step, setStep] = useState('start')

  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')

  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')

  const [code, setCode] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  /* =========================================================
     START MFA
  ========================================================= */

  async function startEnrollment() {
    setLoading(true)
    setError('')

    try {
      /* =========================================
         CHECK SESSION
      ========================================= */

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        navigate('/admin/login', {
          replace: true,
        })

        return
      }

      /* =========================================
         CHECK EXISTING MFA FACTOR
      ========================================= */

      const {
        data: factorsData,
        error: factorsError,
      } =
        await supabase.auth.mfa.listFactors()

      if (factorsError) {
        throw factorsError
      }

      const verifiedFactor =
        factorsData?.totp?.find(
          (factor) =>
            factor.status === 'verified'
        )

      /* =========================================
         EXISTING MFA
      ========================================= */

      if (verifiedFactor) {
        setFactorId(
          verifiedFactor.id
        )

        const {
          data: challengeData,
          error: challengeError,
        } =
          await supabase.auth.mfa.challenge({
            factorId:
              verifiedFactor.id,
          })

        if (challengeError) {
          throw challengeError
        }

        setChallengeId(
          challengeData.id
        )

        setCode('')

        setStep('verify')

        return
      }

      /* =========================================
         FIRST TIME MFA SETUP
      ========================================= */

      const {
        data,
        error: enrollError,
      } =
        await supabase.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'MOKA Admin',
        })

      if (enrollError) {
        throw enrollError
      }

      setFactorId(data.id)

      setQrCode(
        data.totp.qr_code
      )

      setSecret(
        data.totp.secret
      )

      /* =========================================
         CREATE CHALLENGE
      ========================================= */

      const {
        data: challengeData,
        error: challengeError,
      } =
        await supabase.auth.mfa.challenge({
          factorId: data.id,
        })

      if (challengeError) {
        throw challengeError
      }

      setChallengeId(
        challengeData.id
      )

      setCode('')

      setStep('setup')

    } catch (err) {
      console.error(
        'MFA start error:',
        err
      )

      setError(
        err.message ||
        'تعذر بدء إعداد المصادقة الثنائية'
      )
    } finally {
      setLoading(false)
    }
  }


  /* =========================================================
     VERIFY MFA CODE
  ========================================================= */

  async function verifyCode(event) {
    event.preventDefault()

    const cleanCode =
      code.replace(/\D/g, '')

    if (cleanCode.length !== 6) {
      setError(
        'أدخل رمز التحقق المكون من 6 أرقام'
      )

      return
    }

    if (!factorId || !challengeId) {
      setError(
        'انتهت جلسة التحقق، ابدأ التحقق من جديد'
      )

      setStep('start')

      return
    }

    setLoading(true)
    setError('')

    try {
      /* =========================================
         VERIFY
      ========================================= */

      const {
        error: verifyError,
      } =
        await supabase.auth.mfa.verify({
          factorId,
          challengeId,
          code: cleanCode,
        })

      if (verifyError) {
        throw verifyError
      }

      /* =========================================
         CHECK AAL2
      ========================================= */

      const {
        data: assurance,
        error: assuranceError,
      } =
        await supabase.auth.mfa
          .getAuthenticatorAssuranceLevel()

      if (assuranceError) {
        throw assuranceError
      }

      if (
        assurance.currentLevel !==
        'aal2'
      ) {
        throw new Error(
          'لم يتم رفع مستوى المصادقة إلى AAL2'
        )
      }

      /* =========================================
         MFA SUCCESS
      ========================================= */

      const from =
        location.state?.from ||
        '/admin'

      navigate(from, {
        replace: true,
        state: {
          mfaVerified: true,
        },
      })

    } catch (err) {
      console.error(
        'MFA verification error:',
        err
      )

      setError(
        err.message ||
        'رمز التحقق غير صحيح'
      )
    } finally {
      setLoading(false)
    }
  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main className="admin-mfa-page">

      <section className="admin-mfa-card">

        <div className="admin-mfa-kicker">
          MOKA SECURITY
        </div>


        <h1>
          المصادقة الثنائية
        </h1>


        {/* =================================================
            START
        ================================================= */}

        {step === 'start' && (
          <>

            <p>
              لحماية لوحة الإدارة، يجب تأكيد هويتك باستخدام
              تطبيق مصادقة يدعم رموز TOTP
            </p>


            <button
              type="button"
              className="admin-mfa-button"
              onClick={
                startEnrollment
              }
              disabled={loading}
            >
              {loading
                ? 'جاري التجهيز...'
                : 'ابدأ التحقق'}
            </button>

          </>
        )}


        {/* =================================================
            FIRST TIME SETUP
        ================================================= */}

        {step === 'setup' && (
          <>

            <p>
              امسح رمز QR باستخدام تطبيق المصادقة
              ثم أدخل الرمز المكون من 6 أرقام
            </p>


            {qrCode && (
              <div className="admin-mfa-qr">

                <img
                  src={qrCode}
                  alt="رمز إعداد المصادقة الثنائية"
                />

              </div>
            )}


            {secret && (
              <div className="admin-mfa-secret">

                <span>
                  المفتاح اليدوي
                </span>

                <code>
                  {secret}
                </code>

              </div>
            )}


            <form
              onSubmit={verifyCode}
            >

              <input
                className="admin-mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
                placeholder="000000"
                disabled={loading}
              />


              <button
                type="submit"
                className="admin-mfa-button"
                disabled={
                  loading ||
                  code.length !== 6
                }
              >
                {loading
                  ? 'جاري التحقق...'
                  : 'تأكيد وحماية الحساب'}
              </button>

            </form>

          </>
        )}


        {/* =================================================
            EXISTING MFA
        ================================================= */}

        {step === 'verify' && (
          <>

            <p>
              أدخل رمز المصادقة من تطبيقك للمتابعة إلى لوحة الإدارة
            </p>


            <form
              onSubmit={verifyCode}
            >

              <input
                className="admin-mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) =>
                  setCode(
                    event.target.value.replace(
                      /\D/g,
                      ''
                    )
                  )
                }
                placeholder="000000"
                disabled={loading}
              />


              <button
                type="submit"
                className="admin-mfa-button"
                disabled={
                  loading ||
                  code.length !== 6
                }
              >
                {loading
                  ? 'جاري التحقق...'
                  : 'تأكيد الدخول'}
              </button>

            </form>

          </>
        )}


        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="admin-mfa-error">
            {error}
          </div>
        )}

      </section>

    </main>
  )
}