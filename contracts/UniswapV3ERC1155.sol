// SPDX-License-Identifier: UNLICENSED
pragma solidity <=0.8.0;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
contract UniswapV3ERC1155 is ERC1155 {
    
    address public executor;
    
    modifier onlyExecutor() {
        require(msg.sender == executor, "UniswapV3ERC1155: Only executor can call this function");
        _;
    }
    
    constructor(address _executor) ERC1155("") {
        executor = _executor;
    }

    function mint(address to, uint256 tokenId, uint256 amount) external onlyExecutor {
        _mint(to, tokenId, amount, "");
    }
    
    function burn(address account, uint256 id, uint256 amount) external onlyExecutor {
        _burn(account, id, amount);
    }
}
