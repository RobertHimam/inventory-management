import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCreateCategory } from '../hooks/useCategories'
import type { CreateCategoryDto } from '@inventory/shared-types'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  description: z.string().max(500, 'Max 500 characters').optional(),
})

type FormValues = z.infer<typeof schema>

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: string } } }).response
    return resp?.data?.error ?? 'Failed to create category'
  }
  return 'Failed to create category'
}

export function CategoryCreatePage() {
  const navigate = useNavigate()
  const { mutate: createCategory, isPending, isError, error } = useCreateCategory()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  function onSubmit(values: FormValues) {
    const dto: CreateCategoryDto = {
      name: values.name,
      ...(values.description ? { description: values.description } : {}),
    }
    createCategory(dto, {
      onSuccess: () => {
        toast.success('Category created successfully')
        navigate('/categories')
      },
      onError: () => {
        toast.error('Failed to create category')
      },
    })
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Category</h1>

      {isError && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {getErrorMessage(error)}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="name"
            type="text"
            {...register('name')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/categories')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
