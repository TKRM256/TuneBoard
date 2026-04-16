import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import type { ApiClientError } from "@/lib/api/type";
import type { InvitationInfoResponse } from "@/features/tenants/types/tenant-types";
import { useAuthContext } from "@/features/auth/authContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Users } from "lucide-react";

export const InvitationAcceptPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { authMe, isAuthLoading } = useAuthContext();

  const [info, setInfo] = useState<InvitationInfoResponse | null>(null);
  const [isFetching, setIsFetching] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    apiClient
      .get<InvitationInfoResponse>(`/invitations/${token}`)
      .then((response) => {
        if (response) setInfo(response);
      })
      .catch((error: ApiClientError) => {
        setFetchError(error.apiError?.message ?? "招待リンクの取得に失敗しました");
      })
      .finally(() => setIsFetching(false));
  }, [token]);

  const handleAccept = () => {
    if (!token) return;
    setIsAccepting(true);
    apiClient
      .post<void>(`/invitations/${token}/accept`, {})
      .then(() => {
        toast.success("テナントに参加しました", { position: "top-center" });
        navigate("/tenants");
      })
      .catch((error: ApiClientError) => {
        const msg = error.apiError?.message ?? "招待の受け入れに失敗しました";
        toast.error(msg, { position: "top-center" });
        setIsAccepting(false);
      });
  };

  const handleLoginRedirect = () => {
    const redirect = encodeURIComponent(`/invitation/${token}`);
    navigate(`/login?redirect=${redirect}`);
  };

  if (isFetching || isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-destructive">招待リンクが無効です</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{fetchError}</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              トップへ
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!info) return null;

  const roleLabel = info.role === "ADMIN" ? "管理者" : "メンバー";

  if (info.expired || info.used) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-destructive">
              {info.expired ? "有効期限切れ" : "使用済みリンク"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {info.expired
                ? "この招待リンクは有効期限が切れています。管理者に新しいリンクを発行してもらってください。"
                : "この招待リンクは既に使用されています。"}
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button variant="outline" onClick={() => navigate("/")}>
              トップへ
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary/10">
            <Users className="size-6 text-primary" />
          </div>
          <CardTitle>テナントへの招待</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          <p className="text-lg font-semibold">{info.tenantName}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{roleLabel}</span> として招待されています
          </p>
          <p className="text-xs text-muted-foreground">
            有効期限:{" "}
            {new Date(info.expiresAt).toLocaleString("ja-JP", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            まで
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          {authMe?.authenticated ? (
            <Button onClick={handleAccept} disabled={isAccepting}>
              {isAccepting ? <Spinner className="size-4 mr-2" /> : null}
              参加する
            </Button>
          ) : (
            <Button onClick={handleLoginRedirect}>
              ログインして参加する
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
