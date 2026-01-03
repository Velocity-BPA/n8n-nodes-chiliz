/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { jsonRpcRequest, chilizScanRequest, formatTokenAmount } from '../../transport/client';
import { FAN_TOKENS, ERC20_ABI, SUPPORTED_CLUBS } from '../../constants/constants';
import {
  hexToNumber,
  hexToBigInt,
  hexToString,
  buildCallData,
  normalizeAddress,
  calculatePercentage,
} from '../../utils/helpers';
import type { IFanToken, ITokenHolder, ITokenPrice, ITokenVolume } from '../../utils/types';

/**
 * Get Fan Token information
 */
export async function getFanTokenInfo(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const tokenAddress = this.getNodeParameter('tokenAddress', index) as string;
  const address = normalizeAddress(tokenAddress);

  // Get token name
  const nameData = buildCallData('name()', []);
  const nameResult = await jsonRpcRequest.call(this, 'eth_call', [
    { to: address, data: nameData },
    'latest',
  ]);

  // Get token symbol
  const symbolData = buildCallData('symbol()', []);
  const symbolResult = await jsonRpcRequest.call(this, 'eth_call', [
    { to: address, data: symbolData },
    'latest',
  ]);

  // Get decimals
  const decimalsData = buildCallData('decimals()', []);
  const decimalsResult = await jsonRpcRequest.call(this, 'eth_call', [
    { to: address, data: decimalsData },
    'latest',
  ]);

  // Get total supply
  const supplyData = buildCallData('totalSupply()', []);
  const supplyResult = await jsonRpcRequest.call(this, 'eth_call', [
    { to: address, data: supplyData },
    'latest',
  ]);

  const name = hexToString(nameResult as string);
  const symbol = hexToString(symbolResult as string);
  const decimals = hexToNumber(decimalsResult as string);
  const totalSupply = hexToBigInt(supplyResult as string).toString();

  // Find associated club info
  const knownToken = Object.values(FAN_TOKENS).find(
    (t) => t.address.toLowerCase() === address,
  );

  const tokenInfo: IFanToken = {
    address,
    name,
    symbol,
    decimals,
    totalSupply,
    totalSupplyFormatted: formatTokenAmount(totalSupply, decimals),
    club: knownToken?.club,
  } as IFanToken & { totalSupplyFormatted: string };

  return [{ json: tokenInfo as unknown as IDataObject }];
}

/**
 * List all known Fan Tokens
 */
export async function listFanTokens(
  this: IExecuteFunctions,
  _index: number,
): Promise<INodeExecutionData[]> {
  const tokens = Object.entries(FAN_TOKENS).map(([symbol, info]) => ({
    symbol,
    name: info.name,
    club: info.club,
    address: info.address,
  }));

  return tokens.map((token) => ({ json: token as IDataObject }));
}

/**
 * Get token price (from external API or DEX)
 */
export async function getTokenPrice(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const tokenSymbol = this.getNodeParameter('tokenSymbol', index) as string;

  // Note: In production, this would query a price API like CoinGecko
  // For now, return a placeholder structure
  const priceInfo: ITokenPrice = {
    symbol: tokenSymbol,
    priceUsd: '0.00',
    priceBtc: '0.00000000',
    priceEth: '0.00000000',
    change24h: 0,
    marketCap: '0',
  };

  return [{ json: priceInfo as unknown as IDataObject }];
}

/**
 * Get token holders
 */
export async function getTokenHolders(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const tokenAddress = this.getNodeParameter('tokenAddress', index) as string;
  const limit = this.getNodeParameter('limit', index, 10) as number;

  try {
    const holders = await chilizScanRequest.call(this, 'token', 'tokenholderlist', {
      contractaddress: tokenAddress,
      page: 1,
      offset: limit,
    });

    const holderList = Array.isArray(holders) ? holders : [];
    const formattedHolders: ITokenHolder[] = holderList.map((holder: IDataObject, idx: number) => ({
      address: holder.TokenHolderAddress as string,
      balance: holder.TokenHolderQuantity as string,
      balanceFormatted: formatTokenAmount(holder.TokenHolderQuantity as string, 18),
      percentage: 0, // Would need total supply to calculate
      rank: idx + 1,
    }));

    return formattedHolders.map((holder) => ({ json: holder as unknown as IDataObject }));
  } catch (error) {
    // Return empty if API not available
    return [{ json: { message: 'Token holder list not available', tokenAddress } }];
  }
}

/**
 * Get token trading volume
 */
export async function getTokenVolume(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const tokenSymbol = this.getNodeParameter('tokenSymbol', index) as string;

  // Placeholder - would query exchange API
  const volumeInfo: ITokenVolume = {
    symbol: tokenSymbol,
    volume24h: '0',
    volumeChange: 0,
    trades24h: 0,
  };

  return [{ json: volumeInfo as unknown as IDataObject }];
}

/**
 * Get token supply information
 */
export async function getTokenSupply(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const tokenAddress = this.getNodeParameter('tokenAddress', index) as string;
  const address = normalizeAddress(tokenAddress);

  // Get total supply
  const supplyData = buildCallData('totalSupply()', []);
  const supplyResult = await jsonRpcRequest.call(this, 'eth_call', [
    { to: address, data: supplyData },
    'latest',
  ]);

  // Get decimals
  const decimalsData = buildCallData('decimals()', []);
  const decimalsResult = await jsonRpcRequest.call(this, 'eth_call', [
    { to: address, data: decimalsData },
    'latest',
  ]);

  const totalSupply = hexToBigInt(supplyResult as string).toString();
  const decimals = hexToNumber(decimalsResult as string);

  return [
    {
      json: {
        tokenAddress: address,
        totalSupply,
        totalSupplyFormatted: formatTokenAmount(totalSupply, decimals),
        decimals,
        // Note: Circulating supply would require additional data source
        circulatingSupply: totalSupply,
        circulatingSupplyFormatted: formatTokenAmount(totalSupply, decimals),
      },
    },
  ];
}

/**
 * Get user's fan token holdings
 */
export async function getUserTokens(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const userAddress = this.getNodeParameter('userAddress', index) as string;
  const address = normalizeAddress(userAddress);

  const holdings: IDataObject[] = [];

  // Check balance for each known fan token
  for (const [symbol, tokenInfo] of Object.entries(FAN_TOKENS)) {
    if (tokenInfo.address === '0x...') continue; // Skip placeholder addresses

    try {
      const balanceData = buildCallData('balanceOf(address)', [
        { type: 'address', value: address },
      ]);

      const balanceResult = await jsonRpcRequest.call(this, 'eth_call', [
        { to: tokenInfo.address, data: balanceData },
        'latest',
      ]);

      const balance = hexToBigInt(balanceResult as string);
      if (balance > BigInt(0)) {
        holdings.push({
          symbol,
          name: tokenInfo.name,
          club: tokenInfo.club,
          contractAddress: tokenInfo.address,
          balance: balance.toString(),
          balanceFormatted: formatTokenAmount(balance.toString(), 18),
        });
      }
    } catch {
      // Skip tokens that fail
      continue;
    }
  }

  if (holdings.length === 0) {
    return [
      {
        json: {
          address,
          message: 'No fan token holdings found',
          holdings: [],
        },
      },
    ];
  }

  return holdings.map((holding) => ({ json: holding }));
}

/**
 * Get supported clubs list
 */
export async function getSupportedClubs(
  this: IExecuteFunctions,
  _index: number,
): Promise<INodeExecutionData[]> {
  return SUPPORTED_CLUBS.map((club) => ({ json: club as IDataObject }));
}
