// SPDX-License-Identifier: UNLICENSED
pragma solidity <=0.8.0;
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
interface IUniswapV3ERC1155 is IERC1155 {
	
	function mint(address to, uint256 tokenId, uint256 amount) external;
	
	function burn(address account, uint256 id, uint256 amount) external;
	
	function balanceOf(address account, uint256 id) external view virtual override returns (uint256);
}
