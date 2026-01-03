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
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

// Import action functions
import * as fanTokensActions from './actions/fanTokens/fanTokens';
import * as accountsActions from './actions/accounts/accounts';
import * as transactionsActions from './actions/transactions/transactions';
import * as smartContractsActions from './actions/smartContracts/smartContracts';
import * as pollsActions from './actions/polls/polls';
import * as rewardsActions from './actions/rewards/rewards';
import * as nftsActions from './actions/nfts/nfts';
import * as networkActions from './actions/network/network';
import * as eventsActions from './actions/events/events';
import * as utilityActions from './actions/utility/utility';

// Licensing notice - logged once per node load
let licensingNoticeShown = false;

export class Chiliz implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chiliz',
		name: 'chiliz',
		icon: 'file:chiliz.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Chiliz Chain - Fan Tokens, Voting, Rewards, and NFTs',
		defaults: {
			name: 'Chiliz',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'chilizApi',
				required: true,
			},
		],
		properties: [
			// Resource selection
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Fan Token',
						value: 'fanToken',
						description: 'Interact with Fan Tokens (BAR, PSG, JUV, etc.)',
					},
					{
						name: 'Account',
						value: 'account',
						description: 'Query account balances and history',
					},
					{
						name: 'Transaction',
						value: 'transaction',
						description: 'Send and query transactions',
					},
					{
						name: 'Smart Contract',
						value: 'smartContract',
						description: 'Interact with smart contracts',
					},
					{
						name: 'Poll',
						value: 'poll',
						description: 'Fan voting and polls',
					},
					{
						name: 'Reward',
						value: 'reward',
						description: 'Fan rewards and benefits',
					},
					{
						name: 'NFT',
						value: 'nft',
						description: 'Fan collectibles and NFTs',
					},
					{
						name: 'Network',
						value: 'network',
						description: 'Network status and information',
					},
					{
						name: 'Event',
						value: 'event',
						description: 'Blockchain event logs',
					},
					{
						name: 'Utility',
						value: 'utility',
						description: 'Helper functions and tools',
					},
				],
				default: 'fanToken',
			},

			// ============ FAN TOKEN OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['fanToken'],
					},
				},
				options: [
					{
						name: 'Get Fan Token Info',
						value: 'getFanTokenInfo',
						description: 'Get detailed information about a Fan Token',
						action: 'Get fan token info',
					},
					{
						name: 'List Fan Tokens',
						value: 'listFanTokens',
						description: 'List all known Fan Tokens',
						action: 'List fan tokens',
					},
					{
						name: 'Get Token Price',
						value: 'getTokenPrice',
						description: 'Get current token price',
						action: 'Get token price',
					},
					{
						name: 'Get Token Holders',
						value: 'getTokenHolders',
						description: 'Get list of token holders',
						action: 'Get token holders',
					},
					{
						name: 'Get Token Volume',
						value: 'getTokenVolume',
						description: 'Get trading volume',
						action: 'Get token volume',
					},
					{
						name: 'Get Token Supply',
						value: 'getTokenSupply',
						description: 'Get circulating and total supply',
						action: 'Get token supply',
					},
					{
						name: 'Get User Tokens',
						value: 'getUserTokens',
						description: "Get user's Fan Token holdings",
						action: 'Get user tokens',
					},
					{
						name: 'Get Supported Clubs',
						value: 'getSupportedClubs',
						description: 'Get list of supported clubs',
						action: 'Get supported clubs',
					},
				],
				default: 'getFanTokenInfo',
			},

			// ============ ACCOUNT OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['account'],
					},
				},
				options: [
					{
						name: 'Get Balance',
						value: 'getBalance',
						description: 'Get CHZ balance for an address',
						action: 'Get balance',
					},
					{
						name: 'Get Token Balances',
						value: 'getTokenBalances',
						description: 'Get all Fan Token balances',
						action: 'Get token balances',
					},
					{
						name: 'Get Transaction History',
						value: 'getTransactionHistory',
						description: 'Get transaction history for an address',
						action: 'Get transaction history',
					},
					{
						name: 'Get Token Transfers',
						value: 'getTokenTransfers',
						description: 'Get Fan Token transfer history',
						action: 'Get token transfers',
					},
					{
						name: 'Get Account Nonce',
						value: 'getAccountNonce',
						description: 'Get current nonce for an address',
						action: 'Get account nonce',
					},
				],
				default: 'getBalance',
			},

			// ============ TRANSACTION OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['transaction'],
					},
				},
				options: [
					{
						name: 'Get Transaction',
						value: 'getTransaction',
						description: 'Get transaction details by hash',
						action: 'Get transaction',
					},
					{
						name: 'Send Transaction',
						value: 'sendTransaction',
						description: 'Send a transaction',
						action: 'Send transaction',
					},
					{
						name: 'Transfer Token',
						value: 'transferToken',
						description: 'Transfer Fan Tokens',
						action: 'Transfer token',
					},
					{
						name: 'Estimate Gas',
						value: 'estimateGas',
						description: 'Estimate gas for a transaction',
						action: 'Estimate gas',
					},
					{
						name: 'Get Transaction Receipt',
						value: 'getTransactionReceipt',
						description: 'Get transaction receipt',
						action: 'Get transaction receipt',
					},
					{
						name: 'Get Pending Transactions',
						value: 'getPendingTransactions',
						description: 'Get pending transactions',
						action: 'Get pending transactions',
					},
				],
				default: 'getTransaction',
			},

			// ============ SMART CONTRACT OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['smartContract'],
					},
				},
				options: [
					{
						name: 'Read Contract',
						value: 'readContract',
						description: 'Call a view/pure function',
						action: 'Read contract',
					},
					{
						name: 'Write Contract',
						value: 'writeContract',
						description: 'Send a transaction to a contract',
						action: 'Write contract',
					},
					{
						name: 'Get Contract Events',
						value: 'getContractEvents',
						description: 'Get events emitted by a contract',
						action: 'Get contract events',
					},
					{
						name: 'Get Fan Token Contract',
						value: 'getFanTokenContract',
						description: 'Get Fan Token contract address',
						action: 'Get fan token contract',
					},
					{
						name: 'Get Contract Info',
						value: 'getContractInfo',
						description: 'Get contract code and verification status',
						action: 'Get contract info',
					},
					{
						name: 'Get Contract Source',
						value: 'getContractSource',
						description: 'Get verified contract source code',
						action: 'Get contract source',
					},
				],
				default: 'readContract',
			},

			// ============ POLL OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['poll'],
					},
				},
				options: [
					{
						name: 'Get Active Polls',
						value: 'getActivePolls',
						description: 'Get currently active polls',
						action: 'Get active polls',
					},
					{
						name: 'Get Poll Details',
						value: 'getPollDetails',
						description: 'Get details of a specific poll',
						action: 'Get poll details',
					},
					{
						name: 'Vote on Poll',
						value: 'voteOnPoll',
						description: 'Cast a vote on a poll',
						action: 'Vote on poll',
					},
					{
						name: 'Get Vote Results',
						value: 'getVoteResults',
						description: 'Get results of a poll',
						action: 'Get vote results',
					},
					{
						name: 'Get User Votes',
						value: 'getUserVotes',
						description: "Get user's voting history",
						action: 'Get user votes',
					},
					{
						name: 'Get Upcoming Polls',
						value: 'getUpcomingPolls',
						description: 'Get upcoming/scheduled polls',
						action: 'Get upcoming polls',
					},
				],
				default: 'getActivePolls',
			},

			// ============ REWARD OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['reward'],
					},
				},
				options: [
					{
						name: 'Get Available Rewards',
						value: 'getAvailableRewards',
						description: 'Get available rewards',
						action: 'Get available rewards',
					},
					{
						name: 'Get User Rewards',
						value: 'getUserRewards',
						description: "Get user's earned rewards",
						action: 'Get user rewards',
					},
					{
						name: 'Claim Reward',
						value: 'claimReward',
						description: 'Claim/redeem a reward',
						action: 'Claim reward',
					},
					{
						name: 'Get Reward History',
						value: 'getRewardHistory',
						description: 'Get past reward redemptions',
						action: 'Get reward history',
					},
					{
						name: 'Get Reward Details',
						value: 'getRewardDetails',
						description: 'Get details of a specific reward',
						action: 'Get reward details',
					},
					{
						name: 'Check Reward Eligibility',
						value: 'checkRewardEligibility',
						description: 'Check if eligible for a reward',
						action: 'Check reward eligibility',
					},
				],
				default: 'getAvailableRewards',
			},

			// ============ NFT OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['nft'],
					},
				},
				options: [
					{
						name: 'Get NFT Collection',
						value: 'getNFTCollection',
						description: 'Get NFT collection details',
						action: 'Get NFT collection',
					},
					{
						name: 'Get User NFTs',
						value: 'getUserNFTs',
						description: "Get user's NFTs",
						action: 'Get user NFTs',
					},
					{
						name: 'Get NFT Metadata',
						value: 'getNFTMetadata',
						description: 'Get metadata for an NFT',
						action: 'Get NFT metadata',
					},
					{
						name: 'Transfer NFT',
						value: 'transferNFT',
						description: 'Transfer an NFT',
						action: 'Transfer NFT',
					},
					{
						name: 'Check NFT Ownership',
						value: 'checkNFTOwnership',
						description: 'Check who owns an NFT',
						action: 'Check NFT ownership',
					},
					{
						name: 'Get NFT Approval',
						value: 'getNFTApproval',
						description: 'Get approval status for an NFT',
						action: 'Get NFT approval',
					},
				],
				default: 'getNFTCollection',
			},

			// ============ NETWORK OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['network'],
					},
				},
				options: [
					{
						name: 'Get Network Status',
						value: 'getNetworkStatus',
						description: 'Get network health and status',
						action: 'Get network status',
					},
					{
						name: 'Get Gas Price',
						value: 'getGasPrice',
						description: 'Get current gas price',
						action: 'Get gas price',
					},
					{
						name: 'Get Block',
						value: 'getBlock',
						description: 'Get block by number or hash',
						action: 'Get block',
					},
					{
						name: 'Get Latest Block',
						value: 'getLatestBlock',
						description: 'Get the latest block',
						action: 'Get latest block',
					},
					{
						name: 'Get Network Info',
						value: 'getNetworkInfo',
						description: 'Get network configuration',
						action: 'Get network info',
					},
					{
						name: 'Get Protocol Version',
						value: 'getProtocolVersion',
						description: 'Get protocol version',
						action: 'Get protocol version',
					},
					{
						name: 'Get Fee History',
						value: 'getFeeHistory',
						description: 'Get historical fee data',
						action: 'Get fee history',
					},
				],
				default: 'getNetworkStatus',
			},

			// ============ EVENT OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['event'],
					},
				},
				options: [
					{
						name: 'Get Logs',
						value: 'getLogs',
						description: 'Get event logs with filters',
						action: 'Get logs',
					},
					{
						name: 'Filter Events',
						value: 'filterEvents',
						description: 'Filter events by topics',
						action: 'Filter events',
					},
					{
						name: 'Get Contract Events',
						value: 'getContractEvents',
						description: 'Get events for a specific contract',
						action: 'Get contract events',
					},
					{
						name: 'Decode Transfer Event',
						value: 'decodeTransferEvent',
						description: 'Decode ERC-20/721 Transfer events',
						action: 'Decode transfer event',
					},
					{
						name: 'Create Event Filter',
						value: 'createEventFilter',
						description: 'Create a filter to poll for events',
						action: 'Create event filter',
					},
					{
						name: 'Get Filter Changes',
						value: 'getFilterChanges',
						description: 'Get new events for a filter',
						action: 'Get filter changes',
					},
				],
				default: 'getLogs',
			},

			// ============ UTILITY OPERATIONS ============
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['utility'],
					},
				},
				options: [
					{
						name: 'Convert Units',
						value: 'convertUnits',
						description: 'Convert between CHZ/Wei/Gwei',
						action: 'Convert units',
					},
					{
						name: 'Get API Health',
						value: 'getAPIHealth',
						description: 'Check API health status',
						action: 'Get API health',
					},
					{
						name: 'Get Supported Clubs',
						value: 'getSupportedClubs',
						description: 'Get list of supported clubs',
						action: 'Get supported clubs',
					},
					{
						name: 'Validate Address',
						value: 'validateAddress',
						description: 'Validate an Ethereum address',
						action: 'Validate address',
					},
					{
						name: 'Get Network Info',
						value: 'getNetworkInfo',
						description: 'Get network configuration',
						action: 'Get network info',
					},
					{
						name: 'Encode Function Call',
						value: 'encodeFunctionCall',
						description: 'Encode function call data',
						action: 'Encode function call',
					},
				],
				default: 'convertUnits',
			},

			// ============ PARAMETERS ============

			// Token Address/Symbol (common)
			{
				displayName: 'Token',
				name: 'tokenAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['fanToken'],
						operation: ['getFanTokenInfo', 'getTokenPrice', 'getTokenHolders', 'getTokenVolume', 'getTokenSupply'],
					},
				},
				description: 'Token contract address or symbol (e.g., BAR, PSG, 0x...)',
			},

			// User Address (common)
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['account'],
						operation: ['getBalance', 'getTokenBalances', 'getTransactionHistory', 'getTokenTransfers', 'getAccountNonce'],
					},
				},
				description: 'Ethereum address to query',
			},

			// User Address for Fan Tokens
			{
				displayName: 'User Address',
				name: 'userAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['fanToken'],
						operation: ['getUserTokens'],
					},
				},
				description: 'User address to check token holdings',
			},

			// Transaction Hash
			{
				displayName: 'Transaction Hash',
				name: 'transactionHash',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['getTransaction', 'getTransactionReceipt'],
					},
				},
				description: 'Transaction hash (0x...)',
			},

			// Contract Address
			{
				displayName: 'Contract Address',
				name: 'contractAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['smartContract'],
						operation: ['readContract', 'writeContract', 'getContractEvents', 'getContractInfo', 'getContractSource'],
					},
				},
				description: 'Smart contract address',
			},

			// Function Selector/Name
			{
				displayName: 'Function',
				name: 'functionName',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['smartContract'],
						operation: ['readContract', 'writeContract'],
					},
				},
				description: 'Function name or selector (e.g., balanceOf, 0x70a08231)',
			},

			// Function Parameters (JSON)
			{
				displayName: 'Parameters',
				name: 'functionParams',
				type: 'json',
				default: '[]',
				displayOptions: {
					show: {
						resource: ['smartContract'],
						operation: ['readContract', 'writeContract'],
					},
				},
				description: 'Function parameters as JSON array',
			},

			// Token Symbol for Fan Token Contract
			{
				displayName: 'Token Symbol',
				name: 'tokenSymbol',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['smartContract'],
						operation: ['getFanTokenContract'],
					},
				},
				description: 'Fan Token symbol (e.g., BAR, PSG)',
			},

			// Token Symbol Filter (optional)
			{
				displayName: 'Token Symbol',
				name: 'tokenSymbol',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['poll', 'reward'],
						operation: ['getActivePolls', 'getAvailableRewards', 'getRewardHistory'],
					},
				},
				description: 'Filter by token symbol',
			},

			// Poll ID
			{
				displayName: 'Poll ID',
				name: 'pollId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['poll'],
						operation: ['getPollDetails', 'voteOnPoll', 'getVoteResults'],
					},
				},
				description: 'Poll identifier',
			},

			// Vote Option
			{
				displayName: 'Option ID',
				name: 'optionId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['poll'],
						operation: ['voteOnPoll'],
					},
				},
				description: 'Vote option identifier',
			},

			// Reward ID
			{
				displayName: 'Reward ID',
				name: 'rewardId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['reward'],
						operation: ['claimReward', 'getRewardDetails', 'checkRewardEligibility'],
					},
				},
				description: 'Reward identifier',
			},

			// User Address for Rewards/Polls
			{
				displayName: 'User Address',
				name: 'userAddress',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['reward', 'poll'],
						operation: ['getUserRewards', 'getRewardHistory', 'getUserVotes', 'checkRewardEligibility'],
					},
				},
				description: 'User address (optional)',
			},

			// Delivery Info for Rewards
			{
				displayName: 'Delivery Information',
				name: 'deliveryInfo',
				type: 'json',
				default: '{}',
				displayOptions: {
					show: {
						resource: ['reward'],
						operation: ['claimReward'],
					},
				},
				description: 'Delivery information for physical rewards',
			},

			// NFT Collection Address
			{
				displayName: 'Collection Address',
				name: 'collectionAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['nft'],
						operation: ['getNFTCollection', 'getNFTMetadata', 'checkNFTOwnership', 'getNFTApproval'],
					},
				},
				description: 'NFT collection contract address',
			},

			// User Address for NFTs
			{
				displayName: 'User Address',
				name: 'userAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['nft'],
						operation: ['getUserNFTs'],
					},
				},
				description: 'User address to check NFT holdings',
			},

			// Token ID
			{
				displayName: 'Token ID',
				name: 'tokenId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['nft'],
						operation: ['getNFTMetadata', 'transferNFT', 'checkNFTOwnership', 'getNFTApproval'],
					},
				},
				description: 'NFT token ID',
			},

			// NFT Transfer Parameters
			{
				displayName: 'From Address',
				name: 'fromAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['nft'],
						operation: ['transferNFT'],
					},
				},
				description: 'Current owner address',
			},
			{
				displayName: 'To Address',
				name: 'toAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['nft'],
						operation: ['transferNFT'],
					},
				},
				description: 'Recipient address',
			},
			{
				displayName: 'Collection Address',
				name: 'collectionAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['nft'],
						operation: ['transferNFT'],
					},
				},
				description: 'NFT collection contract address',
			},

			// Block Parameters
			{
				displayName: 'Block Identifier',
				name: 'blockIdentifier',
				type: 'string',
				default: 'latest',
				displayOptions: {
					show: {
						resource: ['network'],
						operation: ['getBlock'],
					},
				},
				description: 'Block number or hash (default: latest)',
			},

			// Event Filter Parameters
			{
				displayName: 'Contract Address',
				name: 'contractAddress',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['event'],
						operation: ['getLogs', 'filterEvents', 'getContractEvents', 'createEventFilter'],
					},
				},
				description: 'Filter by contract address',
			},
			{
				displayName: 'From Block',
				name: 'fromBlock',
				type: 'string',
				default: 'latest',
				displayOptions: {
					show: {
						resource: ['event'],
						operation: ['getLogs', 'filterEvents', 'getContractEvents', 'createEventFilter'],
					},
				},
				description: 'Start block (number or "latest")',
			},
			{
				displayName: 'To Block',
				name: 'toBlock',
				type: 'string',
				default: 'latest',
				displayOptions: {
					show: {
						resource: ['event'],
						operation: ['getLogs', 'filterEvents', 'getContractEvents', 'createEventFilter'],
					},
				},
				description: 'End block (number or "latest")',
			},
			{
				displayName: 'Topics',
				name: 'topics',
				type: 'json',
				default: '[]',
				displayOptions: {
					show: {
						resource: ['event'],
						operation: ['getLogs', 'filterEvents', 'createEventFilter'],
					},
				},
				description: 'Event topics as JSON array',
			},

			// Event Log for Decoding
			{
				displayName: 'Event Log',
				name: 'eventLog',
				type: 'json',
				default: '{}',
				required: true,
				displayOptions: {
					show: {
						resource: ['event'],
						operation: ['decodeTransferEvent'],
					},
				},
				description: 'Raw event log to decode',
			},

			// Filter ID
			{
				displayName: 'Filter ID',
				name: 'filterId',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['event'],
						operation: ['getFilterChanges'],
					},
				},
				description: 'Filter ID from createEventFilter',
			},

			// Unit Conversion Parameters
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['utility'],
						operation: ['convertUnits'],
					},
				},
				description: 'Amount to convert',
			},
			{
				displayName: 'From Unit',
				name: 'fromUnit',
				type: 'options',
				options: [
					{ name: 'Wei', value: 'wei' },
					{ name: 'Gwei', value: 'gwei' },
					{ name: 'CHZ', value: 'chz' },
				],
				default: 'chz',
				displayOptions: {
					show: {
						resource: ['utility'],
						operation: ['convertUnits'],
					},
				},
				description: 'Source unit',
			},
			{
				displayName: 'To Unit',
				name: 'toUnit',
				type: 'options',
				options: [
					{ name: 'Wei', value: 'wei' },
					{ name: 'Gwei', value: 'gwei' },
					{ name: 'CHZ', value: 'chz' },
				],
				default: 'wei',
				displayOptions: {
					show: {
						resource: ['utility'],
						operation: ['convertUnits'],
					},
				},
				description: 'Target unit',
			},
			{
				displayName: 'Decimals',
				name: 'decimals',
				type: 'number',
				default: 18,
				displayOptions: {
					show: {
						resource: ['utility'],
						operation: ['convertUnits'],
					},
				},
				description: 'Token decimals (default: 18)',
			},

			// Address Validation
			{
				displayName: 'Address',
				name: 'address',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['utility'],
						operation: ['validateAddress'],
					},
				},
				description: 'Address to validate',
			},

			// Function Encoding
			{
				displayName: 'Function Signature',
				name: 'functionSignature',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['utility'],
						operation: ['encodeFunctionCall'],
					},
				},
				description: 'Function signature (e.g., transfer(address,uint256))',
			},
			{
				displayName: 'Parameters',
				name: 'parameters',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				displayOptions: {
					show: {
						resource: ['utility'],
						operation: ['encodeFunctionCall'],
					},
				},
				options: [
					{
						name: 'parameter',
						displayName: 'Parameter',
						values: [
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
							},
						],
					},
				],
				description: 'Function parameters',
			},

			// Club Category Filter
			{
				displayName: 'Category',
				name: 'category',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'Football', value: 'football' },
					{ name: 'Esports', value: 'esports' },
					{ name: 'Racing', value: 'racing' },
					{ name: 'MMA', value: 'mma' },
				],
				default: 'all',
				displayOptions: {
					show: {
						resource: ['utility', 'fanToken'],
						operation: ['getSupportedClubs'],
					},
				},
				description: 'Filter by category',
			},

			// Reward Type Filter
			{
				displayName: 'Reward Type',
				name: 'rewardType',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['reward'],
						operation: ['getAvailableRewards'],
					},
				},
				description: 'Filter by reward type',
			},

			// Status Filter
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['reward'],
						operation: ['getUserRewards'],
					},
				},
				description: 'Filter by status (e.g., claimed, pending)',
			},

			// Limit
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 10,
				displayOptions: {
					show: {
						resource: ['account', 'poll', 'reward', 'nft', 'fanToken'],
						operation: ['getTransactionHistory', 'getTokenTransfers', 'getActivePolls', 'getUserVotes', 'getUpcomingPolls', 'getAvailableRewards', 'getUserRewards', 'getRewardHistory', 'getUserNFTs', 'getTokenHolders'],
					},
				},
				description: 'Maximum number of results',
			},

			// Page
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				displayOptions: {
					show: {
						resource: ['account', 'fanToken'],
						operation: ['getTransactionHistory', 'getTokenTransfers', 'getTokenHolders'],
					},
				},
				description: 'Page number for pagination',
			},

			// Transaction Parameters
			{
				displayName: 'To Address',
				name: 'toAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['sendTransaction', 'transferToken', 'estimateGas'],
					},
				},
				description: 'Recipient address',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['sendTransaction', 'transferToken'],
					},
				},
				description: 'Amount to send',
			},
			{
				displayName: 'Token Address',
				name: 'tokenAddress',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['transferToken'],
					},
				},
				description: 'Token contract address',
			},
			{
				displayName: 'Data',
				name: 'data',
				type: 'string',
				default: '0x',
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['sendTransaction', 'estimateGas'],
					},
				},
				description: 'Transaction data (hex)',
			},
			{
				displayName: 'Value (Wei)',
				name: 'value',
				type: 'string',
				default: '0',
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['estimateGas'],
					},
				},
				description: 'Value in Wei',
			},
			{
				displayName: 'From Address',
				name: 'fromAddress',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['transaction'],
						operation: ['estimateGas'],
					},
				},
				description: 'Sender address (for estimation)',
			},

			// Fee History Parameters
			{
				displayName: 'Block Count',
				name: 'blockCount',
				type: 'number',
				default: 10,
				displayOptions: {
					show: {
						resource: ['network'],
						operation: ['getFeeHistory'],
					},
				},
				description: 'Number of blocks to retrieve',
			},
			{
				displayName: 'Newest Block',
				name: 'newestBlock',
				type: 'string',
				default: 'latest',
				displayOptions: {
					show: {
						resource: ['network'],
						operation: ['getFeeHistory'],
					},
				},
				description: 'Newest block to start from',
			},
			{
				displayName: 'Reward Percentiles',
				name: 'rewardPercentiles',
				type: 'json',
				default: '[25, 50, 75]',
				displayOptions: {
					show: {
						resource: ['network'],
						operation: ['getFeeHistory'],
					},
				},
				description: 'Percentiles for priority fee calculation',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Log licensing notice once per node load
		if (!licensingNoticeShown) {
			this.logger.warn(
				'[Velocity BPA Licensing Notice] This n8n node is licensed under the Business Source License 1.1 (BSL 1.1). ' +
					'Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA. ' +
					'For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.',
			);
			licensingNoticeShown = true;
		}

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: INodeExecutionData[] | IDataObject;

				// Fan Token operations
				if (resource === 'fanToken') {
					switch (operation) {
						case 'getFanTokenInfo':
							result = await fanTokensActions.getFanTokenInfo.call(this, i);
							break;
						case 'listFanTokens':
							result = await fanTokensActions.listFanTokens.call(this, i);
							break;
						case 'getTokenPrice':
							result = await fanTokensActions.getTokenPrice.call(this, i);
							break;
						case 'getTokenHolders':
							result = await fanTokensActions.getTokenHolders.call(this, i);
							break;
						case 'getTokenVolume':
							result = await fanTokensActions.getTokenVolume.call(this, i);
							break;
						case 'getTokenSupply':
							result = await fanTokensActions.getTokenSupply.call(this, i);
							break;
						case 'getUserTokens':
							result = await fanTokensActions.getUserTokens.call(this, i);
							break;
						case 'getSupportedClubs':
							result = await fanTokensActions.getSupportedClubs.call(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown Fan Token operation: ${operation}`);
					}
				}
				// Account operations
				else if (resource === 'account') {
					switch (operation) {
						case 'getBalance':
							result = await accountsActions.getBalance.call(this, i);
							break;
						case 'getTokenBalances':
							result = await accountsActions.getTokenBalances.call(this, i);
							break;
						case 'getTransactionHistory':
							result = await accountsActions.getTransactionHistory.call(this, i);
							break;
						case 'getTokenTransfers':
							result = await accountsActions.getTokenTransfers.call(this, i);
							break;
						case 'getAccountNonce':
							result = await accountsActions.getAccountNonce.call(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown Account operation: ${operation}`);
					}
				}
				// Transaction operations
				else if (resource === 'transaction') {
					switch (operation) {
						case 'getTransaction':
							result = await transactionsActions.getTransaction.call(this, i);
							break;
						case 'sendTransaction':
							result = await transactionsActions.sendTransaction.call(this, i);
							break;
						case 'transferToken':
							result = await transactionsActions.transferToken.call(this, i);
							break;
						case 'estimateGas':
							result = await transactionsActions.estimateGas.call(this, i);
							break;
						case 'getTransactionReceipt':
							result = await transactionsActions.getTransactionReceipt.call(this, i);
							break;
						case 'getPendingTransactions':
							result = await transactionsActions.getPendingTransactions.call(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown Transaction operation: ${operation}`);
					}
				}
				// Smart Contract operations
				else if (resource === 'smartContract') {
					switch (operation) {
						case 'readContract':
							result = await smartContractsActions.readContract.call(this, i);
							break;
						case 'writeContract':
							result = await smartContractsActions.writeContract.call(this, i);
							break;
						case 'getContractEvents':
							result = await smartContractsActions.getContractEvents.call(this, i);
							break;
						case 'getFanTokenContract':
							result = await smartContractsActions.getFanTokenContract.call(this, i);
							break;
						case 'getContractInfo':
							result = await smartContractsActions.getContractInfo.call(this, i);
							break;
						case 'getContractSource':
							result = await smartContractsActions.getContractSource.call(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown Smart Contract operation: ${operation}`);
					}
				}
				// Poll operations
				else if (resource === 'poll') {
					switch (operation) {
						case 'getActivePolls':
							result = await pollsActions.getActivePolls.call(this, i);
							break;
						case 'getPollDetails':
							result = await pollsActions.getPollDetails.call(this, i);
							break;
						case 'voteOnPoll':
							result = await pollsActions.voteOnPoll.call(this, i);
							break;
						case 'getVoteResults':
							result = await pollsActions.getVoteResults.call(this, i);
							break;
						case 'getUserVotes':
							result = await pollsActions.getUserVotes.call(this, i);
							break;
						case 'getUpcomingPolls':
							result = await pollsActions.getUpcomingPolls.call(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown Poll operation: ${operation}`);
					}
				}
				// Reward operations
				else if (resource === 'reward') {
					switch (operation) {
						case 'getAvailableRewards':
							result = await rewardsActions.getAvailableRewards.call(this, i);
							break;
						case 'claimReward':
							result = await rewardsActions.claimReward.call(this, i);
							break;
						case 'getRewardHistory':
							result = await rewardsActions.getRewardHistory.call(this, i);
							break;
						case 'getRewardDetails':
							result = await rewardsActions.getRewardDetails.call(this, i);
							break;
						case 'checkEligibility':
							result = await rewardsActions.checkRewardEligibility.call(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown Reward operation: ${operation}`);
					}
				}
				// NFT operations
				else if (resource === 'nft') {
					switch (operation) {
						case 'getCollection':
							result = await nftsActions.getNFTCollection.call(this, i);
							break;
						case 'getUserNFTs':
							result = await nftsActions.getUserNFTs.call(this, i);
							break;
						case 'getNFTMetadata':
							result = await nftsActions.getNFTMetadata.call(this, i);
							break;
						case 'checkOwnership':
							result = await nftsActions.checkNFTOwnership.call(this, i);
							break;
						case 'transferNFT':
							result = await nftsActions.transferNFT.call(this, i);
							break;
						case 'getApproval':
							result = await nftsActions.getNFTApproval.call(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown NFT operation: ${operation}`);
					}
				}
				// Network operations
				else if (resource === 'network') {
					switch (operation) {
						case 'getNetworkStatus':
							result = await networkActions.getNetworkStatus.call(this, i);
							break;
						case 'getBlock':
							result = await networkActions.getBlock.call(this, i);
							break;
						case 'getLatestBlock':
							result = await networkActions.getLatestBlock.call(this, i);
							break;
						case 'getGasPrice':
							result = await networkActions.getGasPrice.call(this, i);
							break;
						case 'getNetworkInfo':
							result = await networkActions.getNetworkInfo.call(this, i);
							break;
						case 'getProtocolVersion':
							result = await networkActions.getProtocolVersion.call(this, i);
							break;
						case 'getFeeHistory':
							result = await networkActions.getFeeHistory.call(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown Network operation: ${operation}`);
					}
				}
				// Event operations
				else if (resource === 'event') {
					switch (operation) {
						case 'getLogs':
							result = await eventsActions.getLogs.call(this, i);
							break;
						case 'filterEvents':
							result = await eventsActions.filterEvents.call(this, i);
							break;
						case 'getContractEvents':
							result = await eventsActions.getContractEvents.call(this, i);
							break;
						case 'decodeTransferEvent':
							result = await eventsActions.decodeTransferEvent.call(this, i);
							break;
						case 'createEventFilter':
							result = await eventsActions.createEventFilter.call(this, i);
							break;
						case 'getFilterChanges':
							result = await eventsActions.getFilterChanges.call(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown Event operation: ${operation}`);
					}
				}
				// Utility operations
				else if (resource === 'utility') {
					switch (operation) {
						case 'convertUnits':
							result = await utilityActions.convertUnits.call(this, i);
							break;
						case 'getAPIHealth':
							result = await utilityActions.getAPIHealth.call(this, i);
							break;
						case 'getSupportedClubs':
							result = await utilityActions.getSupportedClubs.call(this, i);
							break;
						case 'validateAddress':
							result = await utilityActions.validateAddress.call(this, i);
							break;
						case 'getNetworkInfo':
							result = await utilityActions.getNetworkInfo.call(this, i);
							break;
						case 'encodeFunctionCall':
							result = await utilityActions.encodeFunctionCall.call(this, i);
							break;
						default:
							throw new NodeOperationError(this.getNode(), `Unknown Utility operation: ${operation}`);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
				}

				// Normalize result to array format
				if (Array.isArray(result)) {
					returnData.push(...result);
				} else {
					returnData.push({ json: result });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : 'Unknown error',
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}

}
