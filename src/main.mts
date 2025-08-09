import fetch from "node-fetch";
import { ContractTag, ITagService } from "atq-types";

// Subgraph URLs for various chains
const SUBGRAPH_URLS: Record<string, { decentralized: string }> = {
  // Ethereum Mainnet, verifieable on https://docs.sushi.com/subgraphs/cpamm
  "1": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmaR2nAMF6dCHBL1eFNQ4F5nGpJQs7V11PZobJB2FgQtbt",
  },
  // Optimism, verifieable on https://docs.sushi.com/subgraphs/cpamm
  "10": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmZWaFzzzs7CEzpVeLrNqW6e7oNxG8AnkJt9kUEV5rFzxn",
  },
  // BSC, verifieable on https://docs.sushi.com/subgraphs/cpamm
  "56": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmQ3b4S6PSgvRkd5PhxtDPDQRybfmaRYxGVZCLbYJopoKJ",
  },
  // Gnosis, verifieable on https://docs.sushi.com/subgraphs/cpamm
  "100": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmU7USviTB8LtJ9tkPjZLcretNnYyUWzwDy9N7zTupNYj2",
  },
  // Polygon, verifieable on https://docs.sushi.com/subgraphs/cpamm
  "137": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmcFVSFXGgodMVUGLAdYdYPfohyMwWat8pfi5pHSDXgskU",
  },
  // Sonic, verifieable on https://docs.sushi.com/subgraphs/cpamm
  "146": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmTnVXE9wVJRDaxNdW1hnvzi8Cj1XBv3cMGXz6gHLacMVJ",
  },
  // Fantom, verifieable on https://docs.sushi.com/subgraphs/cpamm
  "250": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmbitwNMFxEcJVtZyTcLYr2GrQSLg99rpZZmmD2m13xRp2",
  },
  // Boba, verifieable on https://docs.sushi.com/subgraphs/cpamm
  "288": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmYzLBMamDBWJWsUNFiRfq91w2H38SAf9jXyCYDTzhyHh3",
  },
  // Base, verifieable on https://docs.sushi.com/subgraphs/clamm
  "8453": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmQfYe5Ygg9A3mAiuBZYj5a64bDKLF4gF6sezfhgxKvb9y",
  },
  // Arbitrum One, verifieable on https://docs.sushi.com/subgraphs/clamm
  "42161": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmfN96hDXYtgeLsBv5WjQY8FAwqBfBFoiq8gzsn9oApcoU",
  },
  // Celo, verifieable on https://docs.sushi.com/subgraphs/clamm
  "42220": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmNxrypMUwDagUwxcBDPPebNx4ZPZ3XGJ2cdaejAjXg735",
  },
  // Avalanche C-Chain, verifieable on https://docs.sushi.com/subgraphs/clamm
  "43114": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmadNP3fXrcba189BuSrT88Tw7YHhTtHWsdBTQhNpyaF6c",
  },
  // Scroll, verifieable on https://docs.sushi.com/subgraphs/clamm
  "534352": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmZkX4zi2RzLsQKva29gE3uCcMuJVxXE3R11Ln1J3FY3f7",
  },
  // Linea, verifieable on https://docs.sushi.com/subgraphs/clamm
  "59144": {
    decentralized:
      "https://gateway.thegraph.com/api/[api-key]/deployments/id/QmWYpVMcyczvRvpzLpw5R7tKWouFLEzmufN55jnrNWmpth",
  },
};

// The Graph API queries and types
interface PoolToken {
  id: string;
  name: string;
  symbol: string;
}

interface Pool {
  id: string;
  createdAtTimestamp: number;
  token0: PoolToken;
  token1: PoolToken;
}

interface GraphQLData {
  pairs: Pool[];
}

interface GraphQLResponse {
  data?: GraphQLData;
  errors?: { message: string }[]; // Assuming the API might return errors in this format
}

// Defining headers for the query
const headers: Record<string, string> = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

const GET_POOLS_QUERY = `
query GetPools($lastTimestamp: Int) {
  pairs(
    first: 1000,
    orderBy: createdAtTimestamp,
    orderDirection: asc,
    where: { createdAtTimestamp_gt: $lastTimestamp }
  ) {
    id
    createdAtTimestamp
    token0 {
      id
      name
      symbol
    }
    token1 {
      id
      name
      symbol
    }
  }
}
`;

function isError(e: unknown): e is Error {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as Error).message === "string"
  );
}

function containsHtmlOrMarkdown(text: string): boolean {
  // Simple HTML tag detection
  return /<[^>]*>/.test(text);
}

