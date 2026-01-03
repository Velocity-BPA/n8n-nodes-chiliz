/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class ChilizApi implements ICredentialType {
  name = 'chilizApi';
  displayName = 'Chiliz API';
  documentationUrl = 'https://docs.chiliz.com';

  properties: INodeProperties[] = [
    {
      displayName: 'Network',
      name: 'network',
      type: 'options',
      options: [
        {
          name: 'Chiliz Mainnet',
          value: 'mainnet',
        },
        {
          name: 'Spicy Testnet',
          value: 'spicy',
        },
        {
          name: 'Custom RPC',
          value: 'custom',
        },
      ],
      default: 'mainnet',
      description: 'Select the Chiliz network to connect to',
    },
    {
      displayName: 'RPC Endpoint',
      name: 'rpcEndpoint',
      type: 'string',
      default: '',
      placeholder: 'https://rpc.chiliz.com',
      description: 'Custom RPC endpoint URL (leave empty for default)',
      displayOptions: {
        show: {
          network: ['custom'],
        },
      },
    },
    {
      displayName: 'Private Key',
      name: 'privateKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description:
        'Private key for signing transactions (optional - only needed for write operations)',
    },
    {
      displayName: 'ChilizScan API Key',
      name: 'chilizScanApiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'API key for ChilizScan (optional - for enhanced data access)',
    },
    {
      displayName: 'Socios API Key',
      name: 'sociosApiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'Socios API key for voting/rewards operations (optional - partner access)',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {},
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: '={{$credentials.network === "mainnet" ? "https://rpc.chiliz.com" : $credentials.network === "spicy" ? "https://spicy-rpc.chiliz.com" : $credentials.rpcEndpoint}}',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1,
      }),
    },
  };
}
