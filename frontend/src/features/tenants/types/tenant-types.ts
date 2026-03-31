export interface TenantsResponse{
  id: string;
  name: string;
}

export interface TenantsFormValues { 
  name: {
    value: string;
    error?: string;
  }; 
}
