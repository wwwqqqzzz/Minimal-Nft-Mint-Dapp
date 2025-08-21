import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './theme.css'; // 引入主题样式
import App from './App';
import SelectableApp from './SelectableApp';
import LandingPage from './components/LandingPage';
import AppHeader from './components/AppHeader';
import HelpCenter from './components/HelpCenter';
import { signLogin, signLogout, getLocalSession } from './auth';
import { ethers } from 'ethers';
import selectableAbi from './abi/selectable-min-abi.json';
import marketAbi from './abi/market-min-abi.json';
import MyNFTAbi from './MyNFT.json';

// 简易的“我的仓库”页面（基础版：枚举两个合约的持有 NFT）
function InventoryPage({ account, onBackToApp }) {
  const [loading, setLoading] = React.useState(false);
  // items: {contractName, address, tokenId, tokenURI?, image?, name?, rawMeta?}
  const [items, setItems] = React.useState([]);
  const [error, setError] = React.useState('');
  const [listingPrice, setListingPrice] = React.useState(''); // 以 ETH 输入
  const [listLoading, setListLoading] = React.useState(false);
  const marketAddr = process.env.REACT_APP_MARKET_CONTRACT_ADDRESS || '';

  const selectableAddr = process.env.REACT_APP_SELECTABLE_CONTRACT_ADDRESS || process.env.REACT_APP_CONTRACT_ADDRESS;
  const mynftAddr = process.env.REACT_APP_CONTRACT_ADDRESS;

  // ipfs:// 转 http(s) 便于浏览器加载
  const ipfsToHttp = React.useCallback((uri) => {
    if (!uri) return '';
    if (uri.startsWith('ipfs://')) {
      const path = uri.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${path}`;
    }
    return uri;
  }, []);

  const ensureApprovalAndList = React.useCallback(async (it) => {
    try {
      if (!window.ethereum) { alert('请先安装钱包'); return; }
      if (!marketAddr) { alert('未配置市场合约地址 REACT_APP_MARKET_CONTRACT_ADDRESS'); return; }
      if (!listingPrice || Number(listingPrice) <= 0) { alert('请输入有效的上架价格（ETH）'); return; }
      setListLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const collection = new ethers.Contract(it.address, selectableAbi.abi || selectableAbi, signer);
      const isAllApproved = await collection.isApprovedForAll(account, marketAddr);
      if (!isAllApproved) {
        const txA = await collection.setApprovalForAll(marketAddr, true);
        await txA.wait();
      }
      const market = new ethers.Contract(marketAddr, marketAbi.abi || marketAbi, signer);
      const priceWei = ethers.parseEther(String(listingPrice));
      const tx = await market.listItem(it.address, it.tokenId, priceWei);
      await tx.wait();
      alert('上架成功');
    } catch (e) {
      console.error('上架失败', e);
      alert(e?.shortMessage || e?.message || '上架失败');
    } finally {
      setListLoading(false);
    }
  }, [account, listingPrice, marketAddr]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadInventory() {
      if (!account) { setItems([]); return; }
      if (!window.ethereum) { setError('未检测到钱包'); return; }
      setLoading(true);
      setError('');
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const next = [];

        // 加载 MyNFT（如有配置）
        if (mynftAddr) {
          const mynft = new ethers.Contract(mynftAddr, MyNFTAbi.abi || MyNFTAbi, provider);
          const bal = await mynft.balanceOf(account);
          const count = Number(bal);
          for (let i = 0; i < count; i++) {
            try {
              const tokenId = await mynft.tokenOfOwnerByIndex(account, i);
              let tokenURI = '';
              try { tokenURI = await mynft.tokenURI(tokenId); } catch {}
              let meta = null; let image = '';
              if (tokenURI) {
                try {
                  const resp = await fetch(ipfsToHttp(tokenURI));
                  meta = await resp.json().catch(() => null);
                  image = ipfsToHttp(meta?.image || meta?.image_url || '');
                } catch {}
              }
              next.push({ contractName: 'MyNFT', address: mynftAddr, tokenId: tokenId.toString(), tokenURI, image, name: meta?.name, rawMeta: meta });
            } catch (e) { console.warn('枚举 MyNFT 失败', e); }
          }
        }
        // 加载 SelectableNFT（如有配置且不同于 MyNFT）
        if (selectableAddr && selectableAddr.toLowerCase() !== (mynftAddr || '').toLowerCase()) {
          const selectable = new ethers.Contract(selectableAddr, selectableAbi.abi || selectableAbi, provider);
          const bal2 = await selectable.balanceOf(account);
          const count2 = Number(bal2);
          for (let j = 0; j < count2; j++) {
            try {
              const tokenId2 = await selectable.tokenOfOwnerByIndex(account, j);
              let tokenURI2 = '';
              try { tokenURI2 = await selectable.tokenURI(tokenId2); } catch {}
              let meta2 = null; let image2 = '';
              if (tokenURI2) {
                try {
                  const resp2 = await fetch(ipfsToHttp(tokenURI2));
                  meta2 = await resp2.json().catch(() => null);
                  image2 = ipfsToHttp(meta2?.image || meta2?.image_url || '');
                } catch {}
              }
              next.push({ contractName: 'SelectableNFT', address: selectableAddr, tokenId: tokenId2.toString(), tokenURI: tokenURI2, image: image2, name: meta2?.name, rawMeta: meta2 });
            } catch (e) { console.warn('枚举 Selectable 失败', e); }
          }
        }
        if (!cancelled) setItems(next);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError(e?.message || '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadInventory();
    return () => { cancelled = true; };
  }, [account, mynftAddr, selectableAddr, ipfsToHttp]);

  return (
    <div className="main-content" style={{ padding: '24px' }}>
      <div className="card" style={{ maxWidth: 1024, margin: '0 auto' }}>
        <h2>📦 我的仓库</h2>
        <p>当前地址：{account || '未连接'}</p>
        {/* 统计与状态 */}
        {loading && <p>🔄 正在加载我的 NFT...</p>}
        {error && <p style={{ color: 'var(--danger)' }}>⚠️ {error}</p>}
        {!loading && !error && (
          <p>共持有：<b>{items.length}</b> 枚 NFT（汇总自两个合约）</p>
        )}

        {/* 未连接提示 */}
        {!account && (
          <div className="card" style={{ padding: 16, marginBottom: 12 }}>
            <div>请先在右上角连接钱包，然后再次进入“我的仓库”。</div>
          </div>
        )}

        {/* 上架价格输入 */}
        {account && (
          <div className="card" style={{ padding: 12, marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>上架价格（ETH）：</span>
            <input value={listingPrice} onChange={e=>setListingPrice(e.target.value)} placeholder="例如 0.02" style={{ flex: 'none', width: 160 }} />
            <span style={{ opacity: 0.7 }}>选择下方 NFT 点击“上架”</span>
          </div>
        )}

        {/* NFT 列表（展示元数据） */}
        <div className="nft-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {items.map((it, idx) => (
            <div key={`${it.address}-${it.tokenId}-${idx}`} className="card" style={{ padding: 16 }}>
              <div className="badge">{it.contractName}</div>
              <div style={{ marginBottom: 8, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, overflow: 'hidden' }}>
                {it.image ? (
                  <img src={it.image} alt={it.name || `Token #${it.tokenId}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: 32, opacity: 0.7 }}>🖼️</div>
                )}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{it.name || `Token #${it.tokenId}`}</div>
              <div>Token ID: <b>#{it.tokenId}</b></div>
              <div style={{ fontSize: 12, wordBreak: 'break-all', opacity: 0.7 }}>合约: {it.address}</div>
              {/* 操作：查看元数据 与 上架 */}
              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {it.tokenURI && (
                  <a className="btn btn-secondary" href={ipfsToHttp(it.tokenURI)} target="_blank" rel="noreferrer">查看元数据</a>
                )}
                {account && (
                  <button className="btn btn-primary" disabled={listLoading} onClick={() => ensureApprovalAndList(it)}>↑ 上架</button>
                )}
              </div>
            </div>
          ))}
          {!loading && items.length === 0 && account && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 24 }}>🗃️ 暂无持有</div>
              <div style={{ opacity: 0.8 }}>去铸造页试试吧～</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onBackToApp}>返回应用</button>
        </div>
      </div>
    </div>
  );
}

