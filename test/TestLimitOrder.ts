import {ethers} from 'hardhat';
import {expect} from 'chai';
import {UniswapV3Factory} from '../typechain/UniswapV3Factory';
import {encodePriceSqrt} from './shared/utilities';
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {UniswapV3Pool} from "../typechain";
import {Contract} from "ethers";

describe('UniswapV3Pool Limit Order Assignment', () => {
    let user1:SignerWithAddress, factory: Contract, pool: Contract, token0: Contract, token1: Contract, helper:Contract, erc1155:Contract;
    before(async () => {
        [user1] = await ethers.getSigners();
        const UniswapV3Factory = await ethers.getContractFactory('UniswapV3Factory');
        factory = await UniswapV3Factory.deploy();

        const TestToken = await ethers.getContractFactory('TestERC20');
        token0 = await TestToken.deploy(ethers.utils.parseEther('1000000000000'));
        token1 = await TestToken.deploy(ethers.utils.parseEther('1000000000000'));

        await factory.createPool(token0.address, token1.address, 3000);


        let poolAddress = await factory.getPool(token0.address, token1.address, 3000);
        let ERC1155 = await ethers.getContractFactory('UniswapV3ERC1155');
        erc1155 = await ERC1155.deploy(poolAddress);

        pool = await ethers.getContractAt('UniswapV3Pool', poolAddress);
        //


        expect(await pool.token0()).to.eq(token1.address);
        expect(await pool.token1()).to.eq(token0.address);
        expect(await pool.fee()).to.eq(3000);


        const UniswapV3Helper = await ethers.getContractFactory('HelpCaller');
        helper = await UniswapV3Helper.deploy(token1.address, token0.address, pool.address);


        await token0.transfer(helper.address, ethers.utils.parseEther('10000'));
        await token1.transfer(helper.address, ethers.utils.parseEther('10000'));
    });

    it("Check if contract is initialized", async()=> {
        let params = getParams();
        let price = encodePriceSqrt(1, 1);
        let tx = await pool.initialize(params[6]);
        await tx.wait();
        expect(await pool.tickSpacing()).to.eq(60);

        await expect(pool.initialize(params[6])).to.be.revertedWith('AI');
    })

    it("Provide liquidity", async()=> {

        await token0.connect(user1).approve(pool.address, ethers.utils.parseEther('100'));
        await token1.connect(user1).approve(pool.address, ethers.utils.parseEther('10000'));

        let params = getParams();

        await helper.connect(user1).callMint(
            params[3],
            params[4],
            params[5],
            ethers.constants.AddressZero
        );

        console.log("Liquidity provided successfully");
    });

    it ("Place limit order", async()=> {

        await pool.setUniswapV3ERC1155(erc1155.address);
        await token0.connect(user1).approve(pool.address, ethers.utils.parseEther('100'));
        await token1.connect(user1).approve(pool.address, ethers.utils.parseEther('5000'));

        // Create Limit Order
        await pool.createLimitOrder(
            user1.address,
            84222,
            ethers.utils.parseEther('5000'),
            true
        );

        console.log("Limit order created successfully");
        await expect(erc1155.balanceOf(user1.address, await pool.getTokenId(84222,true))).to.eq(ethers.utils.parseEther('5000'));
    });


    it ("Simulating the env so that the limit order gets executed", async()=> {
        await helper.connect(user1).callSwap(
            true,
            ethers.utils.parseEther('5000'),
            getParams()[6],
            ethers.constants.AddressZero
        );

        console.log("Limit order executed successfully");

    });

    it ("Check if the limit order is executed", async()=> {

        let amount = await pool.tokenIdClaimable(await pool.getTokenId(84222,true));
        expect(amount).to.eq(ethers.utils.parseEther('1'));

        let previousBalance = await token0.balanceOf(user1.address);
        await pool.connect(user1).claimLimitOrder(84222,true,ethers.utils.parseEther('5000'));
        expect(await token0.balanceOf(user1.address)).to.eq(previousBalance+ethers.utils.parseEther('1'));

    })


})


function getParams() {
    return [
        ethers.utils.parseEther('1'),
        ethers.utils.parseEther('5000'),
        85176,
        84222,
        86129,
        '1517882343751509868544',
        '5602277097478614198912276234240',
        true,
        true
    ];
}
