import type { TenantsResponse } from "../types/tenant-types";
import { TenantsCard } from "./TenantsCard";

/** テナントの一覧。外側は枠で囲まず、テナントごとのカードを直接並べる（スマホで横幅を詰めないため）。 */
export const ListTenantsCard = ({ tenants, onUpdateSuccess, onDelete, onRestore, trashTrigger }: { tenants: TenantsResponse[]; onUpdateSuccess: (updatedTenant: TenantsResponse) => void; onDelete?: (id: string) => void; onRestore?: (tenant: TenantsResponse) => void; trashTrigger?: React.ReactNode }) => {
    return (
        <section className="space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">テナント一覧</h2>
                {trashTrigger}
            </div>
            <div className="space-y-3">
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
        </section>
    );
}
