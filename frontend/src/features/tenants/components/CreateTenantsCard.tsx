import { Field, FieldError, FieldGroup,FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import { useState } from "react";
import type { ApiClientError } from "@/lib/api/type";
import type { TenantsFormValues, TenantsResponse } from "../types/tenant-types";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ConfirmButton } from "@/components/original/ConfirmButton";
import { CreateAccordionCard } from "@/components/original/CreateAccordionCard";

export const CreateTenantsCard = ({ onCreateSuccess }: { onCreateSuccess: (newTenant: TenantsResponse) => void }) => {
  const [formValues, setFormValues] = useState<TenantsFormValues>({ name: { value: "" } });
  
  const onSubmit = () => {
    apiClient.post<TenantsResponse>("/tenants/create", {
      name: formValues.name.value
    }).then((response) => {
      if(response){
        onCreateSuccess(response);
        setFormValues({ name: { value: "" } });
        toast.success("テナントが作成されました",{position: "top-center"});
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

  return (
    <div>
      <CreateAccordionCard
        value="create-tenant"
        title="テナント新規作成"
      >
          <div className="space-y-2">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">テナント名<span className="text-red-500">*</span></FieldLabel>
                <Input
                  id="name"
                  value={formValues.name.value}
                  onChange={(e) => {
                        setFormValues((prev) => ({ ...prev, name: { value: e.target.value, error: undefined } }))
                    }}
                />
                {formValues.name.error && 
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <FieldError>{formValues.name.error}</FieldError>
                  </motion.div>
                }
              </Field>
            </FieldGroup>
            <div className="flex justify-end">
              <ConfirmButton onClick={onSubmit}>
                作成
              </ConfirmButton>
            </div>
          </div>
      </CreateAccordionCard>
    </div>
  );
}