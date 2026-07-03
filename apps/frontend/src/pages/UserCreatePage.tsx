import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCreateManagedUser } from '../hooks/useUserManagement'
import { Role } from '@inventory/shared-types'
import type { CreateUserDto } from '@inventory/shared-types'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fieldClass } from '@/lib/fieldClass'

const schema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Max 50 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(Role),
})

type FormValues = z.infer<typeof schema>

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: string } } }).response
    return resp?.data?.error ?? 'Failed to create user'
  }
  return 'Failed to create user'
}

export function UserCreatePage() {
  const navigate = useNavigate()
  const { mutate: createUser, isPending, isError, error } = useCreateManagedUser()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: Role.USER },
  })

  function onSubmit(values: FormValues) {
    const dto: CreateUserDto = {
      username: values.username,
      email: values.email,
      password: values.password,
      role: values.role,
    }
    createUser(dto, {
      onSuccess: () => {
        toast.success('User created successfully')
        navigate('/users')
      },
      onError: () => {
        toast.error('Failed to create user')
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <PageHeader title="Create User" />

      {isError && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {getErrorMessage(error)}
        </div>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="username" className="mb-1.5 block">
                Username
              </Label>
              <Input id="username" type="text" {...register('username')} />
              {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="email" className="mb-1.5 block">
                Email
              </Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 block">
                Password
              </Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div>
              <Label htmlFor="role" className="mb-1.5 block">
                Role
              </Label>
              <select id="role" {...register('role')} className={`${fieldClass} min-h-[44px]`}>
                <option value={Role.USER}>USER</option>
                <option value={Role.ADMIN}>ADMIN</option>
              </select>
              {errors.role && <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row">
              <SecondaryButton
                type="button"
                onClick={() => navigate('/users')}
                className="w-full sm:w-auto"
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? 'Creating...' : 'Create'}
              </PrimaryButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
