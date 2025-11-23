// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IAgentCoordination.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title AgentTaskManager
 * @notice ERC-8001-style intent coordination for UberProtocol
 * @dev Minimal v1: postJobIntent + settleJobWithAgent
 */
contract AgentTaskManager is EIP712 {
    using ECDSA for bytes32;

    // ERC-8001 compliant type hashes
    bytes32 public constant AGENT_INTENT_TYPEHASH = keccak256(
        "AgentIntent(bytes32 payloadHash,uint64 expiry,uint64 nonce,address agentId,bytes32 coordinationType,uint256 coordinationValue,address[] participants)"
    );

    bytes32 public constant ACCEPTANCE_TYPEHASH = keccak256(
        "AcceptanceAttestation(bytes32 intentHash,address participant,uint64 nonce,uint64 expiry,bytes32 conditionsHash)"
    );

    bytes32 public constant JOBSPEC_TYPEHASH = keccak256(
        "JobSpec(string topic,string ipfsUri,uint256 budget,uint64 deadline)"
    );

    bytes32 public constant COORDINATION_TYPE = keccak256("UBER_JOB_V1");

    struct IntentData {
        Status status;
        address proposer;
        uint256 budget;
        address paymentToken;
    }

    // Intent storage
    mapping(bytes32 => IntentData) public intents;
    mapping(bytes32 => AgentIntent) public intentDetails;
    
    // Nonce management per agentId
    mapping(address => uint64) public agentNonces;

    // Events
    event JobIntentPosted(
        bytes32 indexed intentHash,
        address indexed user,
        JobSpec spec
    );

    event JobSettled(
        bytes32 indexed intentHash,
        address indexed agent,
        uint256 amountPaid,
        bytes32 logRootHash
    );

    // Errors
    error ERC8001_NotProposer();
    error ERC8001_ExpiredIntent();
    error ERC8001_ExpiredAcceptance(address participant);
    error ERC8001_BadSignature();
    error ERC8001_NotParticipant();
    error ERC8001_ParticipantsNotCanonical();
    error ERC8001_NonceTooLow();
    error ERC8001_PayloadHashMismatch();
    error ERC8001_NotReady();
    error InvalidStatus();
    error IntentAlreadyExists();
    error IntentNotFound();
    error BudgetExceeded();
    error InsufficientBalance();
    error TransferFailed();

    constructor() EIP712("ERC-8001", "1") {}

    /// @notice Post a job intent (simplified v1)
    /// @param intent The agent intent struct
    /// @param intentSig Signature over intent
    /// @param spec The job specification
    function postJobIntent(
        AgentIntent calldata intent,
        bytes calldata intentSig,
        JobSpec calldata spec
    ) external payable returns (bytes32 intentHash) {
        // Verify intent expiry
        if (intent.expiry <= block.timestamp) {
            revert ERC8001_ExpiredIntent();
        }

        // Verify nonce monotonicity
        if (intent.nonce <= agentNonces[intent.agentId]) {
            revert ERC8001_NonceTooLow();
        }

        // Verify participants are canonical (sorted ascending)
        _verifyParticipantsCanonical(intent.participants);

        // Verify agentId is in participants
        bool foundAgentId = false;
        for (uint256 i = 0; i < intent.participants.length; i++) {
            if (intent.participants[i] == intent.agentId) {
                foundAgentId = true;
                break;
            }
        }
        if (!foundAgentId) {
            revert ERC8001_NotParticipant();
        }

        // Verify payload hash
        bytes32 computedPayloadHash = hashJobSpec(spec);
        if (intent.payloadHash != computedPayloadHash) {
            revert ERC8001_PayloadHashMismatch();
        }

        // Verify coordination type
        if (intent.coordinationType != COORDINATION_TYPE) {
            revert ERC8001_PayloadHashMismatch();
        }

        // Compute intent hash (struct hash, not digest)
        intentHash = _hashAgentIntent(intent);

        // Verify intent doesn't already exist
        if (intents[intentHash].status != Status.None) {
            revert IntentAlreadyExists();
        }

        // Verify signature
        bytes32 digest = _hashTypedDataV4(_hashAgentIntent(intent));
        address signer = digest.recover(intentSig);
        if (signer != intent.agentId) {
            revert ERC8001_BadSignature();
        }

        // Store intent
        intents[intentHash] = IntentData({
            status: Status.Proposed,
            proposer: msg.sender,
            budget: spec.budget,
            paymentToken: address(0) // ETH for v1, could be token address
        });

        intentDetails[intentHash] = intent;

        // Update nonce
        agentNonces[intent.agentId] = intent.nonce;

        emit JobIntentPosted(intentHash, msg.sender, spec);
    }

    /// @notice Settle job with selected agent (simplified v1)
    /// @param intent The original intent
    /// @param acc The acceptance attestation from selected agent
    /// @param payoutAddress Address to receive payment
    /// @param amount Amount to pay
    /// @param logRootHash Hash of execution logs
    function settleJobWithAgent(
        AgentIntent calldata intent,
        AcceptanceAttestation calldata acc,
        address payable payoutAddress,
        uint256 amount,
        bytes32 logRootHash
    ) external {
        // Recompute intent hash
        bytes32 intentHash = _hashAgentIntent(intent);

        IntentData storage intentData = intents[intentHash];

        // Verify intent exists and is in correct status
        if (intentData.status == Status.None) {
            revert IntentNotFound();
        }
        if (intentData.status == Status.Executed) {
            revert InvalidStatus();
        }
        if (intentData.status == Status.Cancelled) {
            revert InvalidStatus();
        }

        // Verify intent not expired
        if (intent.expiry <= block.timestamp) {
            revert ERC8001_ExpiredIntent();
        }

        // Verify acceptance
        if (acc.intentHash != intentHash) {
            revert ERC8001_PayloadHashMismatch();
        }

        // Verify acceptance not expired
        if (acc.expiry <= block.timestamp) {
            revert ERC8001_ExpiredAcceptance(acc.participant);
        }

        // Verify participant is in intent.participants
        bool isParticipant = false;
        for (uint256 i = 0; i < intent.participants.length; i++) {
            if (intent.participants[i] == acc.participant) {
                isParticipant = true;
                break;
            }
        }
        if (!isParticipant) {
            revert ERC8001_NotParticipant();
        }

        // Verify acceptance signature
        bytes32 acceptanceDigest = _hashTypedDataV4(_hashAcceptance(acc));
        address acceptanceSigner = acceptanceDigest.recover(acc.signature);
        if (acceptanceSigner != acc.participant) {
            revert ERC8001_BadSignature();
        }

        // Verify amount doesn't exceed budget
        if (amount > intentData.budget) {
            revert BudgetExceeded();
        }

        // Verify contract has sufficient balance
        if (address(this).balance < amount) {
            revert InsufficientBalance();
        }

        // Execute payment
        (bool success, ) = payoutAddress.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }

        // Mark as executed
        intentData.status = Status.Executed;

        emit JobSettled(intentHash, acc.participant, amount, logRootHash);
    }

    /// @notice Hash a JobSpec
    function hashJobSpec(JobSpec calldata spec) public pure returns (bytes32) {
        return keccak256(abi.encode(
            JOBSPEC_TYPEHASH,
            keccak256(bytes(spec.topic)),
            keccak256(bytes(spec.ipfsUri)),
            spec.budget,
            spec.deadline
        ));
    }

    /// @notice Hash an AgentIntent (struct hash, not full digest)
    function _hashAgentIntent(AgentIntent calldata intent) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            AGENT_INTENT_TYPEHASH,
            intent.payloadHash,
            intent.expiry,
            intent.nonce,
            intent.agentId,
            intent.coordinationType,
            intent.coordinationValue,
            _hashParticipants(intent.participants)
        ));
    }

    /// @notice Hash participants array (packed)
    function _hashParticipants(address[] calldata participants) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(participants));
    }

    /// @notice Hash an AcceptanceAttestation
    function _hashAcceptance(AcceptanceAttestation calldata acc) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            ACCEPTANCE_TYPEHASH,
            acc.intentHash,
            acc.participant,
            acc.nonce,
            acc.expiry,
            acc.conditionsHash
        ));
    }

    /// @notice Verify participants array is canonical (sorted ascending, unique)
    function _verifyParticipantsCanonical(address[] calldata participants) internal pure {
        for (uint256 i = 1; i < participants.length; i++) {
            if (uint160(participants[i]) <= uint160(participants[i - 1])) {
                revert ERC8001_ParticipantsNotCanonical();
            }
        }
    }

    /// @notice Get intent status
    function getIntentStatus(bytes32 intentHash) external view returns (Status) {
        return intents[intentHash].status;
    }

    /// @notice Get intent details
    function getIntent(bytes32 intentHash) external view returns (AgentIntent memory) {
        return intentDetails[intentHash];
    }

    /// @notice Allow contract to receive ETH
    receive() external payable {}

    /// @notice Withdraw stuck funds (admin function)
    function withdraw(address payable to, uint256 amount) external {
        // In production, add access control
        (bool success, ) = to.call{value: amount}("");
        if (!success) {
            revert TransferFailed();
        }
    }
}

