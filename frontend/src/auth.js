// auth.js - 本地会话管理工具
import { ethers } from 'ethers';

const AUTH_STORAGE_KEY = 'nft_app_auth';
const SIGNATURE_MESSAGE = 'Welcome to Minimal NFT Mint DApp!\n\nSign this message to authenticate your session.\n\nTimestamp: ';

/**
 * 生成待签名消息
 */
function generateSignMessage(timestamp = Date.now()) {
  return SIGNATURE_MESSAGE + timestamp;
}

/**
 * 获取本地存储的会话
 */
export function getLocalSession() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!stored) return null;
    
    const session = JSON.parse(stored);
    
    // 检查会话是否过期（24小时）
    const now = Date.now();
    const expiry = session.timestamp + (24 * 60 * 60 * 1000); // 24小时
    
    if (now > expiry) {
      clearLocalSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('读取本地会话失败:', error);
    clearLocalSession();
    return null;
  }
}

/**
 * 保存会话到本地存储
 */
export function saveLocalSession(address, signature, timestamp) {
  try {
    const session = {
      address: address.toLowerCase(),
      signature,
      timestamp,
      expiresAt: timestamp + (24 * 60 * 60 * 1000)
    };
    
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    return session;
  } catch (error) {
    console.error('保存本地会话失败:', error);
    return null;
  }
}

/**
 * 清除本地会话
 */
export function clearLocalSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('清除本地会话失败:', error);
  }
}

/**
 * 验证地址是否与当前会话匹配
 */
export function isSessionValid(currentAddress) {
  const session = getLocalSession();
  if (!session || !currentAddress) return false;
  
  return session.address === currentAddress.toLowerCase();
}

/**
 * 执行签名登录
 */
export async function signLogin(signer) {
  try {
    if (!signer) {
      throw new Error('未提供签名器');
    }
    
    const address = await signer.getAddress();
    const timestamp = Date.now();
    const message = generateSignMessage(timestamp);
    
    console.log('请求签名:', message);
    const signature = await signer.signMessage(message);
    
    // 验证签名
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
      throw new Error('签名验证失败');
    }
    
    // 保存到本地
    const session = saveLocalSession(address, signature, timestamp);
    if (!session) {
      throw new Error('保存会话失败');
    }
    
    console.log('签名登录成功:', address);
    return {
      success: true,
      address,
      signature,
      timestamp,
      session
    };
    
  } catch (error) {
    console.error('签名登录失败:', error);
    
    // 用户拒绝签名
    if (error.code === 'ACTION_REJECTED' || error.code === 4001) {
      throw new Error('用户取消签名');
    }
    
    throw error;
  }
}

/**
 * 执行登出
 */
export function signLogout() {
  clearLocalSession();
  console.log('已退出登录');
  return { success: true };
}

/**
 * 检查用户是否已登录
 */
export function checkLoginStatus(currentAddress) {
  if (!currentAddress) return false;
  return isSessionValid(currentAddress);
}