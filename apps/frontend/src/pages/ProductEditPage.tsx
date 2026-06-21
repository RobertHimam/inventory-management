import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useProduct, useUpdateProduct } from '../hooks/useProducts'
import { useCategoryList } from '../hooks/useCategories'
import type { UpdateProductDto } from '@inventory/shared-types'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

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
    .min(0, 'Cannot be negative'),
  isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: string } } }).response
    return resp?.data?.error ?? 'Failed to update product'
  }
  return 'Failed to update product'
}

export function ProductEditPage() {
  const navigate = useNavigate()
  const { id = '' } = useParams<{ id: string }>()

  const { data: productData, isLoading, isError } = useProduct(id)
  const { mutate: updateProduct, isPending, isError: isUpdateError, error: updateError } = useUpdateProduct()
  const { data: categoriesData, isLoading: categoriesLoading } = useCategoryList({ limit: 100 })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (productData?.data) {
      const p = productData.data
      reset({
        name: p.name,
        description: p.description ?? '',
        price: p.price,
        sku: p.sku,
        category: p.category,
        stockQuantity: p.stockQuantity,
        isActive: p.isActive,
      })
    }
  }, [productData, reset])

  function onSubmit(values: FormValues) {
    const dto: UpdateProductDto = {
      name: values.name,
      price: values.price,
      sku: values.sku,
      category: values.category,
      description: values.description,
      stockQuantity: values.stockQuantity,
      isActive: values.isActive,
    }
    updateProduct({ id, dto }, {
      onSuccess: () => {
        toast.success('Product updated successfully')
        navigate('/products')
      },
      onError: () => {
        toast.error('Failed to update product')
      },
    })
  }

  if (isLoading) return <p className="p-4 sm:p-6 text-gray-500">Loading...</p>

  if (isError) {
    return (
      <p role="alert" className="p-4 sm:p-6 text-red-600">
        Failed to load product.
      </p>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Product</h1>

      {isUpdateError && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {getErrorMessage(updateError)}
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
          <select
            id="category"
            {...register('category')}
            disabled={categoriesLoading}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-100"
          >
            <option value="">Select a category</option>
            {categoriesData?.data.map((cat) => (
              <option key={cat._id} value={cat.name}>
                {cat.name}
              </option>
            ))}
          </select>
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
          <PrimaryButton type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save'}
          </PrimaryButton>
          <SecondaryButton type="button" onClick={() => navigate('/products')}>
            Cancel
          </SecondaryButton>
        </div>
      </form>
    </div>
  )
}
