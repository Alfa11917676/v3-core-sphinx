// SPDX-License-Identifier: UNLICENSED
pragma solidity <=0.8.0;
import {IUniswapV3Pool} from "../interfaces/IUniswapV3Pool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "hardhat/console.sol";
contract HelpCaller {
    
    address public token0;
    address public token1;
    address public pool;
    
    constructor(address _token0, address _token1, address _pool) {
        token0 = _token0;
        token1 = _token1;
        pool = _pool;
    }

    function callMint(
        int24 tickLower,
        int24 tickUpper,
        uint128 amount,
        bytes calldata data
    ) external {
        IUniswapV3Pool(pool).mint(msg.sender, tickLower, tickUpper, amount, data);
    }
    
    function uniswapV3MintCallback(
        uint256 amount0Owed,
        uint256 amount1Owed,
        bytes calldata data
    ) external {
        // do nothing
        if (amount0Owed > 0 || amount1Owed > 0) {
           IERC20(token0).transfer(pool, amount0Owed);
           IERC20(token1).transfer(pool, amount1Owed);
        }
        else {
            console.log('problem here');
            revert("HelpCaller: no tokens to transfer");
        }
    }
    
    function callSwap(
       bool zeroForOne,
       int256 amountSpecified,
       uint160 sqrtPriceLimitX96,
       bytes calldata data
    ) external {
        IUniswapV3Pool(pool).swap(msg.sender,zeroForOne,amountSpecified,sqrtPriceLimitX96,data);
    }
    
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external {
        // do nothing
        if (amount0Delta > 0) {
           IERC20(token0).transfer(pool, uint256(amount0Delta));
        }
        if (amount1Delta > 0) {
           IERC20(token1).transfer(pool, uint256(amount1Delta));
        }
    }
    

}
