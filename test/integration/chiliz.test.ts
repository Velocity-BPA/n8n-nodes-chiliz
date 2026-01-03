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

/**
 * Integration tests for Chiliz node
 *
 * These tests require network access and will make actual RPC calls.
 * Run with: npm test -- --testPathPattern=integration
 *
 * Set environment variables for testing:
 * - CHILIZ_RPC_URL: RPC endpoint (defaults to Spicy testnet)
 * - CHILIZ_SCAN_API_KEY: ChilizScan API key (optional)
 */

import { NETWORKS } from '../../nodes/Chiliz/constants/constants';

interface JsonRpcResponse {
	jsonrpc: string;
	id: number;
	result?: unknown;
	error?: {
		code: number;
		message: string;
	};
}

interface BlockResult {
	number: string;
	hash: string;
	timestamp: string;
	[key: string]: unknown;
}

const RPC_URL = process.env.CHILIZ_RPC_URL || NETWORKS.spicy.rpcUrl;

// Skip integration tests in CI unless explicitly enabled
const runIntegration = process.env.RUN_INTEGRATION_TESTS === 'true';

const conditionalDescribe = runIntegration ? describe : describe.skip;

conditionalDescribe('Chiliz Integration Tests', () => {
	describe('JSON-RPC Connection', () => {
		it('should connect to RPC endpoint', async () => {
			const response = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_chainId',
					params: [],
					id: 1,
				}),
			});

			expect(response.ok).toBe(true);
			const data = (await response.json()) as JsonRpcResponse;
			expect(data.result).toBeDefined();
		});

		it('should get current block number', async () => {
			const response = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_blockNumber',
					params: [],
					id: 1,
				}),
			});

			const data = (await response.json()) as JsonRpcResponse;
			expect(data.result).toBeDefined();
			expect(data.result as string).toMatch(/^0x[0-9a-f]+$/i);

			const blockNumber = parseInt(data.result as string, 16);
			expect(blockNumber).toBeGreaterThan(0);
		});

		it('should get gas price', async () => {
			const response = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_gasPrice',
					params: [],
					id: 1,
				}),
			});

			const data = (await response.json()) as JsonRpcResponse;
			expect(data.result).toBeDefined();
			expect(data.result as string).toMatch(/^0x[0-9a-f]+$/i);
		});

		it('should get latest block details', async () => {
			const response = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_getBlockByNumber',
					params: ['latest', false],
					id: 1,
				}),
			});

			const data = (await response.json()) as JsonRpcResponse;
			expect(data.result).toBeDefined();
			const result = data.result as BlockResult;
			expect(result.number).toBeDefined();
			expect(result.hash).toBeDefined();
			expect(result.timestamp).toBeDefined();
		});
	});

	describe('Account Queries', () => {
		const testAddress = '0x0000000000000000000000000000000000000000';

		it('should get balance for address', async () => {
			const response = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_getBalance',
					params: [testAddress, 'latest'],
					id: 1,
				}),
			});

			const data = (await response.json()) as JsonRpcResponse;
			expect(data.result).toBeDefined();
			expect(data.result as string).toMatch(/^0x[0-9a-f]+$/i);
		});

		it('should get transaction count (nonce)', async () => {
			const response = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_getTransactionCount',
					params: [testAddress, 'latest'],
					id: 1,
				}),
			});

			const data = (await response.json()) as JsonRpcResponse;
			expect(data.result).toBeDefined();
			expect(data.result as string).toMatch(/^0x[0-9a-f]+$/i);
		});
	});

	describe('Contract Calls', () => {
		// Use a known ERC-20 contract for testing
		it('should call view function on contract', async () => {
			// Call totalSupply() - selector: 0x18160ddd
			const response = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_call',
					params: [
						{
							to: '0x0000000000000000000000000000000000000000', // Placeholder
							data: '0x18160ddd', // totalSupply()
						},
						'latest',
					],
					id: 1,
				}),
			});

			const data = (await response.json()) as JsonRpcResponse;
			// Will return 0x or error for zero address, but should not fail
			expect(data.result !== undefined || data.error !== undefined).toBe(true);
		});
	});

	describe('Event Logs', () => {
		it('should query event logs', async () => {
			// Get logs from recent blocks
			const blockResponse = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_blockNumber',
					params: [],
					id: 1,
				}),
			});

			const blockData = (await blockResponse.json()) as JsonRpcResponse;
			const currentBlock = parseInt(blockData.result as string, 16);
			const fromBlock = Math.max(0, currentBlock - 100);

			const response = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_getLogs',
					params: [
						{
							fromBlock: `0x${fromBlock.toString(16)}`,
							toBlock: 'latest',
							topics: [
								'0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer topic
							],
						},
					],
					id: 1,
				}),
			});

			const data = (await response.json()) as JsonRpcResponse;
			expect(data.result !== undefined || data.error !== undefined).toBe(true);

			if (data.result) {
				expect(Array.isArray(data.result)).toBe(true);
			}
		});
	});

	describe('Network Info', () => {
		it('should verify chain ID matches expected network', async () => {
			const response = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'eth_chainId',
					params: [],
					id: 1,
				}),
			});

			const data = (await response.json()) as JsonRpcResponse;
			const chainId = parseInt(data.result as string, 16);

			// Should be either mainnet (88888) or spicy (88882)
			expect([88888, 88882]).toContain(chainId);
		});

		it('should get peer count', async () => {
			const response = await fetch(RPC_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					jsonrpc: '2.0',
					method: 'net_peerCount',
					params: [],
					id: 1,
				}),
			});

			const data = (await response.json()) as JsonRpcResponse;
			// Some nodes may not expose this, so just check for response
			expect(data.result !== undefined || data.error !== undefined).toBe(true);
		});
	});
});

