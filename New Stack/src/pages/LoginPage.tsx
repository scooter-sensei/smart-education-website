import { useMutation } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { homeFor, useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { ApiError, LoginResult } from '@/lib/types'

const REMEMBER_KEY = 'set-remember-email'
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function LoginPage() {
  const { isAuthed, role, login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState<string>(() => {
    try {
      return localStorage.getItem(REMEMBER_KEY) || ''
    } catch {
      return ''
    }
  })
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(REMEMBER_KEY)
    } catch {
      return false
    }
  })
  const [show, setShow] = useState(false)
  const [help, setHelp] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState('')

  const mutation = useMutation<LoginResult, ApiError, { email: string; password: string }>({
    mutationFn: (body) => api.auth.login(body),
    onSuccess: (result) => {
      login(result)
      navigate(homeFor(result.role), { replace: true })
    },
    onError: (err) => {
      setFormError(err?.message || 'We couldn’t sign you in. Check your email and password.')
    },
  })

  if (isAuthed) return <Navigate to={homeFor(role)} replace />

  function validate(): boolean {
    const e: typeof errors = {}
    const em = email.trim()
    if (!em) e.email = 'Enter your email.'
    else if (!EMAIL_RE.test(em)) e.email = 'That doesn’t look like an email address.'
    if (!password) e.password = 'Enter your password.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function onSubmit(ev: FormEvent) {
    ev.preventDefault()
    setFormError('')
    if (!validate()) return
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, email.trim())
      else localStorage.removeItem(REMEMBER_KEY)
    } catch {
      /* ignore */
    }
    mutation.mutate({ email: email.trim(), password })
  }

  const inputCls =
    'w-full min-h-[52px] px-4 rounded-[14px] bg-fill border-[1.5px] border-transparent text-[16.5px] ' +
    'text-label placeholder:text-tertiary transition-colors duration-150 focus:outline-none focus:bg-fill-2 focus:border-lime'

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.02fr_1fr] bg-bg">
      {/* Brand / visual panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-ink text-white p-12">
        <div
          aria-hidden
          className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-3xl opacity-25"
          style={{ background: 'radial-gradient(circle at 30% 30%, var(--lime), transparent 60%)' }}
        />
        <div className="relative z-10 flex items-center gap-2 text-[19px] font-bold tracking-[-0.02em] font-display">
          SmartEdu<span className="text-lime">Track</span>
        </div>

        <div className="relative z-10">
          <p className="text-[11px] font-semibold tracking-[0.22em] uppercase text-lime/90 mb-5">
            Smart Education · Asansol
          </p>
          <h1 className="font-display font-semibold text-[clamp(2rem,3.2vw,3rem)] leading-[1.05] tracking-[-0.02em] text-balance max-w-[16ch]">
            The staff console that keeps the centre in view.
          </h1>
          <p className="text-white/70 text-[15px] mt-5 max-w-[42ch] leading-relaxed">
            Enrolments, fees, attendance and payouts — one place for the Super Admin and every teacher.
          </p>
          <ul className="mt-7 flex flex-col gap-2.5">
            {['Approve sign-ups and enrolments', 'Record payments and reconcile dues', 'Track commission and teacher payouts'].map(
              (t) => (
                <li key={t} className="flex items-center gap-3 text-[14px] text-white/85">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime flex-none" />
                  {t}
                </li>
              ),
            )}
          </ul>
        </div>

        <p className="relative z-10 text-[11px] tracking-[0.14em] uppercase text-white/45">Staff console · v1.0</p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
        {/* compact brand for mobile */}
        <div className="lg:hidden mb-8 flex items-center gap-2 text-[18px] font-bold tracking-[-0.02em] font-display">
          SmartEdu<span className="text-lime-2">Track</span>
        </div>

        <div className="w-full max-w-[400px] mx-auto lg:mx-0">
          <h2 className="font-display font-semibold text-[clamp(1.9rem,4vw,2.4rem)] leading-[1.1] tracking-[-0.02em]">
            Sign in
          </h2>
          <p className="text-secondary text-[15px] mt-2">The SmartEduTrack console for teachers and the Super Admin.</p>

          <form onSubmit={onSubmit} noValidate className="mt-7 flex flex-col gap-4">
            <AnimatePresence>
              {formError && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="flex items-start gap-2.5 rounded-xl bg-tint-red px-3.5 py-3 text-[14px] font-medium text-red"
                >
                  <Icon name="info" size={17} className="flex-none mt-0.5" />
                  <span>{formError}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[13px] font-semibold text-secondary">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="you@smartedutrack.in"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (errors.email) setErrors((s) => ({ ...s, email: undefined }))
                }}
                className={cn(inputCls, errors.email && 'border-red bg-tint-red')}
                aria-invalid={!!errors.email}
              />
              {errors.email && <span className="text-[13px] text-red font-medium">{errors.email}</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[13px] font-semibold text-secondary">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((s) => ({ ...s, password: undefined }))
                  }}
                  className={cn(inputCls, 'pr-[52px]', errors.password && 'border-red bg-tint-red')}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-pressed={show}
                  aria-label={show ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-[38px] h-[38px] rounded-full grid place-items-center text-secondary hover:bg-fill transition active:scale-95"
                >
                  <Icon name={show ? 'x' : 'search'} size={18} />
                </button>
              </div>
              {errors.password && <span className="text-[13px] text-red font-medium">{errors.password}</span>}
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-[14px] font-medium text-secondary">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="peer sr-only"
                />
                <span className="relative w-11 h-[26px] rounded-full bg-fill-2 peer-checked:bg-green transition-colors duration-200 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-200 peer-checked:after:translate-x-[18px] peer-focus-visible:outline-2 peer-focus-visible:outline-blue" />
                Remember my email
              </label>
              <button
                type="button"
                onClick={() => setHelp((v) => !v)}
                aria-expanded={help}
                className="text-[14px] font-semibold text-blue underline underline-offset-[3px] decoration-1 cursor-pointer"
              >
                Trouble signing in?
              </button>
            </div>

            <AnimatePresence initial={false}>
              {help && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <div className="rounded-[14px] bg-fill p-3.5 flex flex-col gap-3">
                    <p className="text-[13.5px] text-secondary leading-relaxed">
                      Staff accounts are created and reset by your Super Admin. If you can’t get in, contact the office
                      and we’ll sort it the same day.
                    </p>
                    <a
                      href="tel:+919382938916"
                      className="inline-flex items-center gap-2 self-start rounded-full bg-green text-white px-4 py-2 text-[14px] font-semibold hover:brightness-110 transition"
                    >
                      <Icon name="phone" size={15} />
                      Call the office
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              variant="lime"
              block
              disabled={mutation.isPending}
              className="mt-1 min-h-[54px] justify-between px-6 text-[16.5px]"
            >
              <span>{mutation.isPending ? 'Signing you in…' : 'Sign in'}</span>
              <span className="w-9 h-9 rounded-full bg-lime-ink/12 grid place-items-center">
                {mutation.isPending ? (
                  <span className="w-[18px] h-[18px] rounded-full border-2 border-lime-ink/30 border-t-lime-ink animate-spin" />
                ) : (
                  <Icon name="arrowRight" size={16} />
                )}
              </span>
            </Button>

            <div className="flex items-start gap-2.5 rounded-[14px] bg-fill p-3.5 text-[13.5px] text-secondary leading-relaxed">
              <Icon name="info" size={16} className="flex-none mt-0.5 text-blue" />
              <p>
                Only <strong className="text-label font-semibold">staff</strong> sign in here — the Super Admin and
                teachers. Students don’t have accounts in this version; their records are kept for them.
              </p>
            </div>
            <p className="text-[12px] text-secondary text-center leading-relaxed">
              Demo build — any email signs you in. Include <b className="text-label">“admin”</b> in the address to see
              the Super Admin console.
            </p>
          </form>
        </div>
      </main>
    </div>
  )
}