// 简易“市场”页面：展示两个合约中最近铸造的 NFT 列表（读取 totalSupply 并倒序显示 tokenId），提供“查看元数据”与占位“上架/购买”按钮。
function MarketPage({ onBack, account }) {
  const [items, setItems] = React.useState([]); // {contractName,address,tokenId,tokenURI?,image?,name?}
  const [loading, setLoading] = React.useState(false);
  const [listings, setListings] = React.useState([]); // 来自合约的上架数据
  const [fetchingListings, setFetchingListings] = React.useState(false);
  const marketAddr = process.env.REACT_APP_MARKET_CONTRACT_ADDRESS || '';

  const selectableAddr = process.env.REACT_APP_SELECTABLE_CONTRACT_ADDRESS || process.env.REACT_APP_CONTRACT_ADDRESS;
  const mynftAddr = process.env.REACT_APP_CONTRACT_ADDRESS;

  const ipfsToHttp = React.useCallback((uri) => {
    if (!uri) return '';
    if (uri.startsWith('ipfs://')) return `https://ipfs.io/ipfs/${uri.replace('ipfs://','')}`;
    return uri;
  }, []);

  // 读取市场合约的上架列表（最近 N 条）
  React.useEffect(() => {
    let off = false;
    async function loadListings() {
      if (!marketAddr) return;
      try {
        setFetchingListings(true);
        const provider = window.ethereum ? new ethers.BrowserProvider(window.ethereum) : new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL || undefined);
        const market = new ethers.Contract(marketAddr, marketAbi.abi || marketAbi, provider);
        const count = Number(await market.listingCount());
        if (count === 0) { setListings([]); return; }
        const from = Math.max(1, count - 20 + 1);
        const arr = await market.getListingsInRange(from, count);
        // 过滤 active=true 且补充基本可读字段
        const actives = arr
          .map((lst, i) => ({
            listingId: from + i,
            collection: lst.collection,
            tokenId: Number(lst.tokenId),
            seller: lst.seller,
            price: lst.price, // BigInt
            active: lst.active
          }))
          .filter(x => x.active);
        if (!off) setListings(actives.reverse());
      } catch (e) {
        console.warn('加载上架列表失败', e);
      } finally {
        if (!off) setFetchingListings(false);
      }
    }
    loadListings();
    return () => { off = true; };
  }, [marketAddr]);

  const doBuy = React.useCallback(async (lst) => {
    try {
      if (!window.ethereum) { alert('请安装钱包'); return; }
      if (!marketAddr) { alert('未配置市场合约地址'); return; }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const market = new ethers.Contract(marketAddr, marketAbi.abi || marketAbi, signer);
      const tx = await market.buy(lst.listingId, { value: lst.price });
      await tx.wait();
      alert('购买成功');
    } catch (e) {
      console.error('购买失败', e);
      alert(e?.shortMessage || e?.message || '购买失败');
    }
  }, [marketAddr]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const provider = window.ethereum ? new ethers.BrowserProvider(window.ethereum) : new ethers.JsonRpcProvider(process.env.REACT_APP_RPC_URL || undefined);
        const next = [];
        if (mynftAddr) {
          const c = new ethers.Contract(mynftAddr, MyNFTAbi.abi || MyNFTAbi, provider);
          if (typeof c.totalSupply === 'function') {
            const total = Number(await c.totalSupply());
            for (let i = Math.max(0,total-12); i < total; i++) { // 只取最近12个
              const tokenId = i; // 假设 tokenId 从0/1自增，若非则需要 tokenByIndex
              let tokenURI = '';
              try { tokenURI = await c.tokenURI(tokenId); } catch {}
              let name = '', image = '';
              if (tokenURI) {
                try {
                  const resp = await fetch(ipfsToHttp(tokenURI));
                  const meta = await resp.json().catch(()=>null);
                  name = meta?.name || '';
                  image = ipfsToHttp(meta?.image || meta?.image_url || '');
                } catch {}
              }
              next.push({ contractName: 'MyNFT', address: mynftAddr, tokenId: String(tokenId), tokenURI, image, name });
            }
          }
        }
        if (selectableAddr && selectableAddr.toLowerCase() !== (mynftAddr||'').toLowerCase()) {
          const s = new ethers.Contract(selectableAddr, selectableAbi.abi || selectableAbi, provider);
          if (typeof s.totalSupply === 'function') {
            const total2 = Number(await s.totalSupply());
            for (let j = Math.max(0,total2-12); j < total2; j++) {
              const tokenId2 = j;
              let tokenURI2 = '';
              try { tokenURI2 = await s.tokenURI(tokenId2); } catch {}
              let name2 = '', image2 = '';
              if (tokenURI2) {
                try {
                  const resp2 = await fetch(ipfsToHttp(tokenURI2));
                  const meta2 = await resp2.json().catch(()=>null);
                  name2 = meta2?.name || '';
                  image2 = ipfsToHttp(meta2?.image || meta2?.image_url || '');
                } catch {}
              }
              next.push({ contractName: 'SelectableNFT', address: selectableAddr, tokenId: String(tokenId2), tokenURI: tokenURI2, image: image2, name: name2 });
            }
          }
        }
        if (!cancelled) setItems(next.reverse());
      } catch(e) {
        console.error('加载市场失败', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [mynftAddr, selectableAddr, ipfsToHttp]);

  return (
    <div className="main-content" style={{ padding: 24 }}>
      <div className="card" style={{ maxWidth: 1080, margin: '0 auto' }}>
        <h2>🛒 交易市场（演示版）</h2>
        <p style={{ opacity: 0.8 }}>展示最近铸造的 NFT，后续可接入上架/出价/购买合约。</p>
        <p style={{ opacity: 0.8 }}>展示最近铸造的 NFT，并显示来自合约的在售列表，可直接购买。</p>
        {marketAddr ? null : <p style={{ color: 'var(--danger)' }}>⚠️ 未配置 REACT_APP_MARKET_CONTRACT_ADDRESS，购买与上架将不可用</p>}

        {/* 上架列表 */}
        {fetchingListings ? (
          <p>正在读取在售列表...</p>
        ) : listings.length > 0 ? (
          <div className="card" style={{ marginBottom: 12 }}>
            <h3>在售列表</h3>
            <div className="nft-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
              {listings.map((lst) => (
                <div key={lst.listingId} className="card" style={{ padding: 12 }}>
                  <div>Listing #{lst.listingId}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, wordBreak: 'break-all' }}>合约: {lst.collection}</div>
                  <div>Token ID: #{String(lst.tokenId)}</div>
                  <div>价格: {ethers.formatEther(lst.price)} ETH</div>
                  <div style={{ marginTop: 8 }}>
                    <button className="btn btn-primary" disabled={!account} onClick={() => doBuy(lst)}>立即购买</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ opacity: 0.8 }}>暂无在售列表</div>
          </div>
        )}

        <div className="nft-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {items.map((it, idx) => (
            <div key={`${it.address}-${it.tokenId}-${idx}`} className="card" style={{ padding: 16 }}>
              <div className="badge">{it.contractName}</div>
              <div style={{ marginBottom: 8, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, overflow: 'hidden' }}>
                {it.image ? (
                  <img src={it.image} alt={it.name || `Token #${it.tokenId}`} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ fontSize: 32, opacity: 0.7 }}>🖼️</div>
                )}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{it.name || `Token #${it.tokenId}`}</div>
              <div>Token ID: <b>#{it.tokenId}</b></div>
              <div style={{ fontSize: 12, wordBreak: 'break-all', opacity: 0.7 }}>合约: {it.address}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                {it.tokenURI && <a className="btn btn-secondary" href={ipfsToHttp(it.tokenURI)} target="_blank" rel="noreferrer">查看元数据</a>}
                <button className="btn btn-primary" disabled title="从合约“在售列表”中购买">💱 购买</button>
              </div>
            </div>
          ))}
          {!loading && items.length === 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 24 }}>🙈 暂无可展示的 NFT</div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={onBack}>返回</button>
        </div>
      </div>
    </div>
  );
}

