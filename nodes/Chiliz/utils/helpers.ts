/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IDataObject } from 'n8n-workflow';
import type { IBlock, ITransaction, IEventLog, IFanToken, ITokenBalance } from './types';

/**
 * Parse hex string to number
 */
export function hexToNumber(hex: string): number {
  if (!hex || hex === '0x') return 0;
  return parseInt(hex, 16);
}

/**
 * Parse hex string to bigint
 */
export function hexToBigInt(hex: string): bigint {
  if (!hex || hex === '0x') return BigInt(0);
  return BigInt(hex);
}

/**
 * Convert number to hex string
 */
export function numberToHex(num: number | bigint): string {
  return '0x' + num.toString(16);
}

/**
 * Format block response from JSON-RPC
 */
export function formatBlockResponse(rawBlock: IDataObject): IBlock {
  return {
    number: hexToNumber(rawBlock.number as string),
    hash: rawBlock.hash as string,
    parentHash: rawBlock.parentHash as string,
    timestamp: hexToNumber(rawBlock.timestamp as string),
    gasLimit: hexToBigInt(rawBlock.gasLimit as string).toString(),
    gasUsed: hexToBigInt(rawBlock.gasUsed as string).toString(),
    miner: rawBlock.miner as string,
    transactions: rawBlock.transactions as string[],
    transactionCount: (rawBlock.transactions as unknown[])?.length || 0,
  };
}

/**
 * Format transaction response from JSON-RPC
 */
export function formatTransactionResponse(rawTx: IDataObject): ITransaction {
  return {
    hash: rawTx.hash as string,
    blockNumber: rawTx.blockNumber ? hexToNumber(rawTx.blockNumber as string) : null,
    blockHash: rawTx.blockHash as string | null,
    from: rawTx.from as string,
    to: rawTx.to as string | null,
    value: hexToBigInt(rawTx.value as string).toString(),
    gasPrice: hexToBigInt(rawTx.gasPrice as string).toString(),
    gas: hexToBigInt(rawTx.gas as string).toString(),
    nonce: hexToNumber(rawTx.nonce as string),
    input: rawTx.input as string,
  };
}

/**
 * Format event log response
 */
export function formatEventLogResponse(rawLog: IDataObject): IEventLog {
  return {
    address: rawLog.address as string,
    topics: rawLog.topics as string[],
    data: rawLog.data as string,
    blockNumber: hexToNumber(rawLog.blockNumber as string),
    blockHash: rawLog.blockHash as string,
    transactionHash: rawLog.transactionHash as string,
    transactionIndex: hexToNumber(rawLog.transactionIndex as string),
    logIndex: hexToNumber(rawLog.logIndex as string),
    removed: rawLog.removed as boolean,
  };
}

/**
 * Format fan token info
 */
export function formatFanTokenInfo(
  address: string,
  name: string,
  symbol: string,
  decimals: number,
  totalSupply: string,
  club?: string,
): IFanToken {
  return {
    address,
    name,
    symbol,
    decimals,
    totalSupply,
    club,
  };
}

/**
 * Format token balance
 */
export function formatTokenBalance(
  token: string,
  symbol: string,
  balance: string,
  decimals: number,
): ITokenBalance {
  const divisor = BigInt(10 ** decimals);
  const balanceValue = BigInt(balance);
  const wholePart = balanceValue / divisor;
  const fractionalPart = balanceValue % divisor;
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const balanceFormatted = `${wholePart}.${fractionalStr}`.replace(/\.?0+$/, '') || '0';

  return {
    token,
    symbol,
    balance,
    balanceFormatted,
    decimals,
  };
}

/**
 * Sleep utility for rate limiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Chunk array into smaller arrays
 */
export function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove 0x prefix from hex string
 */
export function strip0x(hex: string): string {
  return hex.startsWith('0x') ? hex.slice(2) : hex;
}

/**
 * Add 0x prefix to hex string if not present
 */
export function add0x(hex: string): string {
  return hex.startsWith('0x') ? hex : '0x' + hex;
}

/**
 * Pad hex string to specified length
 */
export function padHex(hex: string, length: number): string {
  const stripped = strip0x(hex);
  return '0x' + stripped.padStart(length, '0');
}

/**
 * Keccak256 hash function selector (first 4 bytes)
 * Simple implementation for function selectors
 */
