export const MULTISIG_ABI = [
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_caseId", "type": "bytes32" },
      { "internalType": "address[]", "name": "_owners", "type": "address[]" },
      { "internalType": "uint256", "name": "_threshold", "type": "uint256" }
    ],
    "name": "configureCase",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_caseId", "type": "bytes32" },
      { "internalType": "string", "name": "_reason", "type": "string" }
    ],
    "name": "requestAccess",
    "outputs": [
      { "internalType": "bytes32", "name": "", "type": "bytes32" }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_requestId", "type": "bytes32" }
    ],
    "name": "approveAccess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_requestId", "type": "bytes32" }
    ],
    "name": "executeAccess",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_requestId", "type": "bytes32" }
    ],
    "name": "getRequest",
    "outputs": [
      { "internalType": "bytes32", "name": "caseId", "type": "bytes32" },
      { "internalType": "string", "name": "reason", "type": "string" },
      { "internalType": "uint256", "name": "approvals", "type": "uint256" },
      { "internalType": "bool", "name": "executed", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getAllRequestIds",
    "outputs": [
      { "internalType": "bytes32[]", "name": "", "type": "bytes32[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "_caseId", "type": "bytes32" }
    ],
    "name": "getCaseConfig",
    "outputs": [
      { "internalType": "address[]", "name": "owners", "type": "address[]" },
      { "internalType": "uint256", "name": "threshold", "type": "uint256" },
      { "internalType": "bool", "name": "initialized", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const MULTISIG_ADDRESS = '0x0000000000000000000000000000000000000000'; // To be updated after deployment
