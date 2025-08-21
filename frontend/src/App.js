/* global BigInt */
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractJson from './MyNFT.json';
import { ipfsToHttp } from './utils/ipfs';
import { getNetworkByChainId, getExplorerUrl, GAS_LEVELS } from './utils/networks';
import { getProofAndRoot } from './utils/merkle';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '';

// 占位图片
const PLACEHOLDER_IMAGE = '/og-image.svg';

function App(){
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Ready to mint!');
  const [totalSupply, setTotalSupply] = useState(null);
  const [mintedNFTs, setMintedNFTs] = useState([]);
  const [maxSupply, setMaxSupply] = useState(null);
  const [selectedGasLevel, setSelectedGasLevel] = useState('medium');
  const [gasEstimate, setGasEstimate] = useState(null);
  const [gasLoading, setGasLoading] = useState(false);
  const [showNFTList, setShowNFTList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [walletInfo, setWalletInfo] = useState(null);
  const [merkleProofInput, setMerkleProofInput] = useState('');
  // Merkle: 选配的自动 proof 生成支持
  const [merkleRootOnChain, setMerkleRootOnChain] = useState(null);
  const [allowlistAddrs, setAllowlistAddrs] = useState(null);
  const [merkleAutoLoading, setMerkleAutoLoading] = useState(false);
  const nftsPerPage = 12;

  // 新增：白名单（Merkle）铸造函数（手动粘贴 proof）
  async function allowlistMint() {
    if (!window.ethereum) {
      alert('请先安装 MetaMask');
      return;
    }
    if (!CONTRACT_ADDRESS) {
      alert('请在 frontend 的 .env 中设置 REACT_APP_CONTRACT_ADDRESS');
      return;
    }

    // 铸造限制检查
    if (walletInfo && walletInfo.maxMintPerWallet && parseInt(walletInfo.remainingMints) <= 0) {
      alert('❌ 您已达到最大铸造数量限制');
      return;
    }

    // 解析用户输入的 Merkle Proof
    let proof;
    const trimmed = (merkleProofInput || '').trim();
    if (!trimmed) {
      alert('请粘贴 Merkle Proof');
      return;
    }
    try {
      // 优先尝试 JSON 数组
      proof = JSON.parse(trimmed);
      if (!Array.isArray(proof)) throw new Error('proof 必须是数组');
    } catch (_) {
      // 退化为逗号分隔字符串
      proof = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }

    try {
      setLoading(true);
      setStatus('准备发送白名单铸造交易...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      // 使用最小 ABI 调用，避免前端 ABI 未同步导致的方法缺失
      const allowlistAbi = ['function allowlistMint(bytes32[] proof)'];
      const contract = new ethers.Contract(CONTRACT_ADDRESS, allowlistAbi, signer);

      const tx = await contract.allowlistMint(proof);
      setStatus('等待交易确认... ' + tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setStatus('白名单铸造成功！交易哈希: ' + tx.hash);
        await getTotalSupply();
        await getWalletMintInfo();
        await loadMintedNFTs();
        setShowNFTList(true);
        const explorerUrl = getExplorerUrl(tx.hash);
        alert(`白名单铸造成功！\n交易哈希: ${tx.hash}\n区块链浏览器: ${explorerUrl}`);
      } else {
        setStatus('交易失败');
        alert('❌ 交易失败');
      }
    } catch (err) {
      console.error(err);
      let msg = '❌ 白名单铸造失败: ' + (err?.shortMessage || err?.message || '未知错误');
      setStatus(msg);
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  // 新增：自动生成 Merkle Proof 并铸造（需要 public/allowlist.json）
  async function autoAllowlistMint() {
    try {
      if (!window.ethereum) {
        alert('请先安装 MetaMask');
        return;
      }
      if (!CONTRACT_ADDRESS) {
        alert('请在 frontend 的 .env 中设置 REACT_APP_CONTRACT_ADDRESS');
        return;
      }
      if (!account) {
        alert('请先连接钱包');
        return;
      }
      if (!allowlistAddrs || allowlistAddrs.length === 0) {
        alert('未检测到 allowlist.json，请将白名单地址数组放到 frontend/public/allowlist.json');
        return;
      }

      // 铸造限制检查
      if (walletInfo && walletInfo.maxMintPerWallet && parseInt(walletInfo.remainingMints) <= 0) {
        alert('❌ 您已达到最大铸造数量限制');
        return;
      }

      setMerkleAutoLoading(true);
      setStatus('正在计算 Merkle Proof...');

      // 1) 构建 Merkle Tree（叶子为 keccak256(abi.encodePacked(address))）
      const leaves = allowlistAddrs.map(addr => ethers.keccak256(ethers.solidityPacked(['address'], [addr])));

      // 2) 计算当前账户的 leaf 与 proof
      const leaf = ethers.keccak256(ethers.solidityPacked(['address'], [account]));
      const { proof, root } = getProofAndRoot(leaves, leaf, true);
      const rootHex = root;

      // 3) 校验与链上 merkleRoot 一致性
      if (merkleRootOnChain && rootHex && merkleRootOnChain !== '0x' && merkleRootOnChain !== '0x0') {
        if (rootHex.toLowerCase() !== merkleRootOnChain.toLowerCase()) {
          const cont = window.confirm(`本地计算的 Merkle Root 与链上不一致:\nLocal: ${rootHex}\nOn-chain: ${merkleRootOnChain}\n是否仍然尝试提交？`);
          if (!cont) return;
        }
      }

      // 4) 发送交易
      setStatus('准备发送白名单铸造交易...');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const allowlistAbi = ['function allowlistMint(bytes32[] proof)'];
      const contract = new ethers.Contract(CONTRACT_ADDRESS, allowlistAbi, signer);

      const tx = await contract.allowlistMint(proof);
      setStatus('等待交易确认... ' + tx.hash);
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setStatus('白名单铸造成功！交易哈希: ' + tx.hash);
        await getTotalSupply();
        await getWalletMintInfo();
        await loadMintedNFTs();
        setShowNFTList(true);
        const explorerUrl = getExplorerUrl(tx.hash);
        alert(`白名单铸造成功！\n交易哈希: ${tx.hash}\n区块链浏览器: ${explorerUrl}`);
      } else {
        setStatus('交易失败');
        alert('❌ 交易失败');
      }
    } catch (err) {
      console.error(err);
      let msg = '❌ 自动白名单铸造失败: ' + (err?.shortMessage || err?.message || '未知错误');
      setStatus(msg);
      alert(msg);
    } finally {
      setMerkleAutoLoading(false);
    }
  }

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    if(window.ethereum) {
      await connect();
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if(accounts.length > 0) {
        setAccount(accounts[0]);
        await getTotalSupply();
        await getMaxSupply();
        await getWalletMintInfo();
        await loadMintedNFTs();
      }

      // 读取链上 merkleRoot（可选）
      try {
        if (CONTRACT_ADDRESS) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
          const root = await contract.merkleRoot();
          setMerkleRootOnChain(root);
        }
      } catch (e) {
        console.warn('读取 merkleRoot 失败（可忽略）：', e?.message || e);
      }

      // 尝试加载前端白名单地址（可选：frontend/public/allowlist.json）
      try {
        const res = await fetch('/allowlist.json');
        if (res.ok) {
          const arr = await res.json();
          if (Array.isArray(arr)) setAllowlistAddrs(arr);
        }
      } catch (_) { /* 忽略 */ }
    }
  }

  async function connect() {
    try {
      if (!window.ethereum) {
        alert('请安装 MetaMask');
        return;
      }
      
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      
      // 检查网络
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      const currentNetwork = getNetworkByChainId(currentChainId);
      
      if (!currentNetwork) {
        alert(`不支持的网络，请切换到支持的网络`);
        return;
      }
      
      await getTotalSupply();
      await getMaxSupply();
      await getWalletMintInfo();
      await loadMintedNFTs();
      
      setStatus(`已连接到 ${currentNetwork.name}`);
    } catch (error) {
      console.error('连接钱包失败:', error);
      setStatus('连接钱包失败');
    }
  }

  async function getTotalSupply() {
    try {
      if (!CONTRACT_ADDRESS || !window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      const supply = await contract.totalSupply();
      setTotalSupply(supply.toString());
    } catch (error) {
      console.error('获取总供应量失败:', error);
    }
  }

  async function getMaxSupply() {
    try {
      if (!CONTRACT_ADDRESS || !window.ethereum) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      
      // 检查合约是否有 maxSupply 方法
      const maxSupply = await contract.maxSupply();
      setMaxSupply(maxSupply.toString());
    } catch (error) {
      // 如果没有 maxSupply 方法，设为 null
      setMaxSupply(null);
    }
  }

  async function getWalletMintInfo() {
    try {
      if (!CONTRACT_ADDRESS || !window.ethereum || !account) return;
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      
      // 获取钱包已铸造数量
      const mintCount = await contract.balanceOf(account);
      
      // 尝试获取最大铸造限制
      let maxMintPerWallet = null;
      try {
        maxMintPerWallet = await contract.maxMintPerWallet();
      } catch (e) {
        // 如果没有限制，设为 null
      }
      
      setWalletInfo({
        mintedCount: mintCount.toString(),
        maxMintPerWallet: maxMintPerWallet ? maxMintPerWallet.toString() : null,
        remainingMints: maxMintPerWallet ? 
          Math.max(0, parseInt(maxMintPerWallet.toString()) - parseInt(mintCount.toString())) : 
          null
      });
    } catch (error) {
      console.error('获取钱包信息失败:', error);
    }
  }

  async function loadMintedNFTs() {
    try {
      if (!CONTRACT_ADDRESS || !window.ethereum || !account) return;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
      
      const balance = await contract.balanceOf(account);
      const nfts = [];
      
      for (let i = 0; i < parseInt(balance.toString()); i++) {
        const tokenId = await contract.tokenOfOwnerByIndex(account, i);
        const tokenURI = await contract.tokenURI(tokenId);
        
        const metadata = await fetchMetadata(tokenURI);
        nfts.push({
          tokenId: tokenId.toString(),
          tokenURI,
          metadata
        });
      }
      
      setMintedNFTs(nfts);
    } catch (error) {
      console.error('加载 NFT 失败:', error);
    }
  }

  async function fetchMetadata(uri) {
    try {
      const httpUri = ipfsToHttp(uri);
      const response = await fetch(httpUri);
      if (!response.ok) throw new Error('Failed to fetch metadata');
      return await response.json();
    } catch (error) {
      console.error('获取元数据失败:', error);
      return {
        name: 'Unknown NFT',
        description: 'Metadata not available',
        image: PLACEHOLDER_IMAGE
      };
    }
  }

  async function estimateGasCost(showAlert = false) {
    if (!CONTRACT_ADDRESS || !window.ethereum) return;
    
    setGasLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, signer);

      // 估算 Gas
      const gasLimit = await contract.mint.estimateGas();
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice;

      // 计算不同档位的费用
      const levels = {};
      Object.entries(GAS_LEVELS).forEach(([key, level]) => {
        const adjustedGasPrice = gasPrice * BigInt(Math.floor(level.multiplier * 100)) / BigInt(100);
        const totalCost = (gasLimit * adjustedGasPrice);
        
        levels[key] = {
          ...level,
          gasLimit: gasLimit.toString(),
          gasPrice: ethers.formatUnits(adjustedGasPrice, 'gwei'),
          rawGasPrice: adjustedGasPrice,
          totalCost: ethers.formatEther(totalCost)
        };
      });

      setGasEstimate({
        gasLimit: gasLimit.toString(),
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        levels
      });
      
      if (showAlert) {
        const selectedLevel = levels[selectedGasLevel];
        alert(`Gas 估算完成!\n档位: ${selectedLevel.name}\n预计费用: ${parseFloat(selectedLevel.totalCost).toFixed(6)} ETH`);
      }
      
    } catch (error) {
      console.error('Gas 估算失败:', error);
      if (showAlert) {
        alert('Gas 估算失败: ' + error.message);
      }
    } finally {
      setGasLoading(false);
    }
  }

  // 增强版 mint 函数
  async function mint() {
    // 如果启用旧版白名单，则进行简单映射检查；否则允许公售或使用 Merkle 通道
    const whitelistEnabled = await checkWhitelistEnabled();
    if (whitelistEnabled) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, provider);
        const isWhitelisted = await contract.whitelist(account);
        if (!isWhitelisted) {
          alert('❌ 您不在白名单中，无法使用普通铸造。请使用“白名单铸造（Merkle）”入口。');
          return;
        }
      } catch (error) {
        alert('❌ 您不在白名单中，无法使用普通铸造。请使用“白名单铸造（Merkle）”入口。');
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
    <div className="container" style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>
        {`
          .info-label { 
            font-size: 0.9rem; 
            color: var(--text-secondary); 
            margin-bottom: 4px; 
          }
          .info-value { 
            font-size: 1.1rem; 
            font-weight: 600; 
            color: var(--primary); 
          }
          .nft-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
            gap: 20px; 
          }
          .nft-card { 
            border: 1px solid var(--card-border); 
            border-radius: 12px; 
            overflow: hidden; 
            background: var(--card-bg); 
            transition: transform 0.2s; 
          }
          .nft-card:hover { 
            transform: translateY(-4px); 
          }
          .pagination { 
            display: flex; 
            justify-content: center; 
            gap: 10px; 
            margin: 20px 0; 
          }
          .page-btn { 
            padding: 8px 12px; 
            border: 1px solid var(--card-border); 
            background: var(--card-bg); 
            border-radius: 6px; 
            cursor: pointer; 
            color: var(--text-secondary); 
          }
          .page-btn.active { 
            background: var(--primary); 
            color: var(--text-primary); 
            border-color: var(--primary); 
          }
          .page-btn:hover:not(.active) { 
            background: var(--glass-bg); 
          }
        `}
      </style>

      {/* Header 已移至统一的 AppHeader 组件 */}

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Collection Info */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            <div style={{ textAlign: 'center' }}>
              <div className="info-label">当前供应</div>
              <div className="info-value">{totalSupply || '0'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="info-label">最大供应</div>
              <div className="info-value">{maxSupply || '∞'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="info-label">铸造进度</div>
              <div className="info-value">{getProgress().toFixed(1)}%</div>
            </div>
            {walletInfo && (
              <>
                <div style={{ textAlign: 'center' }}>
                  <div className="info-label">我的NFT</div>
                  <div className="info-value">{walletInfo.mintedCount}</div>
                </div>
                {walletInfo.maxMintPerWallet && (
                  <div style={{ textAlign: 'center' }}>
                    <div className="info-label">剩余铸造</div>
                    <div className="info-value" style={{
                      color: walletInfo.remainingMints > 0 ? 'var(--primary)' : 'var(--danger)'
                    }}>
                      {walletInfo.remainingMints}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Progress Bar */}
          {maxSupply && (
            <div style={{ marginTop: '20px' }}>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'var(--glass-bg)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${getProgress()}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Mint Section */}
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '20px',
          padding: '30px',
          marginBottom: '30px',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--shadow-card)'
        }}>
          <h2 style={{ marginBottom: '20px', color: 'var(--text-primary)' }}>🎨 铸造 NFT</h2>
          
          {/* Gas Settings */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>⛽ Gas 设置</h3>
              <button
                onClick={() => estimateGasCost(true)}
                disabled={gasLoading}
                style={{
                  padding: '8px 16px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                {gasLoading ? '估算中...' : '重新估算'}
              </button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              {Object.entries(GAS_LEVELS).map(([key, level]) => (
                <div
                  key={key}
                  onClick={() => setSelectedGasLevel(key)}
                  style={{
                    padding: '15px',
                    border: `2px solid ${selectedGasLevel === key ? 'var(--primary)' : 'var(--card-border)'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: selectedGasLevel === key ? 'var(--glass-bg)' : 'transparent'
                  }}
                >
                  <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{level.name}</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '5px 0' }}>
                    {level.description}
                  </div>
                  {gasEstimate?.levels[key] && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
                      预计: {parseFloat(gasEstimate.levels[key].totalCost).toFixed(6)} ETH
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Merkle Allowlist Mint Section */}
          <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--card-border)', borderRadius: '12px', background: 'var(--glass-bg)' }}>
            <h3 style={{ margin: 0, marginBottom: 8 }}>白名单铸造（Merkle）</h3>
            <p style={{ marginTop: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              如果您收到了白名单 Merkle 证明，请在下方粘贴 JSON 数组（例如：["0xabc...","0xdef..."]）或用逗号分隔的哈希。
            </p>
            <textarea
              rows={4}
              style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--card-border)', borderRadius: 8, padding: 8 }}
              placeholder='在此粘贴 Merkle Proof（JSON 数组或逗号分隔）'
              value={merkleProofInput}
              onChange={e => setMerkleProofInput(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                style={{ marginTop: 8, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: loading || !account ? 'not-allowed' : 'pointer' }}
                onClick={allowlistMint}
                disabled={loading || !account}
              >
                {loading ? '处理中...' : '使用手动 proof 铸造'}
              </button>
              <button
                style={{ marginTop: 8, padding: '10px 16px', borderRadius: 8, border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: merkleAutoLoading || !account ? 'not-allowed' : 'pointer' }}
                onClick={autoAllowlistMint}
                disabled={merkleAutoLoading || !account}
                title={allowlistAddrs ? `已加载 ${allowlistAddrs.length} 个白名单地址` : '需提供 frontend/public/allowlist.json'}
              >
                {merkleAutoLoading ? '计算中...' : '自动生成 proof 并铸造'}
              </button>
            </div>
          </div>

          {/* Mint Button */}
          <button
            onClick={mint}
            disabled={loading || !account}
            style={{
              width: '100%',
              padding: '18px',
              fontSize: '1.2rem',
              fontWeight: '600',
              borderRadius: '12px',
              border: 'none',
              background: loading ? 'var(--text-muted)' : 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : 'var(--glow-primary)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? '铸造中...' : '铸造 NFT'}
          </button>

          {/* Status */}
          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: 'var(--glass-bg)',
            borderRadius: '12px',
            border: '1px solid var(--card-border)',
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            {status}
          </div>
        </div>

        {/* My NFTs Section */}
        {account && (
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: '20px',
            padding: '30px',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-card)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>🖼️ 我的 NFT</h2>
              <button
                onClick={() => setShowNFTList(!showNFTList)}
                style={{
                  padding: '8px 16px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                {showNFTList ? '隐藏' : '显示'}
              </button>
            </div>

            {showNFTList && (
              <>
                {mintedNFTs.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: 'var(--text-secondary)'
                  }}>
                    还没有 NFT，快去铸造一个吧！
                  </div>
                ) : (
                  <>
                    <div className="nft-grid">
                      {currentNFTs.map((nft, index) => (
                        <div key={index} className="nft-card">
                          <img
                            src={ipfsToHttp(nft.metadata.image)}
                            alt={nft.metadata.name}
                            style={{
                              width: '100%',
                              height: '200px',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              e.target.src = PLACEHOLDER_IMAGE;
                            }}
                          />
                          <div style={{ padding: '15px' }}>
                            <h3 style={{ 
                              margin: '0 0 8px 0', 
                              fontSize: '1.1rem',
                              color: 'var(--text-primary)'
                            }}>
                              {nft.metadata.name}
                            </h3>
                            <p style={{ 
                              margin: '0 0 8px 0', 
                              fontSize: '0.9rem', 
                              color: 'var(--text-secondary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {nft.metadata.description}
                            </p>
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: 'var(--primary)',
                              fontWeight: '500'
                            }}>
                              Token ID: {nft.tokenId}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="pagination">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="page-btn"
                        >
                          上一页
                        </button>
                        
                        {[...Array(totalPages)].map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPage(index + 1)}
                            className={`page-btn ${currentPage === index + 1 ? 'active' : ''}`}
                          >
                            {index + 1}
                          </button>
                        ))}
                        
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="page-btn"
                        >
                          下一页
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;