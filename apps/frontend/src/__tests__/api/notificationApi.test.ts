import { getNotificationsApi, markAsReadApi } from '../../api/notificationApi'
import { apiClient } from '../../api/client'

jest.mock('../../api/client', () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}))

const mockGet = apiClient.get as jest.Mock
const mockPatch = apiClient.patch as jest.Mock

const mockNotification = {
  _id: 'n1',
  userId: 'u1',
  type: 'LOW_STOCK',
  recipient: 'user@example.com',
  subject: 'Low stock alert',
  body: 'Product X is low.',
  status: 'SENT',
  read: false,
  attempts: 1,
  createdAt: '2026-06-18T00:00:00.000Z',
}

describe('notificationApi', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getNotificationsApi', () => {
    it('calls GET /notifications/api/v1/notifications and returns data', async () => {
      const response = { success: true, data: [mockNotification] }
      mockGet.mockResolvedValueOnce({ data: response })

      const result = await getNotificationsApi()

      expect(mockGet).toHaveBeenCalledWith('/notifications/api/v1/notifications')
      expect(result).toEqual(response)
    })

    it('propagates error on failure', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'))
      await expect(getNotificationsApi()).rejects.toThrow('Network error')
    })
  })

  describe('markAsReadApi', () => {
    it('calls PATCH /notifications/api/v1/notifications/:id/read', async () => {
      const response = { success: true, data: { ...mockNotification, read: true } }
      mockPatch.mockResolvedValueOnce({ data: response })

      const result = await markAsReadApi('n1')

      expect(mockPatch).toHaveBeenCalledWith('/notifications/api/v1/notifications/n1/read')
      expect(result).toEqual(response)
    })

    it('propagates error on failure', async () => {
      mockPatch.mockRejectedValueOnce(new Error('Not found'))
      await expect(markAsReadApi('bad-id')).rejects.toThrow('Not found')
    })
  })
})
