/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { jsonRpcRequest } from '../../transport/client';
import {
  hexToNumber,
  hexToBigInt,
  numberToHex,
  normalizeAddress,
  formatEventLogResponse,
} from '../../utils/helpers';
import type { IEventLog, IEventFilterParams } from '../../utils/types';

/**
 * Get event logs with filters
 */
export async function getLogs(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const address = this.getNodeParameter('address', index, '') as string;
  const fromBlock = this.getNodeParameter('fromBlock', index, 'latest') as string | number;
  const toBlock = this.getNodeParameter('toBlock', index, 'latest') as string | number;
  const topics = this.getNodeParameter('topics', index, []) as string[];
  const limit = this.getNodeParameter('limit', index, 100) as number;

  const filterParams: IDataObject = {
    fromBlock: typeof fromBlock === 'number' ? numberToHex(fromBlock) : fromBlock,
    toBlock: typeof toBlock === 'number' ? numberToHex(toBlock) : toBlock,
  };

  if (address) {
    filterParams.address = normalizeAddress(address);
  }

  if (topics && topics.length > 0) {
    filterParams.topics = topics.filter((t) => t !== '' && t !== null);
  }

  try {
    const logs = await jsonRpcRequest.call(this, 'eth_getLogs', [filterParams]);
    const logArray = logs as IDataObject[];

    // Limit results
    const limitedLogs = logArray.slice(0, limit);
    const formattedLogs = limitedLogs.map((log) => formatEventLogResponse(log));

    return formattedLogs.map((log) => ({ json: log as unknown as IDataObject }));
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to get logs: ${(error as Error).message}`,
    );
  }
}

/**
 * Filter events by topics
 */
export async function filterEvents(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const address = this.getNodeParameter('address', index, '') as string;
  const topic0 = this.getNodeParameter('topic0', index, '') as string;
  const topic1 = this.getNodeParameter('topic1', index, '') as string;
  const topic2 = this.getNodeParameter('topic2', index, '') as string;
  const topic3 = this.getNodeParameter('topic3', index, '') as string;
  const fromBlock = this.getNodeParameter('fromBlock', index, 'latest') as string | number;
  const toBlock = this.getNodeParameter('toBlock', index, 'latest') as string | number;

  const topics: (string | null)[] = [];

  if (topic0) topics.push(topic0);
  else if (topic1 || topic2 || topic3) topics.push(null);

  if (topic1) topics.push(topic1);
  else if (topic2 || topic3) topics.push(null);

  if (topic2) topics.push(topic2);
  else if (topic3) topics.push(null);

  if (topic3) topics.push(topic3);

  const filterParams: IDataObject = {
    fromBlock: typeof fromBlock === 'number' ? numberToHex(fromBlock) : fromBlock,
    toBlock: typeof toBlock === 'number' ? numberToHex(toBlock) : toBlock,
  };

  if (address) {
    filterParams.address = normalizeAddress(address);
  }

  if (topics.length > 0) {
    filterParams.topics = topics;
  }

  try {
    const logs = await jsonRpcRequest.call(this, 'eth_getLogs', [filterParams]);
    const logArray = logs as IDataObject[];
    const formattedLogs = logArray.map((log) => formatEventLogResponse(log));

    return formattedLogs.map((log) => ({ json: log as unknown as IDataObject }));
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to filter events: ${(error as Error).message}`,
    );
  }
}

/**
 * Get events for a specific contract
 */
