export interface ZKProof {
  id: number;
  proof_id: string;
  evidence_public_id: string;
  circuit_name: string;
  circuit_version: string;
  proving_system: string;
  public_inputs: any;
  public_signals: any;
  proof_data: any;
  status: string;
  verification_result?: boolean;
  verified_at?: string;
  created_at: string;
}

export interface ZKVerificationResponse {
  valid: boolean;
  status: string;
  verified_at: string;
}
