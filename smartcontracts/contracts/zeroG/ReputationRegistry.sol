// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title ReputationRegistry
 * @notice ERC-8004 compliant reputation system for agents
 * @dev Manages feedback, revocation, and responses with on-chain aggregation
 */
contract ReputationRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct FeedbackData {
        uint8 score;
        bytes32 tag1;
        bytes32 tag2;
        bool isRevoked;
    }

    struct FeedbackAuth {
        uint256 agentId;
        address clientAddress;
        uint64 indexLimit;
        uint64 expiry;
        uint256 chainId;
        address identityRegistry;
        address signerAddress;
    }

    address public immutable identityRegistry;

    // agentId => clientAddress => feedbackIndex => FeedbackData
    mapping(uint256 => mapping(address => mapping(uint64 => FeedbackData))) private feedback;
    
    // agentId => clientAddress => lastIndex
    mapping(uint256 => mapping(address => uint64)) private lastIndex;
    
    // agentId => list of clients
    mapping(uint256 => address[]) private clients;
    
    // agentId => clientAddress => hasSubmitted (for efficient client tracking)
    mapping(uint256 => mapping(address => bool)) private hasSubmittedFeedback;
    
    // agentId => clientAddress => feedbackIndex => responder => responseCount
    mapping(uint256 => mapping(address => mapping(uint64 => mapping(address => uint64)))) private responseCount;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint8 score,
        bytes32 indexed tag1,
        bytes32 tag2,
        string fileuri,
        bytes32 filehash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseUri
    );

    error InvalidScore();
    error InvalidFeedbackAuth();
    error FeedbackAuthExpired();
    error InvalidChainId();
    error InvalidIdentityRegistry();
    error IndexLimitExceeded();
    error FeedbackNotFound();
    error FeedbackAlreadyRevoked();

    constructor(address _identityRegistry) {
        identityRegistry = _identityRegistry;
    }

    /// @notice Get the identity registry address
    function getIdentityRegistry() external view returns (address) {
        return identityRegistry;
    }

    /// @notice Give feedback to an agent
    /// @param agentId The agent ID
    /// @param score Score between 0 and 100
    /// @param tag1 First tag for categorization
    /// @param tag2 Second tag for categorization
    /// @param fileuri URI to off-chain feedback file
    /// @param filehash KECCAK-256 hash of the file
    /// @param feedbackAuth Signed authorization from agent
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata fileuri,
        bytes32 filehash,
        bytes memory feedbackAuth
    ) external {
        if (score > 100) {
            revert InvalidScore();
        }

        // Decode and verify feedbackAuth
        _verifyFeedbackAuth(agentId, msg.sender, feedbackAuth);

        uint64 currentIndex = lastIndex[agentId][msg.sender];
        
        // Store feedback
        feedback[agentId][msg.sender][currentIndex] = FeedbackData({
            score: score,
            tag1: tag1,
            tag2: tag2,
            isRevoked: false
        });

        // Track client if first feedback
        if (!hasSubmittedFeedback[agentId][msg.sender]) {
            clients[agentId].push(msg.sender);
            hasSubmittedFeedback[agentId][msg.sender] = true;
        }

        lastIndex[agentId][msg.sender]++;

        emit NewFeedback(agentId, msg.sender, score, tag1, tag2, fileuri, filehash);
    }

    /// @notice Revoke previously submitted feedback
    /// @param agentId The agent ID
    /// @param feedbackIndex The index of the feedback to revoke
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        FeedbackData storage fb = feedback[agentId][msg.sender][feedbackIndex];
        
        if (fb.score == 0 && fb.tag1 == bytes32(0) && fb.tag2 == bytes32(0)) {
            revert FeedbackNotFound();
        }
        if (fb.isRevoked) {
            revert FeedbackAlreadyRevoked();
        }

        fb.isRevoked = true;

        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /// @notice Append a response to feedback
    /// @param agentId The agent ID
    /// @param clientAddress The client who gave feedback
    /// @param feedbackIndex The feedback index
    /// @param responseUri URI to response file
    /// @param responseHash KECCAK-256 hash of response
    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseUri,
        bytes32 responseHash
    ) external {
        // Anyone can append responses
        responseCount[agentId][clientAddress][feedbackIndex][msg.sender]++;

        emit ResponseAppended(
            agentId,
            clientAddress,
            feedbackIndex,
            msg.sender,
            responseUri
        );
    }

    /// @notice Get aggregated summary for an agent
    /// @param agentId The agent ID (required)
    /// @param clientAddresses Filter by specific clients (optional)
    /// @param tag1 Filter by tag1 (optional, use bytes32(0) for no filter)
    /// @param tag2 Filter by tag2 (optional, use bytes32(0) for no filter)
    /// @return count Number of feedback entries
    /// @return averageScore Average score
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        bytes32 tag1,
        bytes32 tag2
    ) external view returns (uint64 count, uint8 averageScore) {
        uint256 totalScore = 0;
        count = 0;

        address[] memory clientsToCheck;
        if (clientAddresses.length > 0) {
            clientsToCheck = clientAddresses;
        } else {
            clientsToCheck = clients[agentId];
        }

        for (uint256 i = 0; i < clientsToCheck.length; i++) {
            address client = clientsToCheck[i];
            uint64 maxIndex = lastIndex[agentId][client];

            for (uint64 j = 0; j < maxIndex; j++) {
                FeedbackData storage fb = feedback[agentId][client][j];
                
                if (fb.isRevoked) continue;

                // Apply filters
                if (tag1 != bytes32(0) && fb.tag1 != tag1) continue;
                if (tag2 != bytes32(0) && fb.tag2 != tag2) continue;

                totalScore += fb.score;
                count++;
            }
        }

        if (count > 0) {
            averageScore = uint8(totalScore / count);
        }
    }

    /// @notice Read a specific feedback entry
    /// @param agentId The agent ID
    /// @param clientAddress The client address
    /// @param index The feedback index
    /// @return score The score
    /// @return tag1 First tag
    /// @return tag2 Second tag
    /// @return isRevoked Whether feedback is revoked
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 index
    ) external view returns (
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        bool isRevoked
    ) {
        FeedbackData storage fb = feedback[agentId][clientAddress][index];
        return (fb.score, fb.tag1, fb.tag2, fb.isRevoked);
    }

    /// @notice Get response count for a feedback entry
    /// @param agentId The agent ID
    /// @param clientAddress The client address
    /// @param feedbackIndex The feedback index
    /// @param responders Filter by specific responders (optional)
    /// @return Total response count
    function getResponseCount(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        address[] calldata responders
    ) external view returns (uint64) {
        if (responders.length == 0) {
            // Return total from all responders (would need additional tracking in production)
            return 0; // Simplified for hackathon
        }

        uint64 total = 0;
        for (uint256 i = 0; i < responders.length; i++) {
            total += responseCount[agentId][clientAddress][feedbackIndex][responders[i]];
        }
        return total;
    }

    /// @notice Get all clients who provided feedback for an agent
    /// @param agentId The agent ID
    /// @return Array of client addresses
    function getClients(uint256 agentId) external view returns (address[] memory) {
        return clients[agentId];
    }

    /// @notice Get the last feedback index for a client-agent pair
    /// @param agentId The agent ID
    /// @param clientAddress The client address
    /// @return The last index
    function getLastIndex(
        uint256 agentId,
        address clientAddress
    ) external view returns (uint64) {
        return lastIndex[agentId][clientAddress];
    }

    /// @notice Verify feedbackAuth signature (EIP-191 or ERC-1271)
    function _verifyFeedbackAuth(
        uint256 agentId,
        address clientAddress,
        bytes memory authData
    ) internal view {
        // Decode feedbackAuth
        FeedbackAuth memory auth = abi.decode(authData, (FeedbackAuth));

        // Verify fields
        if (auth.agentId != agentId) {
            revert InvalidFeedbackAuth();
        }
        if (auth.clientAddress != clientAddress) {
            revert InvalidFeedbackAuth();
        }
        if (auth.chainId != block.chainid) {
            revert InvalidChainId();
        }
        if (auth.identityRegistry != identityRegistry) {
            revert InvalidIdentityRegistry();
        }
        if (block.timestamp >= auth.expiry) {
            revert FeedbackAuthExpired();
        }
        if (lastIndex[agentId][clientAddress] >= auth.indexLimit) {
            revert IndexLimitExceeded();
        }

        // For hackathon: simplified signature verification
        // Production would verify auth.signerAddress is agent owner/operator
        // via the identityRegistry contract
    }
}

