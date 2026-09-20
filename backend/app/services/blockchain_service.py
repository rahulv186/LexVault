from web3 import Web3
from app.core.config import settings
from typing import Optional, Tuple, List
import logging

logger = logging.getLogger(__name__)

# Minimal ABI for LexVaultMultisig
MULTISIG_ABI = [
    {
        "inputs": [
            {"internalType": "bytes32", "name": "_caseId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "_evidenceId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "_action", "type": "bytes32"},
            {"internalType": "uint256", "name": "_nonce", "type": "uint256"}
        ],
        "name": "requestAccess",
        "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "_requestId", "type": "bytes32"}],
        "name": "getRequest",
        "outputs": [
            {"internalType": "bytes32", "name": "caseId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "evidenceId", "type": "bytes32"},
            {"internalType": "bytes32", "name": "action", "type": "bytes32"},
            {"internalType": "uint256", "name": "approvals", "type": "uint256"},
            {"internalType": "bool", "name": "executed", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "bytes32", "name": "_caseId", "type": "bytes32"}],
        "name": "getCaseConfig",
        "outputs": [
            {"internalType": "address[]", "name": "owners", "type": "address[]"},
            {"internalType": "uint256", "name": "threshold", "type": "uint256"},
            {"internalType": "bool", "name": "initialized", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

class BlockchainService:
    def __init__(self):
        self.w3 = Web3(Web3.HTTPProvider(settings.ETH_RPC_URL))
        self.contract_address = settings.MULTISIG_CONTRACT_ADDRESS
        self.contract = self.w3.eth.contract(address=self.contract_address, abi=MULTISIG_ABI)

    def verify_access_request(self, request_id: str, expected_case_id: str, expected_evidence_id: str, expected_action: str) -> bool:
        try:
            # Convert hex strings to bytes
            req_id_bytes = Web3.to_bytes(hexstr=request_id)
            case_id_bytes = Web3.to_bytes(hexstr=expected_case_id)
            evidence_id_bytes = Web3.to_bytes(hexstr=expected_evidence_id)
            # Action is a string, convert to bytes32 using keccak256
            action_bytes = Web3.keccak(text=expected_action)

            # Call getRequest on the contract
            request_data = self.contract.functions.getRequest(req_id_bytes).call()

            # request_data: (caseId, evidenceId, action, approvals, executed)
            on_chain_case_id = request_data[0]
            on_chain_evidence_id = request_data[1]
            on_chain_action = request_data[2]
            approvals = request_data[3]
            executed = request_data[4]

            # 1. Verify request exists and matches identifiers
            if on_chain_case_id != case_id_bytes:
                logger.warning(f"Request {request_id} does not belong to case {expected_case_id}")
                return False
            if on_chain_evidence_id != evidence_id_bytes:
                logger.warning(f"Request {request_id} does not reference evidence {expected_evidence_id}")
                return False
            if on_chain_action != action_bytes:
                logger.warning(f"Request {request_id} does not match action {expected_action}")
                return False

            # 2. Verify threshold
            config = self.contract.functions.getCaseConfig(case_id_bytes).call()
            threshold = config[1]

            if approvals < threshold:
                logger.warning(f"Request {request_id} threshold not met: {approvals}/{threshold}")
                return False

            # 3. Verify it has been executed on-chain
            if not executed:
                logger.warning(f"Request {request_id} not yet executed on-chain")
                return False

            return True
        except Exception as e:
            logger.error(f"Error verifying on-chain request {request_id}: {str(e)}")
            return False

blockchain_service = BlockchainService()
