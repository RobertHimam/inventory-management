import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCreateProduct } from '../hooks/useProducts'
import type { CreateProductDto } from '@inventory/shared-types'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  description: z.string().max(500, 'Max 500 characters').optional(),
  price: z
    .number({ invalid_type_error: 'Price must be a number' })
    .min(0, 'Price cannot be negative'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  stockQuantity: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Cannot be negative')
    .default(0),
  isActive: z.boolean().default(true),
})

type FormValues = z.infer<typeof schema>

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: string } } }).response
    return resp?.data?.error ?? 'Failed to create product'
  }
  return 'Failed to create product'
}

export function ProductCreatePage() {
  const navigate = useNavigate()
  const { mutate: createProduct, isPending, isError, error } = useCreateProduct()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { stockQuantity: 0, isActive: true },
  })

  function onSubmit(values: FormValues) {
    const dto: CreateProductDto = {
      name: values.name,
      price: values.price,
      sku: values.sku,
      category: values.category,
      ...(values.description ? { description: values.description } : {}),
      stockQuantity: values.stockQuantity,
      isActive: values.isActive,
    }
    createProduct(dto, {
      onSuccess: () => {
        toast.success('Product created successfully')
        navigate('/products')
      },
      onError: () => {
        toast.error('Failed to create product')
      },
    })
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create Product</h1>

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

        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
            Price
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
        </div>

        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
            SKU
          </label>
          <input
            id="sku"
            type="text"
            {...register('sku')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <input
            id="category"
            type="text"
            {...register('category')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
        </div>

        <div>
          <label htmlFor="stockQuantity" className="block text-sm font-medium text-gray-700 mb-1">
            Stock Quantity
          </label>
          <input
            id="stockQuantity"
            type="number"
            {...register('stockQuantity', { valueAsNumber: true })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.stockQuantity && <p className="mt-1 text-xs text-red-600">{errors.stockQuantity.message}</p>}
        </div>

        <div className="flex items-center gap-2">
          <input id="isActive" type="checkbox" {...register('isActive')} className="rounded" />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
            Active
          </label>
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
            onClick={() => navigate('/products')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
