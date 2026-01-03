/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { jsonRpcRequest, chilizScanRequest } from '../../transport/client';
import { ERC721_ABI, GAS_SETTINGS } from '../../constants/constants';
import {
  hexToBigInt,
  hexToNumber,
  hexToString,
  normalizeAddress,
  buildCallData,
} from '../../utils/helpers';
import type { IChilizCredentials, INftMetadata, INftCollection } from '../../utils/types';

/**
 * Get NFT collection details
 */
export async function getNFTCollection(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const collectionAddress = this.getNodeParameter('collectionAddress', index) as string;
  const normalizedAddress = normalizeAddress(collectionAddress);

  // Get collection name
  const nameData = buildCallData('name()', []);
  const nameResult = await jsonRpcRequest.call(this, 'eth_call', [
    { to: normalizedAddress, data: nameData },
    'latest',
  ]);

  // Get collection symbol
  const symbolData = buildCallData('symbol()', []);
  const symbolResult = await jsonRpcRequest.call(this, 'eth_call', [
    { to: normalizedAddress, data: symbolData },
    'latest',
  ]);

  const name = hexToString(nameResult as string);
  const symbol = hexToString(symbolResult as string);

  // Try to get total supply (may not be available on all contracts)
  let totalSupply = 0;
  try {
    const supplyData = buildCallData('totalSupply()', []);
    const supplyResult = await jsonRpcRequest.call(this, 'eth_call', [
      { to: normalizedAddress, data: supplyData },
      'latest',
    ]);
    totalSupply = Number(hexToBigInt(supplyResult as string));
  } catch {
    // totalSupply not available
  }

  const collection: INftCollection = {
    address: normalizedAddress,
    name,
    symbol,
    totalSupply,
  };

  return [{ json: collection as unknown as IDataObject }];
}

/**
 * Get user's NFTs
 */
export async function getUserNFTs(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const userAddress = this.getNodeParameter('userAddress', index) as string;
  const collectionAddress = this.getNodeParameter('collectionAddress', index, '') as string;
  const normalizedUser = normalizeAddress(userAddress);

  try {
    // Use ChilizScan API to get NFT transfers
    const params: Record<string, string | number> = {
      address: normalizedUser,
      page: 1,
      offset: 100,
      sort: 'desc',
    };

    if (collectionAddress) {
      params.contractaddress = normalizeAddress(collectionAddress);
    }

    const nftTransfers = await chilizScanRequest.call(this, 'account', 'tokennfttx', params);

    if (!Array.isArray(nftTransfers) || nftTransfers.length === 0) {
      return [
        {
          json: {
            address: normalizedUser,
            message: 'No NFTs found',
            nfts: [],
          },
        },
      ];
    }

    // Group by token to find current holdings
    const holdingsMap = new Map<string, IDataObject>();

    for (const transfer of nftTransfers) {
      const key = `${transfer.contractAddress}-${transfer.tokenID}`;
      const isReceived = (transfer.to as string).toLowerCase() === normalizedUser;
      const isSent = (transfer.from as string).toLowerCase() === normalizedUser;

      if (isReceived && !holdingsMap.has(key)) {
        holdingsMap.set(key, {
          contractAddress: transfer.contractAddress,
          tokenId: transfer.tokenID,
          tokenName: transfer.tokenName,
          tokenSymbol: transfer.tokenSymbol,
          receivedAt: transfer.timeStamp,
          receivedTxHash: transfer.hash,
        });
      } else if (isSent) {
        holdingsMap.delete(key);
      }
    }

    const nfts = Array.from(holdingsMap.values());

    return [
      {
        json: {
          address: normalizedUser,
          nftCount: nfts.length,
          nfts,
        },
      },
    ];
  } catch (error) {
    return [
      {
        json: {
          address: normalizedUser,
          message: 'NFT query not available',
          error: (error as Error).message,
        },
      },
    ];
  }
}

/**
 * Get NFT metadata
 */
