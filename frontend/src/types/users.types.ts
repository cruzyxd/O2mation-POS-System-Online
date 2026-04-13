import type { Role } from "./auth.types";

export interface UserWithPassword {
  id: number;
  username: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  role: "manager" | "cashier";
}

export interface UpdateUserRequest {
  username?: string;
  password?: string;
}

export interface ToggleUserActiveRequest {
  is_active: boolean;
}

export interface DeleteUserRequest {
  confirm_password: string;
}

export interface ListUsersResponse {
  users: UserWithPassword[];
}
