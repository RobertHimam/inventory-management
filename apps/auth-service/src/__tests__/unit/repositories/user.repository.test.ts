import UserModel from '../../../models/user.model';
jest.mock('../../../models/user.model');

import { UserRepository } from '../../../repositories/user.repository';
import { Role } from '@inventory/shared-types';
import { NotFoundError } from '../../../errors';

type MockUserModel = jest.Mocked<typeof UserModel>;

describe('UserRepository', () => {
  let userRepo: UserRepository;
  let mockUser: MockUserModel;

  beforeEach(() => {
    mockUser = UserModel as MockUserModel;
    mockUser.findOne = jest.fn();
    mockUser.findById = jest.fn();
    mockUser.findByIdAndUpdate = jest.fn();
    mockUser.create = jest.fn();

    userRepo = new UserRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const userDoc = {
        _id: '123',
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };
      (mockUser.findOne as any).mockReturnValue({
        exec: jest.fn().mockResolvedValue(userDoc),
      });

      const result = await userRepo.findByEmail('test@example.com');

      expect(mockUser.findOne).toHaveBeenCalledWith({ email: 'test@example.com', deletedAt: null }, null);
      expect(result).toEqual(
        expect.objectContaining({
          id: '123',
          email: 'test@example.com',
          username: 'testuser',
          role: Role.USER,
        })
      );
    });

    it('should return null when not found', async () => {
      (mockUser.findOne as any).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      const result = await userRepo.findByEmail('missing@example.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const userDoc = {
        _id: '123',
        id: '123',
        email: 'test@example.com',
        username: 'testuser',
        role: Role.USER,
        deletedAt: null,
      };
      (mockUser.findById as any).mockReturnValue({
        exec: jest.fn().mockResolvedValue(userDoc),
      });

      const result = await userRepo.findById('123');

      expect(mockUser.findById).toHaveBeenCalledWith('123', null);
      expect(result).toEqual(
        expect.objectContaining({
          id: '123',
          email: 'test@example.com',
        })
      );
    });

    it('should return null when not found', async () => {
      (mockUser.findById as any).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      const result = await userRepo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'new@example.com',
        username: 'newuser',
        passwordHash: 'hash123',
        role: Role.USER,
      };
      const createdDoc = {
        _id: 'newId',
        id: 'newId',
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        deletedBy: null,
      };
      (mockUser.create as any).mockResolvedValue(createdDoc);

      const result = await userRepo.create(userData);

      expect(mockUser.create).toHaveBeenCalledWith(expect.objectContaining(userData));
      expect(result).toEqual(
        expect.objectContaining({
          id: 'newId',
          ...userData,
        })
      );
    });
  });

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      const userId = 'userId';
      const deletedBy = 'adminId';
      mockUser.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: userId }),
      });

      await userRepo.softDelete(userId, deletedBy);

      expect(mockUser.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy,
        }),
        { new: true }
      );
    });

    it('should throw NotFoundError if user not found', async () => {
      const userId = 'missing';
      mockUser.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(userRepo.softDelete(userId, 'admin')).rejects.toThrow(NotFoundError);
    });
  });
});
