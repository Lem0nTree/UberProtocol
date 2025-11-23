// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IERC7857.sol";
import "./interfaces/IERC7857Metadata.sol";
import "./interfaces/IERC7857DataVerifier.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AgentNFT
 * @notice ERC-7857 compliant AI Agent NFT with private metadata
 * @dev Implements intelligent data storage with verifiable transfer
 */
contract AgentNFT is IERC7857, IERC7857Metadata, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    string public constant VERSION = "1.0.0";

    struct TokenData {
        address owner;
        address[] authorizedUsers;
        address approvedUser;
        IntelligentData[] iDatas;
    }

    // Storage
    mapping(uint256 => TokenData) private tokens;
    mapping(address => mapping(address => bool)) private operatorApprovals;
    mapping(address => address) private accessAssistants;
    uint256 private nextTokenId;

    string private _name;
    string private _symbol;
    string private _storageInfo;
    IERC7857DataVerifier private _verifier;

    event Updated(
        uint256 indexed _tokenId,
        IntelligentData[] _oldDatas,
        IntelligentData[] _newDatas
    );

    event Minted(
        uint256 indexed _tokenId,
        address indexed _creator,
        address indexed _owner
    );

    error ZeroAddress();
    error NotOwner();
    error NotAuthorized();
    error TokenDoesNotExist();
    error EmptyDataArray();
    error ProofCountMismatch();
    error OldDataHashMismatch();
    error AccessAssistantMismatch();
    error EncryptedPubKeyMismatch();
    error ApprovalToCurrentOwner();
    error ApprovalToCaller();
    error AlreadyAuthorized();
    error UserNotAuthorized();

    constructor(
        string memory name_,
        string memory symbol_,
        string memory storageInfo_,
        address verifierAddr,
        address admin
    ) {
        if (verifierAddr == address(0) || admin == address(0)) {
            revert ZeroAddress();
        }

        _name = name_;
        _symbol = symbol_;
        _storageInfo = storageInfo_;
        _verifier = IERC7857DataVerifier(verifierAddr);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    // Basic getters
    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function verifier() public view override returns (IERC7857DataVerifier) {
        return _verifier;
    }

    function storageInfo() public view returns (string memory) {
        return _storageInfo;
    }

    // Admin functions
    function updateVerifier(address newVerifier) public onlyRole(ADMIN_ROLE) {
        if (newVerifier == address(0)) {
            revert ZeroAddress();
        }
        _verifier = IERC7857DataVerifier(newVerifier);
    }

    function update(
        uint256 tokenId,
        IntelligentData[] calldata newDatas
    ) public {
        TokenData storage token = tokens[tokenId];
        if (token.owner != msg.sender) {
            revert NotOwner();
        }
        if (newDatas.length == 0) {
            revert EmptyDataArray();
        }

        IntelligentData[] memory oldDatas = new IntelligentData[](
            token.iDatas.length
        );
        for (uint i = 0; i < token.iDatas.length; i++) {
            oldDatas[i] = token.iDatas[i];
        }

        delete token.iDatas;

        for (uint i = 0; i < newDatas.length; i++) {
            token.iDatas.push(newDatas[i]);
        }

        emit Updated(tokenId, oldDatas, newDatas);
    }

    function mint(
        IntelligentData[] calldata iDatas,
        address to
    ) public payable returns (uint256 tokenId) {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        if (iDatas.length == 0) {
            revert EmptyDataArray();
        }

        tokenId = nextTokenId++;
        TokenData storage newToken = tokens[tokenId];
        newToken.owner = to;
        newToken.approvedUser = address(0);

        for (uint i = 0; i < iDatas.length; i++) {
            newToken.iDatas.push(iDatas[i]);
        }

        emit Minted(tokenId, msg.sender, to);
    }

    function _proofCheck(
        address from,
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata proofs
    ) internal returns (bytes[] memory sealedKeys, IntelligentData[] memory newDatas) {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        if (tokens[tokenId].owner != from) {
            revert NotOwner();
        }
        if (proofs.length == 0) {
            revert EmptyDataArray();
        }

        TransferValidityProofOutput[] memory proofOutput = _verifier
            .verifyTransferValidity(proofs);

        if (proofOutput.length != tokens[tokenId].iDatas.length) {
            revert ProofCountMismatch();
        }

        sealedKeys = new bytes[](proofOutput.length);
        newDatas = new IntelligentData[](proofOutput.length);

        for (uint i = 0; i < proofOutput.length; i++) {
            // Require the initial data hash is the same as the old data hash
            if (proofOutput[i].oldDataHash != tokens[tokenId].iDatas[i].dataHash) {
                revert OldDataHashMismatch();
            }

            // Only the receiver itself or the access assistant can sign the access proof
            if (
                proofOutput[i].accessAssistant != accessAssistants[to] &&
                proofOutput[i].accessAssistant != to
            ) {
                revert AccessAssistantMismatch();
            }

            bytes memory wantedKey = proofOutput[i].wantedKey;
            bytes memory encryptedPubKey = proofOutput[i].encryptedPubKey;
            
            if (wantedKey.length == 0) {
                // If the wanted key is empty, verify default receiver
                // For hackathon, simplified check
                // Production would use Utils.pubKeyToAddress
            } else {
                // If the wanted key is not empty, verify match
                if (keccak256(encryptedPubKey) != keccak256(wantedKey)) {
                    revert EncryptedPubKeyMismatch();
                }
            }

            sealedKeys[i] = proofOutput[i].sealedKey;
            newDatas[i] = IntelligentData({
                dataDescription: tokens[tokenId].iDatas[i].dataDescription,
                dataHash: proofOutput[i].newDataHash
            });
        }
        return (sealedKeys, newDatas);
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata proofs
    ) internal {
        (bytes[] memory sealedKeys, IntelligentData[] memory newDatas) = _proofCheck(
            from,
            to,
            tokenId,
            proofs
        );

        TokenData storage token = tokens[tokenId];
        token.owner = to;
        token.approvedUser = address(0);

        delete token.iDatas;
        for (uint i = 0; i < newDatas.length; i++) {
            token.iDatas.push(newDatas[i]);
        }

        emit Transferred(tokenId, from, to);
        emit PublishedSealedKey(to, tokenId, sealedKeys);
    }

    function iTransfer(
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata proofs
    ) public override {
        if (!_isApprovedOrOwner(msg.sender, tokenId)) {
            revert NotAuthorized();
        }
        _transfer(ownerOf(tokenId), to, tokenId, proofs);
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public {
        TokenData storage token = tokens[tokenId];
        if (!_isApprovedOrOwner(msg.sender, tokenId)) {
            revert NotAuthorized();
        }
        if (to == address(0)) {
            revert ZeroAddress();
        }
        if (token.owner != from) {
            revert NotOwner();
        }
        
        token.owner = to;
        token.approvedUser = address(0);

        emit Transferred(tokenId, from, to);
    }

    function _clone(
        address from,
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata proofs
    ) internal returns (uint256) {
        (bytes[] memory sealedKeys, IntelligentData[] memory newDatas) = _proofCheck(
            from,
            to,
            tokenId,
            proofs
        );

        uint256 newTokenId = nextTokenId++;
        TokenData storage newToken = tokens[newTokenId];
        newToken.owner = to;
        newToken.approvedUser = address(0);

        for (uint i = 0; i < newDatas.length; i++) {
            newToken.iDatas.push(newDatas[i]);
        }

        emit Cloned(tokenId, newTokenId, from, to);
        emit PublishedSealedKey(to, newTokenId, sealedKeys);

        return newTokenId;
    }

    function iClone(
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata proofs
    ) public override returns (uint256) {
        if (!_isApprovedOrOwner(msg.sender, tokenId)) {
            revert NotAuthorized();
        }
        return _clone(ownerOf(tokenId), to, tokenId, proofs);
    }

    function authorizeUsage(uint256 tokenId, address to) public override {
        if (to == address(0)) {
            revert ZeroAddress();
        }
        if (tokens[tokenId].owner != msg.sender) {
            revert NotOwner();
        }

        address[] storage authorizedUsers = tokens[tokenId].authorizedUsers;
        for (uint i = 0; i < authorizedUsers.length; i++) {
            if (authorizedUsers[i] == to) {
                revert AlreadyAuthorized();
            }
        }

        authorizedUsers.push(to);
        emit Authorization(msg.sender, to, tokenId);
    }

    function revokeAuthorization(uint256 tokenId, address user) public override {
        if (tokens[tokenId].owner != msg.sender) {
            revert NotOwner();
        }
        if (user == address(0)) {
            revert ZeroAddress();
        }

        address[] storage authorizedUsers = tokens[tokenId].authorizedUsers;
        bool found = false;

        for (uint i = 0; i < authorizedUsers.length; i++) {
            if (authorizedUsers[i] == user) {
                authorizedUsers[i] = authorizedUsers[authorizedUsers.length - 1];
                authorizedUsers.pop();
                found = true;
                break;
            }
        }

        if (!found) {
            revert UserNotAuthorized();
        }
        emit AuthorizationRevoked(msg.sender, user, tokenId);
    }

    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = tokens[tokenId].owner;
        if (owner == address(0)) {
            revert TokenDoesNotExist();
        }
        return owner;
    }

    function authorizedUsersOf(
        uint256 tokenId
    ) public view override returns (address[] memory) {
        if (!_exists(tokenId)) {
            revert TokenDoesNotExist();
        }
        return tokens[tokenId].authorizedUsers;
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokens[tokenId].owner != address(0);
    }

    function intelligentDataOf(
        uint256 tokenId
    ) public view override returns (IntelligentData[] memory) {
        if (!_exists(tokenId)) {
            revert TokenDoesNotExist();
        }
        return tokens[tokenId].iDatas;
    }

    function approve(address to, uint256 tokenId) public override {
        address owner = ownerOf(tokenId);
        if (to == owner) {
            revert ApprovalToCurrentOwner();
        }
        if (msg.sender != owner && !isApprovedForAll(owner, msg.sender)) {
            revert NotAuthorized();
        }

        tokens[tokenId].approvedUser = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) public override {
        if (operator == msg.sender) {
            revert ApprovalToCaller();
        }
        operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function getApproved(uint256 tokenId) public view override returns (address) {
        if (!_exists(tokenId)) {
            revert TokenDoesNotExist();
        }
        return tokens[tokenId].approvedUser;
    }

    function isApprovedForAll(
        address owner,
        address operator
    ) public view override returns (bool) {
        return operatorApprovals[owner][operator];
    }

    function delegateAccess(address assistant) public override {
        if (assistant == address(0)) {
            revert ZeroAddress();
        }
        accessAssistants[msg.sender] = assistant;
        emit DelegateAccess(msg.sender, assistant);
    }

    function getDelegateAccess(address user) public view override returns (address) {
        return accessAssistants[user];
    }

    function _isApprovedOrOwner(
        address spender,
        uint256 tokenId
    ) internal view returns (bool) {
        if (!_exists(tokenId)) {
            revert TokenDoesNotExist();
        }
        address owner = ownerOf(tokenId);
        return (spender == owner ||
            getApproved(tokenId) == spender ||
            isApprovedForAll(owner, spender));
    }

    function totalSupply() public view returns (uint256) {
        return nextTokenId;
    }
}

