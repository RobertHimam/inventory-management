/** @jest-environment jsdom */

jest.mock('../../api/client', () => ({
  apiClient: {
    post: jest.fn(),
  },
  setTokenGetter: jest.fn(),
  setOnUnauthorized: jest.fn(),
}))

import { apiClient } from '../../api/client'
import { loginApi, refreshTokenApi, logoutApi } from '../../api/authApi'
import { Role } from '@inventory/shared-types'

const mockPost = apiClient.post as jest.Mock

describe('loginApi', () => {
  it('posts to /auth/login with credentials', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        user: { id: '1', email: 'a@b.com', username: 'a', role: Role.USER },
        accessToken: 'tok',
      },
    })
    const result = await loginApi({ email: 'a@b.com', password: 'pass' })
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', password: 'pass' })
    expect(result.accessToken).toBe('tok')
    expect(result.user.email).toBe('a@b.com')
  })

  it('propagates error on failed login', async () => {
    mockPost.mockRejectedValueOnce(new Error('Unauthorized'))
    await expect(loginApi({ email: 'x@x.com', password: 'bad' })).rejects.toThrow('Unauthorized')
  })
})

describe('refreshTokenApi', () => {
  it('posts to /auth/refresh', async () => {
    mockPost.mockResolvedValueOnce({ data: { accessToken: 'new-tok' } })
    const result = await refreshTokenApi()
    expect(mockPost).toHaveBeenCalledWith('/auth/refresh')
    expect(result.accessToken).toBe('new-tok')
  })
})

describe('logoutApi', () => {
  it('posts to /auth/logout', async () => {
    mockPost.mockResolvedValueOnce({ data: {} })
    await logoutApi()
    expect(mockPost).toHaveBeenCalledWith('/auth/logout')
  })
})
