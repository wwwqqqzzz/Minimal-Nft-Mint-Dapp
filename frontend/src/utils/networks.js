// 多链网络配置
export const SUPPORTED_NETWORKS = {
  sepolia: {
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    name: 'Sepolia Test Network',
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
    explorerName: 'Etherscan'
  },
  baseSepolia: {
    chainId: 84532,
    chainIdHex: '0x14a34',
    name: 'Base Sepolia',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.base.org'],
    blockExplorerUrls: ['https://sepolia.basescan.org/'],
    explorerName: 'BaseScan'
  },
  polygon: {
    chainId: 80001,
    chainIdHex: '0x13881',
    name: 'Polygon Mumbai',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18,
    },
    rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
    blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
    explorerName: 'PolygonScan'
  }
};

// 默认网络（从环境变量读取，默认为 sepolia）
export const DEFAULT_NETWORK = process.env.REACT_APP_NETWORK || 'sepolia';

// 获取当前网络配置
export function getCurrentNetworkConfig() {
  return SUPPORTED_NETWORKS[DEFAULT_NETWORK] || SUPPORTED_NETWORKS.sepolia;
}

// 根据 chainId 获取网络信息
export function getNetworkByChainId(chainId) {
  const chainIdNum = typeof chainId === 'bigint' ? Number(chainId) : chainId;
  return Object.values(SUPPORTED_NETWORKS).find(network => network.chainId === chainIdNum);
}

// 获取区块浏览器 URL
export function getExplorerUrl(hash, type = 'tx') {
  const network = getCurrentNetworkConfig();
  const baseUrl = network.blockExplorerUrls[0];
  return `${baseUrl}${type}/${hash}`;
}

// Gas 档位配置（针对不同网络可以有不同策略）
export const GAS_LEVELS = {
  low: {
    name: '慢速',
    multiplier: 1.0,
    description: '约 5-10 分钟确认'
  },
  medium: {
    name: '标准',
    multiplier: 1.2,
    description: '约 2-5 分钟确认'
  },
  high: {
    name: '快速',
    multiplier: 1.5,
    description: '约 30 秒-2 分钟确认'
  }
};