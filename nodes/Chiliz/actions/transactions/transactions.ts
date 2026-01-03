/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
  jsonRpcRequest,
  formatWeiToCHZ,
  formatCHZToWei,
  formatTokenAmount,
  parseTokenAmount,
} from '../../transport/client';
import { GAS_SETTINGS } from '../../constants/constants';
import {
  hexToBigInt,
  hexToNumber,
  normalizeAddress,
  numberToHex,
  buildCallData,
  formatTransactionResponse,
} from '../../utils/helpers';
import type { IChilizCredentials, ITransaction, ITransactionReceipt } from '../../utils/types';

/**
 * Get transaction details by hash
 */
export async function getTransaction(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const txHash = this.getNodeParameter('transactionHash', index) as string;

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    throw new NodeOperationError(this.getNode(), 'Invalid transaction hash format');
  }

  const transaction = await jsonRpcRequest.call(this, 'eth_getTransactionByHash', [txHash]);

  if (!transaction) {
    return [
      {
        json: {
          hash: txHash,
          found: false,
          message: 'Transaction not found',
        },
      },
    ];
  }

  const tx = transaction as IDataObject;
  const formattedTx = formatTransactionResponse(tx);

  // Get transaction receipt for status
  const receipt = await jsonRpcRequest.call(this, 'eth_getTransactionReceipt', [txHash]);

  let status = 'pending';
  let gasUsed = '0';

  if (receipt) {
    const receiptData = receipt as IDataObject;
    status = receiptData.status === '0x1' ? 'success' : 'failed';
    gasUsed = hexToBigInt(receiptData.gasUsed as string).toString();
  }

  return [
    {
      json: {
        ...formattedTx,
        valueFormatted: formatWeiToCHZ(formattedTx.value),
        gasPriceGwei: (BigInt(formattedTx.gasPrice) / BigInt(10 ** 9)).toString(),
        status,
        gasUsed,
      } as IDataObject,
    },
  ];
}

/**
 * Send a raw transaction (requires private key)
 */
export async function sendTransaction(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.privateKey) {
    throw new NodeOperationError(
      this.getNode(),
      'Private key is required for sending transactions. Please configure it in credentials.',
    );
  }

  const toAddress = this.getNodeParameter('toAddress', index) as string;
  const amount = this.getNodeParameter('amount', index) as string;
  const gasLimit = this.getNodeParameter('gasLimit', index, GAS_SETTINGS.defaultGasLimit) as number;
  const gasPriceGwei = this.getNodeParameter('gasPriceGwei', index, '') as string;

  const normalizedTo = normalizeAddress(toAddress);
  const valueWei = formatCHZToWei(amount);

  // This is a placeholder for actual transaction signing
  // In production, you would use ethers.js or similar library
  // to sign and send the transaction

  return [
    {
      json: {
        message: 'Transaction signing requires ethers.js integration',
        to: normalizedTo,
        value: valueWei,
        valueFormatted: amount,
        gasLimit,
        note: 'For full transaction support, private key signing must be implemented with ethers.js',
      },
    },
  ];
}

/**
 * Transfer ERC-20 token
 */
export async function transferToken(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.privateKey) {
    throw new NodeOperationError(
      this.getNode(),
      'Private key is required for token transfers. Please configure it in credentials.',
    );
  }

  const tokenAddress = this.getNodeParameter('tokenAddress', index) as string;
  const toAddress = this.getNodeParameter('toAddress', index) as string;
  const amount = this.getNodeParameter('amount', index) as string;
  const decimals = this.getNodeParameter('decimals', index, 18) as number;

  const normalizedToken = normalizeAddress(tokenAddress);
  const normalizedTo = normalizeAddress(toAddress);
  const rawAmount = parseTokenAmount(amount, decimals);

  // Build transfer call data
  const callData = buildCallData('transfer(address,uint256)', [
    { type: 'address', value: normalizedTo },
    { type: 'uint256', value: rawAmount },
  ]);

  return [
    {
      json: {
        message: 'Token transfer requires ethers.js integration for signing',
        tokenAddress: normalizedToken,
        to: normalizedTo,
        amount: rawAmount,
        amountFormatted: amount,
        decimals,
        callData,
        note: 'For full token transfer support, private key signing must be implemented',
      },
    },
  ];
}

