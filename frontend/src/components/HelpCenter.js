import React, { useState } from 'react';
import './HelpCenter.css';

const HELP_SECTIONS = {
  'quick-start': {
    title: '🚀 快速开始',
    content: [
      {
        question: '如何开始铸造 NFT？',
        answer: '1. 点击"连接钱包"按钮连接 MetaMask\n2. 确保钱包有足够的 ETH 用于 Gas 费\n3. 选择铸造模式（原版铸造 或 可选择铸造）\n4. 上传图片或选择模板\n5. 点击"铸造 NFT"完成铸造'
      },
      {
        question: '支持哪些钱包？',
        answer: '目前支持 MetaMask 钱包。请确保已安装 MetaMask 浏览器扩展。'
      },
      {
        question: '支持哪些网络？',
        answer: '支持以太坊主网、Sepolia 测试网、Polygon 等多个网络。可在钱包中切换网络。'
      }
    ]
  },
  'faq': {
    title: '❓ 常见问题',
    content: [
      {
        question: '铸造失败怎么办？',
        answer: '1. 检查钱包余额是否足够支付 Gas 费\n2. 确认网络连接正常\n3. 尝试刷新页面重新连接钱包\n4. 如果持续失败，请检查 MetaMask 设置'
      },
      {
        question: 'Gas 费用太高？',
        answer: '1. 选择"慢速"Gas 档位降低费用\n2. 在网络拥堵较少时铸造\n3. 考虑使用 Layer 2 网络（如 Polygon）'
      },
      {
        question: '铸造的 NFT 在哪里查看？',
        answer: '1. 铸造成功后会显示交易哈希\n2. 可在 OpenSea 等 NFT 市场查看\n3. 在钱包的 NFT 页签中查看\n4. 使用区块链浏览器查询交易'
      },
      {
        question: '可以铸造多少个 NFT？',
        answer: '每个地址的铸造限制取决于智能合约设置。通常单次可铸造 1-10 个，总量根据项目而定。'
      }
    ]
  },
  'troubleshooting': {
    title: '🔧 故障排查',
    content: [
      {
        question: '连接钱包失败',
        answer: '1. 确认已安装 MetaMask 扩展\n2. 刷新页面重试\n3. 检查 MetaMask 是否已解锁\n4. 尝试切换浏览器或清除缓存'
      },
      {
        question: '交易一直pending',
        answer: '1. 在 MetaMask 中查看交易状态\n2. 如果卡住可尝试加速交易\n3. 等待网络拥堵缓解\n4. 必要时取消交易重新发起'
      },
      {
        question: '图片上传失败',
        answer: '1. 检查图片格式（支持 JPG, PNG, GIF）\n2. 确认图片大小不超过 10MB\n3. 检查网络连接\n4. 尝试使用不同的图片'
      }
    ]
  },
  'terms': {
    title: '⚠️ 风险提示',
    content: [
      {
        question: 'NFT 基础知识',
        answer: 'NFT（非同质化代币）是区块链上的唯一数字资产。每个 NFT 都有独特的标识符，不可互换。'
      },
      {
        question: '投资风险',
        answer: '⚠️ NFT 投资存在风险：\n• 价格波动性大\n• 流动性可能不足\n• 技术风险（智能合约漏洞）\n• 监管风险\n请理性投资，谨慎决策。'
      },
      {
        question: 'Gas 费说明',
        answer: 'Gas 费是区块链网络的交易手续费，由网络拥堵程度决定。选择较低的 Gas 价格可能导致交易延迟。'
      },
      {
        question: '版权声明',
        answer: '请确保上传的内容拥有合法版权或使用权。不得上传侵犯他人知识产权的内容。'
      }
    ]
  }
};

const HelpCenter = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState('quick-start');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const currentSection = HELP_SECTIONS[activeSection];
  
  // 搜索过滤
  const filteredContent = currentSection.content.filter(item =>
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="help-overlay">
      <div className="help-modal">
        <div className="help-header">
          <h2 className="help-title">📚 帮助中心</h2>
          <button className="help-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="help-content">
          {/* 左侧导航 */}
          <div className="help-sidebar">
            <div className="help-search">
              <input
                type="text"
                placeholder="🔍 搜索帮助内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="help-search-input"
              />
            </div>

            <nav className="help-nav">
              {Object.entries(HELP_SECTIONS).map(([key, section]) => (
                <button
                  key={key}
                  className={`help-nav-item ${activeSection === key ? 'active' : ''}`}
                  onClick={() => setActiveSection(key)}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="help-main">
            <div className="help-section">
              <h3 className="help-section-title">{currentSection.title}</h3>
              
              {filteredContent.length === 0 ? (
                <div className="help-no-results">
                  <p>未找到相关内容</p>
                  <p>请尝试其他关键词或选择不同的帮助分类</p>
                </div>
              ) : (
                <div className="help-items">
                  {filteredContent.map((item, index) => (
                    <div key={index} className="help-item">
                      <h4 className="help-question">{item.question}</h4>
                      <div className="help-answer">
                        {item.answer.split('\n').map((line, lineIndex) => (
                          <div key={lineIndex} className="help-answer-line">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 底部链接 */}
            <div className="help-footer">
              <div className="help-links">
                <span className="help-footer-text">需要更多帮助？</span>
                <a 
                  href="https://github.com/your-repo/issues" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="help-link"
                >
                  📝 提交问题
                </a>
                <a 
                  href="https://discord.gg/your-discord" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="help-link"
                >
                  💬 加入社区
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;