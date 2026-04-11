import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import type { ApiClientError } from "@/lib/api/type";
import type { TenantMemberResponse, AddMemberFormValues } from "../types/tenant-types";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/original/ConfirmButton";
import { Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export const TenantMembersPanel = ({ tenantId }: { tenantId: string }) => {
  const [members, setMembers] = useState<TenantMemberResponse[]>([]);
  const [formValues, setFormValues] = useState<AddMemberFormValues>({
    email: { value: "" },
    role: { value: "MEMBER" },
  });

  const fetchMembers = useCallback(() => {
    apiClient
      .get<TenantMemberResponse[]>(`/tenants/${tenantId}/members`)
      .then((response) => {
        if (response) setMembers(response);
      });
  }, [tenantId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAdd = () => {
    setFormValues((prev) => ({
      email: { ...prev.email, error: undefined },
      role: { ...prev.role, error: undefined },
    }));

    apiClient
      .post<TenantMemberResponse>(`/tenants/${tenantId}/members`, {
        email: formValues.email.value,
        role: formValues.role.value,
      })
      .then((response) => {
        if (response) {
          setMembers((prev) => [...prev, response]);
          setFormValues({ email: { value: "" }, role: { value: "MEMBER" } });
          toast.success("メンバーを追加しました", { position: "top-center" });
        }
      })
      .catch((error: ApiClientError) => {
        const msg = error.apiError?.message;
        const fieldErrors = error.apiError?.fieldErrors;
        if (fieldErrors) {
          setFormValues((prev) => ({
            email: { ...prev.email, error: fieldErrors["email"] },
            role: { ...prev.role, error: fieldErrors["role"] },
          }));
        } else if (msg) {
          toast.error(msg, { position: "top-center" });
        }
      });
  };

  const handleRemove = (userId: number) => {
    apiClient
      .delete(`/tenants/${tenantId}/members/${userId}`)
      .then(() => {
        setMembers((prev) => prev.filter((m) => m.userId !== userId));
        toast.success("メンバーを削除しました", { position: "top-center" });
      })
      .catch((error: ApiClientError) => {
        const msg = error.apiError?.message;
        if (msg) toast.error(msg, { position: "top-center" });
      });
  };

  const handleRoleChange = (userId: number, role: string) => {
    apiClient
      .put<TenantMemberResponse>(
        `/tenants/${tenantId}/members/${userId}/role`,
        { role }
      )
      .then((response) => {
        if (response) {
          setMembers((prev) =>
            prev.map((m) => (m.userId === userId ? response : m))
          );
          toast.success("ロールを変更しました", { position: "top-center" });
        }
      })
      .catch((error: ApiClientError) => {
        const msg = error.apiError?.message;
        if (msg) toast.error(msg, { position: "top-center" });
      });
  };

  return (
    <motion.div layout className="w-full space-y-4">
      <h5 className="text-sm font-semibold">メンバー管理</h5>

      {/* Member list */}
      <div className="space-y-2">
        {members.map((member) => (
          <div
            key={member.userId}
            className="flex items-center gap-3 rounded-lg border p-2"
          >
            <Avatar className="size-8">
              <AvatarImage src={member.picture} alt={member.name} />
              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{member.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {member.email}
              </p>
            </div>
            {member.role === "ADMIN" ? (
              <Badge variant="default">管理者</Badge>
            ) : (
              <>
                <Select
                  value={member.role}
                  onValueChange={(v) => handleRoleChange(member.userId, v)}
                >
                  <SelectTrigger className="h-7 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">管理者</SelectItem>
                    <SelectItem value="MEMBER">メンバー</SelectItem>
                  </SelectContent>
                </Select>
                <ConfirmButton
                  onClick={() => handleRemove(member.userId)}
                  defaultVariant="ghost"
                  confirmVariant="destructive"
                >
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add member form */}
      <div className="border-t pt-3">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={`add-email-${tenantId}`}>
              メールアドレス<span className="text-red-500">*</span>
            </FieldLabel>
            <div className="flex gap-2">
              <Input
                id={`add-email-${tenantId}`}
                type="email"
                placeholder="user@example.com"
                value={formValues.email.value}
                onChange={(e) =>
                  setFormValues((prev) => ({
                    ...prev,
                    email: { value: e.target.value, error: undefined },
                  }))
                }
                className="flex-1"
              />
              <Select
                value={formValues.role.value}
                onValueChange={(v) =>
                  setFormValues((prev) => ({
                    ...prev,
                    role: { value: v, error: undefined },
                  }))
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">管理者</SelectItem>
                  <SelectItem value="MEMBER">メンバー</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleAdd}>
                追加
              </Button>
            </div>
            {formValues.email.error ? (
              <FieldError>{formValues.email.error}</FieldError>
            ) : null}
          </Field>
        </FieldGroup>
      </div>
    </motion.div>
  );
};
