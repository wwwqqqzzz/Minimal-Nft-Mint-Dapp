import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import SelectableApp from './SelectableApp';

// 页面选择器组件
function AppSelector() {
  const [selectedApp, setSelectedApp] = useState('original'); // 'original' | 'selectable'

  return (
    <div>
      {/* 导航切换 */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <button
          onClick={() => setSelectedApp('original')}
          style={{
            padding: '6px 12px',
            marginRight: '8px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: selectedApp === 'original' ? '#2563eb' : '#f8fafc',
            color: selectedApp === 'original' ? 'white' : '#6b7280',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          🎨 原版铸造
        </button>
        <button
          onClick={() => setSelectedApp('selectable')}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: selectedApp === 'selectable' ? '#2563eb' : '#f8fafc',
            color: selectedApp === 'selectable' ? 'white' : '#6b7280',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          🎯 可选择铸造
        </button>
      </div>

      {/* 渲染选中的应用 */}
      {selectedApp === 'original' ? <App /> : <SelectableApp />}
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<AppSelector />);