/**
 * Estimate gas for a transaction
 */
export async function estimateGas(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const fromAddress = this.getNodeParameter('fromAddress', index) as string;
  const toAddress = this.getNodeParameter('toAddress', index) as string;
  const value = this.getNodeParameter('value', index, '0') as string;
  const data = this.getNodeParameter('data', index, '0x') as string;

  const normalizedFrom = normalizeAddress(fromAddress);
  const normalizedTo = normalizeAddress(toAddress);

  const txParams: IDataObject = {
    from: normalizedFrom,
    to: normalizedTo,
    data: data || '0x',
  };

  if (value && value !== '0') {
    txParams.value = numberToHex(BigInt(formatCHZToWei(value)));
  }

  try {
    const gasEstimate = await jsonRpcRequest.call(this, 'eth_estimateGas', [txParams]);
    const gas = hexToBigInt(gasEstimate as string);

    // Get current gas price for cost estimation
    const gasPriceHex = await jsonRpcRequest.call(this, 'eth_gasPrice', []);
    const gasPrice = hexToBigInt(gasPriceHex as string);

    const estimatedCost = gas * gasPrice;

    return [
      {
        json: {
          gasEstimate: gas.toString(),
          gasPrice: gasPrice.toString(),
          gasPriceGwei: (gasPrice / BigInt(10 ** 9)).toString(),
          estimatedCostWei: estimatedCost.toString(),
          estimatedCostCHZ: formatWeiToCHZ(estimatedCost),
        },
      },
    ];
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Gas estimation failed: ${(error as Error).message}`,
    );
  }
}

/**
 * Get transaction receipt
 */
export async function getTransactionReceipt(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const txHash = this.getNodeParameter('transactionHash', index) as string;

  if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    throw new NodeOperationError(this.getNode(), 'Invalid transaction hash format');
  }

  const receipt = await jsonRpcRequest.call(this, 'eth_getTransactionReceipt', [txHash]);

  if (!receipt) {
    return [
      {
        json: {
          hash: txHash,
          found: false,
          message: 'Transaction receipt not found (transaction may be pending)',
        },
      },
    ];
  }

  const receiptData = receipt as IDataObject;

  return [
    {
      json: {
        transactionHash: receiptData.transactionHash,
        blockNumber: hexToNumber(receiptData.blockNumber as string),
        blockHash: receiptData.blockHash,
        from: receiptData.from,
        to: receiptData.to,
        contractAddress: receiptData.contractAddress,
        gasUsed: hexToBigInt(receiptData.gasUsed as string).toString(),
        cumulativeGasUsed: hexToBigInt(receiptData.cumulativeGasUsed as string).toString(),
        status: receiptData.status === '0x1' ? 'success' : 'failed',
        logsCount: (receiptData.logs as unknown[])?.length || 0,
      },
    },
  ];
}

/**
 * Get pending transactions in mempool
 */
export async function getPendingTransactions(
  this: IExecuteFunctions,
  _index: number,
): Promise<INodeExecutionData[]> {
  try {
    const pendingBlock = await jsonRpcRequest.call(this, 'eth_getBlockByNumber', [
      'pending',
      true,
    ]);

    if (!pendingBlock) {
      return [{ json: { transactions: [], count: 0 } }];
    }

    const block = pendingBlock as IDataObject;
    const transactions = block.transactions as IDataObject[];

    return [
      {
        json: {
          transactions: transactions?.slice(0, 20) || [],
          count: transactions?.length || 0,
        },
      },
    ];
  } catch {
    return [
      {
        json: {
          message: 'Pending transaction query not supported by this RPC',
          transactions: [],
          count: 0,
        },
      },
    ];
  }
}
