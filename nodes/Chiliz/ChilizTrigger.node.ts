/**
 * [Velocity BPA Licensing Notice]
 *
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 *
 * Use of this node by for-profit organizations in production environments
 * requires a commercial license from Velocity BPA.
 *
 * For licensing information, visit https://velobpa.com/licensing
 * or contact licensing@velobpa.com.
 */

import type {
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { KNOWN_FAN_TOKENS, NETWORKS } from './constants/constants';
import type { IChilizCredentials } from './utils/types';

// Licensing notice - logged once per node load
let licensingNoticeShown = false;

// Helper function for JSON-RPC requests from trigger context
async function triggerJsonRpcRequest(
	context: IPollFunctions,
	method: string,
	params: unknown[] = [],
): Promise<unknown> {
	const credentials = (await context.getCredentials('chilizApi')) as unknown as IChilizCredentials;

	let rpcUrl: string;
	if (credentials.network === 'custom' && credentials.rpcEndpoint) {
		rpcUrl = credentials.rpcEndpoint;
	} else if (credentials.network === 'mainnet') {
		rpcUrl = NETWORKS.mainnet.rpcUrl;
	} else {
		rpcUrl = NETWORKS.spicy.rpcUrl;
	}

	const response = await context.helpers.httpRequest({
		method: 'POST',
		url: rpcUrl,
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			jsonrpc: '2.0',
			method,
			params,
			id: Date.now(),
		}),
	});

	if (response.error) {
		throw new Error(`JSON-RPC Error: ${response.error.message || JSON.stringify(response.error)}`);
	}

	return response.result;
}

// Helper function for Socios API requests from trigger context
async function triggerSociosApiRequest(
	context: IPollFunctions,
	endpoint: string,
	method: 'GET' | 'POST' = 'GET',
	body?: IDataObject,
): Promise<unknown> {
	const credentials = (await context.getCredentials('chilizApi')) as unknown as IChilizCredentials;

	if (!credentials.sociosApiKey) {
		// Return mock data for testing without API key
		return [];
	}

	const requestOptions = {
		method,
		url: `https://api.socios.com/v1${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${credentials.sociosApiKey}`,
		},
		body: body ? JSON.stringify(body) : undefined,
	};

	return await context.helpers.httpRequest(requestOptions);
}

export class ChilizTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chiliz Trigger',
		name: 'chilizTrigger',
		icon: 'file:chiliz.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Triggers workflow on Chiliz Chain events',
		defaults: {
			name: 'Chiliz Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'chilizApi',
				required: true,
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'New Poll Created',
						value: 'newPollCreated',
						description: 'Trigger when a new poll is created',
					},
					{
						name: 'Poll Ended',
						value: 'pollEnded',
						description: 'Trigger when a poll ends',
					},
					{
						name: 'Token Transfer',
						value: 'tokenTransfer',
						description: 'Trigger on Fan Token transfers',
					},
					{
						name: 'New Reward Available',
						value: 'newRewardAvailable',
						description: 'Trigger when new rewards are available',
					},
					{
						name: 'Price Change Alert',
						value: 'priceChangeAlert',
						description: 'Trigger on significant price changes',
					},
					{
						name: 'New Fan Token Listed',
						value: 'newFanTokenListed',
						description: 'Trigger when a new Fan Token is listed',
					},
					{
						name: 'New Block',
						value: 'newBlock',
						description: 'Trigger on every new block',
					},
					{
						name: 'Contract Event',
						value: 'contractEvent',
						description: 'Trigger on specific contract events',
					},
				],
				default: 'tokenTransfer',
			},

			// Token Transfer Parameters
			{
				displayName: 'Token',
				name: 'tokenSymbol',
				type: 'options',
				options: KNOWN_FAN_TOKENS.map((t) => ({
					name: `${t.name} (${t.symbol})`,
					value: t.symbol,
				})),
				default: 'BAR',
				displayOptions: {
					show: {
						event: ['tokenTransfer', 'priceChangeAlert', 'newPollCreated', 'pollEnded'],
					},
				},
				description: 'Fan Token to monitor',
			},

			// Address filter for transfers
			{
				displayName: 'Filter Address',
				name: 'filterAddress',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						event: ['tokenTransfer'],
					},
				},
				description: 'Only trigger for transfers to/from this address (leave empty for all)',
			},

			// Price change threshold
			{
				displayName: 'Price Change Threshold (%)',
				name: 'priceThreshold',
				type: 'number',
				default: 5,
				displayOptions: {
					show: {
						event: ['priceChangeAlert'],
					},
				},
				description: 'Minimum percentage change to trigger',
			},

			// Contract event parameters
			{
				displayName: 'Contract Address',
				name: 'contractAddress',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						event: ['contractEvent'],
					},
				},
				description: 'Contract address to monitor',
			},
			{
				displayName: 'Event Signature',
				name: 'eventSignature',
				type: 'string',
				default: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
				displayOptions: {
					show: {
						event: ['contractEvent'],
					},
				},
				description: 'Event topic hash (default is Transfer event)',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		// Show licensing notice once
		if (!licensingNoticeShown) {
			this.logger.warn(
				'[Velocity BPA Licensing Notice] This n8n node is licensed under the Business Source License 1.1 (BSL 1.1). ' +
					'Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA. ' +
					'For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.',
			);
			licensingNoticeShown = true;
		}

		const event = this.getNodeParameter('event') as string;
		const webhookData = this.getWorkflowStaticData('node');

		try {
			switch (event) {
				case 'newPollCreated':
					return await pollNewPolls(this, webhookData);
				case 'pollEnded':
					return await pollEndedPolls(this, webhookData);
				case 'tokenTransfer':
					return await pollTokenTransfers(this, webhookData);
				case 'newRewardAvailable':
					return await pollNewRewards(this, webhookData);
				case 'priceChangeAlert':
					return await pollPriceChanges(this, webhookData);
				case 'newFanTokenListed':
					return await pollNewTokens(this, webhookData);
				case 'newBlock':
					return await pollNewBlocks(this, webhookData);
				case 'contractEvent':
					return await pollContractEvents(this, webhookData);
				default:
					return null;
			}
		} catch (error) {
			this.logger.error(`Chiliz Trigger error: ${error instanceof Error ? error.message : 'Unknown error'}`);
			return null;
		}
	}
}

