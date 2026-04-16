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
