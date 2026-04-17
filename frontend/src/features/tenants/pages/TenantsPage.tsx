import { CreateTenantsCard } from "@/features/tenants/components/CreateTenantsCard";
import { ListTenantsCard } from "@/features/tenants/components/ListTenantsCard";
import type { TenantsResponse } from "@/features/tenants/types/tenant-types";
import { apiClient } from "@/lib/api/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TrashButton, TrashSheet } from "@/components/original/TrashSheet";


export const TenantsPage = () => {

  const [tenants, setTenants] = useState<TenantsResponse[]>([]);
  const [trashedTenants, setTrashedTenants] = useState<TenantsResponse[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashFetched, setTrashFetched] = useState(false);

  const fetchTenants = () => {
    apiClient.get<TenantsResponse[]>("/tenants/list")
      .then((response) => {
          if(response){
              setTenants(response);
          }
      })
  }

  const fetchTrash = () => {
    apiClient.get<TenantsResponse[]>("/tenants/trash")
      .then((response) => {
        setTrashedTenants(response ?? []);
        setTrashFetched(true);
      });
  }

  const onCreateSuccess = (newTenant: TenantsResponse) => {
    setTenants((prev) => [...prev, newTenant]);
  }

  const onUpdateSuccess = (updatedTenant: TenantsResponse) => {
    setTenants((prev) => prev.map((tenant) => tenant.id === updatedTenant.id ? updatedTenant : tenant));
  }

  const onDeleteSuccess = (id: string) => {
    setTenants((prev) => prev.filter((t) => t.id !== id));
    setTrashedTenants((prev) => {
      const found = tenants.find((t) => t.id === id);
      if (!found) return prev;
      return [found, ...prev];
    });
  }

  const onRestoreSuccess = (restored: TenantsResponse) => {
    setTrashedTenants((prev) => prev.filter((t) => t.id !== restored.id));
    setTenants((prev) => [restored, ...prev]);
  }

  const handleRestoreFromTrash = (id: string) => {
    apiClient.post<void>("/tenants/restore", { id }).then(() => {
      const restored = trashedTenants.find((t) => t.id === id);
      setTrashedTenants((prev) => prev.filter((t) => t.id !== id));
      if (restored) setTenants((prev) => [restored, ...prev]);
      toast.success("テナントを復元しました", { position: "top-center" });
    }).catch(() => {
      toast.error("復元に失敗しました", { position: "top-center" });
    });
  }

  const handlePurgeTenant = (id: string) => {
    apiClient.post<void>("/tenants/purge", { id }).then(() => {
      setTrashedTenants((prev) => prev.filter((t) => t.id !== id));
      toast.success("テナントを完全に削除しました", { position: "top-center" });
    }).catch(() => {
      toast.error("完全削除に失敗しました", { position: "top-center" });
    });
  }

  const handleOpenTrash = () => {
    if (!trashFetched) fetchTrash();
    setTrashOpen(true);
  }

  useEffect(() => {
    fetchTenants();
  },[]);

  return (
    <div className="space-y-4">
      <CreateTenantsCard onCreateSuccess={onCreateSuccess} />
      <ListTenantsCard
        tenants={tenants}
        onUpdateSuccess={onUpdateSuccess}
        onDelete={onDeleteSuccess}
        onRestore={onRestoreSuccess}
        trashTrigger={<TrashButton onClick={handleOpenTrash} count={trashedTenants.length} />}
      />
      <TrashSheet
        open={trashOpen}
        onOpenChange={setTrashOpen}
        items={trashedTenants.map((t) => ({ id: t.id, label: t.name }))}
        onRestore={handleRestoreFromTrash}
        onPurge={handlePurgeTenant}
        entityLabel="テナント"
      />
    </div>
  );
}