// Poll functions as standalone helpers

async function pollNewPolls(
	context: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const tokenSymbol = context.getNodeParameter('tokenSymbol', '') as string;
	const lastPollId = webhookData.lastPollId as string | undefined;

	try {
		let endpoint = '/polls/active';
		if (tokenSymbol) endpoint += `?token=${tokenSymbol}`;

		const polls = (await triggerSociosApiRequest(context, endpoint, 'GET')) as IDataObject[];

		if (!Array.isArray(polls) || polls.length === 0) {
			return null;
		}

		// Filter new polls
		const newPolls = lastPollId
			? polls.filter((poll: IDataObject) => poll.id && poll.id > lastPollId)
			: polls;

		if (newPolls.length === 0) {
			return null;
		}

		// Update last seen poll ID
		const latestPoll = newPolls.reduce((a: IDataObject, b: IDataObject) =>
			(a.id as string) > (b.id as string) ? a : b,
		);
		webhookData.lastPollId = latestPoll.id;

		return [
			newPolls.map((poll: IDataObject) => ({
				json: {
					event: 'newPollCreated',
					pollId: poll.id,
					title: poll.title,
					description: poll.description,
					tokenSymbol: poll.tokenSymbol || tokenSymbol,
					startDate: poll.startDate,
					endDate: poll.endDate,
					options: poll.options,
					timestamp: new Date().toISOString(),
				},
			})),
		];
	} catch (error) {
		context.logger.error(`Poll new polls error: ${(error as Error).message}`);
		return null;
	}
}

async function pollEndedPolls(
	context: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const tokenSymbol = context.getNodeParameter('tokenSymbol', '') as string;
	const lastEndedPollId = webhookData.lastEndedPollId as string | undefined;

	try {
		let endpoint = '/polls/ended';
		if (tokenSymbol) endpoint += `?token=${tokenSymbol}`;

		const polls = (await triggerSociosApiRequest(context, endpoint, 'GET')) as IDataObject[];

		if (!Array.isArray(polls) || polls.length === 0) {
			return null;
		}

		// Filter newly ended polls
		const newlyEndedPolls = lastEndedPollId
			? polls.filter((poll: IDataObject) => poll.id && poll.id > lastEndedPollId)
			: polls;

		if (newlyEndedPolls.length === 0) {
			return null;
		}

		// Update last seen ended poll ID
		const latestPoll = newlyEndedPolls.reduce((a: IDataObject, b: IDataObject) =>
			(a.id as string) > (b.id as string) ? a : b,
		);
		webhookData.lastEndedPollId = latestPoll.id;

		return [
			newlyEndedPolls.map((poll: IDataObject) => ({
				json: {
					event: 'pollEnded',
					pollId: poll.id,
					title: poll.title,
					tokenSymbol: poll.tokenSymbol || tokenSymbol,
					results: poll.results,
					winner: poll.winner,
					totalVotes: poll.totalVotes,
					endDate: poll.endDate,
					timestamp: new Date().toISOString(),
				},
			})),
		];
	} catch (error) {
		context.logger.error(`Poll ended polls error: ${(error as Error).message}`);
		return null;
	}
}

