/** 今のユーザーがテナントの管理者（ADMIN / OWNER）か。読み込み中は null。 */
import { useEffect, useState } from 'react';

import { apiClient } from '@/lib/api/client';

export function useIsTenantAdmin(tenantId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    apiClient.get<{ role: string }>(`/tenants/get/${tenantId}`)
      .then((tenant) => {
        if (!cancelled) setIsAdmin(tenant?.role === 'ADMIN' || tenant?.role === 'OWNER');
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);
  return isAdmin;
}
