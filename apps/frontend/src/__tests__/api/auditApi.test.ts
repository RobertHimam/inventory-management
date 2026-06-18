import { listAuditLogsApi } from '../../api/auditApi'
import { apiClient } from '../../api/client'

jest.mock('../../api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}))

const mockGet = apiClient.get as jest.Mock

const mockAuditLog = {
  id: 'a1',
  correlationId: 'corr-1',
  userId: 'u1',
  username: 'admin',
  role: 'ADMIN',
  action: 'CREATE',
  resourceType: 'product',
  resourceId: 'p1',
  createdAt: '2026-06-18T00:00:00.000Z',
}

const mockResponse = {
  success: true,
  data: [mockAuditLog],
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
}

describe('auditApi', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls GET /audit/api/v1/audit without params', async () => {
    mockGet.mockResolvedValueOnce({ data: mockResponse })

    const result = await listAuditLogsApi()

    expect(mockGet).toHaveBeenCalledWith('/audit/api/v1/audit', { params: undefined })
    expect(result).toEqual(mockResponse)
  })

  it('calls GET /audit/api/v1/audit with query params', async () => {
    mockGet.mockResolvedValueOnce({ data: mockResponse })

    const params = { page: 2, limit: 10, search: 'product', action: 'CREATE' }
    await listAuditLogsApi(params)

    expect(mockGet).toHaveBeenCalledWith('/audit/api/v1/audit', { params })
  })

  it('propagates error on failure', async () => {
    mockGet.mockRejectedValueOnce(new Error('Unauthorized'))
    await expect(listAuditLogsApi()).rejects.toThrow('Unauthorized')
  })
})
