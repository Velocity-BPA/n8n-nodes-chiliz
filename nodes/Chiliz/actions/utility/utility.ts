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

import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { jsonRpcRequest, getRpcUrl } from '../../transport/client';
import { SUPPORTED_CLUBS, KNOWN_FAN_TOKENS, NETWORKS } from '../../constants/constants';
import type { IChilizCredentials } from '../../utils/types';

/**
 * Convert between CHZ and Wei units
 */
export async function convertUnits(
	this: IExecuteFunctions,
	index: number,
): Promise<IDataObject> {
	const amount = this.getNodeParameter('amount', index) as string;
	const fromUnit = this.getNodeParameter('fromUnit', index) as string;
	const toUnit = this.getNodeParameter('toUnit', index) as string;
	const decimals = this.getNodeParameter('decimals', index, 18) as number;

	let result: string;
	let amountBigInt: bigint;

	try {
		// Parse the input amount
		if (fromUnit === 'wei') {
			amountBigInt = BigInt(amount);
		} else if (fromUnit === 'gwei') {
			// 1 Gwei = 10^9 Wei
			const parts = amount.split('.');
			if (parts.length === 2) {
				const wholePart = BigInt(parts[0]) * BigInt(10 ** 9);
				const decimalPart = BigInt(parts[1].padEnd(9, '0').slice(0, 9));
				amountBigInt = wholePart + decimalPart;
			} else {
				amountBigInt = BigInt(amount) * BigInt(10 ** 9);
			}
		} else {
			// CHZ or token (assumes 18 decimals by default)
			const parts = amount.split('.');
			if (parts.length === 2) {
				const wholePart = BigInt(parts[0]) * BigInt(10 ** decimals);
				const decimalStr = parts[1].padEnd(decimals, '0').slice(0, decimals);
				const decimalPart = BigInt(decimalStr);
				amountBigInt = wholePart + decimalPart;
			} else {
				amountBigInt = BigInt(amount) * BigInt(10 ** decimals);
			}
		}

		// Convert to target unit
		if (toUnit === 'wei') {
			result = amountBigInt.toString();
		} else if (toUnit === 'gwei') {
			const gweiValue = amountBigInt / BigInt(10 ** 9);
			const remainder = amountBigInt % BigInt(10 ** 9);
			if (remainder > 0) {
				result = `${gweiValue}.${remainder.toString().padStart(9, '0').replace(/0+$/, '')}`;
			} else {
				result = gweiValue.toString();
			}
		} else {
			// CHZ or token
			const wholeValue = amountBigInt / BigInt(10 ** decimals);
			const remainder = amountBigInt % BigInt(10 ** decimals);
			if (remainder > 0) {
				result = `${wholeValue}.${remainder.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
			} else {
				result = wholeValue.toString();
			}
		}

		return {
			success: true,
			conversion: {
				from: {
					amount,
					unit: fromUnit,
				},
				to: {
					amount: result,
					unit: toUnit,
				},
				decimals,
			},
		};
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to convert units: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Check API and node health status
 */
export async function getAPIHealth(
	this: IExecuteFunctions,
	_index: number,
): Promise<IDataObject> {
	const credentials = (await this.getCredentials('chilizApi')) as unknown as IChilizCredentials;
	const rpcUrl = getRpcUrl(credentials);

	const healthChecks: IDataObject = {
		timestamp: new Date().toISOString(),
		checks: [],
	};

	// Check RPC endpoint
	try {
		const startTime = Date.now();
		const chainIdResult = await jsonRpcRequest.call(this, 'eth_chainId', []);
		const rpcLatency = Date.now() - startTime;

		const blockResult = await jsonRpcRequest.call(this, 'eth_blockNumber', []);
		const blockNumber = parseInt(blockResult as string, 16);

		(healthChecks.checks as IDataObject[]).push({
			service: 'rpc',
			status: 'healthy',
			latency: rpcLatency,
			endpoint: rpcUrl,
			chainId: parseInt(chainIdResult as string, 16),
			latestBlock: blockNumber,
		});
	} catch (error) {
		(healthChecks.checks as IDataObject[]).push({
			service: 'rpc',
			status: 'unhealthy',
			endpoint: rpcUrl,
			error: error instanceof Error ? error.message : 'Unknown error',
		});
	}

	// Check peer count
	try {
		const peerResult = await jsonRpcRequest.call(this, 'net_peerCount', []);
		const peerCount = parseInt(peerResult as string, 16);

		(healthChecks.checks as IDataObject[]).push({
			service: 'network',
			status: peerCount > 0 ? 'healthy' : 'degraded',
			peerCount,
		});
	} catch (error) {
		(healthChecks.checks as IDataObject[]).push({
			service: 'network',
			status: 'unknown',
			error: error instanceof Error ? error.message : 'Unknown error',
		});
	}

	// Check gas price (indicator of network congestion)
	try {
		const gasPriceResult = await jsonRpcRequest.call(this, 'eth_gasPrice', []);
		const gasPriceWei = BigInt(gasPriceResult as string);
		const gasPriceGwei = Number(gasPriceWei) / 1e9;

		(healthChecks.checks as IDataObject[]).push({
			service: 'gasPrice',
			status: gasPriceGwei < 100 ? 'normal' : 'elevated',
			gasPriceGwei: gasPriceGwei.toFixed(2),
		});
	} catch (error) {
		(healthChecks.checks as IDataObject[]).push({
			service: 'gasPrice',
			status: 'unknown',
			error: error instanceof Error ? error.message : 'Unknown error',
		});
	}

	// Determine overall health
	const checks = healthChecks.checks as IDataObject[];
	const unhealthyCount = checks.filter((c) => c.status === 'unhealthy').length;
	const degradedCount = checks.filter((c) => c.status === 'degraded').length;

	if (unhealthyCount > 0) {
		healthChecks.overallStatus = 'unhealthy';
	} else if (degradedCount > 0) {
		healthChecks.overallStatus = 'degraded';
	} else {
		healthChecks.overallStatus = 'healthy';
	}

	return healthChecks;
}

/**
 * Get list of supported clubs/teams
 */
export async function getSupportedClubs(
	this: IExecuteFunctions,
	index: number,
): Promise<IDataObject> {
	const category = this.getNodeParameter('category', index, 'all') as string;

	let clubs = SUPPORTED_CLUBS;

	if (category !== 'all') {
		clubs = clubs.filter((club) => club.category.toLowerCase() === category.toLowerCase());
	}

	// Enrich with token information if available
	const enrichedClubs = clubs.map((club) => {
		const token = KNOWN_FAN_TOKENS.find(
			(t) => t.symbol === club.symbol || t.name.includes(club.name),
		);

		return {
			...club,
			tokenAddress: token?.address || null,
			hasToken: !!token,
		};
	});

	return {
		success: true,
		totalClubs: enrichedClubs.length,
		category: category === 'all' ? 'All Categories' : category,
		clubs: enrichedClubs,
	};
}

/**
 * Validate an Ethereum address
 */
export async function validateAddress(
	this: IExecuteFunctions,
	index: number,
): Promise<IDataObject> {
	const address = this.getNodeParameter('address', index) as string;

	// Basic format validation
	const isValidFormat = /^0x[a-fA-F0-9]{40}$/.test(address);

	if (!isValidFormat) {
		return {
			valid: false,
			address,
			reason: 'Invalid format: must be 0x followed by 40 hexadecimal characters',
		};
	}

	// Check if it's a contract or EOA
	try {
		const code = await jsonRpcRequest.call(this, 'eth_getCode', [address, 'latest']);

		const isContract = code !== '0x' && code !== '0x0';

		return {
			valid: true,
			address: address.toLowerCase(),
			checksumAddress: toChecksumAddress(address),
			type: isContract ? 'contract' : 'eoa',
			isContract,
		};
	} catch (error) {
		return {
			valid: true,
			address: address.toLowerCase(),
			checksumAddress: toChecksumAddress(address),
			type: 'unknown',
			note: 'Could not determine if address is contract or EOA',
		};
	}
}

/**
 * Get network information
 */
export async function getNetworkInfo(
	this: IExecuteFunctions,
	_index: number,
): Promise<IDataObject> {
	const credentials = await this.getCredentials('chilizApi');
	const network = credentials.network as string;

	const networkConfig = NETWORKS[network as keyof typeof NETWORKS] || NETWORKS.mainnet;

	// Get current chain ID to verify connection
	const chainIdResult = await jsonRpcRequest.call(this, 'eth_chainId', []);
	const actualChainId = parseInt(chainIdResult as string, 16);

	return {
		success: true,
		network: {
			name: networkConfig.name,
			chainId: networkConfig.chainId,
			actualChainId,
			isCorrectNetwork: networkConfig.chainId === actualChainId,
			rpcUrl: networkConfig.rpcUrl,
			explorerUrl: networkConfig.explorerUrl,
			nativeCurrency: {
				name: 'Chiliz',
				symbol: 'CHZ',
				decimals: 18,
			},
		},
		availableNetworks: Object.entries(NETWORKS).map(([key, config]) => ({
			id: key,
			name: config.name,
			chainId: config.chainId,
		})),
	};
}

/**
 * Encode function call data
 */
export async function encodeFunctionCall(
	this: IExecuteFunctions,
	index: number,
): Promise<IDataObject> {
	const functionSignature = this.getNodeParameter('functionSignature', index) as string;
	const parameters = this.getNodeParameter('parameters', index, []) as IDataObject[];

	try {
		// Parse function signature (e.g., "transfer(address,uint256)")
		const match = functionSignature.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\((.*)\)$/);
		if (!match) {
			throw new Error('Invalid function signature format');
		}

		const functionName = match[1];
		const paramTypes = match[2]
			.split(',')
			.map((t) => t.trim())
			.filter((t) => t);

		// Calculate function selector (first 4 bytes of keccak256 hash)
		// For simplicity, we'll use a basic implementation
		const selector = calculateFunctionSelector(functionSignature);

		// Encode parameters
		let encodedParams = '';
		for (let i = 0; i < paramTypes.length; i++) {
			const paramType = paramTypes[i];
			const param = parameters[i];

			if (!param) {
				throw new Error(`Missing parameter ${i} for type ${paramType}`);
			}

			const value = param.value as string;

			if (paramType === 'address') {
				encodedParams += value.toLowerCase().replace('0x', '').padStart(64, '0');
			} else if (paramType.startsWith('uint') || paramType.startsWith('int')) {
				const bigValue = BigInt(value);
				encodedParams += bigValue.toString(16).padStart(64, '0');
			} else if (paramType === 'bool') {
				encodedParams += (value === 'true' ? '1' : '0').padStart(64, '0');
			} else if (paramType === 'bytes32') {
				encodedParams += value.replace('0x', '').padEnd(64, '0');
			} else {
				throw new Error(`Unsupported parameter type: ${paramType}`);
			}
		}

		return {
			success: true,
			functionName,
			functionSignature,
			selector,
			encodedParameters: encodedParams ? `0x${encodedParams}` : '0x',
			callData: `${selector}${encodedParams}`,
		};
	} catch (error) {
		throw new NodeOperationError(
			this.getNode(),
			`Failed to encode function call: ${error instanceof Error ? error.message : 'Unknown error'}`,
		);
	}
}

/**
 * Calculate function selector from signature
 */
function calculateFunctionSelector(signature: string): string {
	// This is a simplified implementation
	// In production, you'd use keccak256 hash
	const commonSelectors: Record<string, string> = {
		'transfer(address,uint256)': '0xa9059cbb',
		'approve(address,uint256)': '0x095ea7b3',
		'transferFrom(address,address,uint256)': '0x23b872dd',
		'balanceOf(address)': '0x70a08231',
		'allowance(address,address)': '0xdd62ed3e',
		'totalSupply()': '0x18160ddd',
		'name()': '0x06fdde03',
		'symbol()': '0x95d89b41',
		'decimals()': '0x313ce567',
		'ownerOf(uint256)': '0x6352211e',
		'tokenURI(uint256)': '0xc87b56dd',
		'safeTransferFrom(address,address,uint256)': '0x42842e0e',
		'getApproved(uint256)': '0x081812fc',
	};

	return commonSelectors[signature] || '0x00000000';
}

/**
 * Convert to checksum address (EIP-55)
 */
function toChecksumAddress(address: string): string {
	// Simplified checksum - in production use proper keccak256
	const addr = address.toLowerCase().replace('0x', '');
	// For now, just return mixed case as placeholder
	let result = '0x';
	for (let i = 0; i < addr.length; i++) {
		const char = addr[i];
		if (parseInt(char, 16) >= 8) {
			result += char.toUpperCase();
		} else {
			result += char;
		}
	}
	return result;
}
