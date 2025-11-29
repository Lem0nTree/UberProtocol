// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("MockUSDC", "USDC") {
        _mint(msg.sender, 100000 * 10**decimals()); // Mint 100,000 tokens to deployer
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}