export async function getContractEvents(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const contractAddress = this.getNodeParameter('contractAddress', index) as string;
  const eventSignature = this.getNodeParameter('eventSignature', index, '') as string;
  const fromBlock = this.getNodeParameter('fromBlock', index, 0) as number;
  const toBlock = this.getNodeParameter('toBlock', index, 'latest') as string | number;
  const limit = this.getNodeParameter('limit', index, 100) as number;

  const normalizedAddress = normalizeAddress(contractAddress);

  const filterParams: IDataObject = {
    address: normalizedAddress,
    fromBlock: numberToHex(fromBlock),
    toBlock: typeof toBlock === 'number' ? numberToHex(toBlock) : toBlock,
  };

  if (eventSignature) {
    filterParams.topics = [eventSignature];
  }

  try {
    const logs = await jsonRpcRequest.call(this, 'eth_getLogs', [filterParams]);
    const logArray = logs as IDataObject[];

    // Limit and format results
    const limitedLogs = logArray.slice(0, limit);
    const formattedLogs = limitedLogs.map((log) => formatEventLogResponse(log));

    return [
      {
        json: {
          contractAddress: normalizedAddress,
          eventCount: formattedLogs.length,
          totalEvents: logArray.length,
          events: formattedLogs,
          fromBlock,
          toBlock,
        },
      },
    ];
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to get contract events: ${(error as Error).message}`,
    );
  }
}

/**
 * Decode Transfer event
 */
export async function decodeTransferEvent(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const logData = this.getNodeParameter('logData', index) as string;
  const topics = this.getNodeParameter('topics', index) as string[];

  // Transfer event signature: Transfer(address indexed from, address indexed to, uint256 value)
  // Topic[0] = 0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef

  const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  if (topics.length < 3 || topics[0].toLowerCase() !== TRANSFER_TOPIC.toLowerCase()) {
    return [
      {
        json: {
          isTransferEvent: false,
          message: 'Not a standard ERC-20 Transfer event',
        },
      },
    ];
  }

  // Extract addresses from topics (indexed params)
  const from = '0x' + topics[1].slice(-40);
  const to = '0x' + topics[2].slice(-40);

  // Value is in the data field
  const value = hexToBigInt(logData || '0x0');

  return [
    {
      json: {
        isTransferEvent: true,
        eventName: 'Transfer',
        from,
        to,
        value: value.toString(),
        rawData: logData,
        rawTopics: topics,
      },
    },
  ];
}

/**
 * Get new filter for events (for long-polling)
 */
export async function createEventFilter(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const address = this.getNodeParameter('address', index, '') as string;
  const topics = this.getNodeParameter('topics', index, []) as string[];
  const fromBlock = this.getNodeParameter('fromBlock', index, 'latest') as string;
  const toBlock = this.getNodeParameter('toBlock', index, 'latest') as string;

  const filterParams: IDataObject = {
    fromBlock,
    toBlock,
  };

  if (address) {
    filterParams.address = normalizeAddress(address);
  }

  if (topics && topics.length > 0) {
    filterParams.topics = topics.filter((t) => t !== '');
  }

  try {
    const filterId = await jsonRpcRequest.call(this, 'eth_newFilter', [filterParams]);

    return [
      {
        json: {
          filterId: filterId as string,
          filterParams,
          note: 'Use eth_getFilterChanges with this filter ID to poll for new events',
        },
      },
    ];
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to create filter: ${(error as Error).message}`,
    );
  }
}

/**
 * Get filter changes (poll existing filter)
 */
export async function getFilterChanges(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const filterId = this.getNodeParameter('filterId', index) as string;

  try {
    const changes = await jsonRpcRequest.call(this, 'eth_getFilterChanges', [filterId]);
    const changeArray = changes as IDataObject[];

    if (!changeArray || changeArray.length === 0) {
      return [{ json: { hasChanges: false, events: [] } }];
    }

    const formattedLogs = changeArray.map((log) => formatEventLogResponse(log));

    return [
      {
        json: {
          hasChanges: true,
          eventCount: formattedLogs.length,
          events: formattedLogs,
        },
      },
    ];
  } catch (error) {
    // Filter may have expired
    return [
      {
        json: {
          error: 'Filter not found or expired',
          message: (error as Error).message,
          note: 'Create a new filter if the previous one expired',
        },
      },
    ];
  }
}
