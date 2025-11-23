// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Status codes for coordination lifecycle
enum Status {
    None,
    Proposed,
    Ready,
    Executed,
    Cancelled,
    Expired
}

/// @notice Agent intent structure per ERC-8001
struct AgentIntent {
    bytes32 payloadHash;
    uint64 expiry;
    uint64 nonce;
    address agentId;
    bytes32 coordinationType;
    uint256 coordinationValue;
    address[] participants;
}

/// @notice Coordination payload structure
struct CoordinationPayload {
    bytes32 version;
    bytes32 coordinationType;
    bytes coordinationData;
    bytes32 conditionsHash;
    uint256 timestamp;
    bytes metadata;
}

/// @notice Acceptance attestation from a participant
struct AcceptanceAttestation {
    bytes32 intentHash;
    address participant;
    uint64 nonce;
    uint64 expiry;
    bytes32 conditionsHash;
    bytes signature;
}

/// @notice JobSpec for UberProtocol (application-specific)
struct JobSpec {
    string topic;
    string ipfsUri;
    uint256 budget;
    uint64 deadline;
}

interface IAgentCoordination {
    // Events
    event CoordinationProposed(
        bytes32 indexed intentHash,
        address indexed proposer,
        bytes32 coordinationType,
        uint256 participantCount,
        uint256 coordinationValue
    );

    event CoordinationAccepted(
        bytes32 indexed intentHash,
        address indexed participant,
        bytes32 acceptanceHash,
        uint256 acceptedCount,
        uint256 requiredCount
    );

    event CoordinationExecuted(
        bytes32 indexed intentHash,
        address indexed executor,
        bool success,
        uint256 gasUsed,
        bytes result
    );

    event CoordinationCancelled(
        bytes32 indexed intentHash,
        address indexed canceller,
        string reason,
        uint8 finalStatus
    );

    // Core functions
    function proposeCoordination(
        AgentIntent calldata intent,
        bytes calldata signature,
        CoordinationPayload calldata payload
    ) external returns (bytes32 intentHash);

    function acceptCoordination(
        bytes32 intentHash,
        AcceptanceAttestation calldata attestation
    ) external returns (bool allAccepted);

    function executeCoordination(
        bytes32 intentHash,
        CoordinationPayload calldata payload,
        bytes calldata executionData
    ) external returns (bool success, bytes memory result);

    function cancelCoordination(bytes32 intentHash, string calldata reason) external;

    function getCoordinationStatus(
        bytes32 intentHash
    ) external view returns (
        Status status,
        address proposer,
        address[] memory participants,
        address[] memory acceptedBy,
        uint256 expiry
    );

    function getRequiredAcceptances(bytes32 intentHash) external view returns (uint256);

    function getAgentNonce(address agent) external view returns (uint64);
}

