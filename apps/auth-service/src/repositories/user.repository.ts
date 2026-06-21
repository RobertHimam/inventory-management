import { IUserRepository, UserFindAllOptions, UserFindAllResult } from './interfaces/IUserRepository';
import UserModel, { IUserDocument } from '../models/user.model';
import { User } from '@inventory/shared-types';
import { NotFoundError } from '../errors';

export class UserRepository implements IUserRepository {
  private toUser(doc: IUserDocument): User {
    return {
      id: doc.id,
      email: doc.email,
      username: doc.username,
      role: doc.role,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      deletedAt: doc.deletedAt ?? null,
      deletedBy: doc.deletedBy ?? null,
      passwordHash: doc.passwordHash,
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase(), deletedAt: null }, null).exec();
    return doc ? this.toUser(doc) : null;
  }

  async findById(id: string): Promise<User | null> {
    const doc = await UserModel.findById(id, null).exec();
    if (!doc || doc.deletedAt) return null;
    return this.toUser(doc);
  }

  async create(data: { email: string; username: string; passwordHash: string; role: string }): Promise<User> {
    const doc = await UserModel.create({
      email: data.email,
      username: data.username,
      passwordHash: data.passwordHash,
      role: data.role,
    });
    return this.toUser(doc);
  }

  async findAll(options: UserFindAllOptions): Promise<UserFindAllResult> {
    const { page = 1, limit = 10 } = options;
    const query = { deletedAt: null };
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      UserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      UserModel.countDocuments(query),
    ]);
    return { data: docs.map((d) => this.toUser(d)), total };
  }

  async softDelete(id: string, deletedBy: string): Promise<void> {
    const doc = await UserModel.findByIdAndUpdate(
      id,
      {
        deletedAt: new Date(),
        deletedBy,
      },
      { new: true }
    ).exec();
    if (!doc) {
      throw new NotFoundError(`User with ID '${id}' not found`);
    }
  }
}
