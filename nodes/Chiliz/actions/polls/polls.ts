/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { sociosApiRequest } from '../../transport/client';
import type { IChilizCredentials, IPoll, IPollOption, IVoteResult } from '../../utils/types';

/**
 * Get active polls
 */
export async function getActivePolls(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const tokenSymbol = this.getNodeParameter('tokenSymbol', index, '') as string;
  const limit = this.getNodeParameter('limit', index, 10) as number;

  try {
    const endpoint = tokenSymbol
      ? `/polls/active?token=${tokenSymbol}&limit=${limit}`
      : `/polls/active?limit=${limit}`;

    const polls = await sociosApiRequest.call(this, endpoint, 'GET');

    if (!Array.isArray(polls)) {
      return [{ json: { message: 'No active polls found', polls: [] } }];
    }

    return polls.map((poll: IDataObject) => ({
      json: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        tokenSymbol: poll.tokenSymbol || poll.token,
        club: poll.club || poll.team,
        startDate: poll.startDate,
        endDate: poll.endDate,
        status: 'active',
        options: poll.options || [],
        totalVotes: poll.totalVotes || 0,
        requiredTokens: poll.requiredTokens || 1,
      } as IDataObject,
    }));
  } catch (error) {
    // Return mock data structure for development/testing
    return [
      {
        json: {
          message: 'Socios API not available - mock response',
          note: 'Configure Socios API key for live poll data',
          polls: [
            {
              id: 'mock-poll-1',
              title: 'Sample Fan Poll',
              description: 'This is a sample poll structure',
              tokenSymbol: tokenSymbol || 'BAR',
              status: 'active',
              options: [
                { id: '1', text: 'Option A', votes: 0 },
                { id: '2', text: 'Option B', votes: 0 },
              ],
            },
          ],
        },
      },
    ];
  }
}

/**
 * Get poll details by ID
 */
export async function getPollDetails(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const pollId = this.getNodeParameter('pollId', index) as string;

  try {
    const poll = await sociosApiRequest.call(this, `/polls/${pollId}`, 'GET');

    const pollData = poll as IDataObject;

    const options: IPollOption[] = ((pollData.options as IDataObject[]) || []).map(
      (opt: IDataObject) => ({
        id: opt.id as string,
        text: opt.text as string,
        votes: (opt.votes as number) || 0,
        percentage: (opt.percentage as number) || 0,
      }),
    );

    return [
      {
        json: {
          id: pollData.id,
          title: pollData.title,
          description: pollData.description,
          tokenSymbol: pollData.tokenSymbol || pollData.token,
          club: pollData.club || pollData.team,
          startDate: pollData.startDate,
          endDate: pollData.endDate,
          status: pollData.status,
          options,
          totalVotes: pollData.totalVotes || 0,
          requiredTokens: pollData.requiredTokens || 1,
          rules: pollData.rules || '',
        } as IDataObject,
      },
    ];
  } catch (error) {
    return [
      {
        json: {
          pollId,
          message: 'Poll details not available',
          error: (error as Error).message,
          note: 'Configure Socios API key for live poll data',
        },
      },
    ];
  }
}

/**
 * Vote on a poll
 */
export async function voteOnPoll(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.sociosApiKey) {
    throw new NodeOperationError(
      this.getNode(),
      'Socios API key is required for voting. Please configure it in credentials.',
    );
  }

  const pollId = this.getNodeParameter('pollId', index) as string;
  const optionId = this.getNodeParameter('optionId', index) as string;
  const tokenCount = this.getNodeParameter('tokenCount', index, 1) as number;

  try {
    const result = await sociosApiRequest.call(this, `/polls/${pollId}/vote`, 'POST', {
      optionId,
      tokenCount,
    });

    return [
      {
        json: {
          pollId,
          optionId,
          tokenCount,
          success: true,
          transactionHash: (result as IDataObject).transactionHash || null,
          timestamp: new Date().toISOString(),
        },
      },
    ];
  } catch (error) {
    return [
      {
        json: {
          pollId,
          optionId,
          success: false,
          error: (error as Error).message,
          note: 'Voting requires valid Socios API credentials and sufficient token balance',
        },
      },
    ];
  }
}

