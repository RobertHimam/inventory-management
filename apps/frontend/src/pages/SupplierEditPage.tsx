import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useSupplier, useUpdateSupplier } from '../hooks/useSuppliers'
import type { UpdateSupplierDto } from '@inventory/shared-types'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fieldClass } from '@/lib/fieldClass'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(30, 'Max 30 characters').optional(),
  address: z.string().max(300, 'Max 300 characters').optional(),
})

type FormValues = z.infer<typeof schema>

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: string } } }).response
    return resp?.data?.error ?? 'Failed to update supplier'
  }
  return 'Failed to update supplier'
}

export function SupplierEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data } = useSupplier(id ?? '')
  const { mutate: updateSupplier, isPending, isError, error } = useUpdateSupplier()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (data?.data) {
      reset({
        name: data.data.name,
        contactEmail: data.data.contactEmail ?? '',
        phone: data.data.phone ?? '',
        address: data.data.address ?? '',
      })
    }
  }, [data, reset])

  function onSubmit(values: FormValues) {
    if (!id) return
    const dto: UpdateSupplierDto = {
      name: values.name,
      ...(values.contactEmail ? { contactEmail: values.contactEmail } : {}),
      ...(values.phone ? { phone: values.phone } : {}),
      ...(values.address ? { address: values.address } : {}),
    }
    updateSupplier({ id, dto }, {
      onSuccess: () => {
        toast.success('Supplier updated successfully')
        navigate('/suppliers')
      },
      onError: () => {
        toast.error('Failed to update supplier')
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <PageHeader title="Edit Supplier" />

      {isError && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {getErrorMessage(error)}
        </div>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name" className="mb-1.5 block">
                Name
              </Label>
              <Input id="name" type="text" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="contactEmail" className="mb-1.5 block">
                Contact Email
              </Label>
              <Input id="contactEmail" type="email" {...register('contactEmail')} />
              {errors.contactEmail && (
                <p className="mt-1 text-xs text-red-600">{errors.contactEmail.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="phone" className="mb-1.5 block">
                Phone
              </Label>
              <Input id="phone" type="text" {...register('phone')} />
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="address" className="mb-1.5 block">
                Address
              </Label>
              <textarea id="address" rows={3} {...register('address')} className={fieldClass} />
              {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row">
              <SecondaryButton
                type="button"
                onClick={() => navigate('/suppliers')}
                className="w-full sm:w-auto"
              >
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? 'Updating...' : 'Update'}
              </PrimaryButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
