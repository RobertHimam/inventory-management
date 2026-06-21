import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useProductList, useDeleteProduct } from '../hooks/useProducts'
import { useAuthStore } from '../store/authStore'
import { Role } from '@inventory/shared-types'

const LIMIT = 10

export function ProductsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === Role.ADMIN

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  const { data, isLoading, isError } = useProductList({
    page,
    limit: LIMIT,
    search: debouncedSearch || undefined,
  })

  const { mutate: deleteProduct } = useDeleteProduct()

  const products = data?.data ?? []
  const pagination = data?.pagination

  function handleConfirmDelete() {
    if (deleteId) {
      deleteProduct(deleteId, {
        onSuccess: () => toast.success('Product deleted successfully'),
        onError: () => toast.error('Failed to delete product'),
      })
      setDeleteId(null)
    }
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        {isAdmin && (
          <button
            onClick={() => navigate('/products/new')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium"
          >
            Add Product
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="search"
          role="searchbox"
          placeholder="Search by name or SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Search products"
        />
      </div>

      {isLoading && <p className="text-gray-500">Loading...</p>}

      {isError && (
        <p role="alert" className="text-red-600">
          Failed to load products. Please try again.
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" aria-label="Products">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                {isAdmin && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product._id}>
                  <td className="px-4 py-3 text-sm text-gray-900">{product.sku}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{product.category}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">${product.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{product.stockQuantity}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-sm space-x-2">
                      <button
                        onClick={() => navigate(`/products/${product._id}/edit`)}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(product._id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.totalPages}
            className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {deleteId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
        >
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm w-full">
            <p className="text-gray-800 mb-4">Are you sure you want to delete this product?</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 border border-gray-300 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
