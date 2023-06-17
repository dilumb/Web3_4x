/// SPDX-License-Identifier: MIT

/// @title Helper to compile contracts
/// @author Dilum Bandara

const fs = require('fs')
const fsExtra = require('fs-extra')
const path = require('path')
const solc = require('solc')

/**
 * Find files to import
 * @param {string} path Path to import
 * @returns {any} Contract code as an object
 */
const findImports = (path: string): any => {
    try {
        return {
            contents: fs.readFileSync(`node_modules/${path}`, 'utf8')
        }
    } catch (e: any) {
        return {
            error: e.message
        }
    }
}

/**
 * Writes contracts from the compiled sources into JSON files
 * @param {any} compiled Object containing the compiled contracts
 * @param {string} buildPath Path of the build folder
 */
export const writeOutput = (compiled: any, buildPath: string) => {
    fsExtra.ensureDirSync(buildPath)    // Make sure directory exists

    for (let contractFileName in compiled.contracts) {
        const contractName = contractFileName.replace('.sol', '')
        console.log('Writing: ', contractName + '.json to ' + buildPath)
        console.log(path.resolve(buildPath, contractName + '.json'))
        fsExtra.outputJsonSync(
            path.resolve(buildPath, contractName + '.json'),
            compiled.contracts
        )
    }
}

/**
 * Compile Solidity contracts
 * @param {Array<string>} names List of contract names
 * @return An object with compiled contracts
 */
export const compileSols = (names: string[]): any => {
    // Collection of Solidity source files
    interface SolSourceCollection {
        [key: string]: any
    }

    let sources: SolSourceCollection = {}

    names.forEach((value: string, index: number, array: string[]) => {
        let file = fs.readFileSync(`contracts/${value}.sol`, 'utf8')
        sources[value] = {
            content: file
        }
    })

    let input = {
        language: 'Solidity',
        sources,
        settings: {
            outputSelection: {
                '*': {
                    '*': ['*']
                }
            },
            // evmVersion: 'berlin' //Uncomment this line if using Ganache GUI
        }
    }

    // Compile all contracts
    try {
        return JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }))
    } catch (error) {
        console.log(error);
    }
}