async function pollTokenTransfers(
	context: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const tokenSymbol = context.getNodeParameter('tokenSymbol') as string;
	const filterAddress = context.getNodeParameter('filterAddress', '') as string;
	const lastBlockNumber = webhookData.lastBlockNumber as number | undefined;

	try {
		// Get current block number
		const currentBlockHex = (await triggerJsonRpcRequest(context, 'eth_blockNumber')) as string;
		const currentBlock = parseInt(currentBlockHex, 16);

		// Set from block (last checked or recent)
		const fromBlock = lastBlockNumber ? lastBlockNumber + 1 : currentBlock - 10;

		if (fromBlock > currentBlock) {
			return null;
		}

		// Find token contract
		const token = KNOWN_FAN_TOKENS.find((t) => t.symbol === tokenSymbol);
		if (!token) {
			return null;
		}

		// Transfer event topic
		const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

		// Build topics array
		const topics: (string | null)[] = [transferTopic];

		// Add address filter if specified
		if (filterAddress) {
			const paddedAddress = '0x' + filterAddress.slice(2).padStart(64, '0').toLowerCase();
			// Filter by from OR to address
			topics.push(paddedAddress);
		}

		// Get logs
		const logs = (await triggerJsonRpcRequest(context, 'eth_getLogs', [
			{
				fromBlock: '0x' + fromBlock.toString(16),
				toBlock: '0x' + currentBlock.toString(16),
				address: token.address,
				topics,
			},
		])) as IDataObject[];

		// Update last block number
		webhookData.lastBlockNumber = currentBlock;

		if (!Array.isArray(logs) || logs.length === 0) {
			return null;
		}

		// Parse transfer events
		const transfers = logs.map((log: IDataObject) => {
			const topics = log.topics as string[];
			const from = '0x' + (topics[1] as string).slice(26);
			const to = '0x' + (topics[2] as string).slice(26);
			const value = BigInt(log.data as string);

			return {
				json: {
					event: 'tokenTransfer',
					tokenSymbol,
					tokenName: token.name,
					from,
					to,
					value: value.toString(),
					valueFormatted: (Number(value) / 1e18).toFixed(4),
					blockNumber: parseInt(log.blockNumber as string, 16),
					transactionHash: log.transactionHash,
					logIndex: parseInt(log.logIndex as string, 16),
					timestamp: new Date().toISOString(),
				},
			};
		});

		return [transfers];
	} catch (error) {
		context.logger.error(`Poll token transfers error: ${(error as Error).message}`);
		return null;
	}
}

async function pollNewRewards(
	context: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const lastRewardId = webhookData.lastRewardId as string | undefined;

	try {
		const rewards = (await triggerSociosApiRequest(
			context,
			'/rewards/available',
			'GET',
		)) as IDataObject[];

		if (!Array.isArray(rewards) || rewards.length === 0) {
			return null;
		}

		// Filter new rewards
		const newRewards = lastRewardId
			? rewards.filter((reward: IDataObject) => reward.id && reward.id > lastRewardId)
			: rewards;

		if (newRewards.length === 0) {
			return null;
		}

		// Update last seen reward ID
		const latestReward = newRewards.reduce((a: IDataObject, b: IDataObject) =>
			(a.id as string) > (b.id as string) ? a : b,
		);
		webhookData.lastRewardId = latestReward.id;

		return [
			newRewards.map((reward: IDataObject) => ({
				json: {
					event: 'newRewardAvailable',
					rewardId: reward.id,
					title: reward.title,
					description: reward.description,
					tokenSymbol: reward.tokenSymbol,
					requiredTokens: reward.requiredTokens,
					type: reward.type,
					expiryDate: reward.expiryDate,
					timestamp: new Date().toISOString(),
				},
			})),
		];
	} catch (error) {
		context.logger.error(`Poll new rewards error: ${(error as Error).message}`);
		return null;
	}
}

async function pollPriceChanges(
	context: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const tokenSymbol = context.getNodeParameter('tokenSymbol') as string;
	const threshold = context.getNodeParameter('priceThreshold', 5) as number;
	const lastPrice = webhookData.lastPrice as number | undefined;

	try {
		// Note: This would require a price API - using placeholder
		// In production, integrate with CoinGecko, CoinMarketCap, or DEX price feeds
		const mockPrice = 1.5 + Math.random() * 0.5; // Mock price for demo

		if (lastPrice === undefined) {
			webhookData.lastPrice = mockPrice;
			return null;
		}

		const percentageChange = ((mockPrice - lastPrice) / lastPrice) * 100;

		if (Math.abs(percentageChange) < threshold) {
			webhookData.lastPrice = mockPrice;
			return null;
		}

		webhookData.lastPrice = mockPrice;

		return [
			[
				{
					json: {
						event: 'priceChangeAlert',
						tokenSymbol,
						previousPrice: lastPrice,
						currentPrice: mockPrice,
						percentageChange: percentageChange.toFixed(2),
						direction: percentageChange > 0 ? 'up' : 'down',
						threshold,
						timestamp: new Date().toISOString(),
						note: 'Price data is simulated - integrate with price API for production',
					},
				},
			],
		];
	} catch (error) {
		context.logger.error(`Poll price changes error: ${(error as Error).message}`);
		return null;
	}
}

