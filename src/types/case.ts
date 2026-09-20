export interface Case {
  id: string; // UUID
  case_number: string;
  title: string;
  description?: string;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export interface CaseMember {
  case_id: string; // UUID
  user_id: number;
  role: string;
  joined_at: string;
}
