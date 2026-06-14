import RefreshTokenModel from '../../../models/refreshToken.model';
jest.mock('../../../models/refreshToken.model');

import { RefreshTokenRepository } from '../../../repositories/refreshToken.repository';

type MockRefreshTokenModel = jest.Mocked<typeof RefreshTokenModel>;

describe('RefreshTokenRepository', () => {
  let repo: RefreshTokenRepository;
  let mockModel: MockRefreshTokenModel;

  beforeEach(() => {
    mockModel = RefreshTokenModel as MockRefreshTokenModel;
    mockModel.create = jest.fn();
    mockModel.findOne = jest.fn();
    mockModel.deleteOne = jest.fn();

    repo = new RefreshTokenRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('save', () => {
    it('should save refresh token', async () => {
      const token = { userId: 'u1', jti: 'j1', expiresAt: new Date() };
      await repo.save(token);
      expect(mockModel.create).toHaveBeenCalledWith(token);
    });
  });

  describe('findByJti', () => {
    it('should return token by jti', async () => {
      const token = { userId: 'u1', jti: 'j1', expiresAt: new Date() };
      (mockModel.findOne as any).mockResolvedValue(token);
      const result = await repo.findByJti('j1');
      expect(mockModel.findOne).toHaveBeenCalledWith({ jti: 'j1' });
      expect(result).toEqual(token);
    });

    it('should return null if not found', async () => {
      (mockModel.findOne as any).mockResolvedValue(null);
      const result = await repo.findByJti('missing');
      expect(result).toBeNull();
    });
  });

  describe('deleteByJti', () => {
    it('should delete token by jti', async () => {
      (mockModel.deleteOne as any).mockResolvedValue({ deletedCount: 1 });
      await repo.deleteByJti('j1');
      expect(mockModel.deleteOne).toHaveBeenCalledWith({ jti: 'j1' });
    });
  });
});
