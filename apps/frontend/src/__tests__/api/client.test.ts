/** @jest-environment jsdom */

jest.mock('../../store/authStore', () => ({
  useAuthStore: {
    getState: jest.fn(),
  },
}))

import { apiClient, setTokenGetter, setOnUnauthorized } from '../../api/client'

describe('apiClient', () => {
  it('is an axios instance with withCredentials true', () => {
    expect(apiClient.defaults.withCredentials).toBe(true)
  })

  it('has a baseURL configured', () => {
    expect(apiClient.defaults.baseURL).toBeDefined()
    expect(typeof apiClient.defaults.baseURL).toBe('string')
  })
})

describe('setTokenGetter', () => {
  it('is a function', () => {
    expect(typeof setTokenGetter).toBe('function')
  })
})

describe('setOnUnauthorized', () => {
  it('is a function', () => {
    expect(typeof setOnUnauthorized).toBe('function')
  })
})

describe('response interceptor', () => {
  it('rejects a failed /auth/refresh instead of hanging, and fires onUnauthorized', async () => {
    // Adapter always 401s the refresh call. Without the guard this recurses
    // into the pending-request queue and never settles → blank page.
    apiClient.defaults.adapter = async (config) => {
      const err: any = new Error('401')
      err.config = config
      err.response = { status: 401, data: { error: 'No refresh token' } }
      throw err
    }
    const onUnauthorized = jest.fn()
    setOnUnauthorized(onUnauthorized)

    await expect(apiClient.post('/auth/refresh')).rejects.toBeDefined()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })
})
