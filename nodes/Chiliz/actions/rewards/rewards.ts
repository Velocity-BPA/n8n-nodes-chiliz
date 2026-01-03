/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { sociosApiRequest } from '../../transport/client';
import type { IChilizCredentials, IReward } from '../../utils/types';

/**
 * Get available rewards
 */
export async function getAvailableRewards(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const tokenSymbol = this.getNodeParameter('tokenSymbol', index, '') as string;
  const rewardType = this.getNodeParameter('rewardType', index, '') as string;
  const limit = this.getNodeParameter('limit', index, 10) as number;

  try {
    let endpoint = `/rewards/available?limit=${limit}`;
    if (tokenSymbol) endpoint += `&token=${tokenSymbol}`;
    if (rewardType) endpoint += `&type=${rewardType}`;

    const rewards = await sociosApiRequest.call(this, endpoint, 'GET');

    if (!Array.isArray(rewards)) {
      return [{ json: { message: 'No available rewards found', rewards: [] } }];
    }

    return rewards.map((reward: IDataObject) => ({
      json: {
        id: reward.id,
        title: reward.title,
        description: reward.description,
        tokenSymbol: reward.tokenSymbol || reward.token,
        club: reward.club || reward.team,
        requiredTokens: reward.requiredTokens || 0,
        type: reward.type || 'general',
        status: 'available',
        expiryDate: reward.expiryDate,
        imageUrl: reward.imageUrl || reward.image,
        termsUrl: reward.termsUrl,
        quantity: reward.quantity,
        remaining: reward.remaining,
      } as IDataObject,
    }));
  } catch (error) {
    // Return mock data structure for development/testing
    return [
      {
        json: {
          message: 'Socios API not available - mock response',
          note: 'Configure Socios API key for live reward data',
          rewards: [
            {
              id: 'mock-reward-1',
              title: 'Sample Reward',
              description: 'This is a sample reward structure',
              tokenSymbol: tokenSymbol || 'BAR',
              requiredTokens: 10,
              type: 'merchandise',
              status: 'available',
            },
          ],
        },
      },
    ];
  }
}

/**
 * Get user's earned rewards
 */
export async function getUserRewards(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.sociosApiKey) {
    throw new NodeOperationError(
      this.getNode(),
      'Socios API key is required to get user rewards. Please configure it in credentials.',
    );
  }

  const userAddress = this.getNodeParameter('userAddress', index, '') as string;
  const status = this.getNodeParameter('status', index, '') as string;
  const limit = this.getNodeParameter('limit', index, 10) as number;

  try {
    let endpoint = `/users/rewards?limit=${limit}`;
    if (userAddress) endpoint += `&address=${userAddress}`;
    if (status) endpoint += `&status=${status}`;

    const rewards = await sociosApiRequest.call(this, endpoint, 'GET');

    if (!Array.isArray(rewards)) {
      return [{ json: { message: 'No user rewards found', rewards: [] } }];
    }

    return rewards.map((reward: IDataObject) => ({
      json: {
        id: reward.id,
        title: reward.title,
        description: reward.description,
        tokenSymbol: reward.tokenSymbol || reward.token,
        club: reward.club || reward.team,
        type: reward.type,
        status: reward.status,
        claimedAt: reward.claimedAt,
        expiryDate: reward.expiryDate,
        redemptionCode: reward.redemptionCode,
        transactionHash: reward.transactionHash,
      } as IDataObject,
    }));
  } catch (error) {
    return [
      {
        json: {
          message: 'User rewards not available',
          error: (error as Error).message,
          note: 'Configure Socios API key for reward data',
        },
      },
    ];
  }
}

/**
 * Claim/redeem a reward
 */
export async function claimReward(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.sociosApiKey) {
    throw new NodeOperationError(
      this.getNode(),
      'Socios API key is required to claim rewards. Please configure it in credentials.',
    );
  }

  const rewardId = this.getNodeParameter('rewardId', index) as string;
  const deliveryInfo = this.getNodeParameter('deliveryInfo', index, {}) as IDataObject;

  try {
    const result = await sociosApiRequest.call(this, `/rewards/${rewardId}/claim`, 'POST', {
      deliveryInfo,
    });

    const resultData = result as IDataObject;

    return [
      {
        json: {
          rewardId,
          success: true,
          claimId: resultData.claimId,
          redemptionCode: resultData.redemptionCode,
          transactionHash: resultData.transactionHash,
          claimedAt: new Date().toISOString(),
          nextSteps: resultData.nextSteps || 'Check your email for confirmation',
        },
      },
    ];
  } catch (error) {
    return [
      {
        json: {
          rewardId,
          success: false,
          error: (error as Error).message,
          note: 'Claiming requires valid Socios API credentials and sufficient tokens',
        },
      },
    ];
  }
}

