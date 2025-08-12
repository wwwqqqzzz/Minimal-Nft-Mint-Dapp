export function ipfsToHttp(ipfsUrl){
  if(!ipfsUrl) return ipfsUrl;
  if(ipfsUrl.startsWith('ipfs://')){
    return ipfsUrl.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  return ipfsUrl;
}

export function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}