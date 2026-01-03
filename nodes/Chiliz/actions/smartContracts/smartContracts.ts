/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { jsonRpcRequest, chilizScanRequest } from '../../transport/client';
import { FAN_TOKENS, GAS_SETTINGS } from '../../constants/constants';
import {
  hexToBigInt,
  hexToNumber,
  hexToString,
  normalizeAddress,
  buildCallData,
  formatEventLogResponse,
} from '../../utils/helpers';
import type { IChilizCredentials, IEventLog } from '../../utils/types';

/**
 * Read from smart contract (view/pure function)
 */
export async function readContract(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const contractAddress = this.getNodeParameter('contractAddress', index) as string;
  const functionName = this.getNodeParameter('functionName', index) as string;
  const functionParams = this.getNodeParameter('functionParams', index, []) as IDataObject[];

  const normalizedAddress = normalizeAddress(contractAddress);

  // Build the call data from function name and params
  const params = functionParams.map((p) => ({
    type: p.type as string,
    value: p.value as string,
  }));

  const callData = buildCallData(functionName, params);

  try {
    const result = await jsonRpcRequest.call(this, 'eth_call', [
      {
        to: normalizedAddress,
        data: callData,
      },
      'latest',
    ]) as string;

    // Try to decode the result based on common return types
    let decodedResult: string | number | bigint = result;

    // Simple heuristic for decoding
    if (typeof result === 'string' && result.length === 66) {
      // Could be uint256
      decodedResult = hexToBigInt(result).toString();
    }

    return [
      {
        json: {
          contractAddress: normalizedAddress,
          functionName,
          rawResult: result,
          decodedResult,
        },
      },
    ];
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Contract call failed: ${(error as Error).message}`,
    );
  }
}

/**
 * Write to smart contract (state-changing function)
 */
export async function writeContract(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.privateKey) {
    throw new NodeOperationError(
      this.getNode(),
      'Private key is required for write operations. Please configure it in credentials.',
    );
  }

  const contractAddress = this.getNodeParameter('contractAddress', index) as string;
  const functionName = this.getNodeParameter('functionName', index) as string;
  const functionParams = this.getNodeParameter('functionParams', index, []) as IDataObject[];
  const value = this.getNodeParameter('value', index, '0') as string;
  const gasLimit = this.getNodeParameter('gasLimit', index, GAS_SETTINGS.contractInteractionGasLimit) as number;

  const normalizedAddress = normalizeAddress(contractAddress);

  const params = functionParams.map((p) => ({
    type: p.type as string,
    value: p.value as string,
  }));

  const callData = buildCallData(functionName, params);

  return [
    {
      json: {
        message: 'Contract write requires ethers.js integration for signing',
        contractAddress: normalizedAddress,
        functionName,
        callData,
        value,
        gasLimit,
        note: 'For full contract interaction, private key signing must be implemented',
      },
    },
  ];
}

/**
 * Get contract events/logs
 */
export async function getContractEvents(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const contractAddress = this.getNodeParameter('contractAddress', index) as string;
  const fromBlock = this.getNodeParameter('fromBlock', index, 'latest') as string | number;
  const toBlock = this.getNodeParameter('toBlock', index, 'latest') as string | number;
  const topics = this.getNodeParameter('topics', index, []) as string[];

  const normalizedAddress = normalizeAddress(contractAddress);

  const filterParams: IDataObject = {
    address: normalizedAddress,
    fromBlock: typeof fromBlock === 'number' ? `0x${fromBlock.toString(16)}` : fromBlock,
    toBlock: typeof toBlock === 'number' ? `0x${toBlock.toString(16)}` : toBlock,
  };

  if (topics && topics.length > 0) {
    filterParams.topics = topics.filter((t) => t !== '');
  }

  try {
    const logs = await jsonRpcRequest.call(this, 'eth_getLogs', [filterParams]);
    const logArray = logs as IDataObject[];

    const formattedLogs = logArray.map((log) => formatEventLogResponse(log));

    return formattedLogs.map((log) => ({ json: log as unknown as IDataObject }));
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to get contract events: ${(error as Error).message}`,
    );
  }
}

/**
 * Get Fan Token contract address by symbol
 */
export async function getFanTokenContract(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const tokenSymbol = this.getNodeParameter('tokenSymbol', index) as string;

  const tokenInfo = FAN_TOKENS[tokenSymbol.toUpperCase()];

  if (!tokenInfo) {
    return [
      {
        json: {
          symbol: tokenSymbol,
          found: false,
          message: `Fan token ${tokenSymbol} not found in known tokens list`,
          availableTokens: Object.keys(FAN_TOKENS),
        },
      },
    ];
  }

  return [
    {
      json: {
        symbol: tokenSymbol.toUpperCase(),
        name: tokenInfo.name,
        club: tokenInfo.club,
        address: tokenInfo.address,
        found: true,
      },
    },
  ];
}

/**
 * Verify contract on ChilizScan
 */
export async function getContractInfo(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const contractAddress = this.getNodeParameter('contractAddress', index) as string;
  const normalizedAddress = normalizeAddress(contractAddress);

  try {
    // Get contract code
    const code = await jsonRpcRequest.call(this, 'eth_getCode', [normalizedAddress, 'latest']);

    if (code === '0x' || code === '0x0') {
      return [
        {
          json: {
            address: normalizedAddress,
            isContract: false,
            message: 'Address is not a contract (EOA)',
          },
        },
      ];
    }

    // Try to get ABI from ChilizScan
    let abi = null;
    let verified = false;

    try {
      const abiResult = await chilizScanRequest.call(this, 'contract', 'getabi', {
        address: normalizedAddress,
      });
      if (abiResult && typeof abiResult === 'string' && abiResult !== 'Contract source code not verified') {
        abi = JSON.parse(abiResult);
        verified = true;
      }
    } catch {
      // ABI not available
    }

    return [
      {
        json: {
          address: normalizedAddress,
          isContract: true,
          codeSize: (code as string).length / 2 - 1, // bytes
          verified,
          abi: abi,
        },
      },
    ];
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to get contract info: ${(error as Error).message}`,
    );
  }
}

/**
 * Get contract source code from ChilizScan
 */
export async function getContractSource(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const contractAddress = this.getNodeParameter('contractAddress', index) as string;
  const normalizedAddress = normalizeAddress(contractAddress);

  try {
    const sourceResult = await chilizScanRequest.call(this, 'contract', 'getsourcecode', {
      address: normalizedAddress,
    });

    const sourceData = Array.isArray(sourceResult) ? sourceResult[0] : sourceResult;

    return [
      {
        json: {
          address: normalizedAddress,
          contractName: sourceData?.ContractName || '',
          compilerVersion: sourceData?.CompilerVersion || '',
          optimizationUsed: sourceData?.OptimizationUsed === '1',
          runs: sourceData?.Runs || 0,
          sourceCode: sourceData?.SourceCode || 'Not verified',
          abi: sourceData?.ABI || '',
          constructorArguments: sourceData?.ConstructorArguments || '',
          evmVersion: sourceData?.EVMVersion || '',
          library: sourceData?.Library || '',
          licenseType: sourceData?.LicenseType || '',
          proxy: sourceData?.Proxy || '0',
          implementation: sourceData?.Implementation || '',
        },
      },
    ];
  } catch (error) {
    return [
      {
        json: {
          address: normalizedAddress,
          message: 'Contract source not available',
          error: (error as Error).message,
        },
      },
    ];
  }
}
