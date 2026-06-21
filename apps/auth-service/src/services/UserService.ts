import { IUserRepository, UserFindAllOptions } from '../repositories/interfaces/IUserRepository';
import { User } from '@inventory/shared-types';

function stripPasswordHash(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash: _pw, ...safe } = user;
  return safe;
}

export class UserService {
  constructor(private readonly repo: IUserRepository) {}

  async list(options: UserFindAllOptions) {
    const { data, total } = await this.repo.findAll(options);
    const page = options.page ?? 1;
    const limit = options.limit ?? 10;
    return {
      data: data.map(stripPasswordHash),
      pagination: {
        page,
        limit,
        total,
        totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
    };
  }
}
