export interface MultisigConfig {
  owners: string[];
  threshold: number;
  initialized: boolean;
}

export interface AccessRequest {
  requestId: string;
  caseId: string;
  reason: string;
  approvals: number;
  executed: boolean;
}
