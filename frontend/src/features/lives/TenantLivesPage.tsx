import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { CreateLiveCard } from './components/CreateLiveCard';
import { LiveListCard } from './components/LiveListCard';
import type { LiveResponse } from './types/type';
import type { TenantsResponse } from '@/features/tenants/type/type';
import { apiClient } from '@/lib/api/client';

export const TenantLivesPage = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<TenantsResponse | null>(null);
  const [lives, setLives] = useState<LiveResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) {
      return;
    }

    Promise.all([
      apiClient.get<TenantsResponse>(`/tenants/get/${tenantId}`),
      apiClient.get<LiveResponse[]>(`/lives/tenant/${tenantId}/list`),
    ])
      .then(([tenantResponse, liveResponse]) => {
        setTenant(tenantResponse ?? null);
        setLives(liveResponse ?? []);
      })
      .catch(() => {
        toast.error('ライブ情報の取得に失敗しました', { position: 'top-center' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [tenantId]);

  const handleCreateSuccess = (live: LiveResponse) => {
    setLives((prev) => [live, ...prev]);
  };

  const handleUpdateSuccess = (updatedLive: LiveResponse) => {
    setLives((prev) => prev.map((live) => (live.id === updatedLive.id ? updatedLive : live)));
  };

  const handleDelete = (id: string) => {
    setLives((prev) => prev.filter((live) => live.id !== id));
  };

  if (!tenantId) {
    return <Navigate to="/tenants" replace />;
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">ライブ情報を読み込み中です...</div>;
  }

  if (!tenant) {
    return <Navigate to="/tenants" replace />;
  }

  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/tenants">テナント一覧</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tenant.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold sm:text-2xl">{tenant.name} のライブ管理</h1>
            </div>
            <Button asChild className="w-full md:w-auto" variant="outline">
              <Link to="/tenants">
                <ChevronLeft className="size-4" />
                テナント一覧へ戻る
              </Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <CreateLiveCard tenantId={tenant.id} tenantName={tenant.name} onCreateSuccess={handleCreateSuccess} />
      <LiveListCard lives={lives} tenantName={tenant.name} tenantId={tenant.id} onUpdateSuccess={handleUpdateSuccess} onDelete={handleDelete} />
    </div>
  );
};