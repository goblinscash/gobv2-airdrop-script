// SPDX-License-Identifier: MIT
pragma solidity ^0.7.0;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AirdropDistributor {
    event Airdrop(address indexed _wallet, uint256 _amount, address _tokenId);

    constructor() {
    }

    /// @dev Distribute ERC20 tokens to multiple wallets
    /// @param _erc20TokenAddress The address of the ERC20 token to distribute
    /// @param _wallets The array of wallet addresses to receive the tokens
    /// @param _amounts The array of amounts to distribute to each wallet
    /// @notice This function allows the caller to distribute ERC20 tokens to multiple wallets
    /// @notice The caller must have sufficient balance of the token to be distributed
    /// @notice The function will emit an Airdrop event for each wallet
    /// @notice The function will revert if the lengths of _wallets and _amounts do not match
    /// @notice The function will revert if the caller does not have sufficient balance of the token
    /// @notice The function will revert if the token transfer fails
    /// @notice The function will revert if the token is not approved for transfer
    function distributeTokens(address _erc20TokenAddress, address[] memory _wallets, uint256[] memory _amounts) external {
        uint256 _len = _wallets.length;
        require(_len == _amounts.length, "Wallets and amounts length mismatch");

        uint256 _sum;
        for (uint256 i = 0; i < _len; i++) {
            _sum += _amounts[i];
        }

        IERC20 token = IERC20(_erc20TokenAddress);
        require(_sum <= token.balanceOf(address(msg.sender)), "Insufficient balance");

        for (uint256 i = 0; i < _len; i++) {
            address _wallet = _wallets[i];
            uint256 _amount = _amounts[i];

            SafeERC20.safeTransferFrom(token, msg.sender, _wallet, _amount);
            emit Airdrop(_wallet, _amount, _erc20TokenAddress);
        }
    }
}