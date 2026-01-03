/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { jsonRpcRequest, chilizScanRequest, formatWeiToCHZ, formatTokenAmount } from '../../transport/client';
import { FAN_TOKENS } from '../../constants/constants';
import {
  hexToBigInt,
  hexToNumber,
  normalizeAddress,
  buildCallData,
  formatTransactionResponse,
} from '../../utils/helpers';
import type { IChilizCredentials } from '../../utils/types';

/**
 * Get CHZ balance for an address
 */
export async function getBalance(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const address = this.getNodeParameter('address', index) as string;
  const normalizedAddress = normalizeAddress(address);

  const balanceHex = await jsonRpcRequest.call(this, 'eth_getBalance', [
    normalizedAddress,
    'latest',
  ]);

  const balance = hexToBigInt(balanceHex as string);
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  return [
    {
      json: {
        address: normalizedAddress,
        balance: balance.toString(),
        balanceFormatted: formatWeiToCHZ(balance),
        symbol: 'CHZ',
        network: credentials.network,
      },
    },
  ];
}

/**
 * Get all fan token balances for an address
 */
export async function getTokenBalances(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const address = this.getNodeParameter('address', index) as string;
  const normalizedAddress = normalizeAddress(address);

  const balances: IDataObject[] = [];

  // First, get native CHZ balance
  const chzBalanceHex = await jsonRpcRequest.call(this, 'eth_getBalance', [
    normalizedAddress,
    'latest',
  ]);
  const chzBalance = hexToBigInt(chzBalanceHex as string);

  balances.push({
    token: 'CHZ',
    name: 'Chiliz',
    type: 'native',
    balance: chzBalance.toString(),
    balanceFormatted: formatWeiToCHZ(chzBalance),
    decimals: 18,
  });

  // Check each known fan token
  for (const [symbol, tokenInfo] of Object.entries(FAN_TOKENS)) {
    if (tokenInfo.address === '0x...') continue;

    try {
      const balanceData = buildCallData('balanceOf(address)', [
        { type: 'address', value: normalizedAddress },
      ]);

      const balanceResult = await jsonRpcRequest.call(this, 'eth_call', [
        { to: tokenInfo.address, data: balanceData },
        'latest',
      ]);

      const balance = hexToBigInt(balanceResult as string);
      if (balance > BigInt(0)) {
        balances.push({
          token: symbol,
          name: tokenInfo.name,
          type: 'fan_token',
          contractAddress: tokenInfo.address,
          club: tokenInfo.club,
          balance: balance.toString(),
          balanceFormatted: formatTokenAmount(balance.toString(), 18),
          decimals: 18,
        });
      }
    } catch {
      continue;
    }
  }

  return [
    {
      json: {
        address: normalizedAddress,
        balances,
        tokenCount: balances.length,
      },
    },
  ];
}

/**
 * Get transaction history for an address
 */
export async function getTransactionHistory(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const address = this.getNodeParameter('address', index) as string;
  const startBlock = this.getNodeParameter('startBlock', index, 0) as number;
  const endBlock = this.getNodeParameter('endBlock', index, 99999999) as number;
  const limit = this.getNodeParameter('limit', index, 10) as number;
  const sortOrder = this.getNodeParameter('sortOrder', index, 'desc') as string;

  const normalizedAddress = normalizeAddress(address);

  try {
    const transactions = await chilizScanRequest.call(this, 'account', 'txlist', {
      address: normalizedAddress,
      startblock: startBlock,
      endblock: endBlock,
      page: 1,
      offset: limit,
      sort: sortOrder,
    });

    const txList = Array.isArray(transactions) ? transactions : [];
    const formattedTxs = txList.map((tx: IDataObject) => ({
      hash: tx.hash,
      blockNumber: parseInt(tx.blockNumber as string, 10),
      timestamp: parseInt(tx.timeStamp as string, 10),
      from: tx.from,
      to: tx.to,
      value: tx.value,
      valueFormatted: formatWeiToCHZ(tx.value as string),
      gas: tx.gas,
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      isError: tx.isError === '1',
      functionName: tx.functionName || '',
    }));

    return formattedTxs.map((tx) => ({ json: tx as IDataObject }));
  } catch (error) {
    return [
      {
        json: {
          address: normalizedAddress,
          message: 'Transaction history not available via ChilizScan API',
          error: (error as Error).message,
        },
      },
    ];
  }
}

/**
 * Get token transfer history for an address
 */
export async function getTokenTransfers(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const address = this.getNodeParameter('address', index) as string;
  const tokenAddress = this.getNodeParameter('tokenAddress', index, '') as string;
  const limit = this.getNodeParameter('limit', index, 10) as number;

  const normalizedAddress = normalizeAddress(address);

  try {
    const params: Record<string, string | number> = {
      address: normalizedAddress,
      page: 1,
      offset: limit,
      sort: 'desc',
    };

    if (tokenAddress) {
      params.contractaddress = normalizeAddress(tokenAddress);
    }

    const transfers = await chilizScanRequest.call(this, 'account', 'tokentx', params);

    const transferList = Array.isArray(transfers) ? transfers : [];
    const formattedTransfers = transferList.map((transfer: IDataObject) => ({
      hash: transfer.hash,
      blockNumber: parseInt(transfer.blockNumber as string, 10),
      timestamp: parseInt(transfer.timeStamp as string, 10),
      from: transfer.from,
      to: transfer.to,
      tokenSymbol: transfer.tokenSymbol,
      tokenName: transfer.tokenName,
      tokenAddress: transfer.contractAddress,
      value: transfer.value,
      valueFormatted: formatTokenAmount(
        transfer.value as string,
        parseInt(transfer.tokenDecimal as string, 10) || 18,
      ),
      decimals: parseInt(transfer.tokenDecimal as string, 10) || 18,
    }));

    return formattedTransfers.map((transfer) => ({ json: transfer as IDataObject }));
  } catch (error) {
    return [
      {
        json: {
          address: normalizedAddress,
          message: 'Token transfer history not available',
          error: (error as Error).message,
        },
      },
    ];
  }
}

/**
 * Get account nonce
 */
export async function getAccountNonce(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const address = this.getNodeParameter('address', index) as string;
  const normalizedAddress = normalizeAddress(address);

  const nonceHex = await jsonRpcRequest.call(this, 'eth_getTransactionCount', [
    normalizedAddress,
    'latest',
  ]);

  const nonce = hexToNumber(nonceHex as string);

  return [
    {
      json: {
        address: normalizedAddress,
        nonce,
      },
    },
  ];
}
