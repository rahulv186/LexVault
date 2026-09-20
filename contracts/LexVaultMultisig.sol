// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LexVaultMultisig
 * @notice Multi-signature access control for legal evidence in LexVault.
 *
 * AUTHORIZATION & GOVERNANCE MODEL:
 * 1. Admin (Deployer / Governance):
 *    - The admin represents the trusted court or system authority that deploys the LexVault system.
 *    - The admin's ONLY power is case initialization (`initializeCase`).
 *    - The admin CANNOT bypass thresholds, approve requests, execute access grants, or unilaterally
 *      alter case configurations once initialized.
 *    - The admin can transfer ownership of the admin role via `transferAdmin`.
 *
 * 2. Case Custodians (Owners):
 *    - Once a case is initialized, governance is self-sovereign and decentralized among designated case owners.
 *    - Access requests require multisig approvals meeting `threshold`.
 *    - Reconfiguring a case (adding/removing owners, changing threshold) requires a formal proposal
 *      and threshold multisig consensus among active owners.
 *    - Reconfiguration increments `configVersion`. Pending requests created under an older configuration
 *      version are invalidated to prevent phantom approvals or votes from removed custodians.
 */
contract LexVaultMultisig {
    // --- State Variables ---

    address public admin;

    struct CaseConfig {
        address[] owners;
        uint256 threshold;
        bool initialized;
        uint256 configVersion;
    }

    struct AccessRequest {
        bytes32 caseId;
        bytes32 evidenceId;
        bytes32 action;
        address requester;
        uint256 nonce;
        uint256 approvals;
        bool executed;
        bool exists;
        uint256 configVersion;
        mapping(address => bool) hasApproved;
    }

    struct ReconfigProposal {
        bytes32 caseId;
        address[] newOwners;
        uint256 newThreshold;
        uint256 targetVersion;
        uint256 approvals;
        bool executed;
        bool exists;
        address proposer;
        mapping(address => bool) hasApproved;
    }

    // caseId => CaseConfig
    mapping(bytes32 => CaseConfig) internal caseConfigs;

    // caseId => configVersion => owner => isOwner
    mapping(bytes32 => mapping(uint256 => mapping(address => bool))) public isCaseOwnerAtVersion;

    // requestId => AccessRequest
    mapping(bytes32 => AccessRequest) internal requests;

    // proposalId => ReconfigProposal
    mapping(bytes32 => ReconfigProposal) internal reconfigProposals;

    bytes32[] public allRequestIds;

    // --- Events ---

    event AdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    event CaseInitialized(bytes32 indexed caseId, address[] owners, uint256 threshold, uint256 configVersion);
    event ReconfigurationProposed(bytes32 indexed proposalId, bytes32 indexed caseId, address indexed proposer, uint256 newThreshold, uint256 targetVersion);
    event ReconfigurationApproved(bytes32 indexed proposalId, address indexed owner);
    event CaseReconfigured(bytes32 indexed caseId, address[] newOwners, uint256 newThreshold, uint256 newVersion);
    event AccessRequested(bytes32 indexed requestId, bytes32 indexed caseId, bytes32 indexed evidenceId, bytes32 action, address requester);
    event AccessApproved(bytes32 indexed requestId, address indexed owner);
    event AccessExecuted(bytes32 indexed requestId, address indexed requester, bytes32 indexed caseId, bytes32 evidenceId, bytes32 action);

    // --- Modifiers ---

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    modifier onlyCaseOwner(bytes32 _caseId) {
        CaseConfig storage config = caseConfigs[_caseId];
        require(config.initialized, "Case not initialized");
        require(isCaseOwnerAtVersion[_caseId][config.configVersion][msg.sender], "Caller is not a case owner");
        _;
    }

    // --- Constructor ---

    constructor() {
        admin = msg.sender;
        emit AdminTransferred(address(0), msg.sender);
    }

    // --- Admin Management ---

    /**
     * @notice Transfer admin authority to a new address.
     */
    function transferAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "New admin cannot be zero address");
        emit AdminTransferred(admin, _newAdmin);
        admin = _newAdmin;
    }

    // --- Case Lifecycle ---

    /**
     * @notice Initialize a new case with designated custodians and threshold.
     * @dev Restricted to admin. One-time initialization per caseId.
     */
    function initializeCase(bytes32 _caseId, address[] memory _owners, uint256 _threshold) external onlyAdmin {
        require(_caseId != bytes32(0), "Invalid caseId");
        CaseConfig storage config = caseConfigs[_caseId];
        require(!config.initialized, "Case already initialized");

        _validateOwnersAndThreshold(_owners, _threshold);

        uint256 version = 1;
        config.owners = _owners;
        config.threshold = _threshold;
        config.initialized = true;
        config.configVersion = version;

        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(!isCaseOwnerAtVersion[_caseId][version][owner], "Duplicate owner detected");
            isCaseOwnerAtVersion[_caseId][version][owner] = true;
        }

        emit CaseInitialized(_caseId, _owners, _threshold, version);
    }

    // --- Reconfiguration Multisig ---

    /**
     * @notice Propose a new set of custodians and threshold for an existing case.
     * @dev Only an active case owner can propose. Automatically registers proposer's approval.
     */
    function proposeReconfiguration(
        bytes32 _caseId,
        address[] memory _newOwners,
        uint256 _newThreshold,
        uint256 _nonce
    ) external onlyCaseOwner(_caseId) returns (bytes32) {
        CaseConfig storage config = caseConfigs[_caseId];
        _validateOwnersAndThreshold(_newOwners, _newThreshold);

        // Pre-validate that newOwners contains no duplicates
        for (uint256 i = 0; i < _newOwners.length; i++) {
            for (uint256 j = i + 1; j < _newOwners.length; j++) {
                require(_newOwners[i] != _newOwners[j], "Duplicate owner in new owners list");
            }
        }

        uint256 targetVersion = config.configVersion + 1;
        bytes32 proposalId = keccak256(
            abi.encodePacked(_caseId, config.configVersion, keccak256(abi.encode(_newOwners)), _newThreshold, msg.sender, _nonce)
        );

        ReconfigProposal storage proposal = reconfigProposals[proposalId];
        require(!proposal.exists, "Proposal already exists");

        proposal.exists = true;
        proposal.caseId = _caseId;
        proposal.newOwners = _newOwners;
        proposal.newThreshold = _newThreshold;
        proposal.targetVersion = targetVersion;
        proposal.proposer = msg.sender;
        proposal.hasApproved[msg.sender] = true;
        proposal.approvals = 1;
        proposal.executed = false;

        emit ReconfigurationProposed(proposalId, _caseId, msg.sender, _newThreshold, targetVersion);
        emit ReconfigurationApproved(proposalId, msg.sender);

        return proposalId;
    }

    /**
     * @notice Approve a reconfiguration proposal.
     */
    function approveReconfiguration(bytes32 _proposalId) external {
        ReconfigProposal storage proposal = reconfigProposals[_proposalId];
        require(proposal.exists, "Proposal does not exist");
        require(!proposal.executed, "Proposal already executed");

        bytes32 caseId = proposal.caseId;
        CaseConfig storage config = caseConfigs[caseId];
        require(proposal.targetVersion == config.configVersion + 1, "Proposal target version outdated");
        require(isCaseOwnerAtVersion[caseId][config.configVersion][msg.sender], "Caller is not a case owner");
        require(!proposal.hasApproved[msg.sender], "Already approved by this owner");

        proposal.hasApproved[msg.sender] = true;
        proposal.approvals++;

        emit ReconfigurationApproved(_proposalId, msg.sender);
    }

    /**
     * @notice Execute a reconfiguration proposal after threshold approvals.
     */
    function executeReconfiguration(bytes32 _proposalId) external {
        ReconfigProposal storage proposal = reconfigProposals[_proposalId];
        require(proposal.exists, "Proposal does not exist");
        require(!proposal.executed, "Proposal already executed");

        bytes32 caseId = proposal.caseId;
        CaseConfig storage config = caseConfigs[caseId];
        require(proposal.targetVersion == config.configVersion + 1, "Proposal target version outdated");
        require(proposal.approvals >= config.threshold, "Threshold not met");

        proposal.executed = true;

        uint256 newVersion = proposal.targetVersion;
        config.configVersion = newVersion;
        config.owners = proposal.newOwners;
        config.threshold = proposal.newThreshold;

        for (uint256 i = 0; i < proposal.newOwners.length; i++) {
            address owner = proposal.newOwners[i];
            isCaseOwnerAtVersion[caseId][newVersion][owner] = true;
        }

        emit CaseReconfigured(caseId, proposal.newOwners, proposal.newThreshold, newVersion);
    }

    // --- Evidence Access Requests ---

    /**
     * @notice Request access to specific evidence under a case for a specified action.
     * @dev Binds request to caseId, evidenceId, action, msg.sender (requester), and nonce.
     *      Safe O(1) existence check; duplicate requests revert without modifying approval state.
     */
    function requestAccess(
        bytes32 _caseId,
        bytes32 _evidenceId,
        bytes32 _action,
        uint256 _nonce
    ) external returns (bytes32) {
        CaseConfig storage config = caseConfigs[_caseId];
        require(config.initialized, "Case not configured");
        require(_evidenceId != bytes32(0), "Invalid evidenceId");
        require(_action != bytes32(0), "Invalid action");

        bytes32 requestId = keccak256(abi.encodePacked(_caseId, _evidenceId, _action, msg.sender, _nonce));

        AccessRequest storage request = requests[requestId];
        require(!request.exists, "Request already exists");

        request.exists = true;
        request.caseId = _caseId;
        request.evidenceId = _evidenceId;
        request.action = _action;
        request.requester = msg.sender;
        request.nonce = _nonce;
        request.approvals = 0;
        request.executed = false;
        request.configVersion = config.configVersion;

        allRequestIds.push(requestId);

        emit AccessRequested(requestId, _caseId, _evidenceId, _action, msg.sender);
        return requestId;
    }

    /**
     * @notice Approve an access request.
     * @dev Only active owners under the request's configVersion can approve.
     */
    function approveAccess(bytes32 _requestId) external {
        AccessRequest storage request = requests[_requestId];
        require(request.exists, "Request does not exist");
        require(!request.executed, "Request already executed");

        bytes32 caseId = request.caseId;
        CaseConfig storage config = caseConfigs[caseId];
        require(request.configVersion == config.configVersion, "Request config version outdated");
        require(isCaseOwnerAtVersion[caseId][config.configVersion][msg.sender], "Caller is not a case owner");
        require(!request.hasApproved[msg.sender], "Already approved by this owner");

        request.hasApproved[msg.sender] = true;
        request.approvals++;

        emit AccessApproved(_requestId, msg.sender);
    }

    /**
     * @notice Execute an access request once the threshold is satisfied.
     * @dev Enforces threshold, single execution, and current configVersion.
     */
    function executeAccess(bytes32 _requestId) external {
        AccessRequest storage request = requests[_requestId];
        require(request.exists, "Request does not exist");
        require(!request.executed, "Request already executed");

        bytes32 caseId = request.caseId;
        CaseConfig storage config = caseConfigs[caseId];
        require(request.configVersion == config.configVersion, "Request config version outdated");
        require(request.approvals >= config.threshold, "Threshold not met");

        request.executed = true;
        emit AccessExecuted(_requestId, request.requester, caseId, request.evidenceId, request.action);
    }

    // --- Internal Helpers ---

    function _validateOwnersAndThreshold(address[] memory _owners, uint256 _threshold) internal pure {
        require(_owners.length > 0, "Owners list cannot be empty");
        require(_threshold >= 1 && _threshold <= _owners.length, "Invalid threshold");
        for (uint256 i = 0; i < _owners.length; i++) {
            require(_owners[i] != address(0), "Zero address owner not allowed");
        }
    }

    // --- Getters & View Functions ---

    function getRequest(bytes32 _requestId) external view returns (
        bytes32 caseId,
        bytes32 evidenceId,
        bytes32 action,
        address requester,
        uint256 nonce,
        uint256 approvals,
        bool executed,
        bool exists,
        uint256 configVersion
    ) {
        AccessRequest storage request = requests[_requestId];
        return (
            request.caseId,
            request.evidenceId,
            request.action,
            request.requester,
            request.nonce,
            request.approvals,
            request.executed,
            request.exists,
            request.configVersion
        );
    }

    function hasApproved(bytes32 _requestId, address _owner) external view returns (bool) {
        return requests[_requestId].hasApproved[_owner];
    }

    function getCaseConfig(bytes32 _caseId) external view returns (
        address[] memory owners,
        uint256 threshold,
        bool initialized,
        uint256 configVersion
    ) {
        CaseConfig storage config = caseConfigs[_caseId];
        return (config.owners, config.threshold, config.initialized, config.configVersion);
    }

    function isCaseOwner(bytes32 _caseId, address _account) external view returns (bool) {
        CaseConfig storage config = caseConfigs[_caseId];
        if (!config.initialized) return false;
        return isCaseOwnerAtVersion[_caseId][config.configVersion][_account];
    }

    function getProposal(bytes32 _proposalId) external view returns (
        bytes32 caseId,
        address[] memory newOwners,
        uint256 newThreshold,
        uint256 targetVersion,
        uint256 approvals,
        bool executed,
        bool exists,
        address proposer
    ) {
        ReconfigProposal storage proposal = reconfigProposals[_proposalId];
        return (
            proposal.caseId,
            proposal.newOwners,
            proposal.newThreshold,
            proposal.targetVersion,
            proposal.approvals,
            proposal.executed,
            proposal.exists,
            proposal.proposer
        );
    }

    function hasApprovedProposal(bytes32 _proposalId, address _owner) external view returns (bool) {
        return reconfigProposals[_proposalId].hasApproved[_owner];
    }

    function getAllRequestIds() external view returns (bytes32[] memory) {
        return allRequestIds;
    }
}
