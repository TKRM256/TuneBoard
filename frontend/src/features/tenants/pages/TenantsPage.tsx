import { CreateTenantsCard } from "@/features/tenants/components/CreateTenantsCard";
import { ListTenantsCard } from "@/features/tenants/components/ListTenantsCard";
import type { TenantsResponse } from "@/features/tenants/types/tenant-types";
import { apiClient } from "@/lib/api/client";
import { useEffect, useState } from "react";


export const TenantsPage = () => {

  const [tenants, setTenants] = useState<TenantsResponse[]>([]);

  const fetchTenants = () => {
    apiClient.get<TenantsResponse[]>("/tenants/list")
      .then((response) => {
          if(response){
              setTenants(response);
          }
      })
      .catch((error) => {
          console.log(error);
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
  }

  useEffect(() => {
    fetchTenants();
  },[]);

  return (
    <div className="space-y-4">
      <CreateTenantsCard onCreateSuccess={onCreateSuccess} />
      <ListTenantsCard tenants={tenants} onUpdateSuccess={onUpdateSuccess} onDelete={onDeleteSuccess} />
    </div>
  );
}