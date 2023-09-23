# Sphinx Arnab Assingment

## Introduction
This repository contains the code for the assignment given by [Sphinx]( https://github.com/parketh). 
In this assignment I was suppose to implement limit order on Uniswap-V3 core smart contracts `on-chain`.

## Implementation
For the implementation I have used the following contracts:
`UniswapV3Pool.sol`
`HelpCaller.sol`
`UniswapV3ERC1155.sol`

## How to run
To run the code you need to have `node` and `npm` installed on your system.
After that you need to install `hardhat` and `ethers` using the following commands:
<br>`npx hardhat compile`

`npx hardhat test`

## Approach
I have used the following approach to implement the limit order:
<h3>OrderCreation:</h3>
At first the Limit Order is placed by the user, and the order is stored in the contract, and as a proof for the order
ERC1155 tokens are minted to the user according to the tick range of the order.
<br>
The tokenID of the ERC1155 is calculated by ```uint256(keccak256(abi.encodePacked(tick, orderSide)))```
<br>
```solidity
 function createLimitOrder(
        address recipient,
        int24 tickLower,
        uint256 amount,
        bool zeroForOne
    ) external returns(int24){
    
        tickLower = _getTickLower(tickLower, tickSpacing);
        
        takeProfitPositions[tickLower][true] += int256(amount);
        
        uint256 tokenId = getTokenId(tickLower, zeroForOne);
        
        if (!tokenIdExists[tokenId]) {
            tokenIdExists[tokenId] = true;
            tokenIdData[tokenId] = TokenData({
                tick: tickLower,
                zeroForOne: zeroForOne
            });
        }
        
        uniswapV3ERC1155.mint(recipient, tokenId, amount);
        tokenIdTotalSupply[tokenId] += amount;
        
        address tokensToBeSoldContract = zeroForOne ? address(token0) : address(token1);
        
        IERC20Minimal(tokensToBeSoldContract).transferFrom(msg.sender, address(this), amount);
        
        return tickLower;
    }
  ```
<h3>Order Cancellation:</h3>
If the user wants to cancel the order, the user can call the `cancelLimitOrder` function with the input params of the
order. Here the user will receive the original amount of token deposited and the received ERC1155 tokens will be burned.
```solidity
 function cancelLimitOrder(address recipient, int24 tickLower, bool zeroForOne) external {
        tickLower = _getTickLower(tickLower, tickSpacing);
        
        uint256 tokenId = getTokenId(tickLower, zeroForOne);
        
        require(tokenIdExists[tokenId], "Token ID does not exist");
        
        uint256 amount = uniswapV3ERC1155.balanceOf(recipient, tokenId);
        
        require(amount > 0, "Amount must be greater than 0");
        
        uniswapV3ERC1155.burn(recipient, tokenId, amount);
        tokenIdTotalSupply[tokenId] -= amount;
        
        takeProfitPositions[tickLower][true] -= int256(amount);
        
        address tokensToBeSoldContract = zeroForOne ? address(token0) : address(token1);
        
        IERC20Minimal(tokensToBeSoldContract).transferFrom(address(this), recipient, amount);
    }
```
<h3>Creating Trigger:</h3>
After this, the trigger needs to be made, so that the order can be executed. 
So, in Limit order, the order is only executed when the tick/price of the token reaches to the user's desired price.
And this can only happen when a swap happened and it's after effects changed the current tick/price of the token to the user's desired price.
<br>
So, when the swap happens or pool is modified or updated, we are checking in the Pool contract if any Limit Order is 
present 
for the 
current 
tick/price using `checkOpenLimitOrders` function.
<br>
```solidity
  // In mint function
        checkOpenLimitOrders(tickLower, false);
        checkOpenLimitOrders(tickUpper, true);

  // In swap function
        checkOpenLimitOrders(tick, zeroForOne);
```
<h3>Working of the trigger:</h3>
In this function, the code loops over the currentLowerTick to the lastLowerTick and checks if any Limit Order is present for the current tick/price.
And if the code doesn't find any order to place it goes to the next tick by adding `tickSpacing` to the `lastLowerTick`.
<br>
Now, if any order is found it's executed and the swapped amount is stored in the contract and the `tokenIdClaimable` 
mapping is updated with the swapped amount.
<br>
```solidity
   function checkOpenLimitOrders(int24 latestTick, bool zeroForOne) internal {
        int24 currentLowerTick = _getTickLower(latestTick, tickSpacing);
        bool swapZeroForOne = !zeroForOne;
        int256 swapAmountIn;
        
        if (lastTickLower < currentLowerTick) {
            for (int24 tick = lastTickLower; tick < currentLowerTick; tick += tickSpacing) {
                swapAmountIn = takeProfitPositions[tick][swapZeroForOne];
                if (swapAmountIn > 0) {
                    fulfillLimitOrder(tick, swapZeroForOne, swapAmountIn);
                }
            }
        } else {
            for (int24 tick = lastTickLower; tick > currentLowerTick; tick -= tickSpacing) {
                swapAmountIn = takeProfitPositions[tick][swapZeroForOne];
                if (swapAmountIn > 0) {
                    fulfillLimitOrder(tick, swapZeroForOne, swapAmountIn);
                }
            }
        }
        lastTickLower = currentLowerTick;
    }
  ```
<h3>Post Trigger Processes:</h3>
Now, the user can claim the swapped amount by calling the `claimLimitOrder` function with the input params of the 
order. Here the user can claim the swapped amount if the order is executed, else the user will received the original 
amount of token deposited.

```solidity
  function claimLimitOrder(int24 tick, bool zeroForOne, uint256 amountIn) external {
	uint256 tokenId = getTokenId(tick, zeroForOne);
	
	uint256 balance = uniswapV3ERC1155.balanceOf(msg.sender, tokenId);
	
	require(balance > 0, "Amount must be greater than 0");
	
	uint256 claimableAmount =  amountIn.mulDivDown(
		tokenIdClaimable[tokenId],
		tokenIdTotalSupply[tokenId]
	);
	
	tokenIdClaimable[tokenId] -= claimableAmount;
	tokenIdTotalSupply[tokenId] -= amountIn;
	
	
	uniswapV3ERC1155.burn(msg.sender, tokenId, amountIn);
	if (claimableAmount > 0) {
		address tokensToBeSoldContract = zeroForOne ? address(token0) : address(token1);
		IERC20Minimal(tokensToBeReceived).transfer(msg.sender, claimableAmount);
	}
	else {
		address tokensToBeReceived = zeroForOne ? address (token0) : address (token1);
		IERC20Minimal(tokensToBeReceived).transfer(msg.sender, amountIn);
	}
}
```

## Limitations
The current implementation has the following limitations:
1. The current implementation only supports even decimal pair token.
2. Partial order execution is not supported.
3. The current implementation can be much more gas optimised.
4. Due to time constraints, I was not able to write all the required tests for the implementation.


