export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  role_id: number;
  role_name: string; // Added
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  permissions?: string[]; // Added
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
}

export interface AuthUser {
  user: User;
  token: string;
  permissions: string[];
}
