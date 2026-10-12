import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TenantsResponse } from "../types/tenant-types";
import { TenantsCard } from "./TenantsCard";

export const ListTenantsCard = ({ tenants, onUpdateSuccess, onDelete, onRestore, trashTrigger }: { tenants: TenantsResponse[]; onUpdateSuccess: (updatedTenant: TenantsResponse) => void; onDelete?: (id: string) => void; onRestore?: (tenant: TenantsResponse) => void; trashTrigger?: React.ReactNode }) => {    
    return (
        <div>
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">テナント一覧</h2>
                        {trashTrigger}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {tenants.map((tenant) => (
                            <TenantsCard 
                                key={tenant.id} 
                                tenant={tenant} 
                                onUpdateSuccess={onUpdateSuccess}
                                onDelete={onDelete}
                                onRestore={onRestore}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}