// Mock tests that don't require network
describe('Chiliz Node Configuration', () => {
	it('should have valid node description', () => {
		const { Chiliz } = require('../../nodes/Chiliz/Chiliz.node');
		const node = new Chiliz();

		expect(node.description).toBeDefined();
		expect(node.description.displayName).toBe('Chiliz');
		expect(node.description.name).toBe('chiliz');
		expect(node.description.credentials).toBeDefined();
		expect(node.description.properties).toBeDefined();
	});

	it('should have valid trigger node description', () => {
		const { ChilizTrigger } = require('../../nodes/Chiliz/ChilizTrigger.node');
		const node = new ChilizTrigger();

		expect(node.description).toBeDefined();
		expect(node.description.displayName).toBe('Chiliz Trigger');
		expect(node.description.name).toBe('chilizTrigger');
		expect(node.description.polling).toBe(true);
	});

	it('should have all expected resources', () => {
		const { Chiliz } = require('../../nodes/Chiliz/Chiliz.node');
		const node = new Chiliz();

		const resourceProp = node.description.properties.find(
			(p: { name: string }) => p.name === 'resource',
		);
		expect(resourceProp).toBeDefined();
		expect(resourceProp.options).toBeDefined();

		const resourceValues = resourceProp.options.map((o: { value: string }) => o.value);
		expect(resourceValues).toContain('fanToken');
		expect(resourceValues).toContain('account');
		expect(resourceValues).toContain('transaction');
		expect(resourceValues).toContain('smartContract');
		expect(resourceValues).toContain('poll');
		expect(resourceValues).toContain('reward');
		expect(resourceValues).toContain('nft');
		expect(resourceValues).toContain('network');
		expect(resourceValues).toContain('event');
		expect(resourceValues).toContain('utility');
	});

	it('should have all expected trigger events', () => {
		const { ChilizTrigger } = require('../../nodes/Chiliz/ChilizTrigger.node');
		const node = new ChilizTrigger();

		const eventProp = node.description.properties.find((p: { name: string }) => p.name === 'event');
		expect(eventProp).toBeDefined();
		expect(eventProp.options).toBeDefined();

		const eventValues = eventProp.options.map((o: { value: string }) => o.value);
		expect(eventValues).toContain('newPollCreated');
		expect(eventValues).toContain('pollEnded');
		expect(eventValues).toContain('tokenTransfer');
		expect(eventValues).toContain('newRewardAvailable');
		expect(eventValues).toContain('priceChangeAlert');
		expect(eventValues).toContain('newFanTokenListed');
		expect(eventValues).toContain('newBlock');
		expect(eventValues).toContain('contractEvent');
	});
});

describe('Credentials Configuration', () => {
	it('should have valid credentials definition', () => {
		const { ChilizApi } = require('../../credentials/ChilizApi.credentials');
		const creds = new ChilizApi();

		expect(creds.name).toBe('chilizApi');
		expect(creds.displayName).toBe('Chiliz API');
		expect(creds.properties).toBeDefined();
		expect(Array.isArray(creds.properties)).toBe(true);
	});

	it('should have network selection', () => {
		const { ChilizApi } = require('../../credentials/ChilizApi.credentials');
		const creds = new ChilizApi();

		const networkProp = creds.properties.find((p: { name: string }) => p.name === 'network');
		expect(networkProp).toBeDefined();
		expect(networkProp.type).toBe('options');
	});

	it('should have credential test method', () => {
		const { ChilizApi } = require('../../credentials/ChilizApi.credentials');
		const creds = new ChilizApi();

		expect(creds.test).toBeDefined();
		expect(creds.test.request).toBeDefined();
	});
});
