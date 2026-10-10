export interface TenantsResponse{
  id: string;
  name: string;
  role: string;
}

export interface TenantsFormValues { 
  name: {
    value: string;
    error?: string;
  }; 
}

/** テナント名の入力チェック。文言はバックエンドの制約（TenantsCreateRequest / TenantsUpdateRequest）に合わせている。 */
export function validateTenantName(name: string): string | undefined {
  if (!name.trim()) {
    return "テナント名は必須です";
  }
  // 入力値はそのまま送信され、サーバーは前後の空白込みで長さを数える
  if (name.length > 255) {
    return "テナント名は255文字以内で入力してください";
  }
  return undefined;
}

export interface TenantMemberResponse {
  userId: number;
  name: string;
  email: string;
  picture: string;
  role: string;
}

export interface AddMemberFormValues {
  email: {
    value: string;
    error?: string;
  };
  role: {
    value: string;
    error?: string;
  };
}

export interface CreateInvitationResponse {
  invitationId: string;
  token: string;
  role: string;
  expiresAt: string;
}

export interface InvitationInfoResponse {
  tenantId: string;
  tenantName: string;
  role: string;
  expiresAt: string;
  expired: boolean;
}
