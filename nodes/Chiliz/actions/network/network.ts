/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { jsonRpcRequest, formatWeiToCHZ, getChainId, getNetworkDisplayName } from '../../transport/client';
import { NETWORKS } from '../../constants/constants';
import {
  hexToNumber,
  hexToBigInt,
  numberToHex,
  formatBlockResponse,
} from '../../utils/helpers';
import type { IChilizCredentials, INetworkStatus, IBlock } from '../../utils/types';

/**
 * Get network status
 */
export async function getNetworkStatus(
  this: IExecuteFunctions,
  _index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  // Get chain ID
  const chainIdHex = await jsonRpcRequest.call(this, 'eth_chainId', []);
  const chainId = hexToNumber(chainIdHex as string);

  // Get latest block number
  const blockNumberHex = await jsonRpcRequest.call(this, 'eth_blockNumber', []);
  const latestBlock = hexToNumber(blockNumberHex as string);

  // Get gas price
  const gasPriceHex = await jsonRpcRequest.call(this, 'eth_gasPrice', []);
  const gasPrice = hexToBigInt(gasPriceHex as string);

  // Try to get peer count
  let peerCount: number | undefined;
  try {
    const peerCountHex = await jsonRpcRequest.call(this, 'net_peerCount', []);
    peerCount = hexToNumber(peerCountHex as string);
  } catch {
    // net_peerCount not supported
  }

  // Get syncing status
  let syncing = false;
  try {
    const syncResult = await jsonRpcRequest.call(this, 'eth_syncing', []);
    syncing = syncResult !== false;
  } catch {
    // eth_syncing not supported
  }

  const networkStatus: INetworkStatus = {
    network: getNetworkDisplayName(credentials.network),
    chainId,
    latestBlock,
    gasPrice: gasPrice.toString(),
    gasPriceGwei: (gasPrice / BigInt(10 ** 9)).toString(),
    isHealthy: true,
    peerCount,
    syncing,
  } as INetworkStatus & { gasPriceGwei: string; syncing: boolean };

  return [{ json: networkStatus as unknown as IDataObject }];
}

/**
 * Get current gas price
 */
export async function getGasPrice(
  this: IExecuteFunctions,
  _index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  const gasPriceHex = await jsonRpcRequest.call(this, 'eth_gasPrice', []);
  const gasPrice = hexToBigInt(gasPriceHex as string);

  // Calculate common gas costs
  const standardTransfer = gasPrice * BigInt(21000);
  const tokenTransfer = gasPrice * BigInt(65000);
  const contractInteraction = gasPrice * BigInt(100000);

  return [
    {
      json: {
        network: getNetworkDisplayName(credentials.network),
        gasPrice: gasPrice.toString(),
        gasPriceGwei: (gasPrice / BigInt(10 ** 9)).toString(),
        gasPriceWei: gasPrice.toString(),
        estimatedCosts: {
          standardTransfer: {
            gas: 21000,
            costWei: standardTransfer.toString(),
            costCHZ: formatWeiToCHZ(standardTransfer),
          },
          tokenTransfer: {
            gas: 65000,
            costWei: tokenTransfer.toString(),
            costCHZ: formatWeiToCHZ(tokenTransfer),
          },
          contractInteraction: {
            gas: 100000,
            costWei: contractInteraction.toString(),
            costCHZ: formatWeiToCHZ(contractInteraction),
          },
        },
      },
    },
  ];
}

/**
 * Get block by number or hash
 */
export async function getBlock(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const blockIdentifier = this.getNodeParameter('blockIdentifier', index) as string;
  const includeTransactions = this.getNodeParameter('includeTransactions', index, false) as boolean;

  let blockParam: string;
  if (blockIdentifier === 'latest' || blockIdentifier === 'earliest' || blockIdentifier === 'pending') {
    blockParam = blockIdentifier;
  } else if (blockIdentifier.startsWith('0x')) {
    // It's a hash
    const block = await jsonRpcRequest.call(this, 'eth_getBlockByHash', [
      blockIdentifier,
      includeTransactions,
    ]);

    if (!block) {
      return [{ json: { found: false, identifier: blockIdentifier, message: 'Block not found' } }];
    }

    const formattedBlock = formatBlockResponse(block as IDataObject);
    return [{ json: formattedBlock as unknown as IDataObject }];
  } else {
    // It's a number
    blockParam = numberToHex(parseInt(blockIdentifier, 10));
  }

  const block = await jsonRpcRequest.call(this, 'eth_getBlockByNumber', [
    blockParam,
    includeTransactions,
  ]);

  if (!block) {
    return [{ json: { found: false, identifier: blockIdentifier, message: 'Block not found' } }];
  }

  const formattedBlock = formatBlockResponse(block as IDataObject);

  return [
    {
      json: {
        ...formattedBlock,
        timestampFormatted: new Date(formattedBlock.timestamp * 1000).toISOString(),
        gasUsedPercent: (
          (Number(formattedBlock.gasUsed) / Number(formattedBlock.gasLimit)) *
          100
        ).toFixed(2),
      } as IDataObject,
    },
  ];
}

