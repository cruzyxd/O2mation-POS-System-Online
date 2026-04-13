export type Role = "owner_admin" | "manager" | "cashier";

export interface User {
  id: number;
  username: string;
  role: Role;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: User;
}