async function pollNewTokens(
	context: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const knownTokens = webhookData.knownTokens as string[] | undefined;

	try {
		// In production, this would query an API for newly listed tokens
		// For now, compare against known tokens list
		const currentTokens = KNOWN_FAN_TOKENS.map((t) => t.symbol);

		if (!knownTokens) {
			webhookData.knownTokens = currentTokens;
			return null;
		}

		const newTokens = currentTokens.filter((t) => !knownTokens.includes(t));

		if (newTokens.length === 0) {
			return null;
		}

		webhookData.knownTokens = currentTokens;

		return [
			newTokens.map((symbol) => {
				const token = KNOWN_FAN_TOKENS.find((t) => t.symbol === symbol);
				return {
					json: {
						event: 'newFanTokenListed',
						tokenSymbol: symbol,
						tokenName: token?.name || symbol,
						tokenAddress: token?.address || 'unknown',
						timestamp: new Date().toISOString(),
					},
				};
			}),
		];
	} catch (error) {
		context.logger.error(`Poll new tokens error: ${(error as Error).message}`);
		return null;
	}
}

async function pollNewBlocks(
	context: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const lastBlockNumber = webhookData.lastBlockNumber as number | undefined;

	try {
		// Get latest block
		const blockHex = (await triggerJsonRpcRequest(context, 'eth_blockNumber')) as string;
		const currentBlock = parseInt(blockHex, 16);

		if (lastBlockNumber !== undefined && currentBlock <= lastBlockNumber) {
			return null;
		}

		// Get block details
		const blockData = (await triggerJsonRpcRequest(context, 'eth_getBlockByNumber', [
			'0x' + currentBlock.toString(16),
			false,
		])) as IDataObject;

		webhookData.lastBlockNumber = currentBlock;

		if (!blockData) {
			return null;
		}

		return [
			[
				{
					json: {
						event: 'newBlock',
						blockNumber: currentBlock,
						blockHash: blockData.hash,
						parentHash: blockData.parentHash,
						timestamp: parseInt(blockData.timestamp as string, 16),
						gasUsed: parseInt(blockData.gasUsed as string, 16),
						gasLimit: parseInt(blockData.gasLimit as string, 16),
						transactionCount: (blockData.transactions as string[])?.length || 0,
						miner: blockData.miner,
						timestampIso: new Date().toISOString(),
					},
				},
			],
		];
	} catch (error) {
		context.logger.error(`Poll new blocks error: ${(error as Error).message}`);
		return null;
	}
}

async function pollContractEvents(
	context: IPollFunctions,
	webhookData: IDataObject,
): Promise<INodeExecutionData[][] | null> {
	const contractAddress = context.getNodeParameter('contractAddress') as string;
	const eventSignature = context.getNodeParameter('eventSignature') as string;
	const lastBlockNumber = webhookData.lastBlockNumber as number | undefined;

	if (!contractAddress) {
		return null;
	}

	try {
		// Get current block number
		const currentBlockHex = (await triggerJsonRpcRequest(context, 'eth_blockNumber')) as string;
		const currentBlock = parseInt(currentBlockHex, 16);

		// Set from block
		const fromBlock = lastBlockNumber ? lastBlockNumber + 1 : currentBlock - 10;

		if (fromBlock > currentBlock) {
			return null;
		}

		// Get logs
		const logs = (await triggerJsonRpcRequest(context, 'eth_getLogs', [
			{
				fromBlock: '0x' + fromBlock.toString(16),
				toBlock: '0x' + currentBlock.toString(16),
				address: contractAddress,
				topics: eventSignature ? [eventSignature] : undefined,
			},
		])) as IDataObject[];

		// Update last block number
		webhookData.lastBlockNumber = currentBlock;

		if (!Array.isArray(logs) || logs.length === 0) {
			return null;
		}

		// Parse events
		const events = logs.map((log: IDataObject) => ({
			json: {
				event: 'contractEvent',
				contractAddress,
				eventTopic: (log.topics as string[])?.[0] || eventSignature,
				topics: log.topics,
				data: log.data,
				blockNumber: parseInt(log.blockNumber as string, 16),
				transactionHash: log.transactionHash,
				logIndex: parseInt(log.logIndex as string, 16),
				timestamp: new Date().toISOString(),
			},
		}));

		return [events];
	} catch (error) {
		context.logger.error(`Poll contract events error: ${(error as Error).message}`);
		return null;
	}
}
