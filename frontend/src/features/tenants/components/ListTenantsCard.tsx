import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TenantsResponse } from "../types/tenant-types";
import { TenantsCard } from "./TenantsCard";

export const ListTenantsCard = ({ tenants, onUpdateSuccess, onDelete }: { tenants: TenantsResponse[]; onUpdateSuccess: (updatedTenant: TenantsResponse) => void; onDelete?: (id: string) => void }) => {    
    return (
        <div>
            <Card>
                <CardHeader>
                    <h3 className="text-lg font-semibold">テナント一覧</h3>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {tenants.map((tenant) => (
                            <TenantsCard 
                                key={tenant.id} 
                                tenant={tenant} 
                                onUpdateSuccess={onUpdateSuccess}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}