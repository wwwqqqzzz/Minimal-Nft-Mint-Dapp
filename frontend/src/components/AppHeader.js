import React from 'react';
import { shortenAddress } from '../utils/ipfs';

const AppHeader = ({ 
  account, 
  connect, 
  loading, 
  onBackToHome, 
  selectedApp, 
  setSelectedApp,
  showAppSwitcher = true,
  onOpenHelp,
  // 新增：就地登录/退出与导航到“我的仓库”
  isLoggedIn,
  onLogin,
  onLogout,
  onGoInventory,
  // 新增：导航到市场页
  onGoMarket
}) => {
  return (
    <header className="app-header">
      <div className="header-container">
        {/* 左侧品牌/标题 */}
        <div className="brand-section">
          <button
            className="brand-home-btn"
            onClick={onBackToHome}
            title="返回首页"
          >
            <div className="brand-icon" />
            <div className="brand-title">Minimal NFT Mint DApp</div>
          </button>
        </div>

        {/* 右侧控制区 */}
        <div className="header-controls">
          {/* 返回首页按钮 */}
          <button
            onClick={onBackToHome}
            title="返回首页"
            className="home-btn"
          >
            🏠 首页
          </button>

          {/* 市场按钮 */}
          {onGoMarket && (
            <button
              onClick={onGoMarket}
              title="前往交易市场"
              className="home-btn"
            >
              🛒 市场
            </button>
          )}

          {/* 我的仓库按钮 */}
          {onGoInventory && (
            <button
              onClick={onGoInventory}
              title="查看我的 NFT 仓库"
              className="home-btn"
            >
              📦 我的仓库
            </button>
          )}

          {/* 帮助按钮 */}
          <button
            onClick={onOpenHelp}
            title="打开帮助中心"
            className="theme-toggle-btn"
          >
            📚 帮助
          </button>

          {/* 主题切换按钮 */}
          <button
            onClick={() => {
              const root = document.documentElement;
              const isLight = root.getAttribute('data-theme') === 'light';
              if (isLight) {
                root.removeAttribute('data-theme');
                localStorage.removeItem('theme');
              } else {
                root.setAttribute('data-theme', 'light');
                localStorage.setItem('theme', 'light');
              }
            }}
            title="切换深/浅色主题"
            className="theme-toggle-btn"
          >
            🌓 主题
          </button>

          {/* 应用切换按钮组（可选显示） */}
          {showAppSwitcher && (
            <div className="app-switch-container">
              <button
                onClick={() => setSelectedApp && setSelectedApp('original')}
                className={`app-switch-btn ${selectedApp === 'original' ? 'active' : ''}`}
              >
                🎨 原版铸造
              </button>
              <button
                onClick={() => setSelectedApp && setSelectedApp('selectable')}
                className={`app-switch-btn ${selectedApp === 'selectable' ? 'active' : ''}`}
              >
                🎯 可选择铸造
              </button>
            </div>
          )}

          {/* 钱包连接状态与登录控制 */}
          {!account ? (
            <button 
              onClick={connect}
              disabled={loading}
              className="connect-wallet-btn"
            >
              {loading ? '🔄 连接中...' : '🔗 连接钱包'}
            </button>
          ) : (
            <div className="wallet-info">
              <div className="wallet-status-dot"></div>
              <span className="wallet-address">
                {shortenAddress(account)}
              </span>
              {/* 仅当提供了登录/退出处理器时显示 */}
              {(typeof onLogin === 'function' || typeof onLogout === 'function') && (
                isLoggedIn ? (
                  <button className="home-btn" onClick={onLogout} title="退出登录">🚪 退出</button>
                ) : (
                  <button className="home-btn" onClick={onLogin} title="签名登录">✍️ 签名登录</button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AppHeader;