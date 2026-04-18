import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import type { ApiClientError } from "@/lib/api/type";
import type { TenantMemberResponse, CreateInvitationResponse } from "../types/tenant-types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ConfirmButton } from "@/components/original/ConfirmButton";
import { Trash2, Copy, Check, Link } from "lucide-react";
import { motion } from "framer-motion";
import { useKeyedSingleFlight, useSingleFlight } from "@/hooks/use-single-flight";

interface InvitationLinkState {
  url: string;
  expiresAt: string;
  role: string;
}

export const TenantMembersPanel = ({ tenantId }: { tenantId: string }) => {
  const [members, setMembers] = useState<TenantMemberResponse[]>([]);
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [invitation, setInvitation] = useState<InvitationLinkState | null>(null);
  const [copied, setCopied] = useState(false);
  const { isRunning: isGenerating, run: runGenerateInvitation } = useSingleFlight();
  const { isRunning: isRoleChanging, run: runRoleChange } = useKeyedSingleFlight<number>();

  const fetchMembers = useCallback(() => {
    apiClient
      .get<TenantMemberResponse[]>(`/tenants/${tenantId}/members`)
      .then((response) => {
        if (response) setMembers(response);
      })
      .catch(() => {
        toast.error("メンバー一覧の取得に失敗しました", { position: "top-center" });
      });
  }, [tenantId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

    const handleCopy = () => {
    if (!invitation) return;
    navigator.clipboard.writeText(invitation.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleGenerateInvitation = () => {
    void runGenerateInvitation(async () => {
      setInvitation(null);
      try {
        const response = await apiClient.post<CreateInvitationResponse>(`/tenants/${tenantId}/invitations`, { role: inviteRole });
        if (response) {
          const url = `${window.location.origin}/invitation/${response.token}`;
          setInvitation({ url, expiresAt: response.expiresAt, role: response.role });
          await navigator.clipboard.writeText(url);
        }
      } catch (error: unknown) {
        const msg = (error as ApiClientError).apiError?.message;
        toast.error(msg ?? "招待リンクの生成に失敗しました", { position: "top-center" });
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
    void runRoleChange(userId, async () => {
      try {
        const response = await apiClient.put<TenantMemberResponse>(
          `/tenants/${tenantId}/members/${userId}/role`,
          { role }
        );
        if (response) {
          setMembers((prev) =>
            prev.map((m) => (m.userId === userId ? response : m))
          );
          toast.success("ロールを変更しました", { position: "top-center" });
        }
      } catch (error: unknown) {
        const msg = (error as ApiClientError).apiError?.message;
        if (msg) toast.error(msg, { position: "top-center" });
      }
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
            {member.role === "OWNER" ? (
              <Badge variant="default" className="bg-amber-100 text-amber-700 hover:bg-amber-100">ホスト</Badge>
            ) : member.role === "ADMIN" ? (
              <>
                <Select
                  value={member.role}
                  onValueChange={(v) => handleRoleChange(member.userId, v)}
                  disabled={isRoleChanging(member.userId)}
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
                  disabled={isRoleChanging(member.userId)}
                >
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </>
            ) : (
              <>
                <Select
                  value={member.role}
                  onValueChange={(v) => handleRoleChange(member.userId, v)}
                  disabled={isRoleChanging(member.userId)}
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
                  disabled={isRoleChanging(member.userId)}
                >
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Invite link generation */}
      <div className="space-y-2 border-t pt-3">
        <p className="text-xs font-medium text-muted-foreground">招待リンクを発行</p>
        <div className="flex gap-2">
          <Select value={inviteRole} onValueChange={setInviteRole}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">管理者</SelectItem>
              <SelectItem value="MEMBER">メンバー</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateInvitation}
            disabled={isGenerating}
            className="flex items-center gap-1"
          >
            <Link className="size-3.5" />
            リンクを発行
          </Button>
        </div>

        {invitation && (
          <div className="rounded-md border bg-muted/50 p-2 space-y-1">
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate font-mono text-xs text-muted-foreground">
                {invitation.url}
              </p>
              <Button size="icon" variant="ghost" className="size-6 shrink-0" onClick={handleCopy}>
                {copied ? (
                  <Check className="size-3.5 text-green-500" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              有効期限: {new Date(invitation.expiresAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} まで
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
