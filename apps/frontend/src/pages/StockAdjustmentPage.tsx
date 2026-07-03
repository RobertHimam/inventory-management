import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useStockAdjust } from '../hooks/useInventory'
import { useProductList } from '../hooks/useProducts'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/Combobox'
import { fieldClass } from '@/lib/fieldClass'

const schema = z.object({
  productId: z.string().min(1, 'Product ID is required').trim(),
  quantity: z.number({ invalid_type_error: 'Quantity must be a number' }).int('Quantity must be an integer'),
  reason: z.string().min(1, 'Reason is required').trim(),
})

type FormValues = z.infer<typeof schema>

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { error?: string } } }).response
    return resp?.data?.error ?? 'Failed to adjust stock'
  }
  return 'Failed to adjust stock'
}

export function StockAdjustmentPage() {
  const navigate = useNavigate()
  const { mutate: stockAdjust, isPending, isError, error } = useStockAdjust()
  const { data: productsData, isLoading: productsLoading } = useProductList({ limit: 1000 })

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { productId: '', quantity: 0 },
  })

  const productOptions = (productsData?.data ?? []).map((p) => ({ value: p._id, label: `${p.name} (${p.sku})` }))

  function onSubmit(values: FormValues) {
    stockAdjust(
      { productId: values.productId, quantity: values.quantity, reason: values.reason },
      {
        onSuccess: () => {
          toast.success('Stock adjusted successfully')
          navigate('/inventory')
        },
        onError: () => {
          toast.error('Failed to adjust stock')
        },
      }
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
      <PageHeader title="Stock Adjustment" />

      {isError && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {getErrorMessage(error)}
        </div>
      )}

      <Card>
        <CardContent className="p-4 sm:p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="productId" className="mb-1.5 block">
                Product
              </Label>
              <Controller
                name="productId"
                control={control}
                render={({ field }) => (
                  <Combobox
                    id="productId"
                    aria-label="Product"
                    options={productOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a product"
                    searchPlaceholder="Search products..."
                    emptyText="No products found."
                    disabled={productsLoading}
                  />
                )}
              />
              {errors.productId && <p className="mt-1 text-xs text-red-600">{errors.productId.message}</p>}
            </div>

            <div>
              <Label htmlFor="quantity" className="mb-1.5 block">
                Quantity (positive to add, negative to remove)
              </Label>
              <Input id="quantity" type="number" {...register('quantity', { valueAsNumber: true })} />
              {errors.quantity && <p className="mt-1 text-xs text-red-600">{errors.quantity.message}</p>}
            </div>

            <div>
              <Label htmlFor="reason" className="mb-1.5 block">
                Reason
              </Label>
              <textarea id="reason" rows={3} {...register('reason')} className={fieldClass} />
              {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
              <SecondaryButton type="button" onClick={() => navigate('/inventory')} className="w-full sm:w-auto">
                Cancel
              </SecondaryButton>
              <PrimaryButton type="submit" disabled={isPending} className="w-full sm:w-auto">
                {isPending ? 'Submitting...' : 'Submit'}
              </PrimaryButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
