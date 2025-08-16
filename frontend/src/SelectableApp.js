// SelectableApp.js - 支持可选择铸造的前端组件
import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import selectableNFTJson from './abi/selectable-min-abi.json';
import { SUPPORTED_NETWORKS } from './utils/networks.js';
import { ipfsToHttp } from './utils/ipfs.js';

/* global BigInt */

const CONTRACT_ADDRESS = process.env.REACT_APP_SELECTABLE_CONTRACT_ADDRESS || process.env.REACT_APP_CONTRACT_ADDRESS || '';
const EXPECTED_NETWORK = process.env.REACT_APP_NETWORK || 'sepolia';

const COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  background: '#f8fafc',
  surface: '#ffffff'
};

// Gas 档位配置
const GAS_LEVELS = {
  low: { name: '慢速', description: '较低费用，可能需要更长确认时间', multiplier: 1.0 },
  medium: { name: '标准', description: '平衡费用与速度', multiplier: 1.2 },
  high: { name: '快速', description: '高费用，快速确认', multiplier: 1.5 }
};

function SelectableApp() {
  // 钱包状态
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  
  // 合约状态
  const [contract, setContract] = useState(null);
  const [totalSupply, setTotalSupply] = useState(0);
  const [walletInfo, setWalletInfo] = useState({ mintedCount: 0, remainingMints: 0, isWhitelisted: false });
  
  // UI 状态
  const [status, setStatus] = useState('准备连接钱包');
  const [loading, setLoading] = useState(false);
  const [networkInfo, setNetworkInfo] = useState({ current: null, expected: null, isCorrect: false });
  
  // 铸造模式
  const [mintMode, setMintMode] = useState('selectable'); // 'selectable' | 'random'
  const [selectableMintEnabled, setSelectableMintEnabled] = useState(true);
  
  // 模板与选择
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  
  // Gas 估算
  const [gasEstimate, setGasEstimate] = useState(null);
  const [selectedGasLevel, setSelectedGasLevel] = useState('medium');
  
  // NFT 收藏
  const [mintedNFTs, setMintedNFTs] = useState([]);
  const [showNFTList, setShowNFTList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const NFTs_PER_PAGE = 6;

  // 网络配置
  const currentConfig = SUPPORTED_NETWORKS[EXPECTED_NETWORK];

  // 页面加载时自动检测钱包是否已连接
  useEffect(() => {
    async function checkIfWalletConnected() {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const currentSigner = await browserProvider.getSigner();
            setProvider(browserProvider);
            setSigner(currentSigner);
            setAccount(accounts[0]);
            
            // 初始化合约
            const contract = new ethers.Contract(CONTRACT_ADDRESS, selectableNFTJson.abi, browserProvider);
            setContract(contract);
          }
        } catch (e) {
          console.log('钱包检测失败:', e);
        }
      }
    }
    checkIfWalletConnected();
  }, []);



  async function connect() {
    if (!window.ethereum) {
      alert('请安装 MetaMask 钱包');
      return;
    }

    try {
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      
      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setStatus('钱包连接成功');
      
      // 初始化合约
      const contract = new ethers.Contract(CONTRACT_ADDRESS, selectableNFTJson.abi, provider);
      setContract(contract);
      
    } catch (error) {
      console.error('连接钱包失败:', error);
      setStatus(`连接失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const checkNetwork = useCallback(async () => {
    if (!provider) return;

    try {
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      const expectedChainId = currentConfig.chainId;
      
      setNetworkInfo({
        current: { name: network.name, chainId: currentChainId },
        expected: { name: currentConfig.name, chainId: expectedChainId },
        isCorrect: currentChainId === expectedChainId
      });

      if (currentChainId !== expectedChainId) {
        setStatus(`⚠️ 请切换到 ${currentConfig?.name || EXPECTED_NETWORK}`);
      } else {
        setStatus(`✅ 已连接到 ${currentConfig?.name || EXPECTED_NETWORK}`);
      }
    } catch (error) {
      console.error('检查网络失败:', error);
    }
  }, [provider, currentConfig]);

  async function switchNetwork() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${currentConfig.chainId.toString(16)}` }]
      });
      setTimeout(checkNetwork, 1000);
    } catch (error) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [currentConfig]
          });
        } catch (addError) {
          console.error('添加网络失败:', addError);
        }
      }
    }
  }

  const estimateGasCost = useCallback(async () => {
    if (!contract || !signer) return;

    try {
      const contractWithSigner = contract.connect(signer);
      const gasLevel = GAS_LEVELS[selectedGasLevel];
      
      let gasEstimate;
      if (mintMode === 'selectable' && selectedTemplate) {
        gasEstimate = await contractWithSigner.mintSelected.estimateGas(selectedTemplate.templateId);
      } else {
        gasEstimate = await contractWithSigner.mintRandom.estimateGas();
      }

      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice * BigInt(Math.floor(gasLevel.multiplier * 100)) / 100n;
      const totalCost = gasEstimate * gasPrice;

      setGasEstimate({
        gasLimit: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        totalCost: ethers.formatEther(totalCost),
        levelName: gasLevel.name
      });
    } catch (error) {
      console.warn('Gas 估算失败:', error);
    }
  }, [contract, signer, selectedGasLevel, mintMode, selectedTemplate, provider]);

  const loadContractData = useCallback(async () => {
    if (!contract) return;

    try {
      const totalSupply = await contract.totalSupply();
      setTotalSupply(Number(totalSupply));

      if (account) {
        const walletInfo = await contract.getWalletMintInfo(account);
        setWalletInfo({
          mintedCount: Number(walletInfo.mintedCount),
          remainingMints: Number(walletInfo.remainingMints),
          isWhitelisted: walletInfo.isWhitelistedWallet
        });

        const selectableEnabled = await contract.selectableMintEnabled();
        setSelectableMintEnabled(Boolean(selectableEnabled));
      }
    } catch (error) {
      console.error('加载合约数据失败:', error);
    }
  }, [contract, account]);

  const loadTemplates = useCallback(async () => {
    if (!contract) return;
    setTemplatesLoading(true);
    try {
      const availableTemplateIds = await contract.getAvailableTemplates();
      const templatesData = [];
      for (const templateId of availableTemplateIds) {
        const info = await contract.getTemplateInfo(templateId);
        try {
          const httpUrl = ipfsToHttp(info.metadataURI);
          const res = await fetch(httpUrl);
          const metadata = await res.json();
          templatesData.push({
            templateId: Number(templateId),
            metadataURI: info.metadataURI,
            maxSupply: Number(info.maxSupply),
            currentSupply: Number(info.currentSupply),
            isActive: info.isActive,
            name: metadata.name || `Template #${templateId}`,
            description: metadata.description || '',
            image: ipfsToHttp(metadata.image) || '/og-image.svg',
            attributes: metadata.attributes || []
          });
        } catch (e) {
          console.warn(`加载模板 ${templateId} 元数据失败:`, e);
          templatesData.push({
            templateId: Number(templateId),
            metadataURI: info.metadataURI,
            maxSupply: Number(info.maxSupply),
            currentSupply: Number(info.currentSupply),
            isActive: info.isActive,
            name: `Template #${templateId}`,
            description: '',
            image: '/og-image.svg',
            attributes: []
          });
        }
      }

      // 仅保留一组（4 个）本地 HTTP 模板：0.json / 1.json / 2.json / 3.json，各取 templateId 最小的一个
      try {
        const prefix = 'http://localhost:3000/metadata/';
        const groupMap = { '0.json': [], '1.json': [], '2.json': [], '3.json': [] };
        for (const t of templatesData) {
          const uri = t.metadataURI || '';
          if (uri.startsWith(prefix)) {
            const m = uri.match(/\/([0-3])\.json$/);
            if (m) {
              const key = `${m[1]}.json`;
              groupMap[key].push(t);
            }
          }
        }
        const selectedByGroup = [];
        for (const key of Object.keys(groupMap)) {
          const arr = groupMap[key];
          if (arr.length > 0) {
            arr.sort((a, b) => a.templateId - b.templateId);
            selectedByGroup.push(arr[0]);
          }
        }
        const finalTemplates = selectedByGroup.length > 0 ? selectedByGroup : templatesData;
        setTemplates(finalTemplates);
        if (finalTemplates.length > 0 && !selectedTemplate) setSelectedTemplate(finalTemplates[0]);
      } catch (e) {
        // 回退到原始列表
        setTemplates(templatesData);
        if (templatesData.length > 0 && !selectedTemplate) setSelectedTemplate(templatesData[0]);
      }
    } catch (error) {
      console.error('加载模板失败:', error);
    } finally {
      setTemplatesLoading(false);
    }
  }, [contract, selectedTemplate]);

  async function mintNFT() {
    if (!contract || !signer) {
      alert('请先连接钱包');
      return;
    }
    if (!networkInfo.isCorrect) {
      alert(`请切换到 ${currentConfig?.name || EXPECTED_NETWORK} 网络`);
      return;
    }
    if (mintMode === 'selectable' && !selectedTemplate) {
      alert('请选择一个 NFT 模板');
      return;
    }
    try {
      setLoading(true);
      setStatus('正在铸造 NFT...');
      const contractWithSigner = contract.connect(signer);
      const gasLevel = GAS_LEVELS[selectedGasLevel];
      let tx;
      if (mintMode === 'selectable') {
        tx = await contractWithSigner.mintSelected(selectedTemplate.templateId);
        setStatus(`正在铸造选择的 NFT: ${selectedTemplate?.name || '未知模板'}...`);
      } else {
        tx = await contractWithSigner.mintRandom();
        setStatus('正在随机铸造 NFT...');
      }
      setStatus('等待交易确认...');
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);
      setStatus('🎉 NFT 铸造成功！');
      await loadContractData();
      await loadTemplates();
      await loadMintedNFTs();
      setShowNFTList(true);
    } catch (error) {
      console.error('铸造失败:', error);
      setStatus(`铸造失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const loadMintedNFTs = useCallback(async () => {
    if (!contract || !account) return;
    try {
      const balance = await contract.balanceOf(account);
      const nfts = [];
      for (let i = 0; i < Number(balance); i++) {
        try {
          const tokenId = await contract.tokenOfOwnerByIndex(account, i);
          const tokenURI = await contract.tokenURI(tokenId);
          const httpUrl = ipfsToHttp(tokenURI);
          const res = await fetch(httpUrl);
          const metadata = await res.json();
          nfts.push({
            tokenId: Number(tokenId),
            name: metadata.name || `NFT #${tokenId}`,
            description: metadata.description || '',
            image: ipfsToHttp(metadata.image) || '/og-image.svg',
            attributes: metadata.attributes || []
          });
        } catch (e) {
          console.warn(`加载 NFT 失败:`, e);
        }
      }
      setMintedNFTs(nfts);
    } catch (error) {
      console.error('加载 NFT 收藏失败:', error);
    }
  }, [contract, account]);

  // 应用初始化逻辑（在所有 useCallback 定义之后）
  const initializeApp = useCallback(async () => {
    if (!account || !contract) return;
    try {
      await checkNetwork();
      await loadContractData();
      await loadTemplates();
      await estimateGasCost();
      await loadMintedNFTs();
    } catch (error) {
      console.error('初始化应用失败:', error);
      setStatus(`初始化失败: ${error.message}`);
    }
  }, [account, contract, checkNetwork, loadContractData, loadTemplates, estimateGasCost, loadMintedNFTs]);

  useEffect(() => {
    initializeApp();
    const interval = setInterval(() => { estimateGasCost(); }, 30000); // 每30秒更新 Gas
    return () => clearInterval(interval);
  }, [initializeApp, estimateGasCost]);

  // 分页逻辑
  const totalPages = Math.ceil(mintedNFTs.length / NFTs_PER_PAGE);
  const startIndex = (currentPage - 1) * NFTs_PER_PAGE;
  const currentNFTs = mintedNFTs.slice(startIndex, startIndex + NFTs_PER_PAGE);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: COLORS.background, minHeight: '100vh' }}>
      {!currentConfig ? (
        <div style={{ padding: '20px', color: 'red' }}>❌ 不支持的网络配置: {EXPECTED_NETWORK}</div>
      ) : (
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
          
          {/* 头部 */}
          <div className="header" style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="title" style={{ fontSize: '2.5rem', fontWeight: 'bold', color: COLORS.primary, marginBottom: '10px' }}>
              🎨 可选择 NFT 铸造
            </div>
            <div className="subtitle" style={{ color: COLORS.secondary }}>
              选择你喜欢的 NFT 或随机铸造，享受独特的数字收藏体验
            </div>
          </div>

          {/* 网络状态 */}
          <div className={`network-status ${networkInfo.isCorrect ? 'network-correct' : 'network-wrong'}`} 
               style={{ 
                 padding: '12px 20px', 
                 borderRadius: '8px', 
                 marginBottom: '20px',
                 backgroundColor: networkInfo.isCorrect ? '#dcfce7' : '#fef3c7',
                 border: `1px solid ${networkInfo.isCorrect ? '#bbf7d0' : '#fde68a'}`
               }}>
            {networkInfo.isCorrect ? (
              <span style={{ color: '#166534' }}>✅ 已连接到 {networkInfo.current?.name || currentConfig?.name || '未知网络'}</span>
            ) : (
              <div style={{ color: '#92400e' }}>
                ⚠️ 当前网络: {networkInfo.current?.name || '未知'}，请切换到 {networkInfo.expected?.name || currentConfig?.name || EXPECTED_NETWORK}
                <button onClick={switchNetwork} style={{ marginLeft: '10px', padding: '4px 8px', borderRadius: '4px', border: 'none', backgroundColor: COLORS.warning, color: 'white' }}>
                  切换网络
                </button>
              </div>
            )}
          </div>

          {!account ? (
            /* 连接钱包 */
            <div className="card" style={{ backgroundColor: COLORS.surface, padding: '30px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ marginBottom: '20px', color: COLORS.primary }}>连接钱包开始铸造</h2>
              <button onClick={connect} disabled={loading} style={{ padding: '12px 24px', fontSize: '1.1rem', borderRadius: '8px', border: 'none', backgroundColor: COLORS.primary, color: 'white' }}>
                {loading ? '连接中...' : '连接 MetaMask 钱包'}
              </button>
            </div>
          ) : (
            <>
              {/* 账户信息 */}
              <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                <div className="info-item" style={{ backgroundColor: COLORS.surface, padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9rem', color: COLORS.secondary, marginBottom: '5px' }}>账户地址</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{account.slice(0, 6)}...{account.slice(-4)}</div>
                </div>
                <div className="info-item" style={{ backgroundColor: COLORS.surface, padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9rem', color: COLORS.secondary, marginBottom: '5px' }}>总供应量</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{totalSupply}</div>
                </div>
                <div className="info-item" style={{ backgroundColor: COLORS.surface, padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9rem', color: COLORS.secondary, marginBottom: '5px' }}>我的铸造数</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{walletInfo.mintedCount}</div>
                </div>
                <div className="info-item" style={{ backgroundColor: COLORS.surface, padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9rem', color: COLORS.secondary, marginBottom: '5px' }}>剩余铸造次数</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{walletInfo.remainingMints}</div>
                </div>
                <div className="info-item" style={{ backgroundColor: COLORS.surface, padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.9rem', color: COLORS.secondary, marginBottom: '5px' }}>白名单状态</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600' }}>{walletInfo.isWhitelisted ? '✅ 是' : '❌ 否'}</div>
                </div>
              </div>

              {/* 铸造模式选择 */}
              <div className="card" style={{ backgroundColor: COLORS.surface, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px', color: COLORS.primary }}>选择铸造模式</h3>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <button 
                    onClick={() => setMintMode('selectable')}
                    style={{ 
                      padding: '10px 20px', 
                      borderRadius: '8px', 
                      border: '2px solid', 
                      borderColor: mintMode === 'selectable' ? COLORS.primary : COLORS.secondary,
                      backgroundColor: mintMode === 'selectable' ? COLORS.primary : 'transparent',
                      color: mintMode === 'selectable' ? 'white' : COLORS.secondary
                    }}
                    disabled={!selectableMintEnabled}
                  >
                    🎯 选择铸造
                  </button>
                  <button 
                    onClick={() => setMintMode('random')}
                    style={{ 
                      padding: '10px 20px', 
                      borderRadius: '8px', 
                      border: '2px solid', 
                      borderColor: mintMode === 'random' ? COLORS.primary : COLORS.secondary,
                      backgroundColor: mintMode === 'random' ? COLORS.primary : 'transparent',
                      color: mintMode === 'random' ? 'white' : COLORS.secondary
                    }}
                  >
                    🎲 随机铸造
                  </button>
                </div>
                <div style={{ fontSize: '0.9rem', color: COLORS.secondary }}>
                  {mintMode === 'selectable' ? '选择你喜欢的 NFT 进行铸造' : '随机获得一个可用的 NFT'}
                  {!selectableMintEnabled && ' (选择铸造已被管理员禁用)'}
                </div>
              </div>

              {/* NFT 模板选择（仅在选择模式下显示） */}
              {mintMode === 'selectable' && (
                <div className="card" style={{ backgroundColor: COLORS.surface, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                  <h3 style={{ marginBottom: '15px', color: COLORS.primary }}>
                    选择 NFT 模板 {templatesLoading && '(加载中...)'}
                  </h3>
                  {templates.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                      {templates.map((template) => (
                        <div 
                          key={template.templateId}
                          onClick={() => setSelectedTemplate(template)}
                          style={{ 
                            border: '2px solid',
                            borderColor: selectedTemplate?.templateId === template.templateId ? COLORS.primary : '#e2e8f0',
                            borderRadius: '8px',
                            padding: '15px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <img 
                            src={template.image} 
                            alt={template.name}
                            style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '6px', marginBottom: '10px' }}
                            onError={(e) => { e.currentTarget.src = '/og-image.svg'; }}
                          />
                          <div style={{ fontWeight: '600', marginBottom: '5px' }}>{template?.name || '未知模板'}</div>
                          <div style={{ fontSize: '0.85rem', color: COLORS.secondary, marginBottom: '8px' }}>{template?.description || ''}</div>
                          <div style={{ fontSize: '0.8rem', color: COLORS.secondary }}>
                            供应量: {template.currentSupply}/{template.maxSupply}
                          </div>
                          {(template?.attributes || []).length > 0 && (
                            <div style={{ marginTop: '8px' }}>
                              {(template?.attributes || []).slice(0, 2).map((attr, index) => (
                                <span 
                                  key={index}
                                  style={{ 
                                    display: 'inline-block', 
                                    backgroundColor: '#f1f5f9', 
                                    padding: '2px 6px', 
                                    borderRadius: '4px', 
                                    fontSize: '0.75rem', 
                                    marginRight: '4px',
                                    marginTop: '4px'
                                  }}
                                >
                                  {(attr?.trait_type || '属性')}: {attr?.value || ''}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: COLORS.secondary, padding: '20px' }}>
                      {templatesLoading ? '正在加载模板...' : '暂无可用的 NFT 模板'}
                    </div>
                  )}
                </div>
              )}

              {/* Gas 费用选择 */}
              <div className="card" style={{ backgroundColor: COLORS.surface, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px', color: COLORS.primary }}>⛽ Gas 费用设置</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
                  {Object.entries(GAS_LEVELS).map(([level, config]) => (
                    <div 
                      key={level}
                      onClick={() => setSelectedGasLevel(level)}
                      style={{ 
                        padding: '12px',
                        border: '2px solid',
                        borderColor: selectedGasLevel === level ? COLORS.primary : '#e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{config.name}</div>
                      <div style={{ fontSize: '0.8rem', color: COLORS.secondary }}>{config.description}</div>
                    </div>
                  ))}
                </div>
                {gasEstimate && (
                  <div style={{ fontSize: '0.9rem', color: COLORS.secondary }}>
                    预估费用: {gasEstimate.totalCost} ETH ({gasEstimate.levelName})
                  </div>
                )}
              </div>

              {/* 铸造按钮 */}
              <div className="card" style={{ backgroundColor: COLORS.surface, padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <button 
                    onClick={mintNFT}
                    disabled={loading || !networkInfo.isCorrect || (mintMode === 'selectable' && !selectedTemplate)}
                    style={{ 
                      padding: '15px 30px', 
                      fontSize: '1.2rem', 
                      borderRadius: '8px', 
                      border: 'none', 
                      backgroundColor: loading ? COLORS.secondary : COLORS.success,
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? '铸造中...' : (mintMode === 'selectable' ? '铸造选定的 NFT' : '随机铸造 NFT')}
                  </button>
                  <div style={{ marginTop: '10px', fontSize: '0.9rem', color: COLORS.secondary }}>
                    {status}
                  </div>
                </div>
              </div>

              {/* 我的 NFT 收藏 */}
              <div className="card" style={{ backgroundColor: COLORS.surface, padding: '20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ color: COLORS.primary, margin: 0 }}>🖼️ 我的 NFT 收藏</h3>
                  <button 
                    onClick={() => setShowNFTList(!showNFTList)}
                    style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: COLORS.primary, color: 'white' }}
                  >
                    {showNFTList ? '隐藏' : '显示'} ({mintedNFTs.length})
                  </button>
                </div>
                
                {showNFTList && (
                  <div>
                    {currentNFTs.length > 0 ? (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '15px' }}>
                          {currentNFTs.map((nft) => (
                            <div key={nft.tokenId} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                              <img 
                                src={nft.image}
                                alt={nft.name}
                                style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }}
                                onError={(e) => { e.currentTarget.src = '/og-image.svg'; }}
                              />
                              <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '0.9rem' }}>{nft?.name || '未知 NFT'}</div>
                              <div style={{ fontSize: '0.8rem', color: COLORS.secondary }}>Token #{nft.tokenId}</div>
                              {(nft?.attributes || []).length > 0 && (
                                <div style={{ marginTop: '6px' }}>
                                  {(nft?.attributes || []).slice(0, 2).map((attr, index) => (
                                    <span 
                                      key={index}
                                      style={{ 
                                        display: 'inline-block', 
                                        backgroundColor: '#f1f5f9', 
                                        padding: '1px 4px', 
                                        borderRadius: '3px', 
                                        fontSize: '0.7rem', 
                                        marginRight: '3px'
                                      }}
                                    >
                                      {attr?.value || ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {/* 分页 */}
                        {totalPages > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
                            <button 
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                            >
                              上一页
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button 
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                style={{ 
                                  padding: '8px 12px', 
                                  borderRadius: '4px', 
                                  border: '1px solid #e2e8f0',
                                  backgroundColor: currentPage === page ? COLORS.primary : 'transparent',
                                  color: currentPage === page ? 'white' : COLORS.secondary
                                }}
                              >
                                {page}
                              </button>
                            ))}
                            <button 
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                            >
                              下一页
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: COLORS.secondary, padding: '20px' }}>
                        暂无 NFT，快去铸造一个吧！
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
    );
}

export default SelectableApp;