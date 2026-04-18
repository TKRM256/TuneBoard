/** 
 * テナントのカードコンポーネント
 * 
*/
import { Card, CardHeader } from "@/components/ui/card"
import type { TenantsFormValues, TenantsResponse } from "../types/tenant-types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import type { ApiClientError } from "@/lib/api/type";
import { ConfirmButton } from "@/components/original/ConfirmButton";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { InlineEditPanel } from "@/components/original/InlineEditPanel";
import { TenantMembersPanel } from "./TenantMembersPanel";
import { ChevronRight, Users } from "lucide-react";
import { useSingleFlight } from "@/hooks/use-single-flight";

export const TenantsCard = ({tenant,onUpdateSuccess, onDelete, onRestore}: { tenant: TenantsResponse; onUpdateSuccess: (updatedTenant: TenantsResponse) => void; onDelete?: (id: string) => void; onRestore?: (tenant: TenantsResponse) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
    const [showMembers, setShowMembers] = useState(false);
    const [formValues, setFormValues] = useState<TenantsFormValues>({ name: { value: tenant.name } });
    const isAdmin = tenant.role === "ADMIN" || tenant.role === "OWNER";
    const { run: runRestoreTenant } = useSingleFlight();

    const onSubmit = async () => {
      try {
        const response = await apiClient.post<TenantsResponse>("/tenants/update", {
          id: tenant.id,
          name: formValues.name.value
        });

        if(response){
          onUpdateSuccess(response);
          setIsEditing(false);
          toast.success("テナントが更新されました",{position: "top-center"});
        }
      } catch (error: unknown) {
        const apiError = error as ApiClientError;
        const serverFieldErrors = apiError.apiError?.fieldErrors;
        if(!serverFieldErrors) return;
        for(const key in serverFieldErrors){
          if(key in formValues){
            setFormValues((prev) => ({
              ...prev,
              [key]: {
                ...prev[key as keyof TenantsFormValues],
                error: serverFieldErrors[key]
              }
            }));
          }
        }
      }
    };

    const restoreTenant = () => runRestoreTenant(async () => {
      await apiClient.post<void>("/tenants/restore", { id: tenant.id });
      if (onRestore) onRestore(tenant);
      toast.success("テナントを復元しました", { position: "top-center" });
    });

    const handleDelete = async () => {
      try {
        await apiClient.post<void>("/tenants/delete", {
          id: tenant.id});

        if (onDelete) onDelete(tenant.id);
        toast.success("テナントを削除しました", {
          position: "top-center",
          action: {
            label: "取り消す",
            onClick: () => {
              void restoreTenant().catch(() => {
                toast.error("復元に失敗しました", { position: "top-center" });
              });
            },
          },
        });
      } catch {
        toast.error("テナントの削除に失敗しました", { position: "top-center" });
      }
    }

    return (
        <motion.div layout>
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="wrap-break-word text-base font-medium sm:text-lg">{tenant.name}</h4>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tenant.role === "OWNER" ? "bg-amber-100 text-amber-700" : isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {tenant.role === "OWNER" ? "ホスト" : isAdmin ? "管理者" : "メンバー"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">ID: {tenant.id}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button asChild size="sm">
                      <Link to={`/tenants/${tenant.id}/lives`}>
                        ライブ一覧
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => { setShowMembers((prev) => !prev); setIsEditing(false); }}>
                        <Users className="size-4" />
                        メンバー
                      </Button>
                    )}
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => { setIsEditing((prev) => !prev); setShowMembers(false); }}>
                        {isEditing ? "キャンセル" : "編集"}
                      </Button>
                    )}
                  </div>
                </div>
            </CardHeader>
            <InlineEditPanel open={isEditing} >
                    <motion.div layout className="w-full space-y-4">
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="name">新しいテナント名<span className="text-red-500">*</span></FieldLabel>
                          <Input
                            id="name"
                            value={formValues.name.value}
                            onChange={(e) => {
                              setFormValues((prev) => ({ ...prev, name: { ...prev.name, value: e.target.value, error: undefined } }))
                            }}
                          />
                          {formValues.name.error ? <FieldError>{formValues.name.error}</FieldError> : null}
                        </Field>
                      </FieldGroup>
                      <div className="flex gap-2 border-t pt-2 justify-end">
                        <ConfirmButton onClick={onSubmit}>更新</ConfirmButton>
                        <ConfirmButton onClick={handleDelete} defaultVariant="outline" confirmVariant="destructive">
                          削除
                        </ConfirmButton>
                      </div>
                    </motion.div>
            </InlineEditPanel>
            {isAdmin && (
              <InlineEditPanel open={showMembers}>
                <TenantMembersPanel tenantId={tenant.id} />
              </InlineEditPanel>
            )}
        </Card>
        </motion.div>);
}