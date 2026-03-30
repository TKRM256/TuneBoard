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
import { ChevronRight } from "lucide-react";

export const TenantsCard = ({tenant,onUpdateSuccess, onDelete}: { tenant: TenantsResponse; onUpdateSuccess: (updatedTenant: TenantsResponse) => void; onDelete?: (id: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
    const [formValues, setFormValues] = useState<TenantsFormValues>({ name: { value: tenant.name } });

    const onSubmit = () => {
      apiClient.post<TenantsResponse>("/tenants/update", {
        id: tenant.id,
        name: formValues.name.value
      }).then((response) => {
        if(response){
          onUpdateSuccess(response);
          setIsEditing(false);
          toast.success("テナントが更新されました",{position: "top-center"});
        }
      }).catch((error: ApiClientError) => {
        const serverFieldErrors = error.apiError?.fieldErrors;
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
      }});
    };

    const handleDelete = () => {
      apiClient.post<void>("/tenants/delete", {
        id: tenant.id}).then(() => {
          if (onDelete) onDelete(tenant.id);
          toast.success("テナントが削除されました",{position: "top-center"});
        }
      );
    }

    return (
        <motion.div layout>
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="wrap-break-word text-lg font-medium">{tenant.name}</h4>
                    <p className="text-xs text-muted-foreground">ID: {tenant.id}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button asChild size="sm">
                      <Link to={`/tenants/${tenant.id}/lives`}>
                        ライブ一覧
                        <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsEditing((prev) => !prev)}>
                      {isEditing ? "キャンセル" : "編集"}
                    </Button>
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
        </Card>
        </motion.div>);
}