/**
 * Get poll results
 */
export async function getVoteResults(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const pollId = this.getNodeParameter('pollId', index) as string;

  try {
    const results = await sociosApiRequest.call(this, `/polls/${pollId}/results`, 'GET');

    const resultsData = results as IDataObject;
    const options = ((resultsData.options as IDataObject[]) || []).map((opt: IDataObject) => ({
      id: opt.id,
      text: opt.text,
      votes: opt.votes || 0,
      percentage: opt.percentage || 0,
      isWinner: opt.isWinner || false,
    }));

    return [
      {
        json: {
          pollId,
          title: resultsData.title,
          status: resultsData.status || 'ended',
          totalVotes: resultsData.totalVotes || 0,
          totalParticipants: resultsData.totalParticipants || 0,
          options,
          winner: options.find((o) => o.isWinner) || null,
          endedAt: resultsData.endDate,
        },
      },
    ];
  } catch (error) {
    return [
      {
        json: {
          pollId,
          message: 'Poll results not available',
          error: (error as Error).message,
        },
      },
    ];
  }
}

/**
 * Get user's voting history
 */
export async function getUserVotes(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const credentials = (await this.getCredentials('chilizApi')) as IChilizCredentials;

  if (!credentials.sociosApiKey) {
    throw new NodeOperationError(
      this.getNode(),
      'Socios API key is required to get user votes. Please configure it in credentials.',
    );
  }

  const userAddress = this.getNodeParameter('userAddress', index, '') as string;
  const tokenSymbol = this.getNodeParameter('tokenSymbol', index, '') as string;
  const limit = this.getNodeParameter('limit', index, 10) as number;

  try {
    let endpoint = `/users/votes?limit=${limit}`;
    if (userAddress) endpoint += `&address=${userAddress}`;
    if (tokenSymbol) endpoint += `&token=${tokenSymbol}`;

    const votes = await sociosApiRequest.call(this, endpoint, 'GET');

    if (!Array.isArray(votes)) {
      return [{ json: { message: 'No voting history found', votes: [] } }];
    }

    return votes.map((vote: IDataObject) => ({
      json: {
        pollId: vote.pollId,
        pollTitle: vote.pollTitle,
        optionId: vote.optionId,
        optionText: vote.optionText,
        tokenSymbol: vote.tokenSymbol,
        tokenCount: vote.tokenCount,
        votedAt: vote.timestamp || vote.votedAt,
        transactionHash: vote.transactionHash,
      } as IDataObject,
    }));
  } catch (error) {
    return [
      {
        json: {
          message: 'User voting history not available',
          error: (error as Error).message,
          note: 'Configure Socios API key for voting history',
        },
      },
    ];
  }
}

/**
 * Get upcoming polls
 */
export async function getUpcomingPolls(
  this: IExecuteFunctions,
  index: number,
): Promise<INodeExecutionData[]> {
  const tokenSymbol = this.getNodeParameter('tokenSymbol', index, '') as string;
  const limit = this.getNodeParameter('limit', index, 10) as number;

  try {
    const endpoint = tokenSymbol
      ? `/polls/upcoming?token=${tokenSymbol}&limit=${limit}`
      : `/polls/upcoming?limit=${limit}`;

    const polls = await sociosApiRequest.call(this, endpoint, 'GET');

    if (!Array.isArray(polls)) {
      return [{ json: { message: 'No upcoming polls found', polls: [] } }];
    }

    return polls.map((poll: IDataObject) => ({
      json: {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        tokenSymbol: poll.tokenSymbol || poll.token,
        club: poll.club || poll.team,
        startDate: poll.startDate,
        endDate: poll.endDate,
        status: 'upcoming',
        requiredTokens: poll.requiredTokens || 1,
      } as IDataObject,
    }));
  } catch (error) {
    return [
      {
        json: {
          message: 'Upcoming polls not available',
          note: 'Configure Socios API key for poll data',
        },
      },
    ];
  }
}
