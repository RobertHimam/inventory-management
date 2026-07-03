import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Layers, Package, BarChart2, Bell } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { loginApi } from '../api/authApi'
import axios from 'axios'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

const FEATURES = [
  { icon: Package, text: 'Track products and stock in real time' },
  { icon: BarChart2, text: 'Sales and valuation reporting' },
  { icon: Bell, text: 'Low-stock alerts as they happen' },
]

function BrandMark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600">
        <Layers className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <span className="text-lg font-semibold tracking-wide">InvMS</span>
    </div>
  )
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(values: LoginForm) {
    setServerError(null)
    try {
      const { user, accessToken } = await loginApi(values)
      setAuth(user, accessToken)
      navigate('/dashboard')
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setServerError(err.response?.data?.error ?? 'Login failed. Please try again.')
      } else {
        setServerError('Login failed. Please try again.')
      }
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — desktop only */}
      <div className="relative hidden flex-col justify-between bg-primary-900 p-12 text-white lg:flex">
        <BrandMark />
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Inventory management,
            <br />
            without the guesswork.
          </h2>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <li key={f.text} className="flex items-center gap-3 text-slate-300">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {f.text}
                </li>
              )
            })}
          </ul>
        </div>
        <p className="text-sm text-slate-400">© {new Date().getFullYear()} InvMS · Inventory Management</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <BrandMark className="mb-8 justify-center text-slate-900 lg:hidden" />

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-2xl font-bold text-slate-900">Sign in to your account</h1>
            <p className="mt-1 text-sm text-slate-500">Enter your credentials to continue.</p>

            {serverError && (
              <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email" className="mb-1.5 block">
                  Email
                </Label>
                <Input id="email" type="email" autoComplete="email" {...register('email')} />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <Label htmlFor="password" className="mb-1.5 block">
                  Password
                </Label>
                <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              </div>

              <PrimaryButton type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </PrimaryButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
