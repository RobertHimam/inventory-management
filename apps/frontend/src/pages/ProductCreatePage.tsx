import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useCreateProduct } from '../hooks/useProducts'
import { useCategoryList } from '../hooks/useCategories'
import type { CreateProductDto } from '@inventory/shared-types'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/Combobox'
import { fieldClass } from '@/lib/fieldClass'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Max 100 characters'),
  description: z.string().max(500, 'Max 500 characters').optional(),
  price: z
    .number({ invalid_type_error: 'Price must be a number' })
    .min(0, 'Price cannot be negative'),
  cost: z
    .number({ invalid_type_error: 'Cost must be a number' })
    .min(0, 'Cost cannot be negative')
    .default(0),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  stockQuantity: z
    .number({ invalid_type_error: 'Must be a number' })
    .min(0, 'Cannot be negative')
    .default(0),
  reorderLevel: z
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
  const { data: categoriesData, isLoading: categoriesLoading } = useCategoryList({ limit: 100 })

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { stockQuantity: 0, cost: 0, reorderLevel: 0, isActive: true },
  })

  const categoryOptions = (categoriesData?.data ?? []).map((cat) => ({ value: cat.name, label: cat.name }))

  function onSubmit(values: FormValues) {
    const dto: CreateProductDto = {
      name: values.name,
      price: values.price,
      sku: values.sku,
      category: values.category,
      ...(values.description ? { description: values.description } : {}),
      cost: values.cost,
      stockQuantity: values.stockQuantity,
      reorderLevel: values.reorderLevel,
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
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <PageHeader title="Create Product" />

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

            <div className="sm:col-span-2">
              <Label htmlFor="description" className="mb-1.5 block">
                Description
              </Label>
              <textarea id="description" rows={3} {...register('description')} className={fieldClass} />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="price" className="mb-1.5 block">
                Price
              </Label>
              <Input id="price" type="number" step="0.01" {...register('price', { valueAsNumber: true })} />
              {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
            </div>

            <div>
              <Label htmlFor="cost" className="mb-1.5 block">
                Cost
              </Label>
              <Input id="cost" type="number" step="0.01" {...register('cost', { valueAsNumber: true })} />
              {errors.cost && <p className="mt-1 text-xs text-red-600">{errors.cost.message}</p>}
            </div>

            <div>
              <Label htmlFor="stockQuantity" className="mb-1.5 block">
                Stock Quantity
              </Label>
              <Input
                id="stockQuantity"
                type="number"
                {...register('stockQuantity', { valueAsNumber: true })}
              />
              {errors.stockQuantity && (
                <p className="mt-1 text-xs text-red-600">{errors.stockQuantity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="reorderLevel" className="mb-1.5 block">
                Reorder Level
              </Label>
              <Input
                id="reorderLevel"
                type="number"
                {...register('reorderLevel', { valueAsNumber: true })}
              />
              {errors.reorderLevel && (
                <p className="mt-1 text-xs text-red-600">{errors.reorderLevel.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="sku" className="mb-1.5 block">
                SKU
              </Label>
              <Input id="sku" type="text" {...register('sku')} />
              {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
            </div>

            <div>
              <Label htmlFor="category" className="mb-1.5 block">
                Category
              </Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Combobox
                    id="category"
                    aria-label="Category"
                    options={categoryOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select a category"
                    searchPlaceholder="Search categories..."
                    emptyText="No categories found."
                    disabled={categoriesLoading}
                  />
                )}
              />
              {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input id="isActive" type="checkbox" {...register('isActive')} className="h-4 w-4 rounded" />
              <Label htmlFor="isActive">Active</Label>
            </div>

            <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row">
              <SecondaryButton
                type="button"
                onClick={() => navigate('/products')}
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
