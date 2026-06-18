import * as client from '../../api/client'
import {
  listSuppliersApi,
  getSupplierApi,
  createSupplierApi,
  updateSupplierApi,
  deleteSupplierApi,
} from '../../api/supplierApi'

jest.mock('../../api/client')

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPut = jest.fn()
const mockDelete = jest.fn()

;(client as unknown as Record<string, unknown>).apiClient = {
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
}

const SUPPLIER = {
  _id: 'sup1',
  name: 'Acme Corp',
  contactEmail: 'contact@acme.com',
  phone: '555-1234',
  address: '123 Main St',
  deletedAt: null,
  deletedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('listSuppliersApi', () => {
  it('calls GET /suppliers and returns data', async () => {
    const response = { data: { success: true, data: [SUPPLIER], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } } }
    mockGet.mockResolvedValueOnce(response)

    const result = await listSuppliersApi({ page: 1 })

    expect(mockGet).toHaveBeenCalledWith('/suppliers', { params: { page: 1 } })
    expect(result.data).toHaveLength(1)
  })
})

describe('getSupplierApi', () => {
  it('calls GET /suppliers/:id and returns data', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: SUPPLIER } })

    const result = await getSupplierApi('sup1')

    expect(mockGet).toHaveBeenCalledWith('/suppliers/sup1')
    expect(result.data._id).toBe('sup1')
  })
})

describe('createSupplierApi', () => {
  it('calls POST /suppliers with Idempotency-Key header', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true, data: SUPPLIER } })

    const result = await createSupplierApi({ name: 'Acme Corp', contactEmail: 'contact@acme.com' })

    expect(mockPost).toHaveBeenCalledWith(
      '/suppliers',
      { name: 'Acme Corp', contactEmail: 'contact@acme.com' },
      expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }) })
    )
    expect(result.data.name).toBe('Acme Corp')
  })
})

describe('updateSupplierApi', () => {
  it('calls PUT /suppliers/:id', async () => {
    mockPut.mockResolvedValueOnce({ data: { success: true, data: { ...SUPPLIER, name: 'Updated' } } })

    const result = await updateSupplierApi('sup1', { name: 'Updated' })

    expect(mockPut).toHaveBeenCalledWith('/suppliers/sup1', { name: 'Updated' })
    expect(result.data.name).toBe('Updated')
  })
})

describe('deleteSupplierApi', () => {
  it('calls DELETE /suppliers/:id', async () => {
    mockDelete.mockResolvedValueOnce({})

    await deleteSupplierApi('sup1')

    expect(mockDelete).toHaveBeenCalledWith('/suppliers/sup1')
  })
})
