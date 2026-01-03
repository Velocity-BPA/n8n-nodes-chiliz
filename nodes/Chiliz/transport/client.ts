/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, ILoadOptionsFunctions, IHttpRequestMethods } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { NETWORKS, API_ENDPOINTS } from '../constants/constants';
import type { IChilizCredentials, IJsonRpcResponse, NetworkType } from '../utils/types';

/**
 * Get the RPC URL based on network configuration
 */
export function getRpcUrl(credentials: IChilizCredentials): string {
  if (credentials.network === 'custom' && credentials.rpcEndpoint) {
    return credentials.rpcEndpoint;
  }
  const network = credentials.network as 'mainnet' | 'spicy';
  return NETWORKS[network]?.rpcUrl || NETWORKS.mainnet.rpcUrl;
}

/**
 * Get the explorer API URL based on network
 */
export function getExplorerApiUrl(credentials: IChilizCredentials): string {
  const network = credentials.network as 'mainnet' | 'spicy';
  return API_ENDPOINTS.chilizScan[network] || API_ENDPOINTS.chilizScan.mainnet;
}

/**
 * Get chain ID for the network
 */
export function getChainId(network: NetworkType): number {
  if (network === 'mainnet') return NETWORKS.mainnet.chainId;
  if (network === 'spicy') return NETWORKS.spicy.chainId;
  return NETWORKS.mainnet.chainId;
}

/**
 * Make a JSON-RPC request to the Chiliz node
 */
export async function jsonRpcRequest<T>(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  method: string,
  params: unknown[] = [],
): Promise<T> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;
  const rpcUrl = getRpcUrl(credentials);

  const requestBody = {
    jsonrpc: '2.0',
    method,
    params,
    id: Date.now(),
  };

  const response = await this.helpers.httpRequest({
    method: 'POST' as IHttpRequestMethods,
    url: rpcUrl,
    headers: {
      'Content-Type': 'application/json',
    },
    body: requestBody,
    json: true,
  });

  const jsonRpcResponse = response as IJsonRpcResponse<T>;

  if (jsonRpcResponse.error) {
    throw new NodeApiError(this.getNode(), {
      message: jsonRpcResponse.error.message,
      description: `JSON-RPC Error (${jsonRpcResponse.error.code}): ${jsonRpcResponse.error.message}`,
    });
  }

  return jsonRpcResponse.result as T;
}

/**
 * Make a request to ChilizScan API
 */
export async function chilizScanRequest<T>(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  module: string,
  action: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;
  const apiUrl = getExplorerApiUrl(credentials);

  const queryParams: Record<string, string> = {
    module,
    action,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  };

  if (credentials.chilizScanApiKey) {
    queryParams.apikey = credentials.chilizScanApiKey;
  }

  const queryString = new URLSearchParams(queryParams).toString();
  const url = `${apiUrl}?${queryString}`;

  const response = await this.helpers.httpRequest({
    method: 'GET' as IHttpRequestMethods,
    url,
    json: true,
  });

  if (response.status === '0' && response.message !== 'No transactions found') {
    throw new NodeApiError(this.getNode(), {
      message: response.message || 'ChilizScan API Error',
      description: response.result || 'Unknown error occurred',
    });
  }

  return response.result as T;
}

/**
 * Make a request to Socios API (for voting/rewards)
 */
export async function sociosApiRequest<T>(
  this: IExecuteFunctions | ILoadOptionsFunctions,
  endpoint: string,
  method: IHttpRequestMethods = 'GET',
  body?: Record<string, unknown>,
): Promise<T> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.sociosApiKey) {
    throw new NodeApiError(this.getNode(), {
      message: 'Socios API key required',
      description: 'Socios API key is required for voting and rewards operations. Please configure it in credentials.',
    });
  }

  const url = `${API_ENDPOINTS.socios.base}${endpoint}`;

  const response = await this.helpers.httpRequest({
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${credentials.sociosApiKey}`,
    },
    body: body ? body : undefined,
    json: true,
  });

  return response as T;
}

/**
 * Format Wei to CHZ (18 decimals)
 */
export function formatWeiToCHZ(wei: string | bigint): string {
  const weiValue = typeof wei === 'string' ? BigInt(wei) : wei;
  const divisor = BigInt(10 ** 18);
  const wholePart = weiValue / divisor;
  const fractionalPart = weiValue % divisor;
  const fractionalStr = fractionalPart.toString().padStart(18, '0');
  return `${wholePart}.${fractionalStr}`.replace(/\.?0+$/, '') || '0';
}

/**
 * Format CHZ to Wei
 */
export function formatCHZToWei(chz: string): string {
  const [whole, decimal = ''] = chz.split('.');
  const paddedDecimal = decimal.padEnd(18, '0').slice(0, 18);
  const weiString = whole + paddedDecimal;
  return BigInt(weiString).toString();
}

/**
 * Format token amount with decimals
 */
export function formatTokenAmount(amount: string | bigint, decimals: number): string {
  const amountValue = typeof amount === 'string' ? BigInt(amount) : amount;
  const divisor = BigInt(10 ** decimals);
  const wholePart = amountValue / divisor;
  const fractionalPart = amountValue % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  return `${wholePart}.${fractionalStr}`.replace(/\.?0+$/, '') || '0';
}

/**
 * Parse token amount to raw units
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  const [whole, decimal = ''] = amount.split('.');
  const paddedDecimal = decimal.padEnd(decimals, '0').slice(0, decimals);
  const rawString = whole + paddedDecimal;
  return BigInt(rawString).toString();
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate transaction hash
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Encode function call for smart contract
 */
export function encodeFunctionCall(functionSignature: string, params: unknown[]): string {
  // Simple encoding for common functions - for full support, ethers.js would be used
  const functionSelector = functionSignature.slice(0, 10);
  // This is a simplified version - in production, use ethers.js Interface
  return functionSelector + params.map(() => '').join('');
}

/**
 * Get the network name for display
 */
export function getNetworkDisplayName(network: NetworkType): string {
  switch (network) {
    case 'mainnet':
      return 'Chiliz Mainnet';
    case 'spicy':
      return 'Spicy Testnet';
    case 'custom':
      return 'Custom Network';
    default:
      return 'Unknown Network';
  }
}
