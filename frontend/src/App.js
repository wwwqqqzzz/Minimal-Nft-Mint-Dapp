import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractJson from './MyNFT.json';
import { shortenAddress, ipfsToHttp } from './utils/ipfs';
import { getCurrentNetworkConfig, getNetworkByChainId, getExplorerUrl, GAS_LEVELS } from './utils/networks';
import SkeletonCard from './components/SkeletonCard';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '';

// 添加样式常量
const COLORS = {
  primary: '#2563eb',
  success: '#10b981',
  warning: '#f59e0b', 
  danger: '#ef4444',
  secondary: '#6b7280',
  light: '#f8fafc',
  white: '#ffffff'
};

// 新增：图片占位符（优先使用本地 public/og-image.svg）
const PLACEHOLDER_IMAGE = '/og-image.svg';

function App(){
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalSupply, setTotalSupply] = useState(0);
  
  // 新增状态
  const [maxSupply, setMaxSupply] = useState(null);
  const [walletInfo, setWalletInfo] = useState(null);
  const [gasEstimate, setGasEstimate] = useState(null);
  const [selectedGasLevel, setSelectedGasLevel] = useState('medium');
  const [nftPreview, setNftPreview] = useState(null);
  const [mintedNFTs, setMintedNFTs] = useState([]);
  const [showNFTList, setShowNFTList] = useState(false);
  const [nftLoading, setNftLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [nftsPerPage] = useState(12);
  const [networkInfo, setNetworkInfo] = useState(null);

  useEffect(() => {
    checkIfWalletConnected();
    checkNetwork();
    loadNFTPreview();
  }, []);

  useEffect(() => {
    (async () => {
      await checkNetwork();
      if (account && CONTRACT_ADDRESS) {
        await getWalletMintInfo();
        await estimateGasCost();
        await loadMintedNFTs();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, CONTRACT_ADDRESS]);

  // 实时更新 Gas 估算（每 30 秒）
  useEffect(() => {
    if (account && CONTRACT_ADDRESS) {
      const interval = setInterval(estimateGasCost, 30000);
      return () => clearInterval(interval);
    }
  }, [account, selectedGasLevel]);

  async function checkIfWalletConnected() {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        await checkNetwork();
      }
    }
  }

  async function checkNetwork() {
    if (!window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const networkConfig = getNetworkByChainId(Number(network.chainId));
      const currentConfig = getCurrentNetworkConfig();
      
      setNetworkInfo({
        current: networkConfig,
        expected: currentConfig,
        isCorrect: networkConfig && networkConfig.chainId === currentConfig.chainId
      });
      
      if (!networkConfig || networkConfig.chainId !== currentConfig.chainId) {
        setStatus(`⚠️ 请切换到 ${currentConfig.name}`);
        return;
      }
      
      // 如果在正确的网络上，获取总供应量
      await getTotalSupply();
    } catch (error) {
      console.error('检查网络失败:', error);
    }
  }

  async function switchNetwork() {
    if (!window.ethereum) return;
    const targetNetwork = getCurrentNetworkConfig();
    
    try {
      // 尝试切换到目标网络
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetNetwork.chainIdHex }],
      });
      setStatus(`已切换到 ${targetNetwork.name}`);
      await getTotalSupply();
    } catch (switchError) {
      // 如果网络不存在，添加网络
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: targetNetwork.chainIdHex,
              chainName: targetNetwork.name,
              nativeCurrency: targetNetwork.nativeCurrency,
              rpcUrls: targetNetwork.rpcUrls,
              blockExplorerUrls: targetNetwork.blockExplorerUrls,
            }],
          });
          setStatus(`已添加并切换到 ${targetNetwork.name}`);
          await getTotalSupply();
        } catch (addError) {
          console.error('添加网络失败:', addError);
          setStatus('添加网络失败: ' + addError.message);
        }
      } else {
        console.error('切换网络失败:', switchError);
        setStatus('切换网络失败: ' + switchError.message);
      }
    }
  }

  async function getTotalSupply() {
    if (!CONTRACT_ADDRESS || !window.ethereum) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      const supply = await contract.totalSupply();
      setTotalSupply(supply.toString());
      
      // 尝试获取最大供应量（如果合约有的话）
      try {
        const max = await contract.MAX_SUPPLY();
        setMaxSupply(max.toString());
      } catch {
        // 如果没有 MAX_SUPPLY，设为 null（无限制）
        setMaxSupply(null);
      }
    } catch (error) {
      console.error('Error getting total supply:', error);
    }
  }

  // 新增：获取钱包铸造信息
  async function getWalletMintInfo() {
    if (!CONTRACT_ADDRESS || !window.ethereum || !account) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      
      const info = await contract.getWalletMintInfo(account);
      setWalletInfo({
        mintedCount: info[0].toString(),
        remainingMints: info[1].toString(),
        isWhitelisted: info[2]
      });
    } catch (error) {
      console.error('Error getting wallet info:', error);
      setWalletInfo(null);
    }
  }

  // 增强版 Gas 估算：多档位 + 实时更新
  async function estimateGasCost(forceUpdate = false) {
    if (!CONTRACT_ADDRESS || !window.ethereum || !account) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      
      const gasLimit = await contract.mint.estimateGas();
      const feeData = await provider.getFeeData();
      const baseGasPrice = feeData.gasPrice || feeData.maxFeePerGas;
      
      const gasLevels = {};
      Object.entries(GAS_LEVELS).forEach(([level, config]) => {
        // eslint-disable-next-line no-undef
        const adjustedPrice = baseGasPrice * BigInt(Math.floor(config.multiplier * 100)) / BigInt(100);
        const totalCost = gasLimit * adjustedPrice;
        
        gasLevels[level] = {
          ...config,
          gasPrice: ethers.formatUnits(adjustedPrice, 'gwei'),
          totalCost: ethers.formatEther(totalCost),
          rawGasPrice: adjustedPrice
        };
      });
      
      setGasEstimate({
        gasLimit: gasLimit.toString(),
        levels: gasLevels,
        lastUpdate: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('Error estimating gas:', error);
      setGasEstimate(null);
    }
  }

  // 修复：加载真实的NFT预览
  async function loadNFTPreview() {
    try {
      if (!CONTRACT_ADDRESS || !window.ethereum) {
        console.log('合约地址或钱包未准备好，使用默认预览');
        setNftPreview({
          name: "My NFT #0",
          description: "A minimal example NFT - Token 0",
          image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
        });
        return;
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      
      // 尝试获取第0个token的URI作为预览
      try {
        const tokenURI = await contract.tokenURI(0);
        const httpUrl = ipfsToHttp(tokenURI);
        
        console.log('正在从以下URL加载预览metadata:', httpUrl);
        const response = await fetch(httpUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const metadata = await response.json();
        
        setNftPreview({
          name: metadata.name || "My NFT #0",
          description: metadata.description || "A minimal example NFT",
          image: ipfsToHttp(metadata.image) || "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
        });
        
        console.log('✅ 成功加载NFT预览:', metadata);
        
      } catch (tokenError) {
        console.log('Token 0 不存在或metadata无法访问，使用默认预览:', tokenError.message);
        
        // 尝试获取当前合约的baseURI + "0"
        try {
          // 大多数NFT合约的tokenURI格式是baseURI + tokenId
          // 我们构造第0个token的预期URL
          const totalSupply = await contract.totalSupply();
          
          if (Number(totalSupply) > 0) {
            // 如果有已铸造的NFT，用第一个作为预览
            const firstTokenURI = await contract.tokenURI(0);
            const httpUrl = ipfsToHttp(firstTokenURI);
            const response = await fetch(httpUrl);
            const metadata = await response.json();
            
            setNftPreview({
              name: metadata.name || "My NFT #0",
              description: metadata.description || "A minimal example NFT",
              image: ipfsToHttp(metadata.image)
            });
          } else {
            // 没有已铸造的NFT，使用默认预览
            setNftPreview({
              name: "My NFT #0",
              description: "A minimal example NFT - Token 0", 
              image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
            });
          }
        } catch (fallbackError) {
          console.log('无法获取合约信息，使用默认预览');
          setNftPreview({
            name: "My NFT #0",
            description: "A minimal example NFT - Token 0",
            image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
          });
        }
      }
      
    } catch (error) {
      console.error('Error loading NFT preview:', error);
      setNftPreview({
        name: "My NFT #0",
        description: "A minimal example NFT - Token 0",
        image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
      });
    }
  }

  // 增强版 NFT 加载：分页 + Skeleton
  async function loadMintedNFTs() {
    if (!CONTRACT_ADDRESS || !window.ethereum || !account) return;
    setNftLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      
      // 获取用户拥有的NFT数量
      const balance = await contract.balanceOf(account);
      const balanceNum = Number(balance);
      const nfts = [];
      
      if (balanceNum === 0) {
        setMintedNFTs([]);
        return;
      }
      
      // 分批加载，避免一次性请求过多
      const batchSize = 10;
      for (let start = 0; start < Math.min(balanceNum, 100); start += batchSize) {
        const batchPromises = [];
        for (let i = start; i < Math.min(start + batchSize, balanceNum, 100); i++) {
          batchPromises.push(loadSingleNFT(contract, i));
        }
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            nfts.push(result.value);
          }
        });
        if (start + batchSize < balanceNum) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // 如果主路径（Enumerable）一个都没拿到，但 balance>0，使用兜底：totalSupply + ownerOf
      if (nfts.length === 0 && balanceNum > 0) {
        console.warn('Enumerable 枚举失败，触发兜底扫描 ownerOf');
        const fallback = await fallbackLoadByOwnerOf(contract, balanceNum);
        setMintedNFTs(fallback);
        return;
      }
      
      setMintedNFTs(nfts);
    } catch (error) {
      console.error('Error loading minted NFTs:', error);
      try {
        // 发生异常时也尝试兜底
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
        const balance = await contract.balanceOf(account);
        const balanceNum = Number(balance);
        if (balanceNum > 0) {
          const fallback = await fallbackLoadByOwnerOf(contract, balanceNum);
          setMintedNFTs(fallback);
          return;
        }
      } catch (e) {
        console.error('Fallback ownerOf 也失败:', e);
        setMintedNFTs([]);
      }
    } finally {
      setNftLoading(false);
    }
  }

  // 单个 NFT 加载逻辑（优先用 Enumerable）
  async function loadSingleNFT(contract, index) {
    try {
      const tokenId = await contract.tokenOfOwnerByIndex(account, index);
      return await resolveTokenData(contract, tokenId);
    } catch (error) {
      console.error(`Error loading NFT ${index}:`, error);
      return null;
    }
  }

  // 兜底：按 totalSupply 遍历所有 tokenId，筛选 owner==account
  async function fallbackLoadByOwnerOf(contract, targetCount) {
    const results = [];
    try {
      const totalSupply = await contract.totalSupply();
      const supplyNum = Math.min(Number(totalSupply), 1000); // 上限保护
      const batchSize = 20;
      for (let start = 0; start < supplyNum && results.length < targetCount; start += batchSize) {
        const batchPromises = [];
        for (let tokenId = start; tokenId < Math.min(start + batchSize, supplyNum); tokenId++) {
          batchPromises.push((async () => {
            try {
              const owner = await contract.ownerOf(tokenId);
              if (owner && owner.toLowerCase() === account.toLowerCase()) {
                return await resolveTokenData(contract, tokenId);
              }
              return null;
            } catch {
              return null;
            }
          })());
        }
        const batchResults = await Promise.allSettled(batchPromises);
        batchResults.forEach(r => {
          if (r.status === 'fulfilled' && r.value) results.push(r.value);
        });
        if (start + batchSize < supplyNum && results.length < targetCount) {
          await new Promise(res => setTimeout(res, 150));
        }
      }
    } catch (e) {
      console.error('fallbackLoadByOwnerOf error:', e);
    }
    return results;
  }

  // 辅助：解析 tokenURI 并拉取 metadata（带占位符）
  async function resolveTokenData(contract, tokenId) {
    try {
      const uri = await contract.tokenURI(tokenId);
      const httpUrl = ipfsToHttp(uri);
      const meta = await fetchMetadata(httpUrl);
      return {
        tokenId: tokenId.toString(),
        name: meta.name || `My NFT #${tokenId}`,
        description: meta.description || 'A minimal example NFT',
        image: meta.image || PLACEHOLDER_IMAGE
      };
    } catch (e) {
      console.warn(`读取 tokenURI(${tokenId}) 失败，使用占位信息`, e.message);
      return {
        tokenId: tokenId.toString(),
        name: `My NFT #${tokenId}`,
        description: 'A minimal example NFT',
        image: PLACEHOLDER_IMAGE
      };
    }
  }

  async function fetchMetadata(httpUrl) {
    try {
      const resp = await fetch(httpUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const metadata = await resp.json();
      return {
        name: metadata?.name,
        description: metadata?.description,
        image: metadata?.image ? ipfsToHttp(metadata.image) : PLACEHOLDER_IMAGE
      };
    } catch (e) {
      console.warn('获取 metadata 失败，使用占位符:', e.message);
      return { name: undefined, description: undefined, image: PLACEHOLDER_IMAGE };
    }
  }

  async function connect(){
    if(!window.ethereum) return alert('请安装 MetaMask');
    try {
      const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(addr);
      setStatus('钱包连接成功');
    } catch (error) {
      console.error('连接钱包失败:', error);
      alert('连接钱包失败: ' + error.message);
    }
  }

  // 增强版铸造：二次Gas估算 + 确认弹窗
  async function mint(){
    if (loading) return;
    
    // 白名单检查
    if (walletInfo && !walletInfo.isWhitelisted) {
      const whitelistEnabled = await checkWhitelistEnabled();
      if (whitelistEnabled) {
        alert('❌ 您不在白名单中，无法铸造 NFT');
        return;
      }
    }

    // 铸造限制检查
    if (walletInfo && parseInt(walletInfo.remainingMints) <= 0) {
      alert('❌ 您已达到最大铸造数量限制');
      return;
    }
    
    // 二次 Gas 估算
    await estimateGasCost(true);
    
    // 确认弹窗
    const selectedLevel = gasEstimate?.levels[selectedGasLevel];
    if (selectedLevel) {
      const confirmMessage = `
🎨 确认铸造 NFT
⛽ Gas 档位: ${selectedLevel.name} (${selectedLevel.description})
💰 预计费用: ${parseFloat(selectedLevel.totalCost).toFixed(6)} ETH
        `;
        // eslint-disable-next-line no-restricted-globals
        if (!confirm(confirmMessage.trim())) {
          return;
        }
      }
    
    try{
      if(!window.ethereum) return alert('请安装 MetaMask');
      if(!CONTRACT_ADDRESS) return alert('请在 frontend 的 .env 中设置 REACT_APP_CONTRACT_ADDRESS');
      
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, signer);
      
      setStatus('准备发送交易...');
      
      // 使用选定的 Gas 档位
      const txOptions = {};
      if (gasEstimate?.levels[selectedGasLevel]) {
        txOptions.gasPrice = gasEstimate.levels[selectedGasLevel].rawGasPrice;
      }
      
      const tx = await contract.mint(txOptions);
      setStatus('等待交易确认... ' + tx.hash);
      
      await tx.wait();
      setStatus('铸造成功！交易哈希: ' + tx.hash);
      
      // 更新状态
      await getTotalSupply();
      await getWalletMintInfo();
      await loadMintedNFTs();
      setShowNFTList(true); // 新增：自动展开我的NFT列表
      
      // 使用网络工具生成浏览器链接
      const explorerUrl = getExplorerUrl(tx.hash);
      alert(`铸造成功！\n交易哈希: ${tx.hash}\n区块链浏览器: ${explorerUrl}`);
      
    } catch(e) {
      console.error(e);
      let errorMessage = '铸造失败: ';
      
      if (e.message.includes('Not in whitelist')) {
        errorMessage += '您不在白名单中';
      } else if (e.message.includes('Exceeded max mint per wallet')) {
        errorMessage += '已达到每钱包最大铸造数量';
      } else {
        errorMessage += (e.message || e);
      }
      
      setStatus(errorMessage);
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  // 新增：检查白名单是否启用
  async function checkWhitelistEnabled() {
    if (!CONTRACT_ADDRESS || !window.ethereum) return false;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      return await contract.whitelistEnabled();
    } catch (error) {
      console.error('Error checking whitelist:', error);
      return false;
    }
  }

  // 计算进度百分比
  const getProgress = () => {
    if (!totalSupply) return 0;
    if (maxSupply) {
      return Math.min((parseInt(totalSupply) / parseInt(maxSupply)) * 100, 100);
    }
    return Math.min(parseInt(totalSupply) * 2, 100); // 无限制时的展示逻辑
  };

  // NFT 分页逻辑
  const totalPages = Math.ceil(mintedNFTs.length / nftsPerPage);
  const currentNFTs = mintedNFTs.slice(
    (currentPage - 1) * nftsPerPage,
    currentPage * nftsPerPage
  );

  return (
    <div className="container">
      <style>
        {`
          .container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 2.5rem; font-weight: bold; color: ${COLORS.primary}; margin-bottom: 8px; }
          .subtitle { color: ${COLORS.secondary}; font-size: 1.1rem; }
          .card { background: ${COLORS.white}; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 24px; margin-bottom: 20px; }
          .btn { background: ${COLORS.primary}; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
          .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); }
          .btn:disabled { background: ${COLORS.secondary}; cursor: not-allowed; transform: none; box-shadow: none; }
          .btn-success { background: ${COLORS.success}; }
          .btn-warning { background: ${COLORS.warning}; }
          .btn-danger { background: ${COLORS.danger}; }
          .progress-bar { background: ${COLORS.light}; border-radius: 8px; height: 8px; overflow: hidden; margin: 8px 0; }
          .progress-fill { background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.success}); height: 100%; transition: width 0.3s; }
          .network-status { padding: 12px; border-radius: 8px; margin-bottom: 16px; font-weight: 600; }
          .network-correct { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
          .network-wrong { background: #fef3c7; color: #d97706; border: 1px solid #fde68a; }
          .gas-selector { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 16px 0; }
          .gas-option { padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; text-align: center; transition: all 0.2s; }
          .gas-option.selected { border-color: ${COLORS.primary}; background: #eff6ff; }
          .gas-option:hover { border-color: ${COLORS.primary}; }
          .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 16px 0; }
          .info-item { padding: 16px; background: ${COLORS.light}; border-radius: 8px; text-align: center; }
          .info-label { font-size: 0.9rem; color: ${COLORS.secondary}; margin-bottom: 4px; }
          .info-value { font-size: 1.1rem; font-weight: 600; color: ${COLORS.primary}; }
          .nft-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 16px; }
          .nft-card { border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: white; transition: transform 0.2s; }
          .nft-card:hover { transform: translateY(-4px); box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1); }
          .nft-image { width: 100%; aspect-ratio: 1; object-fit: cover; }
          .nft-info { padding: 12px; }
          .pagination { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 20px; }
          .page-btn { padding: 8px 12px; border: 1px solid #e5e7eb; background: white; border-radius: 6px; cursor: pointer; }
          .page-btn.active { background: ${COLORS.primary}; color: white; border-color: ${COLORS.primary}; }
        `}
      </style>

      {/* Header */}
      <div className="header">
        <div className="title">🎨 NFT Mint DApp</div>
        <div className="subtitle">Mint your unique digital collectibles on blockchain</div>
      </div>

      {/* Network Status */}
      {networkInfo && (
        <div className={`network-status ${networkInfo.isCorrect ? 'network-correct' : 'network-wrong'}`}>
          {networkInfo.isCorrect ? (
            <>
              ✅ 已连接到 {networkInfo.current.name}
              {networkInfo.current.isTestnet && ' (测试网络)'}
            </>
          ) : (
            <>
              ⚠️ 当前网络: {networkInfo.current?.name || '未知'}，请切换到 {networkInfo.expected.name}
              <button 
                className="btn btn-warning" 
                onClick={switchNetwork}
                style={{marginLeft: 12, padding: '6px 12px', fontSize: '0.9rem'}}
              >
                切换网络
              </button>
            </>
          )}
        </div>
      )}

      {/* Wallet Connection */}
      <div className="card">
        <h2>💰 钱包连接</h2>
        {!account ? (
          <button className="btn" onClick={connect}>连接 MetaMask 钱包</button>
        ) : (
          <div>
            <p>✅ 已连接: <strong>{shortenAddress(account)}</strong></p>
            <div className="info-grid">
              <div className="info-item">
                <div className="info-label">总供应量</div>
                <div className="info-value">{totalSupply}</div>
              </div>
              {maxSupply && (
                <div className="info-item">
                  <div className="info-label">最大供应量</div>
                  <div className="info-value">{maxSupply}</div>
                </div>
              )}
              {walletInfo && (
                <>
                  <div className="info-item">
                    <div className="info-label">已铸造</div>
                    <div className="info-value">{walletInfo.mintedCount}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">剩余铸造次数</div>
                    <div className="info-value">{walletInfo.remainingMints}</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">白名单状态</div>
                    <div className="info-value">{walletInfo.isWhitelisted ? '✅ 是' : '❌ 否'}</div>
                  </div>
                </>
              )}
            </div>
            
            {/* Progress Bar */}
            {maxSupply && (
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: COLORS.secondary}}>
                  <span>铸造进度</span>
                  <span>{getProgress().toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{width: `${getProgress()}%`}}></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NFT Preview */}
      {nftPreview && (
        <div className="card">
          <h2>🎨 NFT 预览</h2>
          <div style={{display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start'}}>
            <div style={{border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden'}}>
              <img 
                src={nftPreview.image} 
                alt={nftPreview.name}
                style={{width: '100%', aspectRatio: '1', objectFit: 'cover'}}
                onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
              />
            </div>
            <div>
              <h3 style={{margin: '0 0 8px 0', color: COLORS.primary}}>{nftPreview.name}</h3>
              <p style={{color: COLORS.secondary, lineHeight: 1.5}}>{nftPreview.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gas Settings */}
      {account && gasEstimate && (
        <div className="card">
          <h2>⛽ Gas 设置</h2>
          <p style={{color: COLORS.secondary, fontSize: '0.9rem', marginBottom: 12}}>
            选择交易速度（更新时间: {gasEstimate.lastUpdate}）
          </p>
          <div className="gas-selector">
            {Object.entries(gasEstimate.levels).map(([level, config]) => (
              <div
                key={level}
                className={`gas-option ${selectedGasLevel === level ? 'selected' : ''}`}
                onClick={() => setSelectedGasLevel(level)}
              >
                <div style={{fontWeight: 600, marginBottom: 4}}>{config.name}</div>
                <div style={{fontSize: '0.8rem', color: COLORS.secondary, marginBottom: 8}}>{config.description}</div>
                <div style={{fontSize: '0.9rem', fontWeight: 600}}>{parseFloat(config.totalCost).toFixed(6)} ETH</div>
                <div style={{fontSize: '0.8rem', color: COLORS.secondary}}>{config.gasPrice} Gwei</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mint Section */}
      {account && networkInfo?.isCorrect && (
        <div className="card">
          <h2>🚀 铸造 NFT</h2>
          <button 
            className={`btn ${loading ? '' : 'btn-success'}`}
            onClick={mint}
            disabled={loading || !account || !networkInfo?.isCorrect}
            style={{width: '100%', fontSize: '1.1rem', padding: '16px'}}
          >
            {loading ? '铸造中...' : '🎨 铸造我的 NFT'}
          </button>
          {status && (
            <div style={{marginTop: 12, padding: 12, background: COLORS.light, borderRadius: 8, fontSize: '0.9rem'}}>
              {status}
            </div>
          )}
        </div>
      )}

      {/* My NFTs */}
      {account && (
        <div className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
            <h2>🖼️ 我的 NFT 收藏</h2>
            <button 
              className="btn"
              onClick={() => setShowNFTList(!showNFTList)}
              style={{padding: '8px 16px', fontSize: '0.9rem'}}
            >
              {showNFTList ? '隐藏' : '显示'} ({mintedNFTs.length})
            </button>
          </div>
          
          {showNFTList && (
            <>
              {nftLoading && (
                <div style={{textAlign: 'center', padding: 20}}>
                  <div style={{color: COLORS.secondary}}>正在加载您的 NFT 收藏...</div>
                  <div className="nft-grid" style={{marginTop: 16}}>
                    {[...Array(6)].map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                </div>
              )}
              
              {!nftLoading && mintedNFTs.length === 0 && (
                <div style={{textAlign: 'center', padding: 40, color: COLORS.secondary}}>
                  <div style={{fontSize: '3rem', marginBottom: 16}}>🎨</div>
                  <div>您还没有铸造任何 NFT</div>
                  <div style={{fontSize: '0.9rem', marginTop: 8}}>点击上方按钮开始铸造您的第一个 NFT！</div>
                </div>
              )}
              
              {!nftLoading && mintedNFTs.length > 0 && (
                <>
                  <div className="nft-grid">
                    {currentNFTs.map((nft) => (
                      <div key={nft.tokenId} className="nft-card">
                        <img 
                          src={nft.image || PLACEHOLDER_IMAGE}
                          alt={nft.name}
                          className="nft-image"
                          onError={(e) => { e.currentTarget.src = PLACEHOLDER_IMAGE; }}
                        />
                        <div className="nft-info">
                          <div style={{fontWeight: 600, marginBottom: 4}}>{nft.name}</div>
                          <div style={{fontSize: '0.8rem', color: COLORS.secondary, marginBottom: 8}}>
                            Token ID: {nft.tokenId}
                          </div>
                          <div style={{fontSize: '0.8rem', color: COLORS.secondary, lineHeight: 1.4}}>
                            {nft.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        className="page-btn"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        ← 上一页
                      </button>
                      
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i + 1}
                          className={`page-btn ${currentPage === i + 1 ? 'active' : ''}`}
                          onClick={() => setCurrentPage(i + 1)}
                        >
                          {i + 1}
                        </button>
                      ))}
                      
                      <button 
                        className="page-btn"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        下一页 →
                      </button>
                      
                      <div style={{marginLeft: 16, color: COLORS.secondary, fontSize: '0.9rem'}}>
                        第 {currentPage} 页，共 {totalPages} 页 | 总计 {mintedNFTs.length} 个 NFT
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{textAlign: 'center', marginTop: 40, padding: 20, color: COLORS.secondary, fontSize: '0.9rem'}}>
        <div>🎨 NFT Mint DApp</div>
        <div style={{marginTop: 8}}>
          合约地址: {CONTRACT_ADDRESS ? shortenAddress(CONTRACT_ADDRESS) : '未设置'}
        </div>
      </div>
    </div>
  );
}

export default App;