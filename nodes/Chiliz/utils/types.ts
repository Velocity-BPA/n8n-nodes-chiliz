/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IDataObject } from 'n8n-workflow';

/**
 * Network type
 */
export type NetworkType = 'mainnet' | 'spicy' | 'custom';

/**
 * Chiliz API credentials
 */
export interface IChilizCredentials {
  network: NetworkType;
  rpcEndpoint?: string;
  privateKey?: string;
  chilizScanApiKey?: string;
  sociosApiKey?: string;
}

/**
 * JSON-RPC request
 */
export interface IJsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params: unknown[];
  id: number;
}

/**
 * JSON-RPC response
 */
export interface IJsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * Fan Token information
 */
export interface IFanToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  club?: string;
  logoUrl?: string;
}

/**
 * Token balance
 */
export interface ITokenBalance {
  token: string;
  symbol: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
}

/**
 * Account balance response
 */
export interface IAccountBalance {
  address: string;
  balance: string;
  balanceFormatted: string;
  network: string;
}

/**
 * Transaction
 */
export interface ITransaction {
  hash: string;
  blockNumber: number | null;
  blockHash: string | null;
  from: string;
  to: string | null;
  value: string;
  gasPrice: string;
  gas: string;
  nonce: number;
  input: string;
  timestamp?: number;
  status?: 'pending' | 'success' | 'failed';
}

/**
 * Transaction receipt
 */
export interface ITransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string | null;
  contractAddress: string | null;
  gasUsed: string;
  cumulativeGasUsed: string;
  status: boolean;
  logs: IEventLog[];
}

/**
 * Block data
 */
export interface IBlock {
  number: number;
  hash: string;
  parentHash: string;
  timestamp: number;
  gasLimit: string;
  gasUsed: string;
  miner: string;
  transactions: string[] | ITransaction[];
  transactionCount: number;
}

/**
 * Event log
 */
export interface IEventLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  blockHash: string;
  transactionHash: string;
  transactionIndex: number;
  logIndex: number;
  removed: boolean;
}

/**
 * Gas price information
 */
export interface IGasPrice {
  gasPrice: string;
  gasPriceGwei: string;
  network: string;
}

/**
 * Poll/Voting data
 */
export interface IPoll {
  id: string;
  title: string;
  description: string;
  tokenSymbol: string;
  club: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'ended' | 'upcoming';
  options: IPollOption[];
  totalVotes: number;
  requiredTokens?: number;
}

/**
 * Poll option
 */
export interface IPollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

/**
 * Vote result
 */
export interface IVoteResult {
  pollId: string;
  optionId: string;
  transactionHash?: string;
  timestamp: string;
  success: boolean;
}

/**
 * Reward data
 */
export interface IReward {
  id: string;
  title: string;
  description: string;
  tokenSymbol: string;
  club: string;
  requiredTokens: number;
  type: 'experience' | 'merchandise' | 'digital' | 'discount' | 'exclusive';
  status: 'available' | 'claimed' | 'expired';
  expiryDate?: string;
  imageUrl?: string;
}

/**
 * NFT metadata
 */
export interface INftMetadata {
  tokenId: string;
  contractAddress: string;
  name: string;
  description: string;
  image: string;
  attributes: INftAttribute[];
  owner?: string;
}

/**
 * NFT attribute
 */
export interface INftAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
}

/**
 * NFT collection
 */
export interface INftCollection {
  address: string;
  name: string;
  symbol: string;
  totalSupply: number;
  description?: string;
  imageUrl?: string;
}

/**
 * Network status
 */
export interface INetworkStatus {
  network: string;
  chainId: number;
  latestBlock: number;
  gasPrice: string;
  isHealthy: boolean;
  peerCount?: number;
}

/**
 * Smart contract call params
 */
export interface IContractCallParams {
  contractAddress: string;
  functionName: string;
  functionParams?: unknown[];
  abi?: string;
}

/**
 * Smart contract write params
 */
export interface IContractWriteParams extends IContractCallParams {
  value?: string;
  gasLimit?: number;
  gasPrice?: string;
}

/**
 * Token transfer params
 */
export interface ITokenTransferParams {
  tokenAddress: string;
  toAddress: string;
  amount: string;
  gasLimit?: number;
}

/**
 * NFT transfer params
 */
export interface INftTransferParams {
  contractAddress: string;
  tokenId: string;
  toAddress: string;
  gasLimit?: number;
}

/**
 * Event filter params
 */
export interface IEventFilterParams {
  address?: string;
  topics?: (string | null)[];
  fromBlock?: number | 'latest' | 'earliest' | 'pending';
  toBlock?: number | 'latest' | 'earliest' | 'pending';
}

/**
 * Unit conversion result
 */
export interface IUnitConversion {
  from: string;
  to: string;
  value: string;
  result: string;
}

/**
 * API health status
 */
export interface IApiHealth {
  rpc: boolean;
  explorer: boolean;
  timestamp: string;
  network: string;
}

/**
 * Trigger state for polling
 */
export interface ITriggerState extends IDataObject {
  lastBlockNumber?: number;
  lastPollId?: string;
  lastRewardId?: string;
  lastTokenAddress?: string;
  lastTimestamp?: number;
}

/**
 * Token holder
 */
export interface ITokenHolder {
  address: string;
  balance: string;
  balanceFormatted: string;
  percentage: number;
  rank: number;
}

/**
 * Token volume
 */
export interface ITokenVolume {
  symbol: string;
  volume24h: string;
  volumeChange: number;
  trades24h: number;
}

/**
 * Token price
 */
export interface ITokenPrice {
  symbol: string;
  priceUsd: string;
  priceBtc: string;
  priceEth: string;
  change24h: number;
  marketCap: string;
}