/**
 * Get reward history
 */
export async function getRewardHistory(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.sociosApiKey) {
    throw new NodeOperationError(
      this.getNode(),
      'Socios API key is required to get reward history. Please configure it in credentials.',
    );
  }

  const userAddress = this.getNodeParameter('userAddress', index, '') as string;
  const tokenSymbol = this.getNodeParameter('tokenSymbol', index, '') as string;
  const limit = this.getNodeParameter('limit', index, 20) as number;

  try {
    let endpoint = `/users/rewards/history?limit=${limit}`;
    if (userAddress) endpoint += `&address=${userAddress}`;
    if (tokenSymbol) endpoint += `&token=${tokenSymbol}`;

    const history = await sociosApiRequest.call(this, endpoint, 'GET');

    if (!Array.isArray(history)) {
      return [{ json: { message: 'No reward history found', history: [] } }];
    }

    return history.map((item: IDataObject) => ({
      json: {
        id: item.id,
        rewardId: item.rewardId,
        title: item.title,
        tokenSymbol: item.tokenSymbol,
        club: item.club,
        type: item.type,
        status: item.status,
        tokensUsed: item.tokensUsed,
        claimedAt: item.claimedAt,
        deliveredAt: item.deliveredAt,
        expiryDate: item.expiryDate,
      } as IDataObject,
    }));
  } catch (error) {
    return [
      {
        json: {
          message: 'Reward history not available',
          error: (error as Error).message,
        },
      },
    ];
  }
}

/**
 * Get reward details by ID
 */
export async function getRewardDetails(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const rewardId = this.getNodeParameter('rewardId', index) as string;

  try {
    const reward = await sociosApiRequest.call(this, `/rewards/${rewardId}`, 'GET');

    const rewardData = reward as IDataObject;

    return [
      {
        json: {
          id: rewardData.id,
          title: rewardData.title,
          description: rewardData.description,
          fullDescription: rewardData.fullDescription,
          tokenSymbol: rewardData.tokenSymbol || rewardData.token,
          club: rewardData.club || rewardData.team,
          requiredTokens: rewardData.requiredTokens,
          type: rewardData.type,
          status: rewardData.status,
          expiryDate: rewardData.expiryDate,
          imageUrl: rewardData.imageUrl,
          termsUrl: rewardData.termsUrl,
          quantity: rewardData.quantity,
          remaining: rewardData.remaining,
          eligibilityCriteria: rewardData.eligibilityCriteria,
          deliveryMethod: rewardData.deliveryMethod,
        },
      },
    ];
  } catch (error) {
    return [
      {
        json: {
          rewardId,
          message: 'Reward details not available',
          error: (error as Error).message,
        },
      },
    ];
  }
}

/**
 * Check reward eligibility
 */
export async function checkRewardEligibility(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.sociosApiKey) {
    throw new NodeOperationError(
      this.getNode(),
      'Socios API key is required to check eligibility. Please configure it in credentials.',
    );
  }

  const rewardId = this.getNodeParameter('rewardId', index) as string;
  const userAddress = this.getNodeParameter('userAddress', index, '') as string;

  try {
    const endpoint = userAddress
      ? `/rewards/${rewardId}/eligibility?address=${userAddress}`
      : `/rewards/${rewardId}/eligibility`;

    const result = await sociosApiRequest.call(this, endpoint, 'GET');
    const eligibility = result as IDataObject;

    return [
      {
        json: {
          rewardId,
          eligible: eligibility.eligible || false,
          reason: eligibility.reason || '',
          requiredTokens: eligibility.requiredTokens,
          userTokenBalance: eligibility.userBalance,
          missingTokens: eligibility.missingTokens || 0,
          additionalRequirements: eligibility.additionalRequirements || [],
        },
      },
    ];
  } catch (error) {
    return [
      {
        json: {
          rewardId,
          eligible: false,
          error: (error as Error).message,
        },
      },
    ];
  }
}
