import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { useCategory, useUpdateCategory } from '../hooks/useCategories'
import type { UpdateCategoryDto } from '@inventory/shared-types'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fieldClass } from '@/lib/fieldClass'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  description: z.string().max(500, 'Max 500 characters').optional(),
})

type FormValues = z.infer<typeof schema>

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: string } } }).response
    return resp?.data?.error ?? 'Failed to update category'
  }
  return 'Failed to update category'
}

export function CategoryEditPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { data } = useCategory(id ?? '')
  const { mutate: updateCategory, isPending, isError, error } = useUpdateCategory()

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
        description: data.data.description ?? '',
      })
    }
  }, [data, reset])

  function onSubmit(values: FormValues) {
    if (!id) return
    const dto: UpdateCategoryDto = {
      name: values.name,
      ...(values.description ? { description: values.description } : {}),
    }
    updateCategory({ id, dto }, {
      onSuccess: () => {
        toast.success('Category updated successfully')
        navigate('/categories')
      },
      onError: () => {
        toast.error('Failed to update category')
      },
    })
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <PageHeader title="Edit Category" />

      {isError && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {getErrorMessage(error)}
        </div>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="name" className="mb-1.5 block">
                Name
              </Label>
              <Input id="name" type="text" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div>
              <Label htmlFor="description" className="mb-1.5 block">
                Description
              </Label>
              <textarea id="description" rows={3} {...register('description')} className={fieldClass} />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <SecondaryButton
                type="button"
                onClick={() => navigate('/categories')}
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
