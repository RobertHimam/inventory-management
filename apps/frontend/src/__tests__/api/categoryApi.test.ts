import * as client from '../../api/client'
import {
  listCategoriesApi,
  getCategoryApi,
  createCategoryApi,
  updateCategoryApi,
  deleteCategoryApi,
} from '../../api/categoryApi'

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

const CATEGORY = {
  _id: 'cat1',
  name: 'Electronics',
  description: 'Electronic items',
  deletedAt: null,
  deletedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('listCategoriesApi', () => {
  it('calls GET /categories and returns data', async () => {
    const response = { data: { success: true, data: [CATEGORY], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } } }
    mockGet.mockResolvedValueOnce(response)

    const result = await listCategoriesApi({ page: 1 })

    expect(mockGet).toHaveBeenCalledWith('/categories', { params: { page: 1 } })
    expect(result.data).toHaveLength(1)
  })
})

describe('getCategoryApi', () => {
  it('calls GET /categories/:id and returns data', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: CATEGORY } })

    const result = await getCategoryApi('cat1')

    expect(mockGet).toHaveBeenCalledWith('/categories/cat1')
    expect(result.data._id).toBe('cat1')
  })
})

describe('createCategoryApi', () => {
  it('calls POST /categories with Idempotency-Key header', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true, data: CATEGORY } })

    const result = await createCategoryApi({ name: 'Electronics', description: 'Electronic items' })

    expect(mockPost).toHaveBeenCalledWith(
      '/categories',
      { name: 'Electronics', description: 'Electronic items' },
      expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }) })
    )
    expect(result.data.name).toBe('Electronics')
  })
})

describe('updateCategoryApi', () => {
  it('calls PUT /categories/:id', async () => {
    mockPut.mockResolvedValueOnce({ data: { success: true, data: { ...CATEGORY, name: 'Updated' } } })

    const result = await updateCategoryApi('cat1', { name: 'Updated' })

    expect(mockPut).toHaveBeenCalledWith('/categories/cat1', { name: 'Updated' })
    expect(result.data.name).toBe('Updated')
  })
})

describe('deleteCategoryApi', () => {
  it('calls DELETE /categories/:id', async () => {
    mockDelete.mockResolvedValueOnce({})

    await deleteCategoryApi('cat1')

    expect(mockDelete).toHaveBeenCalledWith('/categories/cat1')
  })
})