function isEmptyOrInvalid(text: string): boolean {
  return text.trim() === "" || containsHtmlOrMarkdown(text);
}

async function fetchData(
  subgraphUrl: string,
  lastTimestamp: number
): Promise<Pool[]> {
  const response = await fetch(subgraphUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      query: GET_POOLS_QUERY,
      variables: { lastTimestamp },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const result = (await response.json()) as GraphQLResponse;
  if (result.errors) {
    result.errors.forEach((error) => {
      console.error(`GraphQL error: ${error.message}`);
    });
    throw new Error("GraphQL errors occurred: see logs for details.");
  }

  if (!result.data || !result.data.pairs) {
    throw new Error("No pools data found.");
  }

  return result.data.pairs;
}

function prepareUrl(chainId: string, apiKey: string): string {
  const urls = SUBGRAPH_URLS[chainId];
  if (!urls || isNaN(Number(chainId))) {
    const supportedChainIds = Object.keys(SUBGRAPH_URLS).join(", ");
    throw new Error(
      `Unsupported or invalid Chain ID provided: ${chainId}. Only the following values are accepted: ${supportedChainIds}`
    );
  }
  return urls.decentralized.replace("[api-key]", encodeURIComponent(apiKey));
}

function truncateString(text: string, maxLength: number) {
  if (text.length > maxLength) {
    return text.substring(0, maxLength - 3) + "..."; // Subtract 3 for the ellipsis
  }
  return text;
}

function transformPoolsToTags(chainId: string, pairs: Pool[]): ContractTag[] {
  const validPools: Pool[] = [];
  const rejectedNames: string[] = [];

  pairs.forEach((pair) => {
    const token0Invalid = isEmptyOrInvalid(pair.token0.name) || isEmptyOrInvalid(pair.token0.symbol);
    const token1Invalid = isEmptyOrInvalid(pair.token1.name) || isEmptyOrInvalid(pair.token1.symbol);

    if (token0Invalid || token1Invalid) {
      // Reject pools where any of the token names or symbols are empty or contain invalid content
      if (token0Invalid) {
        rejectedNames.push(`Contract: ${pair.id} rejected due to invalid token symbol/name - Token0: ${pair.token0.name}, Symbol: ${pair.token0.symbol}`);
      }
      if (token1Invalid) {
        rejectedNames.push(`Contract: ${pair.id} rejected due to invalid token symbol/name - Token1: ${pair.token1.name}, Symbol: ${pair.token1.symbol}`);
      }
    } else {
      validPools.push(pair);
    }
  });

  if (rejectedNames.length > 0) {
    console.log("Rejected contracts:", rejectedNames);
  }

  return validPools.map((pair) => {
    const maxSymbolsLength = 45;
    const symbolsText = `${pair.token0.symbol}/${pair.token1.symbol}`;
    const truncatedSymbolsText = truncateString(symbolsText, maxSymbolsLength);

    return {
      "Contract Address": `eip155:${chainId}:${pair.id}`,
      "Public Name Tag": `${truncatedSymbolsText} Pool`,
      "Project Name": "Sushi v2",
      "UI/Website Link": "https://www.sushi.com/",
      "Public Note": `The liquidity pool contract on Sushi v2 for the ${pair.token0.name} (${pair.token0.symbol}) / ${pair.token1.name} (${pair.token1.symbol}) pair.`,
    };
  });
}

// The main logic for this module
class TagService implements ITagService {
  // Using an arrow function for returnTags
  returnTags = async (
    chainId: string,
    apiKey: string
  ): Promise<ContractTag[]> => {
    let lastTimestamp: number = 0;
    let allTags: ContractTag[] = [];
    let isMore = true;

    const url = prepareUrl(chainId, apiKey);

    while (isMore) {
      try {
        const pairs = await fetchData(url, lastTimestamp);
        allTags.push(...transformPoolsToTags(chainId, pairs));

        isMore = pairs.length === 1000;
        if (isMore) {
          lastTimestamp = parseInt(
            pairs[pairs.length - 1].createdAtTimestamp.toString(),
            10
          );
        }
      } catch (error) {
        if (isError(error)) {
          console.error(`An error occurred: ${error.message}`);
          throw new Error(`Failed fetching data: ${error}`); // Propagate a new error with more context
        } else {
          console.error("An unknown error occurred.");
          throw new Error("An unknown error occurred during fetch operation."); // Throw with a generic error message if the error type is unknown
        }
      }
    }
    return allTags;
  };
}

// Creating an instance of TagService
const tagService = new TagService();

// Exporting the returnTags method directly
export const returnTags = tagService.returnTags;