/**
 * Get latest block
 */
export async function getLatestBlock(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const includeTransactions = this.getNodeParameter('includeTransactions', index, false) as boolean;

  const block = await jsonRpcRequest.call(this, 'eth_getBlockByNumber', [
    'latest',
    includeTransactions,
  ]);

  if (!block) {
    throw new NodeOperationError(this.getNode(), 'Failed to get latest block');
  }

  const formattedBlock = formatBlockResponse(block as IDataObject);

  return [
    {
      json: {
        ...formattedBlock,
        timestampFormatted: new Date(formattedBlock.timestamp * 1000).toISOString(),
        gasUsedPercent: (
          (Number(formattedBlock.gasUsed) / Number(formattedBlock.gasLimit)) *
          100
        ).toFixed(2),
      } as IDataObject,
    },
  ];
}

/**
 * Get network info
 */
export async function getNetworkInfo(
  this: IExecuteFunctions,
  _index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  const chainIdHex = await jsonRpcRequest.call(this, 'eth_chainId', []);
  const chainId = hexToNumber(chainIdHex as string);

  const networkConfig = credentials.network === 'spicy' ? NETWORKS.spicy : NETWORKS.mainnet;

  return [
    {
      json: {
        network: getNetworkDisplayName(credentials.network),
        chainId,
        rpcUrl: networkConfig.rpcUrl,
        explorerUrl: networkConfig.explorerUrl,
        nativeCurrency: networkConfig.nativeCurrency,
        isMainnet: credentials.network === 'mainnet',
        isTestnet: credentials.network === 'spicy',
      },
    },
  ];
}

/**
 * Get protocol version
 */
export async function getProtocolVersion(
  this: IExecuteFunctions,
  _index: number,
): Promise<INodeExecutionData[]> {
  try {
    const protocolVersion = await jsonRpcRequest.call(this, 'eth_protocolVersion', []);

    // Get client version
    let clientVersion = '';
    try {
      clientVersion = (await jsonRpcRequest.call(this, 'web3_clientVersion', [])) as string;
    } catch {
      // web3_clientVersion not supported
    }

    return [
      {
        json: {
          protocolVersion: protocolVersion as string,
          clientVersion,
        },
      },
    ];
  } catch {
    return [
      {
        json: {
          message: 'Protocol version query not supported by this RPC',
        },
      },
    ];
  }
}

/**
 * Get fee history (EIP-1559)
 */
export async function getFeeHistory(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const blockCount = this.getNodeParameter('blockCount', index, 10) as number;
  const newestBlock = this.getNodeParameter('newestBlock', index, 'latest') as string;
  const rewardPercentiles = this.getNodeParameter('rewardPercentiles', index, [25, 50, 75]) as number[];

  try {
    const feeHistory = await jsonRpcRequest.call(this, 'eth_feeHistory', [
      numberToHex(blockCount),
      newestBlock,
      rewardPercentiles,
    ]);

    const history = feeHistory as IDataObject;

    return [
      {
        json: {
          oldestBlock: hexToNumber(history.oldestBlock as string),
          baseFeePerGas: (history.baseFeePerGas as string[]).map((fee) =>
            hexToBigInt(fee).toString(),
          ),
          gasUsedRatio: history.gasUsedRatio,
          reward: history.reward,
        },
      },
    ];
  } catch {
    return [
      {
        json: {
          message: 'Fee history (EIP-1559) not supported on this network',
          note: 'Chiliz Chain may use legacy gas pricing',
        },
      },
    ];
  }
}