export async function getNFTMetadata(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const contractAddress = this.getNodeParameter('contractAddress', index) as string;
  const tokenId = this.getNodeParameter('tokenId', index) as string;
  const normalizedAddress = normalizeAddress(contractAddress);

  // Get tokenURI
  const tokenUriData = buildCallData('tokenURI(uint256)', [
    { type: 'uint256', value: tokenId },
  ]);

  try {
    const tokenUriResult = await jsonRpcRequest.call(this, 'eth_call', [
      { to: normalizedAddress, data: tokenUriData },
      'latest',
    ]);

    const tokenUri = hexToString(tokenUriResult as string);

    // Get owner
    const ownerData = buildCallData('ownerOf(uint256)', [
      { type: 'uint256', value: tokenId },
    ]);

    let owner = '';
    try {
      const ownerResult = await jsonRpcRequest.call(this, 'eth_call', [
        { to: normalizedAddress, data: ownerData },
        'latest',
      ]);
      // Extract address from result (last 40 chars)
      const ownerHex = ownerResult as string;
      if (ownerHex && ownerHex.length >= 42) {
        owner = '0x' + ownerHex.slice(-40);
      }
    } catch {
      // Token might not exist
    }

    // If tokenUri is a URL, we could fetch metadata
    // For now, return the URI for the user to fetch
    const metadata: IDataObject = {
      tokenId,
      contractAddress: normalizedAddress,
      tokenUri,
      owner,
    };

    // If it's an IPFS URI, note how to access it
    if (tokenUri.startsWith('ipfs://')) {
      metadata.ipfsGatewayUrl = tokenUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
    }

    return [{ json: metadata }];
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to get NFT metadata: ${(error as Error).message}`,
    );
  }
}

/**
 * Transfer NFT
 */
export async function transferNFT(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.privateKey) {
    throw new NodeOperationError(
      this.getNode(),
      'Private key is required for NFT transfers. Please configure it in credentials.',
    );
  }

  const contractAddress = this.getNodeParameter('contractAddress', index) as string;
  const tokenId = this.getNodeParameter('tokenId', index) as string;
  const toAddress = this.getNodeParameter('toAddress', index) as string;
  const gasLimit = this.getNodeParameter('gasLimit', index, GAS_SETTINGS.tokenTransferGasLimit) as number;

  const normalizedContract = normalizeAddress(contractAddress);
  const normalizedTo = normalizeAddress(toAddress);

  // Build safeTransferFrom call data
  // Note: from address would come from the signer
  const callData = buildCallData('safeTransferFrom(address,address,uint256)', [
    { type: 'address', value: '0x0000000000000000000000000000000000000000' }, // placeholder for from
    { type: 'address', value: normalizedTo },
    { type: 'uint256', value: tokenId },
  ]);

  return [
    {
      json: {
        message: 'NFT transfer requires ethers.js integration for signing',
        contractAddress: normalizedContract,
        tokenId,
        to: normalizedTo,
        gasLimit,
        callData,
        note: 'For full NFT transfer support, private key signing must be implemented',
      },
    },
  ];
}

/**
 * Check NFT ownership
 */
export async function checkNFTOwnership(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const contractAddress = this.getNodeParameter('contractAddress', index) as string;
  const tokenId = this.getNodeParameter('tokenId', index) as string;
  const expectedOwner = this.getNodeParameter('expectedOwner', index, '') as string;

  const normalizedContract = normalizeAddress(contractAddress);

  // Get owner
  const ownerData = buildCallData('ownerOf(uint256)', [
    { type: 'uint256', value: tokenId },
  ]);

  try {
    const ownerResult = await jsonRpcRequest.call(this, 'eth_call', [
      { to: normalizedContract, data: ownerData },
      'latest',
    ]);

    const ownerHex = ownerResult as string;
    const owner = ownerHex && ownerHex.length >= 42 ? '0x' + ownerHex.slice(-40).toLowerCase() : '';

    const result: IDataObject = {
      contractAddress: normalizedContract,
      tokenId,
      owner,
    };

    if (expectedOwner) {
      result.expectedOwner = normalizeAddress(expectedOwner);
      result.isOwner = owner === normalizeAddress(expectedOwner);
    }

    return [{ json: result }];
  } catch (error) {
    return [
      {
        json: {
          contractAddress: normalizedContract,
          tokenId,
          error: 'Token does not exist or contract is not ERC-721 compliant',
          message: (error as Error).message,
        },
      },
    ];
  }
}

/**
 * Get NFT approval status
 */
export async function getNFTApproval(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const contractAddress = this.getNodeParameter('contractAddress', index) as string;
  const tokenId = this.getNodeParameter('tokenId', index) as string;

  const normalizedContract = normalizeAddress(contractAddress);

  // Get approved address for this token
  const approvedData = buildCallData('getApproved(uint256)', [
    { type: 'uint256', value: tokenId },
  ]);

  try {
    const approvedResult = await jsonRpcRequest.call(this, 'eth_call', [
      { to: normalizedContract, data: approvedData },
      'latest',
    ]);

    const approvedHex = approvedResult as string;
    const approvedAddress =
      approvedHex && approvedHex.length >= 42 ? '0x' + approvedHex.slice(-40).toLowerCase() : '';

    const isApproved = approvedAddress !== '0x0000000000000000000000000000000000000000';

    return [
      {
        json: {
          contractAddress: normalizedContract,
          tokenId,
          approvedAddress: isApproved ? approvedAddress : null,
          hasApproval: isApproved,
        },
      },
    ];
  } catch (error) {
    throw new NodeOperationError(
      this.getNode(),
      `Failed to get NFT approval: ${(error as Error).message}`,
    );
  }
}
