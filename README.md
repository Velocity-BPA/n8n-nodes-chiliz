# n8n-nodes-chiliz

> [Velocity BPA Licensing Notice]
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

A comprehensive n8n community node for **Chiliz Chain**, the sports and entertainment blockchain powering Socios.com Fan Tokens. Enables fan engagement through voting, rewards, NFTs, and exclusive experiences for major sports clubs including FC Barcelona, Paris Saint-Germain, Juventus, and many more.

![n8n Community Node](https://img.shields.io/badge/n8n-community%20node-orange)
![Chiliz Chain](https://img.shields.io/badge/Chiliz-Chain-red)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## Features

- **Fan Token Management**: Query token info, balances, holders, and trading data
- **Account Operations**: Check CHZ and Fan Token balances, transaction history
- **Transaction Support**: Send transactions, transfer tokens, estimate gas
- **Smart Contract Interaction**: Read and write to contracts, query events
- **Polls & Voting**: Participate in fan polls and view results
- **Rewards System**: Browse and claim fan rewards and benefits
- **NFT Support**: Query and manage Fan NFT collectibles
- **Network Monitoring**: Track block data, gas prices, and network health
- **Event Listening**: Filter and decode blockchain events
- **Utility Functions**: Unit conversion, address validation, and more
- **Trigger Node**: Poll-based triggers for transfers, polls, rewards, and blocks

## Installation

### Community Nodes (Recommended)

1. Open n8n Settings
2. Navigate to **Community Nodes**
3. Click **Install**
4. Enter: `n8n-nodes-chiliz`
5. Accept the installation prompts
6. Restart n8n if prompted

### Manual Installation

```bash
# Navigate to your n8n installation
cd ~/.n8n

# Install the package
npm install n8n-nodes-chiliz
```

### Development Installation

```bash
# Clone or extract the package
cd n8n-nodes-chiliz

# Install dependencies
npm install

# Build the project
npm run build

# Link to n8n custom nodes
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-chiliz

# Restart n8n
n8n start
```

## Credentials Setup

Create Chiliz API credentials in n8n with the following fields:

| Field | Required | Description |
|-------|----------|-------------|
| Network | Yes | Select mainnet, spicy (testnet), or custom |
| RPC Endpoint | No | Custom RPC URL (uses default if empty) |
| Private Key | No | For signing transactions (keep secure!) |
| ChilizScan API Key | No | For enhanced explorer data |
| Socios API Key | No | For voting and rewards features |

### Network Configuration

| Network | Chain ID | RPC URL | Explorer |
|---------|----------|---------|----------|
| Mainnet | 88888 | https://rpc.chiliz.com | https://chiliscan.com |
| Spicy (Testnet) | 88882 | https://spicy-rpc.chiliz.com | https://spicy-explorer.chiliz.com |

## Resources & Operations

### Fan Token

| Operation | Description |
|-----------|-------------|
| Get Fan Token Info | Get detailed token information (name, symbol, supply) |
| List Fan Tokens | List all known Fan Tokens |
| Get Token Price | Get current token price data |
| Get Token Holders | Get list of token holders |
| Get Token Volume | Get trading volume statistics |
| Get Token Supply | Get circulating and total supply |
| Get User Tokens | Get user's Fan Token holdings |
| Get Supported Clubs | List supported sports clubs |

### Account

| Operation | Description |
|-----------|-------------|
| Get Balance | Get CHZ balance for an address |
| Get Token Balances | Get all Fan Token balances |
| Get Transaction History | Get account transaction history |
| Get Token Transfers | Get token transfer history |
| Get Account Nonce | Get current transaction nonce |

### Transaction

| Operation | Description |
|-----------|-------------|
| Get Transaction | Get transaction details by hash |
| Send Transaction | Send a transaction |
| Transfer Token | Transfer Fan Tokens |
| Estimate Gas | Estimate gas cost for a transaction |
| Get Transaction Receipt | Get transaction receipt |
| Get Pending Transactions | Get pending transactions |

### Smart Contract

| Operation | Description |
|-----------|-------------|
| Read Contract | Call a view/pure function |
| Write Contract | Send a transaction to a contract |
| Get Contract Events | Get events emitted by a contract |
| Get Fan Token Contract | Get Fan Token contract address |
| Get Contract Info | Get contract code and verification |
| Get Contract Source | Get verified source code |

### Poll

| Operation | Description |
|-----------|-------------|
| Get Active Polls | Get currently active fan polls |
| Get Poll Details | Get details of a specific poll |
| Vote on Poll | Cast a vote on a poll |
| Get Vote Results | Get poll voting results |
| Get User Votes | Get user's voting history |
| Get Upcoming Polls | Get scheduled future polls |

### Reward

| Operation | Description |
|-----------|-------------|
| Get Available Rewards | Get available fan rewards |
| Get User Rewards | Get user's earned rewards |
| Claim Reward | Claim/redeem a reward |
| Get Reward History | Get past reward redemptions |
| Get Reward Details | Get specific reward details |
| Check Reward Eligibility | Check eligibility for a reward |

### NFT

| Operation | Description |
|-----------|-------------|
| Get NFT Collection | Get collection details |
| Get User NFTs | Get user's NFT holdings |
| Get NFT Metadata | Get metadata for an NFT |
| Transfer NFT | Transfer an NFT |
| Check NFT Ownership | Check who owns an NFT |
| Get NFT Approval | Get approval status |

### Network

| Operation | Description |
|-----------|-------------|
| Get Network Status | Get network health and status |
| Get Gas Price | Get current gas price |
| Get Block | Get block by number or hash |
| Get Latest Block | Get the latest block |
| Get Network Info | Get network configuration |
| Get Protocol Version | Get protocol version |
| Get Fee History | Get historical fee data |

### Event

| Operation | Description |
|-----------|-------------|
| Get Logs | Get event logs with filters |
| Filter Events | Filter events by topics |
| Get Contract Events | Get events for a contract |
| Decode Transfer Event | Decode Transfer events |
| Create Event Filter | Create a filter for polling |
| Get Filter Changes | Get new events for a filter |

### Utility

| Operation | Description |
|-----------|-------------|
| Convert Units | Convert between CHZ/Wei/Gwei |
| Get API Health | Check API health status |
| Get Supported Clubs | Get list of supported clubs |
| Validate Address | Validate an Ethereum address |
| Get Network Info | Get network configuration |
| Encode Function Call | Encode function call data |

## Trigger Node

The Chiliz Trigger node supports poll-based event monitoring:

| Trigger | Description |
|---------|-------------|
| New Poll Created | Trigger when a new fan poll is created |
| Poll Ended | Trigger when a poll ends |
| Token Transfer | Trigger on Fan Token transfers |
| New Reward Available | Trigger when new rewards are available |
| Price Change Alert | Trigger on significant price changes |
| New Fan Token Listed | Trigger when a new token is listed |
| New Block | Trigger on every new block |
| Contract Event | Trigger on specific contract events |

## Usage Examples

### Get Fan Token Balance

```json
{
  "nodes": [
    {
      "name": "Chiliz",
      "type": "n8n-nodes-chiliz.chiliz",
      "parameters": {
        "resource": "account",
        "operation": "getTokenBalances",
        "address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
      }
    }
  ]
}
```

### Monitor Token Transfers

```json
{
  "nodes": [
    {
      "name": "Chiliz Trigger",
      "type": "n8n-nodes-chiliz.chilizTrigger",
      "parameters": {
        "event": "tokenTransfer",
        "tokenAddress": "BAR",
        "direction": "both",
        "minAmount": "100"
      }
    }
  ]
}
```

### Check Active Polls

```json
{
  "nodes": [
    {
      "name": "Chiliz",
      "type": "n8n-nodes-chiliz.chiliz",
      "parameters": {
        "resource": "poll",
        "operation": "getActivePolls",
        "tokenSymbol": "BAR"
      }
    }
  ]
}
```

## Chiliz Chain Concepts

| Concept | Description |
|---------|-------------|
| CHZ | Chiliz native token, used for gas and transactions |
| Fan Token | Club-specific ERC-20 tokens for fan engagement |
| Socios | Fan engagement platform built on Chiliz |
| Poll | On-chain voting mechanism for token holders |
| Reward | Exclusive benefits for token holders |
| Spicy | Chiliz testnet for development |

## Supported Clubs

The node includes built-in support for major Fan Tokens:

**Football**: FC Barcelona (BAR), Paris Saint-Germain (PSG), Juventus (JUV), AC Milan (ACM), Atlético Madrid (ATM), AS Roma (ASR), Galatasaray (GAL), Manchester City (CITY), Inter Milan (INTER)

**Esports**: OG Esports (OG)

**And many more** - use `Get Supported Clubs` to see the full list.

## Error Handling

The node implements comprehensive error handling:

- Invalid addresses throw clear validation errors
- API failures return informative error messages
- Missing credentials show configuration guidance
- Optional features degrade gracefully
- Transaction signing notes requirements clearly

Enable **Continue on Fail** in node settings to handle errors in workflows.

## Security Best Practices

1. **Never share private keys** - Use environment variables or n8n credentials
2. **Use testnet first** - Test on Spicy before mainnet
3. **Verify transactions** - Double-check addresses and amounts
4. **Limit API keys** - Use restricted keys where possible
5. **Monitor usage** - Track API calls and transaction history

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run dev
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service, or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-chiliz/issues)
- **Email**: support@velobpa.com
- **Chiliz Docs**: [docs.chiliz.com](https://docs.chiliz.com)
- **n8n Community**: [community.n8n.io](https://community.n8n.io)

## Acknowledgments

- [Chiliz](https://www.chiliz.com/) for the blockchain infrastructure
- [Socios.com](https://www.socios.com/) for the fan engagement platform
- [n8n](https://n8n.io/) for the workflow automation platform
- The sports fans and communities driving blockchain adoption
