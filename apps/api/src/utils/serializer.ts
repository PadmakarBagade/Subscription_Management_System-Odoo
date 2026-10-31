import { UserRole } from '@brightloop/shared';

/**
 * Strips sensitive admin-only fields (e.g., costPrice) from data structures
 * when accessed by non-admin users (STAFF, CUSTOMER).
 */
export function sanitizeDataForRole<T = any>(data: T, role?: UserRole): T {
  if (role === 'ADMIN') {
    return data;
  }

  return removeForbiddenFields(data);
}

function removeForbiddenFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => removeForbiddenFields(item));
  }

  if (typeof obj === 'bigint') {
    return Number(obj);
  }

  if (typeof obj === 'object') {
    // If it's a Date or other non-plain object, return as is
    if (obj instanceof Date || obj instanceof RegExp) {
      return obj;
    }

    // Prisma Decimal instance (has .toNumber method)
    if (typeof obj.toNumber === 'function') {
      return obj.toNumber();
    }

    // Prisma Decimal-like structure with { s, e, d }
    if (obj.s !== undefined && obj.d !== undefined && Array.isArray(obj.d)) {
      try {
        const digits = obj.d.join('');
        const exp = obj.e;
        let numStr = digits;
        if (exp !== undefined) {
          if (exp >= digits.length - 1) {
            numStr = digits + '0'.repeat(exp - digits.length + 1);
          } else if (exp >= 0) {
            numStr = digits.slice(0, exp + 1) + '.' + digits.slice(exp + 1);
          } else {
            numStr = '0.' + '0'.repeat(-exp - 1) + digits;
          }
        }
        const parsed = Number((obj.s < 0 ? '-' : '') + numStr);
        if (!isNaN(parsed)) return parsed;
      } catch {
        // fallback
      }
    }

    const cleaned: Record<string, any> = {};

    for (const key of Object.keys(obj)) {
      // Sensitive admin-only fields to omit for non-admins
      if (key === 'costPrice') {
        continue;
      }

      cleaned[key] = removeForbiddenFields(obj[key]);
    }

    return cleaned;
  }

  return obj;
}
