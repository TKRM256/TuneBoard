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
import { TrashButton, TrashSheet } from '@/components/original/TrashSheet';
import { CreateLiveCard } from '../components/CreateLiveCard';
import { LiveListCard } from '../components/LiveListCard';
import type { LiveResponse } from '../types/live-types';
import type { TenantsResponse } from '@/features/tenants/types/tenant-types';
import { apiClient } from '@/lib/api/client';

export const TenantLivesPage = () => {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<TenantsResponse | null>(null);
  const [lives, setLives] = useState<LiveResponse[]>([]);
  const [trashedLives, setTrashedLives] = useState<LiveResponse[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashFetched, setTrashFetched] = useState(false);
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

  const fetchTrash = () => {
    if (!tenantId) return;
    apiClient.get<LiveResponse[]>(`/lives/tenant/${tenantId}/trash`)
      .then((res) => {
        setTrashedLives(res ?? []);
        setTrashFetched(true);
      });
  };

  const handleCreateSuccess = (live: LiveResponse) => {
    setLives((prev) => [live, ...prev]);
  };

  const handleUpdateSuccess = (updatedLive: LiveResponse) => {
    setLives((prev) => prev.map((live) => (live.id === updatedLive.id ? updatedLive : live)));
  };

  const handleDelete = (id: string) => {
    const deleted = lives.find((l) => l.id === id);
    setLives((prev) => prev.filter((live) => live.id !== id));
    if (deleted) setTrashedLives((prev) => [deleted, ...prev]);
  };

  const handleRestore = (restored: LiveResponse) => {
    setTrashedLives((prev) => prev.filter((l) => l.id !== restored.id));
    setLives((prev) => [restored, ...prev]);
  };

  const handleRestoreFromTrash = (id: string) => {
    apiClient.post<void>('/lives/restore', { id }).then(() => {
      const restored = trashedLives.find((l) => l.id === id);
      setTrashedLives((prev) => prev.filter((l) => l.id !== id));
      if (restored) setLives((prev) => [restored, ...prev]);
      toast.success('ライブを復元しました', { position: 'top-center' });
    }).catch(() => {
      toast.error('復元に失敗しました', { position: 'top-center' });
    });
  };

  const handlePurgeLive = (id: string) => {
    apiClient.post<void>('/lives/purge', { id }).then(() => {
      setTrashedLives((prev) => prev.filter((l) => l.id !== id));
      toast.success('ライブを完全に削除しました', { position: 'top-center' });
    }).catch(() => {
      toast.error('完全削除に失敗しました', { position: 'top-center' });
    });
  };

  const handleOpenTrash = () => {
    if (!trashFetched) fetchTrash();
    setTrashOpen(true);
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

  const isAdmin = tenant.role === 'ADMIN' || tenant.role === 'OWNER';

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
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <h1 className="wrap-break-word text-lg font-semibold sm:text-2xl">{tenant.name} のライブ</h1>
            </div>
            <div className="flex justify-end">
              <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
                <Link to="/tenants">
                  <ChevronLeft className="size-4" />
                  戻る
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isAdmin && <CreateLiveCard tenantId={tenant.id} onCreateSuccess={handleCreateSuccess} />}
      <LiveListCard
        lives={lives}
        tenantName={tenant.name}
        tenantId={tenant.id}
        isAdmin={isAdmin}
        onUpdateSuccess={handleUpdateSuccess}
        onDelete={handleDelete}
        onRestore={handleRestore}
        trashTrigger={isAdmin ? <TrashButton onClick={handleOpenTrash} count={trashedLives.length} /> : undefined}
      />

      <TrashSheet
        open={trashOpen}
        onOpenChange={setTrashOpen}
        items={trashedLives.map((l) => ({ id: l.id, label: l.name }))}
        onRestore={handleRestoreFromTrash}
        onPurge={handlePurgeLive}
        entityLabel="ライブ"
      />
    </div>
  );
};

