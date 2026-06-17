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
