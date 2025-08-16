export function ipfsToHttp(ipfsUrl){
  if(!ipfsUrl) return ipfsUrl;
  try{
    // 1) 处理 ipfs:// 协议
    if(ipfsUrl.startsWith('ipfs://')){
      const replaced = ipfsUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
      // 若以 /数字 结尾，优先尝试补 .json（不会影响已有 .json 的路径）
      if(/\/[0-9]+$/.test(replaced)){
        return replaced + '.json';
      }
      return replaced;
    }

    // 2) 处理 http(s) 的 IPFS 网关 或 直接 http baseURI
    if(/^https?:\/\//i.test(ipfsUrl)){
      // 如果以 /数字 结尾且没有 .json，补上 .json（适配合约 baseURI=.../ + tokenId 的情况）
      if(/\/[0-9]+$/.test(ipfsUrl) && !/\.json$/i.test(ipfsUrl)){
        return ipfsUrl + '.json';
      }
      return ipfsUrl;
    }
  }catch(e){ /* no-op */ }
  return ipfsUrl;
}

export function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}