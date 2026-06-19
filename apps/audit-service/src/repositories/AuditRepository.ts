import { IAuditRepository, AuditFindAllOptions, AuditFindAllResult } from './interfaces/IAuditRepository';
import { IAuditLog } from '../models/audit.model';
import AuditLog from '../models/audit.model';

export class AuditRepository implements IAuditRepository {
  async create(auditData: Partial<IAuditLog>): Promise<IAuditLog> {
    return await AuditLog.create(auditData);
  }

  async findAll(options: AuditFindAllOptions): Promise<AuditFindAllResult> {
    const {
      page = 1,
      limit = 10,
      userId,
      username,
      role,
      action,
      resourceType,
      startDate,
      endDate,
      search,
      sort = 'createdAt',
      order = 'desc',
    } = options;

    const query: Record<string, unknown> = {};

    if (userId) {
      query.userId = userId;
    }
    if (username) {
      // Use exact match or case-insensitive partial match
      query.username = { $regex: username, $options: 'i' };
    }
    if (role) {
      query.role = role;
    }
    if (action) {
      query.action = action;
    }
    if (resourceType) {
      query.resourceType = resourceType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      query.$or = [
        { correlationId: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { resourceType: { $regex: search, $options: 'i' } },
        { resourceId: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = { [sort]: sortOrder } as Record<string, 1 | -1>;

    const skip = (page - 1) * limit;

    const dataQuery = AuditLog.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const [data, total] = await Promise.all([
      dataQuery.exec(),
      AuditLog.countDocuments(query),
    ]);

    return { data, total };
  }
}
