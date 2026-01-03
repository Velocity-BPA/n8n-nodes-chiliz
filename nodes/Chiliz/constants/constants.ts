/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Network configurations for Chiliz Chain
 */
export const NETWORKS = {
  mainnet: {
    name: 'Chiliz Mainnet',
    chainId: 88888,
    rpcUrl: 'https://rpc.chiliz.com',
    explorerUrl: 'https://chiliscan.com',
    explorerApiUrl: 'https://api.chiliscan.com/api',
    nativeCurrency: {
      name: 'Chiliz',
      symbol: 'CHZ',
      decimals: 18,
    },
  },
  spicy: {
    name: 'Spicy Testnet',
    chainId: 88882,
    rpcUrl: 'https://spicy-rpc.chiliz.com',
    explorerUrl: 'https://spicy.chiliscan.com',
    explorerApiUrl: 'https://api-spicy.chiliscan.com/api',
    nativeCurrency: {
      name: 'Chiliz',
      symbol: 'CHZ',
      decimals: 18,
    },
  },
} as const;

/**
 * Known Fan Token contracts on Chiliz Chain
 */
export const FAN_TOKENS: Record<string, { name: string; symbol: string; address: string; club: string }> = {
  BAR: {
    name: 'FC Barcelona Fan Token',
    symbol: 'BAR',
    address: '0x...',
    club: 'FC Barcelona',
  },
  PSG: {
    name: 'Paris Saint-Germain Fan Token',
    symbol: 'PSG',
    address: '0x...',
    club: 'Paris Saint-Germain',
  },
  JUV: {
    name: 'Juventus Fan Token',
    symbol: 'JUV',
    address: '0x...',
    club: 'Juventus',
  },
  ACM: {
    name: 'AC Milan Fan Token',
    symbol: 'ACM',
    address: '0x...',
    club: 'AC Milan',
  },
  ATM: {
    name: 'Atlético Madrid Fan Token',
    symbol: 'ATM',
    address: '0x...',
    club: 'Atlético Madrid',
  },
  ASR: {
    name: 'AS Roma Fan Token',
    symbol: 'ASR',
    address: '0x...',
    club: 'AS Roma',
  },
  GAL: {
    name: 'Galatasaray Fan Token',
    symbol: 'GAL',
    address: '0x...',
    club: 'Galatasaray',
  },
  OG: {
    name: 'OG Fan Token',
    symbol: 'OG',
    address: '0x...',
    club: 'OG Esports',
  },
  CITY: {
    name: 'Manchester City Fan Token',
    symbol: 'CITY',
    address: '0x...',
    club: 'Manchester City',
  },
  INTER: {
    name: 'Inter Milan Fan Token',
    symbol: 'INTER',
    address: '0x...',
    club: 'Inter Milan',
  },
};

/**
 * ERC-20 ABI for Fan Token interactions
 */
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
];

/**
 * ERC-721 ABI for NFT interactions
 */
export const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function approve(address to, uint256 tokenId)',
  'function setApprovalForAll(address operator, bool approved)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
  'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
];

/**
 * Licensing notice for runtime logging
 */
export const LICENSING_NOTICE = `[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.`;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  chilizScan: {
    mainnet: 'https://api.chiliscan.com/api',
    spicy: 'https://api-spicy.chiliscan.com/api',
  },
  socios: {
    base: 'https://api.socios.com',
  },
};

/**
 * Default gas settings
 */
export const GAS_SETTINGS = {
  defaultGasLimit: 21000,
  tokenTransferGasLimit: 65000,
  contractInteractionGasLimit: 100000,
};

/**
 * Supported clubs list
 */
export const SUPPORTED_CLUBS = [
  { name: 'FC Barcelona', symbol: 'BAR', country: 'Spain', sport: 'Football', category: 'football' },
  { name: 'Paris Saint-Germain', symbol: 'PSG', country: 'France', sport: 'Football', category: 'football' },
  { name: 'Juventus', symbol: 'JUV', country: 'Italy', sport: 'Football', category: 'football' },
  { name: 'AC Milan', symbol: 'ACM', country: 'Italy', sport: 'Football', category: 'football' },
  { name: 'Atlético Madrid', symbol: 'ATM', country: 'Spain', sport: 'Football', category: 'football' },
  { name: 'AS Roma', symbol: 'ASR', country: 'Italy', sport: 'Football', category: 'football' },
  { name: 'Galatasaray', symbol: 'GAL', country: 'Turkey', sport: 'Football', category: 'football' },
  { name: 'Manchester City', symbol: 'CITY', country: 'England', sport: 'Football', category: 'football' },
  { name: 'Inter Milan', symbol: 'INTER', country: 'Italy', sport: 'Football', category: 'football' },
  { name: 'Arsenal', symbol: 'AFC', country: 'England', sport: 'Football', category: 'football' },
  { name: 'OG Esports', symbol: 'OG', country: 'International', sport: 'Esports', category: 'esports' },
  { name: 'Team Heretics', symbol: 'TH', country: 'Spain', sport: 'Esports', category: 'esports' },
  { name: 'Aston Martin', symbol: 'AM', country: 'UK', sport: 'Formula 1', category: 'racing' },
  { name: 'Alfa Romeo', symbol: 'SAUBER', country: 'Switzerland', sport: 'Formula 1', category: 'racing' },
];

/**
 * Known Fan Tokens array (for compatibility)
 */
export const KNOWN_FAN_TOKENS = Object.values(FAN_TOKENS);
