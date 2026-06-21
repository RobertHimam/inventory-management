import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useStockIn } from '../hooks/useInventory'

const schema = z.object({
  productId: z.string().min(1, 'Product ID is required').trim(),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than zero'),
})

type FormValues = z.infer<typeof schema>

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: string } } }).response
    return resp?.data?.error ?? 'Failed to record stock in'
  }
  return 'Failed to record stock in'
}

export function StockInPage() {
  const navigate = useNavigate()
  const { mutate: stockIn, isPending, isError, error } = useStockIn()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  function onSubmit(values: FormValues) {
    stockIn({ productId: values.productId, quantity: values.quantity }, {
      onSuccess: () => {
        toast.success('Stock in recorded successfully')
        navigate('/inventory')
      },
      onError: () => {
        toast.error('Failed to record stock in')
      },
    })
  }

  return (
    <div className="p-4 sm:p-6 max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Stock In</h1>

      {isError && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {getErrorMessage(error)}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="productId" className="block text-sm font-medium text-gray-700 mb-1">
            Product ID
          </label>
          <input
            id="productId"
            type="text"
            {...register('productId')}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.productId && <p className="mt-1 text-xs text-red-600">{errors.productId.message}</p>}
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            id="quantity"
            type="number"
            {...register('quantity', { valueAsNumber: true })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {isPending ? 'Submitting...' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