// 页面选择器组件
function AppSelector({ onBackToHome, walletState, onOpenHelp, authState, onGoInventory }) {
  const [selectedApp, setSelectedApp] = useState('original'); // 'original' | 'selectable'

  return (
    <div>
      {/* 统一的 Header 组件 */}
      <AppHeader 
        onBackToHome={onBackToHome}
        selectedApp={selectedApp}
        setSelectedApp={setSelectedApp}
        showAppSwitcher={true}
        account={walletState?.account}
        connect={walletState?.connect}
        loading={walletState?.loading}
        onOpenHelp={onOpenHelp}
        isLoggedIn={authState?.isLoggedIn}
        onLogin={authState?.onLogin}
        onLogout={authState?.onLogout}
        onGoInventory={onGoInventory}
      />

      {/* 页面主内容，预留 Header 高度 */}
      <div className="main-content">
        {selectedApp === 'original' ? <App /> : <SelectableApp onGoInventory={onGoInventory} />}
      </div>
    </div>
  );
}

// 根组件：默认展示首页，进入后展示 AppSelector
function Root() {
  const [showLanding, setShowLanding] = useState(true);
  const [showInventory, setShowInventory] = useState(false);
  const [showMarket, setShowMarket] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  // 主题
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, []);

  // 统一钱包状态（供 Header 使用）
  const [headerAccount, setHeaderAccount] = React.useState('');
  const [headerLoading, setHeaderLoading] = React.useState(false);
  const headerConnect = React.useCallback(async () => {
    if (!window.ethereum) { alert('请安装 MetaMask'); return; }
    try {
      setHeaderLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      setHeaderAccount(accounts[0] || '');
    } catch (e) {
      console.error(e);
    } finally {
      setHeaderLoading(false);
    }
  }, []);

  // 初始检查是否已经连接、是否已有本地登录会话
  React.useEffect(() => {
    (async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send('eth_accounts', []);
          if (accounts && accounts[0]) {
            setHeaderAccount(accounts[0]);
          }
        } catch(e) {
          console.warn('检查钱包失败', e);
        }
      }
      const session = getLocalSession();
      if (session && session.address && (!headerAccount || session.address.toLowerCase() === headerAccount.toLowerCase())) {
        setIsLoggedIn(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const handleLogin = React.useCallback(async () => {
    try {
      if (!window.ethereum) { alert('请先安装钱包'); return; }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const result = await signLogin(signer);
      if (result?.success) {
        setIsLoggedIn(true);
      }
    } catch(e) {
      console.error('登录失败', e);
    }
  }, []);
  const handleLogout = React.useCallback(() => {
    try { signLogout(); } catch {}
    setIsLoggedIn(false);
  }, []);

  const walletState = {
    account: headerAccount,
    connect: headerConnect,
    loading: headerLoading
  };
  const authState = {
    isLoggedIn,
    onLogin: handleLogin,
    onLogout: handleLogout
  };

  const goInventory = React.useCallback(() => { setShowLanding(false); setShowMarket(false); setShowInventory(true); }, []);
  const goMarket = React.useCallback(() => { setShowLanding(false); setShowInventory(false); setShowMarket(true); }, []);

  return (
    <div>
      {showLanding ? (
        <LandingPage 
          onEnterApp={() => setShowLanding(false)}
          walletState={walletState}
          onOpenHelp={() => setHelpOpen(true)}
          authState={authState}
          onGoInventory={goInventory}
          onGoMarket={goMarket}
        />
      ) : (
        <div>
          <AppHeader 
            onBackToHome={() => { setShowLanding(true); setShowInventory(false); setShowMarket(false); }}
            selectedApp={undefined}
            setSelectedApp={undefined}
            showAppSwitcher={!showInventory && !showMarket}
            account={walletState.account}
            connect={walletState.connect}
            loading={walletState.loading}
            onOpenHelp={() => setHelpOpen(true)}
            isLoggedIn={authState.isLoggedIn}
            onLogin={authState.onLogin}
            onLogout={authState.onLogout}
            onGoInventory={goInventory}
            onGoMarket={goMarket}
          />
          <div className="main-content">
            {showInventory ? (
              <InventoryPage account={walletState.account} onBackToApp={() => { setShowInventory(false); }} />
            ) : showMarket ? (
              <MarketPage account={walletState.account} onBack={() => { setShowMarket(false); }} />
            ) : (
              <AppSelector 
                onBackToHome={() => setShowLanding(true)}
                walletState={walletState}
                onOpenHelp={() => setHelpOpen(true)}
                authState={authState}
                onGoInventory={goInventory}
              />
            )}
          </div>
        </div>
      )}

      {helpOpen && (
        <HelpCenter onClose={() => setHelpOpen(false)} />
      )}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<Root />);