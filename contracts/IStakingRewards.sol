// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;

interface IStakingRewards {
  function balanceOf(address owner) external view returns (uint);
  event Staked(address indexed user, uint256 amount);
  function rewardsToken() external view returns (address);
  function earned(address account) external view returns (uint256);
}
