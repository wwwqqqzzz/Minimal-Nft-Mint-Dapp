import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { shortenAddress } from '../utils/ipfs';
// import { SUPPORTED_NETWORKS } from '../utils/networks'; // removed unused import
import './LandingPage.css';
import AppHeader from './AppHeader';

const FEATURES = [
  {
    icon: '🎨',
    title: '多模式铸造',
    description: '支持随机铸造与可选择模板铸造，满足不同用户需求'
  },
  {
    icon: '🔒',
    title: '安全可靠',
    description: '基于以太坊智能合约，支持白名单、防范常见攻击'
  },
  {
    icon: '⚡',
    title: '智能 Gas',
    description: '实时 Gas 估算，多档位选择，优化交易成本'
  },
  {
    icon: '🌐',
    title: '多链支持',
    description: '支持以太坊主网、测试网等多个网络'
  },
  {
    icon: '💎',
    title: '版税标准',
    description: '完全支持 EIP-2981 版税标准，保护创作者权益'
  },
  {
    icon: '📱',
    title: '响应式设计',
    description: '完美适配桌面、平板、手机等多种设备'
  }
];

const STATS = {
  totalContracts: '2+',
  networksSupported: '5+',
  featuresCount: '20+',
  activeUsers: '100+'
};

const LandingPage = ({ onEnterApp, walletState, onOpenHelp, authState, onGoInventory, onGoMarket }) => {
  const [account, setAccount] = useState('');
  const [currentNetwork, setCurrentNetwork] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(STATS);

  useEffect(() => {
    checkWalletConnection();
    loadDynamicStats();
  }, []);

  useEffect(() => {
    // 如果 header 已连接，同步显示
    if (walletState?.account && !account) {
      setAccount(walletState.account);
    }
  }, [walletState?.account, account]);

  const isLoading = (walletState?.loading ?? false) || loading;

  const connectWallet = async () => {
    if (walletState?.connect) {
      await walletState.connect();
      return;
    }
    // fallback 旧逻辑
    if (!window.ethereum) {
      alert('请安装 MetaMask 钱包');
      return;
    }
    try {
      setLoading(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      setCurrentNetwork(network);
      setTimeout(() => { onEnterApp(); }, 1000);
    } catch (error) {
      console.error('连接钱包失败:', error);
      alert('连接钱包失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const provider = new ethers.BrowserProvider(window.ethereum);
          const network = await provider.getNetwork();
          setCurrentNetwork(network);
        }
      } catch (error) {
        console.log('检查钱包连接失败:', error);
      }
    }
  };

  const loadDynamicStats = async () => {
    // 这里可以添加真实的统计数据获取逻辑
    // 例如从合约读取总铸造数量、活跃用户等
    try {
      // 模拟数据加载
      setTimeout(() => {
        setStats({
          totalContracts: '2+',
          networksSupported: '5+',
          featuresCount: '20+',
          activeUsers: '100+'
        });
      }, 1000);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  // 删除这里重复的 connectWallet 定义

  return (
    <div>
      <AppHeader 
        onBackToHome={() => {}}
        showAppSwitcher={false}
        account={walletState?.account}
        connect={walletState?.connect}
        loading={walletState?.loading}
        onOpenHelp={onOpenHelp}
        isLoggedIn={authState?.isLoggedIn}
        onLogin={authState?.onLogin}
        onLogout={authState?.onLogout}
        onGoInventory={onGoInventory}
        onGoMarket={onGoMarket}
      />
      <div className="main-content">
        <div className="landing-page">
          {/* Hero 区域 */}
          <section className="hero-section">
            <div className="hero-container">
              <div className="hero-content">
                <div className="hero-badge">
                  ✨ 全新 NFT 铸造体验
                </div>
                
                <h1 className="hero-title">
                  <span className="gradient-text">Minimal NFT</span>
                  <br />
                  Mint DApp
                </h1>
                
                <p className="hero-description">
                  专业级 NFT 铸造平台，支持多模式铸造、智能 Gas 优化、版税标准，为创作者和收藏家提供完整的 Web3 解决方案
                </p>

                <div className="hero-actions">
                  {account ? (
                    <div className="wallet-info">
                      <div className="wallet-status">
                        <span className="wallet-indicator">🟢</span>
                        <span>已连接: {shortenAddress(account)}</span>
                        {currentNetwork && (
                          <span className="network-info">
                            | {currentNetwork.name}
                          </span>
                        )}
                      </div>
                      <button className="btn btn-primary" onClick={onEnterApp}>
                        🚀 进入应用
                      </button>
                    </div>
                  ) : (
                    <div className="connect-actions">
                      <button 
                        className="btn btn-primary btn-large"
                        onClick={connectWallet}
                        disabled={isLoading}
                      >
                        {isLoading ? '🔄 连接中...' : '🔗 连接钱包'}
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={onEnterApp}
                      >
                        📖 先浏览功能
                      </button>
                    </div>
                  )}
                </div>

                {/* 快速统计 */}
                <div className="hero-stats">
                  <div className="stat-item">
                    <div className="stat-value">{stats.totalContracts}</div>
                    <div className="stat-label">智能合约</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.networksSupported}</div>
                    <div className="stat-label">支持网络</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.featuresCount}</div>
                    <div className="stat-label">功能特性</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{stats.activeUsers}</div>
                    <div className="stat-label">活跃用户</div>
                  </div>
                </div>
              </div>

              <div className="hero-visual">
                <div className="nft-showcase">
                  <div className="showcase-item showcase-1">
                    <div className="nft-preview">
                      <div className="nft-image">🎨</div>
                      <div className="nft-name">Original Mint</div>
                    </div>
                  </div>
                  <div className="showcase-item showcase-2">
                    <div className="nft-preview">
                      <div className="nft-image">🎯</div>
                      <div className="nft-name">Template Mint</div>
                    </div>
                  </div>
                  <div className="showcase-item showcase-3">
                    <div className="nft-preview">
                      <div className="nft-image">💎</div>
                      <div className="nft-name">Premium NFT</div>
                    </div>
                  </div>
                  {/* 新增：第4个展示卡片，补齐 2x2 布局 */}
                  <div className="showcase-item showcase-4">
                    <div className="nft-preview">
                      <div className="nft-image">🧬</div>
                      <div className="nft-name">Generative Art</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 功能特性区域 */}
          <section className="features-section">
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">核心功能特性</h2>
                <p className="section-description">
                  为 NFT 创作者和收藏家量身打造的专业功能
                </p>
              </div>

              <div className="features-grid">
                {FEATURES.map((feature, index) => (
                  <div key={index} className="feature-card">
                    <div className="feature-icon">{feature.icon}</div>
                    <h3 className="feature-title">{feature.title}</h3>
                    <p className="feature-description">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;