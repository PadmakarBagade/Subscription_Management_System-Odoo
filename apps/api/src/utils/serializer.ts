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

  if (typeof obj === 'object') {
    // If it's a Date or other non-plain object, return as is
    if (obj instanceof Date || obj instanceof RegExp) {
      return obj;
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
