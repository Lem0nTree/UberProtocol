// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentityRegistry
 * @notice ERC-8004 compliant agent identity registry using ERC-721
 * @dev Each agent is uniquely identified by an NFT tokenId (agentId)
 */
contract IdentityRegistry is ERC721URIStorage, Ownable {
    struct MetadataEntry {
        string key;
        bytes value;
    }

    uint256 private _nextAgentId;
    
    // agentId => key => value
    mapping(uint256 => mapping(string => bytes)) private _agentMetadata;

    event Registered(
        uint256 indexed agentId,
        string tokenURI,
        address indexed owner
    );

    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedKey,
        string key,
        bytes value
    );

    error ZeroAddress();
    error InvalidAgentId();
    error NotAgentOwnerOrOperator();

    constructor() ERC721("UberProtocol Agent Registry", "UAGENT") Ownable(msg.sender) {
        _nextAgentId = 1; // Start from 1
    }

    /// @notice Register a new agent with tokenURI and metadata
    /// @param tokenURI_ URI pointing to agent registration JSON
    /// @param metadata Array of metadata entries
    /// @return agentId The newly minted agent ID
    function register(
        string memory tokenURI_,
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, tokenURI_);

        for (uint256 i = 0; i < metadata.length; i++) {
            _agentMetadata[agentId][metadata[i].key] = metadata[i].value;
            emit MetadataSet(agentId, metadata[i].key, metadata[i].key, metadata[i].value);
        }

        emit Registered(agentId, tokenURI_, msg.sender);
    }

    /// @notice Register a new agent with tokenURI only
    /// @param tokenURI_ URI pointing to agent registration JSON
    /// @return agentId The newly minted agent ID
    function register(string memory tokenURI_) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, tokenURI_);

        emit Registered(agentId, tokenURI_, msg.sender);
    }

    /// @notice Register a new agent without tokenURI (set later)
    /// @return agentId The newly minted agent ID
    function register() external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);

        emit Registered(agentId, "", msg.sender);
    }

    /// @notice Set or update metadata for an agent
    /// @param agentId The agent ID
    /// @param key The metadata key
    /// @param value The metadata value
    function setMetadata(
        uint256 agentId,
        string calldata key,
        bytes calldata value
    ) external {
        if (!_isAgentOwnerOrOperator(agentId, msg.sender)) {
            revert NotAgentOwnerOrOperator();
        }

        _agentMetadata[agentId][key] = value;
        emit MetadataSet(agentId, key, key, value);
    }

    /// @notice Get metadata for an agent
    /// @param agentId The agent ID
    /// @param key The metadata key
    /// @return The metadata value
    function getMetadata(
        uint256 agentId,
        string calldata key
    ) external view returns (bytes memory) {
        if (ownerOf(agentId) == address(0)) {
            revert InvalidAgentId();
        }
        return _agentMetadata[agentId][key];
    }

    /// @notice Update tokenURI for an agent
    /// @param agentId The agent ID
    /// @param tokenURI_ New tokenURI
    function updateTokenURI(
        uint256 agentId,
        string memory tokenURI_
    ) external {
        if (!_isAgentOwnerOrOperator(agentId, msg.sender)) {
            revert NotAgentOwnerOrOperator();
        }
        _setTokenURI(agentId, tokenURI_);
    }

    /// @notice Get total number of registered agents
    /// @return Total supply of agent NFTs
    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    /// @notice Check if address is agent owner or approved operator
    function _isAgentOwnerOrOperator(
        uint256 agentId,
        address account
    ) internal view returns (bool) {
        address owner = ownerOf(agentId);
        return (account == owner || 
                isApprovedForAll(owner, account) || 
                getApproved(agentId) == account);
    }
}

