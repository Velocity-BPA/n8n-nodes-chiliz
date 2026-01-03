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

import {
	hexToNumber,
	hexToBigInt,
	numberToHex,
	isValidAddress,
	normalizeAddress,
	isValidTransactionHash,
	calculatePercentage,
	FUNCTION_SELECTORS,
} from '../../nodes/Chiliz/utils/helpers';

describe('Chiliz Helpers', () => {
	describe('hexToNumber', () => {
		it('should convert hex string to number', () => {
			expect(hexToNumber('0x10')).toBe(16);
			expect(hexToNumber('0x0')).toBe(0);
			expect(hexToNumber('0xff')).toBe(255);
			expect(hexToNumber('0x15af0')).toBe(88816);
		});

		it('should handle hex without 0x prefix', () => {
			expect(hexToNumber('10')).toBe(16);
			expect(hexToNumber('ff')).toBe(255);
		});
	});

	describe('hexToBigInt', () => {
		it('should convert hex string to bigint', () => {
			expect(hexToBigInt('0x10')).toBe(BigInt(16));
			expect(hexToBigInt('0xde0b6b3a7640000')).toBe(BigInt('1000000000000000000'));
		});

		it('should handle large numbers', () => {
			const largeHex = '0xffffffffffffffffffffffffffffffff';
			expect(hexToBigInt(largeHex)).toBe(BigInt('340282366920938463463374607431768211455'));
		});
	});

	describe('numberToHex', () => {
		it('should convert number to hex string', () => {
			expect(numberToHex(16)).toBe('0x10');
			expect(numberToHex(0)).toBe('0x0');
			expect(numberToHex(255)).toBe('0xff');
		});

		it('should handle bigint', () => {
			expect(numberToHex(BigInt(16))).toBe('0x10');
			expect(numberToHex(BigInt('1000000000000000000'))).toBe('0xde0b6b3a7640000');
		});
	});

	describe('isValidAddress', () => {
		it('should validate correct addresses', () => {
			expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(true);
			expect(isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true);
		});

		it('should reject invalid addresses', () => {
			expect(isValidAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44')).toBe(false); // Too short
			expect(isValidAddress('742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false); // No 0x
			expect(isValidAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false); // Invalid chars
			expect(isValidAddress('')).toBe(false);
		});
	});

	describe('normalizeAddress', () => {
		it('should lowercase addresses', () => {
			expect(normalizeAddress('0x742D35CC6634C0532925A3B844BC454E4438F44E')).toBe(
				'0x742d35cc6634c0532925a3b844bc454e4438f44e',
			);
		});

		it('should add 0x prefix if missing', () => {
			expect(normalizeAddress('742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(
				'0x742d35cc6634c0532925a3b844bc454e4438f44e',
			);
		});
	});

	describe('isValidTransactionHash', () => {
		it('should validate correct transaction hashes', () => {
			expect(
				isValidTransactionHash(
					'0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
				),
			).toBe(true);
		});

		it('should reject invalid transaction hashes', () => {
			expect(isValidTransactionHash('0x1234')).toBe(false);
			expect(isValidTransactionHash('not-a-hash')).toBe(false);
			expect(isValidTransactionHash('')).toBe(false);
		});
	});

	describe('calculatePercentage', () => {
		it('should calculate percentage correctly', () => {
			expect(calculatePercentage(BigInt(25), BigInt(100))).toBe(25);
			expect(calculatePercentage(BigInt(1), BigInt(4))).toBe(25);
			expect(calculatePercentage(BigInt(0), BigInt(100))).toBe(0);
		});

		it('should handle edge cases', () => {
			expect(calculatePercentage(BigInt(0), BigInt(0))).toBe(0);
			expect(calculatePercentage(BigInt(100), BigInt(100))).toBe(100);
		});
	});

	describe('FUNCTION_SELECTORS', () => {
		it('should have correct ERC-20 selectors', () => {
			expect(FUNCTION_SELECTORS.name).toBe('0x06fdde03');
			expect(FUNCTION_SELECTORS.symbol).toBe('0x95d89b41');
			expect(FUNCTION_SELECTORS.decimals).toBe('0x313ce567');
			expect(FUNCTION_SELECTORS.totalSupply).toBe('0x18160ddd');
			expect(FUNCTION_SELECTORS.balanceOf).toBe('0x70a08231');
			expect(FUNCTION_SELECTORS.transfer).toBe('0xa9059cbb');
			expect(FUNCTION_SELECTORS.approve).toBe('0x095ea7b3');
			expect(FUNCTION_SELECTORS.allowance).toBe('0xdd62ed3e');
			expect(FUNCTION_SELECTORS.transferFrom).toBe('0x23b872dd');
		});

		it('should have correct ERC-721 selectors', () => {
			expect(FUNCTION_SELECTORS.ownerOf).toBe('0x6352211e');
			expect(FUNCTION_SELECTORS.tokenURI).toBe('0xc87b56dd');
			expect(FUNCTION_SELECTORS.safeTransferFrom).toBe('0x42842e0e');
			expect(FUNCTION_SELECTORS.getApproved).toBe('0x081812fc');
		});
	});
});

describe('Chiliz Constants', () => {
	it('should have correct network chain IDs', () => {
		const { NETWORKS } = require('../../nodes/Chiliz/constants/constants');
		expect(NETWORKS.mainnet.chainId).toBe(88888);
		expect(NETWORKS.spicy.chainId).toBe(88882);
	});

	it('should have known fan tokens', () => {
		const { KNOWN_FAN_TOKENS } = require('../../nodes/Chiliz/constants/constants');
		expect(Array.isArray(KNOWN_FAN_TOKENS)).toBe(true);
		expect(KNOWN_FAN_TOKENS.length).toBeGreaterThan(0);

		// Check for BAR token
		const barToken = KNOWN_FAN_TOKENS.find((t: { symbol: string }) => t.symbol === 'BAR');
		expect(barToken).toBeDefined();
		expect(barToken.name).toContain('Barcelona');
	});

	it('should have supported clubs', () => {
		const { SUPPORTED_CLUBS } = require('../../nodes/Chiliz/constants/constants');
		expect(Array.isArray(SUPPORTED_CLUBS)).toBe(true);
		expect(SUPPORTED_CLUBS.length).toBeGreaterThan(0);

		// Check club structure
		const firstClub = SUPPORTED_CLUBS[0];
		expect(firstClub).toHaveProperty('name');
		expect(firstClub).toHaveProperty('symbol');
		expect(firstClub).toHaveProperty('category');
	});
});
