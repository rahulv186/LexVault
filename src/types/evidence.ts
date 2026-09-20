export interface Evidence {
  id: string; // UUID
  evidence_id: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  sha256: string;
  uploaded_by: string;
  uploaded_at: string;
  verification_status: 'pending' | 'verified' | 'tampered';
  wrapped_dek: string;
  storage_provider: string;
  storage_ref: string;
  encryption_version: number;
  encrypted_file_size: number;
  case_id?: string; // UUID
}

export interface CustodyEvent {
  id: number;
  evidence_id?: string;
  case_id?: string;
  event_type: string;
  actor: string;
  timestamp: string;
  description: string;
  metadata_json?: any;
  previous_event_hash?: string;
  event_hash: string;
}

export interface VerificationResponse {
  verified: boolean;
  status: 'verified' | 'tampered';
  original_hash: string;
  current_hash: string;
  message: string;
}

export interface EvidenceListResponse {
  total: number;
  page: number;
  page_size: number;
  items: Evidence[];
}
