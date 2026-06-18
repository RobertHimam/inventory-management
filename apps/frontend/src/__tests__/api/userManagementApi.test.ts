import * as client from '../../api/client'
import {
  listUsersApi,
  getUserApi,
  createManagedUserApi,
  deleteManagedUserApi,
} from '../../api/userManagementApi'
import { Role } from '@inventory/shared-types'

jest.mock('../../api/client')

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockDelete = jest.fn()

;(client as unknown as Record<string, unknown>).apiClient = {
  get: mockGet,
  post: mockPost,
  delete: mockDelete,
}

const USER = {
  id: 'user1',
  username: 'johndoe',
  email: 'john@example.com',
  role: Role.USER,
  deletedAt: null,
  deletedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('listUsersApi', () => {
  it('calls GET /users and returns data', async () => {
    const response = { data: { success: true, data: [USER], pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } } }
    mockGet.mockResolvedValueOnce(response)

    const result = await listUsersApi({ page: 1 })

    expect(mockGet).toHaveBeenCalledWith('/users', { params: { page: 1 } })
    expect(result.data).toHaveLength(1)
  })
})

describe('getUserApi', () => {
  it('calls GET /users/:id', async () => {
    mockGet.mockResolvedValueOnce({ data: { success: true, data: USER } })

    const result = await getUserApi('user1')

    expect(mockGet).toHaveBeenCalledWith('/users/user1')
    expect(result.data.id).toBe('user1')
  })
})

describe('createManagedUserApi', () => {
  it('calls POST /users with Idempotency-Key header', async () => {
    mockPost.mockResolvedValueOnce({ data: { success: true, data: USER } })

    const result = await createManagedUserApi({ username: 'johndoe', email: 'john@example.com', password: 'secret123', role: Role.USER })

    expect(mockPost).toHaveBeenCalledWith(
      '/users',
      { username: 'johndoe', email: 'john@example.com', password: 'secret123', role: Role.USER },
      expect.objectContaining({ headers: expect.objectContaining({ 'Idempotency-Key': expect.any(String) }) })
    )
    expect(result.data.username).toBe('johndoe')
  })
})

describe('deleteManagedUserApi', () => {
  it('calls DELETE /users/:id', async () => {
    mockDelete.mockResolvedValueOnce({})

    await deleteManagedUserApi('user1')

    expect(mockDelete).toHaveBeenCalledWith('/users/user1')
  })
})
