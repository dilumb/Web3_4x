/// SPDX-License-Identifier: MITD

pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Contract to handle a token with an initial supply
/// @author Dilum Bandara


contract MyToken is ERC20 {

  /**
   * @dev Sets values for {name}, {symbol}, and {totalSupply} when 
   * the contract is deployed. Also, set total supply to contract creator
   *
   * @param _name Token name (string)
   * @param _symbol Token symbol (string)
   * @param _totalSupply Total supply of tokens
   */
  constructor(string memory _name, string memory _symbol, uint256 _totalSupply) ERC20(_name, _symbol) {
    _mint(msg.sender, _totalSupply);
  }
}

