const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();
const hre = require('hardhat');
const { ethers } = hre;

// Default allowlist file path (reuses frontend data source)
const DEFAULT_ALLOWLIST_PATH = path.join(__dirname, '..', 'frontend', 'public', 'allowlist.json');

function parseCliArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        const k = a.slice(2, eq);
        const v = a.slice(eq + 1);
        out[k] = v;
      } else {
        const k = a.slice(2);
        const next = args[i + 1];
        if (next && !next.startsWith('--')) {
          out[k] = next;
          i++;
        } else {
          out[k] = true; // boolean flag
        }
      }
    }
  }
  return out;
}

function ensureHex32(root) {
  if (typeof root !== 'string') return false;
  if (!root.startsWith('0x')) return false;
  return root.length === 66; // 0x + 64 hex chars
}

function toAddressArrayFromFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Allowlist 文件不存在: ${filePath}`);
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  let arr;
  try {
    arr = JSON.parse(raw);
  } catch (e) {
    throw new Error(`解析 JSON 失败: ${e.message}`);
  }
  if (!Array.isArray(arr)) {
    throw new Error('allowlist.json 必须是地址数组，例如: ["0xabc...","0xdef..."]');
  }
  return arr;
}

function normalizeAddresses(arr) {
  return arr
    .map((a) => (typeof a === 'string' ? a.trim() : ''))
    .filter(Boolean);
}

function computeMerkleRoot(addresses) {
  // Lazy import merkletreejs to avoid requiring it if --root is provided
  const { MerkleTree } = require('merkletreejs');
  const leaves = addresses.map((addr) => ethers.keccak256(ethers.solidityPacked(['address'], [addr])));
  const hashFn = (data) => ethers.keccak256(data);
  const tree = new MerkleTree(leaves, hashFn, { sortPairs: true });
  return tree.getHexRoot();
}

async function askConfirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (ans) => {
      rl.close();
      resolve(/^y(es)?$/i.test(ans.trim()));
    });
  });
}

async function main() {
  const args = parseCliArgs();
  const dryRun = !!(args.dryRun || args['dry-run']);
  const network = hre.network.name;

  // 1) Resolve contract address
  const CONTRACT_ADDRESS = args.contract || process.env.CONTRACT_ADDRESS || '';
  if (!CONTRACT_ADDRESS && !dryRun) {
    console.log('请通过 --contract 或环境变量 CONTRACT_ADDRESS 提供合约地址');
    console.log('示例: CONTRACT_ADDRESS=0xYourContract npx hardhat run scripts/set-merkle-root.js --network sepolia');
    process.exit(1);
  }

  // 2) Resolve target root
  let targetRoot = args.root || process.env.MERKLE_ROOT;

  if (!targetRoot) {
    // Priority: --file path -> default allowlist.json -> --addresses
    let addrs = [];
    if (args.file) {
      addrs = normalizeAddresses(toAddressArrayFromFile(path.resolve(args.file)));
    } else if (fs.existsSync(DEFAULT_ALLOWLIST_PATH)) {
      addrs = normalizeAddresses(toAddressArrayFromFile(DEFAULT_ALLOWLIST_PATH));
    } else if (args.addresses) {
      addrs = normalizeAddresses(String(args.addresses).split(',').map((s) => s.trim()));
    }

    if (!addrs || addrs.length === 0) {
      console.log('未提供 --root 且未找到白名单地址。请使用以下任一方式:');
      console.log('  1) --root 0x... 或设置环境变量 MERKLE_ROOT=0x...');
      console.log('  2) --file path/to/allowlist.json     从 JSON 地址数组计算 Root');
      console.log('  3) --addresses 0xabc,0xdef,...       从逗号分隔地址计算 Root');
      console.log(`  4) 将白名单写入默认文件: ${DEFAULT_ALLOWLIST_PATH}`);
      process.exit(1);
    }

    targetRoot = computeMerkleRoot(addrs);
  }

  if (!ensureHex32(targetRoot)) {
    throw new Error('提供的 root 非合法 bytes32 值，应为 0x 开头的 64 位十六进制字符串');
  }

  // Early dry-run: print and exit without any RPC calls
  if (dryRun) {
    console.log('\n🔧 网络:', network);
    console.log('📍 合约地址:', CONTRACT_ADDRESS || '(dry-run，无需)');
    console.log('🎯 计算得到的 Merkle Root:', targetRoot);
    console.log('🔎 Dry-run: 不访问网络，不发送交易。');
    return;
  }

  console.log('\n🔧 网络:', network);
  console.log('📍 合约地址:', CONTRACT_ADDRESS);
  console.log('🎯 待设置的 Merkle Root:', targetRoot);

  // 3) Read current on-chain root
  const MyNFT = await hre.ethers.getContractFactory('MyNFT');
  const contract = MyNFT.attach(CONTRACT_ADDRESS);

  const currentRoot = await contract.merkleRoot();
  console.log('📊 当前链上 Merkle Root:', currentRoot);

  if (currentRoot && currentRoot.toLowerCase() === targetRoot.toLowerCase()) {
    console.log('✅ 目标 Root 与链上一致，无需更新。');
    return;
  }

  // 5) Confirm
  const autoYes = !!(args.y || args.Y || args.yes || /^(1|true)$/i.test(String(process.env.AUTO_YES || '')));
  if (!autoYes) {
    const confirmed = await askConfirm('⚠️ 将调用 setMerkleRoot 更新链上值，确定继续吗？(y/N) ');
    if (!confirmed) {
      console.log('已取消。');
      return;
    }
  }

  // 6) Send tx
  const [signer] = await hre.ethers.getSigners();
  console.log('🧾 交易发送者:', signer.address);
  const withSigner = contract.connect(signer);

  console.log('⏳ 正在发送交易 setMerkleRoot...');
  const tx = await withSigner.setMerkleRoot(targetRoot);
  console.log('⛓️ 交易哈希:', tx.hash);
  const receipt = await tx.wait();

  if (receipt.status === 1) {
    console.log('✅ setMerkleRoot 成功!');
    const afterRoot = await contract.merkleRoot();
    console.log('🔁 更新后的 Merkle Root:', afterRoot);
  } else {
    console.log('❌ 交易失败');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('执行失败:', err.message || err);
  process.exit(1);
});