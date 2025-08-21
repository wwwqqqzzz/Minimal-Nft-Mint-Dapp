// Lightweight Merkle utilities for browser (sorted pairs)
// Build Merkle root and proof without merkletreejs to avoid Node polyfills
import { ethers } from 'ethers';

function toLowerHex32(h) {
  if (!h) return h;
  let x = h.toString();
  if (!x.startsWith('0x')) x = '0x' + x;
  return x.toLowerCase();
}

function hashPair(a, b, sortPairs = true) {
  let left = toLowerHex32(a);
  let right = toLowerHex32(b);
  if (sortPairs && right < left) {
    const t = left; left = right; right = t;
  }
  const bytes = ethers.concat([ethers.getBytes(left), ethers.getBytes(right)]);
  return ethers.keccak256(bytes);
}

function buildLevels(leavesInput, sortPairs = true) {
  const leaves = (leavesInput || []).map(toLowerHex32);
  if (leaves.length === 0) return { levels: [['0x']] };
  let level = leaves.slice();
  const levels = [level];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = (i + 1 < level.length) ? level[i + 1] : level[i]; // duplicate last if odd
      next.push(hashPair(left, right, sortPairs));
    }
    level = next;
    levels.push(level);
  }
  return { levels };
}

export function getMerkleRoot(leavesInput, sortPairs = true) {
  const { levels } = buildLevels(leavesInput, sortPairs);
  const top = levels[levels.length - 1];
  return top && top[0] ? toLowerHex32(top[0]) : '0x';
}

export function getMerkleProof(leavesInput, targetLeaf, sortPairs = true) {
  const leaves = (leavesInput || []).map(toLowerHex32);
  const leaf = toLowerHex32(targetLeaf);
  if (leaves.length === 0) return [];
  let idx = leaves.indexOf(leaf);
  if (idx === -1) return [];

  let level = leaves.slice();
  const proof = [];
  while (level.length > 1) {
    const isRightNode = (idx % 2) === 1;
    const pairIndex = isRightNode ? idx - 1 : idx + 1;
    const sibling = pairIndex < level.length ? level[pairIndex] : level[idx]; // duplicate last if needed
    proof.push(toLowerHex32(sibling));

    // build next level once per iteration
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = (i + 1 < level.length) ? level[i + 1] : level[i];
      next.push(hashPair(left, right, sortPairs));
    }
    level = next;
    idx = Math.floor(idx / 2);
  }
  return proof;
}

export function getProofAndRoot(leavesInput, targetLeaf, sortPairs = true) {
  const proof = getMerkleProof(leavesInput, targetLeaf, sortPairs);
  const root = getMerkleRoot(leavesInput, sortPairs);
  return { proof, root };
}