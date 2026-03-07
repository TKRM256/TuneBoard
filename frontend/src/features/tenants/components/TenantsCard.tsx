import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import type { TenantsFormValues, TenantsResponse } from "../type/type";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import type { ApiClientError } from "@/lib/api/type";
import { ConfirmButton } from "@/components/original/ConfirmButton";
import { motion } from "framer-motion";

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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <h4 className="text-2xl font-medium">{tenant.name}</h4>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing((prev) => !prev)}>
                        {isEditing ? "キャンセル" : "編集"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                <p>テナントID: {tenant.id}</p>
            </CardContent>
            {isEditing && (
                <CardFooter>
                    <motion.div className="w-full space-y-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <FieldGroup>
                        <Field>
                          <FieldLabel htmlFor="name">新しいテナント名</FieldLabel>
                          <Input
                            id="name"
                            value={formValues.name.value}
                            onChange={(e) => {
                              setFormValues((prev) => ({ ...prev, name: { ...prev.name, value: e.target.value, error: undefined } }))
                            }}
                          />
                          {formValues.name.error && 
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              <FieldError>{formValues.name.error}</FieldError>
                            </motion.div>
                          }
                        </Field>
                      </FieldGroup>
                      <div className="flex justify-end gap-2">
                        <ConfirmButton onClick={onSubmit}>更新</ConfirmButton>
                        <ConfirmButton onClick={handleDelete} defaultVariant="outline" confirmVariant="destructive">
                          削除
                        </ConfirmButton>
                      </div>
                    </motion.div>
                </CardFooter>
            )}
        </Card>);
}