export function getFunctionSelector(signature: string): string {
  // This is a placeholder - in production, use ethers.js or similar
  // For common functions, we can use pre-computed selectors
  const selectors: Record<string, string> = {
    'transfer(address,uint256)': '0xa9059cbb',
    'balanceOf(address)': '0x70a08231',
    'totalSupply()': '0x18160ddd',
    'name()': '0x06fdde03',
    'symbol()': '0x95d89b41',
    'decimals()': '0x313ce567',
    'approve(address,uint256)': '0x095ea7b3',
    'allowance(address,address)': '0xdd62ed3e',
    'transferFrom(address,address,uint256)': '0x23b872dd',
    'ownerOf(uint256)': '0x6352211e',
    'tokenURI(uint256)': '0xc87b56dd',
    'safeTransferFrom(address,address,uint256)': '0x42842e0e',
  };

  return selectors[signature] || '0x00000000';
}

/**
 * Encode address for ABI
 */
export function encodeAddress(address: string): string {
  return padHex(strip0x(address), 64);
}

/**
 * Encode uint256 for ABI
 */
export function encodeUint256(value: string | number | bigint): string {
  const bigValue = BigInt(value);
  return padHex(bigValue.toString(16), 64);
}

/**
 * Build contract call data
 */
export function buildCallData(functionSignature: string, params: Array<{ type: string; value: string }>): string {
  const selector = getFunctionSelector(functionSignature);
  let data = selector;

  for (const param of params) {
    if (param.type === 'address') {
      data += strip0x(encodeAddress(param.value));
    } else if (param.type === 'uint256') {
      data += strip0x(encodeUint256(param.value));
    }
  }

  return data;
}

/**
 * Decode hex string to UTF-8 string
 */
export function hexToString(hex: string): string {
  const stripped = strip0x(hex);
  let result = '';
  for (let i = 0; i < stripped.length; i += 2) {
    const charCode = parseInt(stripped.substr(i, 2), 16);
    if (charCode > 0) {
      result += String.fromCharCode(charCode);
    }
  }
  return result.trim();
}

/**
 * Format timestamp to ISO string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

/**
 * Validate and normalize address
 */
export function normalizeAddress(address: string): string {
  // Add 0x prefix if missing
  let normalized = address;
  if (!normalized.startsWith('0x')) {
    normalized = '0x' + normalized;
  }
  // Validate the final format
  if (!/^0x[a-fA-F0-9]{40}$/.test(normalized)) {
    throw new Error(`Invalid address: ${address}`);
  }
  return normalized.toLowerCase();
}

/**
 * Validate Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validate transaction hash format
 */
export function isValidTransactionHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Common function selectors for ERC-20/ERC-721 contracts
 */
export const FUNCTION_SELECTORS: Record<string, string> = {
  // Full signatures
  'transfer(address,uint256)': '0xa9059cbb',
  'balanceOf(address)': '0x70a08231',
  'totalSupply()': '0x18160ddd',
  'name()': '0x06fdde03',
  'symbol()': '0x95d89b41',
  'decimals()': '0x313ce567',
  'approve(address,uint256)': '0x095ea7b3',
  'allowance(address,address)': '0xdd62ed3e',
  'transferFrom(address,address,uint256)': '0x23b872dd',
  'ownerOf(uint256)': '0x6352211e',
  'tokenURI(uint256)': '0xc87b56dd',
  'safeTransferFrom(address,address,uint256)': '0x42842e0e',
  'getApproved(uint256)': '0x081812fc',
  // Shorthand keys
  name: '0x06fdde03',
  symbol: '0x95d89b41',
  decimals: '0x313ce567',
  totalSupply: '0x18160ddd',
  balanceOf: '0x70a08231',
  transfer: '0xa9059cbb',
  approve: '0x095ea7b3',
  allowance: '0xdd62ed3e',
  transferFrom: '0x23b872dd',
  ownerOf: '0x6352211e',
  tokenURI: '0xc87b56dd',
  safeTransferFrom: '0x42842e0e',
  getApproved: '0x081812fc',
};

/**
 * Calculate percentage
 */
export function calculatePercentage(part: bigint, total: bigint): number {
  if (total === BigInt(0)) return 0;
  return Number((part * BigInt(10000)) / total) / 100;
}
