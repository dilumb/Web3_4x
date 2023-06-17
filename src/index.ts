/// SPDX-License-Identifier: MIT

/// @title Deploy and interact with MyToken contract
/// @author Dilum Bandara

import { compileSols, writeOutput } from './solc-lib'
const { Web3, ETH_DATA_FORMAT, DEFAULT_RETURN_FORMAT } = require('web3');
import type { Web3BaseProvider, AbiStruct, Address } from 'web3-types'

let fs = require('fs')
const path = require('path');

/**
 * Helper class to calculate adjusted gas value that is higher than estimate
 */
class GasHelper {
    static gasMulptiplier = 1.2 // Increase by 20%

    /**
     * @param {string} gas Gas limit
     * @return {string} Adjusted gas limit
     */
    static gasPay(gasLimit: string) {
        return Math.ceil(Number(gasLimit) * GasHelper.gasMulptiplier).toString()
    }
}

/**
 * Init WebSocket provider
 * @return {Web3BaseProvider} Provider
 */
const initProvider = (): Web3BaseProvider => {
    try {
        const providerData = fs.readFileSync('eth_providers/providers.json', 'utf8')
        const providerJson = JSON.parse(providerData)

        //Enable one of the next 2 lines depending on Ganache CLI or GUI
        // const providerLink = providerJson['provider_link_ui']
        const providerLink = providerJson['provider_link_cli']

        return new Web3.providers.WebsocketProvider(providerLink)
    } catch (error) {
        throw 'Cannot read provider'
    }
}

/**
 * Get an account given its name
 * @param {typeof Web3} Web3 Web3 provider
 * @param {string} name Account name 
 */
const getAccount = (web3: typeof Web3, name: string) => {
    try {
        const accountData = fs.readFileSync('eth_accounts/accounts.json', 'utf8')
        const accountJson = JSON.parse(accountData)
        const accountPvtKey = accountJson[name]['pvtKey']

        // Build an account object given private key
        web3.eth.accounts.wallet.add(accountPvtKey)
    } catch (error) {
        throw 'Cannot read account'
    }
}

/**
 * Get ABI of given contract
 * @param {string} contractName Contract name
 * @param {string} buildPath Path of the build folder
 * @return {AbiStruct} ABI
 */
const getABI = (contractName: string, buildPath: string): AbiStruct => {
    try {
        const filePath = path.resolve(buildPath, contractName + '.json')
        const contractData = fs.readFileSync(filePath, 'utf8')
        const contractJson = JSON.parse(contractData)
        return contractJson[contractName][contractName].abi
    } catch (error) {
        throw 'Cannot read account'
    }
}

(async () => {

    let web3Provider: Web3BaseProvider
    let web3: typeof Web3
    const buildPath = path.resolve(__dirname, '');

    // Init Web3 provider
    try {
        web3Provider = initProvider()
        web3 = new Web3(web3Provider)
    } catch (error) {
        console.error(error)
        throw 'Web3 cannot be initialized.'
    }
    console.log('Connected to Web3 provider.')

    // Deploy contract as account 0
    const accountName = 'acc0'
    const contractName = 'MyToken'
    const tokenName = 'My Token'
    const tokenSymbol = 'MyT'
    const tokenTotalSupply = 100000

    try {
        getAccount(web3, 'acc0')
        getAccount(web3, 'acc1')
        getAccount(web3, 'acc2')
    } catch (error) {
        console.error(error)
        throw 'Cannot access accounts'
    }
    console.log('Accessing account: ' + accountName)
    let from = web3.eth.accounts.wallet[0].address

    // Compile contract and save it into a file for future use
    let compiledContract: any
    try {
        compiledContract = compileSols([contractName])
        writeOutput(compiledContract, buildPath)
    } catch (error) {
        console.error(error)
        throw 'Error while compiling contract'
    }
    console.log('Contract compiled')

    // Deploy contract
    const contract = new web3.eth.Contract(compiledContract.contracts[contractName][contractName].abi)
    const data = compiledContract.contracts[contractName][contractName].evm.bytecode.object
    const args = [tokenName, tokenSymbol, tokenTotalSupply]
    let contractAddress: Address

    // Deploy contract with given constructor arguments
    try {
        const contractSend = contract.deploy({
            data,
            arguments: args
        });

        // Get current average gas price
        const gasPrice = await web3.eth.getGasPrice(ETH_DATA_FORMAT)
        const gasLimit = await contractSend.estimateGas(
            { from },
            DEFAULT_RETURN_FORMAT, // the returned data will be formatted as a bigint
        );
        const tx = await contractSend.send({
            from,
            gasPrice,
            gas: GasHelper.gasPay(gasLimit)
        })
        console.log('Contract contract deployed at address: ' + tx.options.address)
        contractAddress = tx.options.address
    } catch (error) {
        console.error(error)
        throw 'Error while deploying contract'
    }

    // Transact with deployed contract
    
    const abi = getABI(contractName, buildPath)
    const contractDeployed = new web3.eth.Contract(abi, contractAddress)

    // Verify token symbol
    try {
        const symbol = await contractDeployed.methods.symbol().call()
        console.log(`Token symbol is: ${symbol}`)
    } catch (error) {
        console.error('Error while checking symbol')
        console.error(error)
    }

    // Verify total token supply
    try {
        const totalSupply = await contractDeployed.methods.totalSupply().call()
        console.log(`Token supply is: ${totalSupply}`)
    } catch (error) {
        console.error('Error while checking total supply')
        console.error(error)
    }

    // Check token balance as token deployer
    from = web3.eth.accounts.wallet[0].address
    try {
        const balance = await contractDeployed.methods.balanceOf(from).call()
        console.log(`Balance of token deployer is: ${balance}`)
    } catch (error) {
        console.error(error)
    }

    // Transfer tokens from address 0 to address 1 and check balance
    let to = web3.eth.accounts.wallet[1].address
    try {

        const gasPrice = await web3.eth.getGasPrice(ETH_DATA_FORMAT)
        const gasLimit = await contractDeployed.methods.transfer(to, 2000).estimateGas(
            { from },
            DEFAULT_RETURN_FORMAT, // the returned data will be formatted as a bigint
        );
        const tx = await contractDeployed.methods.transfer(to, 2000).send({
            from,
            gasPrice,
            gas: GasHelper.gasPay(gasLimit)
        })

        console.log(`20.00 tokens transferred from address ${from} to address ${to} in transaction ${tx.transactionHash}`)

        // Check balance as address 0 and 1
        const balance0 = await contractDeployed.methods.balanceOf(from).call()
        console.log(`Balance of address 0 is: ${balance0}`)

        const balance1 = await contractDeployed.methods.balanceOf(to).call()
        console.log(`Balance of address 1 is: ${balance1}`)

    } catch (error) {
        console.error('Error while transferring tokens and checking balance')
        console.error(error)
    }

    process.exitCode = 0

})()
