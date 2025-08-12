import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import contractJson from './MyNFT.json';
import { shortenAddress } from './utils/ipfs';

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS || '';

function App(){
  const [account, setAccount] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalSupply, setTotalSupply] = useState(0);

  useEffect(() => {
    checkIfWalletConnected();
    checkNetwork();
  }, []);

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
      
      // Sepolia 测试网的 chainId 是 11155111
      if (network.chainId !== 11155111n) {
        setStatus('⚠️ 请切换到 Sepolia 测试网');
        return;
      }
      
      // 如果在正确的网络上，获取总供应量
      await getTotalSupply();
    } catch (error) {
      console.error('检查网络失败:', error);
    }
  }

  async function switchToSepolia() {
    if (!window.ethereum) return;
    try {
      // 尝试切换到 Sepolia 测试网
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
      });
      setStatus('已切换到 Sepolia 测试网');
      await getTotalSupply();
    } catch (switchError) {
      // 如果网络不存在，添加网络
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Test Network',
              nativeCurrency: {
                name: 'SepoliaETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              blockExplorerUrls: ['https://sepolia.etherscan.io/'],
            }],
          });
          setStatus('已添加并切换到 Sepolia 测试网');
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
    } catch (error) {
      console.error('Error getting total supply:', error);
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

  async function mint(){
    if (loading) return;
    
    try{
      if(!window.ethereum) return alert('请安装 MetaMask');
      if(!CONTRACT_ADDRESS) return alert('请在 frontend 的 .env 中设置 REACT_APP_CONTRACT_ADDRESS');
      
      setLoading(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, contractJson.abi, signer);
      
      setStatus('准备发送交易...');
      const tx = await contract.mint();
      setStatus('等待交易确认... ' + tx.hash);
      
      await tx.wait();
      setStatus('铸造成功！交易哈希: ' + tx.hash);
      
      // 更新总供应量
      await getTotalSupply();
      
      // 获取区块链浏览器链接
      const networkName = await provider.getNetwork();
      let explorerUrl = '';
      if (networkName.chainId === 80001n) {
        explorerUrl = `https://mumbai.polygonscan.com/tx/${tx.hash}`;
      } else if (networkName.chainId === 11155111n) {
        explorerUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
      }
      
      alert(`铸造成功！\n交易哈希: ${tx.hash}\n${explorerUrl ? `区块链浏览器: ${explorerUrl}` : ''}`);
      
    } catch(e) {
      console.error(e);
      setStatus('铸造失败: ' + (e.message || e));
      alert('铸造失败: ' + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ 
      padding: 40, 
      fontFamily: 'Arial, sans-serif',
      maxWidth: 600,
      margin: '0 auto',
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 10,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ color: '#333', marginBottom: 10 }}>🖼️ MyNFT — Minimal Mint DApp</h1>
        <p style={{ color: '#666', marginBottom: 20 }}>在测试网上铸造你的第一个 NFT</p>
        
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: 15, 
          borderRadius: 5, 
          marginBottom: 20 
        }}>
          <p><strong>合约地址:</strong> {CONTRACT_ADDRESS ? shortenAddress(CONTRACT_ADDRESS) : '未设置'}</p>
          <p><strong>已铸造总数:</strong> {totalSupply}</p>
          <p><strong>当前账户:</strong> {account ? shortenAddress(account) : '未连接'}</p>
        </div>
        
        <div style={{ marginBottom: 20 }}>
          <button 
            onClick={connect} 
            disabled={loading}
            style={{ 
              padding: '12px 24px',
              marginRight: 10,
              backgroundColor: account ? '#28a745' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 16
            }}
          >
            {account ? `已连接: ${shortenAddress(account)}` : '连接钱包'}
          </button>
          
          {status.includes('请切换到 Sepolia 测试网') && (
            <button 
              onClick={switchToSepolia} 
              disabled={loading}
              style={{ 
                padding: '12px 24px',
                marginRight: 10,
                backgroundColor: '#ffc107',
                color: '#212529',
                border: 'none',
                borderRadius: 5,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 16
              }}
            >
              🔄 切换到 Sepolia
            </button>
          )}
          
          <button 
            onClick={mint} 
            disabled={loading || !account || status.includes('请切换到 Sepolia 测试网')}
            style={{ 
              padding: '12px 24px',
              backgroundColor: loading ? '#6c757d' : '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: 5,
              cursor: (loading || !account || status.includes('请切换到 Sepolia 测试网')) ? 'not-allowed' : 'pointer',
              fontSize: 16
            }}
          >
            {loading ? '铸造中...' : '🎨 铸造 NFT'}
          </button>
        </div>
        
        <div style={{ 
          backgroundColor: '#e9ecef', 
          padding: 15, 
          borderRadius: 5,
          minHeight: 50
        }}>
          <strong>状态:</strong> {status || '准备就绪'}
        </div>
        
        <hr style={{ margin: '20px 0' }} />
        
        <div style={{ fontSize: 14, color: '#666' }}>
          <p>💡 <strong>说明:</strong></p>
          <ul style={{ paddingLeft: 20 }}>
            <li>首次使用请先连接 MetaMask 钱包</li>
            <li>确保钱包切换到 <strong>Sepolia 测试网</strong>（如果显示网络提醒，请点击切换按钮）</li>
            <li>每次铸造会消耗少量测试币作为 Gas 费</li>
            <li>铸造的 NFT 会直接发送到你的钱包地址</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;