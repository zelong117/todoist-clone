import { useState, useCallback, useRef } from 'react';
import { useStore } from '../store';
import { Sparkles, X, Copy, Check, RefreshCw, Wand2, Target, Image as ImageIcon, Settings } from 'lucide-react';
import DraggableWidget from './DraggableWidget';

type TabMode = 'optimize' | 'goals' | 'settings';

export default function AIOrganizer() {
  const { tasks, projects, sections } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<TabMode>('optimize');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [inputText, setInputText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const dragMovedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Key 配置（存 localStorage）
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('ai_api_key') || '');
  const [apiUrl, setApiUrl] = useState(() => localStorage.getItem('ai_api_url') || '');
  const [apiModel, setApiModel] = useState(() => localStorage.getItem('ai_model') || 'gpt-4o-mini');
  const [keySaved, setKeySaved] = useState(false);

  const saveKeyConfig = () => {
    localStorage.setItem('ai_api_key', apiKey);
    localStorage.setItem('ai_api_url', apiUrl);
    localStorage.setItem('ai_model', apiModel);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const hasApiKey = !!(localStorage.getItem('ai_api_key'));

  // 文字优化
  const handleOptimize = useCallback(async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setLoadingMsg('正在优化文字...');
    setResult('');
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}:3001/api/ai/optimize-text`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          tasks,
          projects,
          clientApiKey: apiKey || undefined,
          clientApiUrl: apiUrl || undefined,
          clientModel: apiModel || undefined,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
      } else {
        setResult('优化失败，请重试。');
      }
    } catch {
      setResult('网络错误，请检查后端是否运行。');
    }
    setLoading(false);
  }, [inputText, tasks, projects]);

  // 图片提取任务
  const handleExtractImage = useCallback(async () => {
    if (!imageData) return;
    setLoading(true);
    setLoadingMsg('正在识别图片内容...');
    setResult('');
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}:3001/api/ai/extract-image`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData,
          clientApiKey: apiKey || undefined,
          clientApiUrl: apiUrl || undefined,
          clientModel: apiModel || undefined,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
      } else {
        setResult('识别失败，请重试。');
      }
    } catch {
      setResult('网络错误，请检查后端是否运行。');
    }
    setLoading(false);
  }, [imageData]);

  // 处理图片文件
  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImagePreview(dataUrl);
      setImageData(dataUrl);
      setResult('');
    };
    reader.readAsDataURL(file);
  }, []);

  // 粘贴图片
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  }, [handleImageFile]);

  // 目标分析
  const handleAnalyze = useCallback(async () => {
    setLoading(true);
    setLoadingMsg('正在分析任务数据...');
    setResult('');
    try {
      const apiUrl = `${window.location.protocol}//${window.location.hostname}:3001/api/ai/organize`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks,
          projects,
          sections,
          clientApiKey: apiKey || undefined,
          clientApiUrl: apiUrl || undefined,
          clientModel: apiModel || undefined,
        }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
      } else {
        setResult('分析失败，请重试。');
      }
    } catch {
      setResult('网络错误，请检查后端是否运行。');
    }
    setLoading(false);
  }, [tasks, projects, sections]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderMarkdown = (md: string) => {
    return md
      .split('\n')
      .map((line) => {
        if (line.startsWith('# ')) return `<h1 class="text-xl font-bold text-[var(--text-primary)] mb-3">${line.slice(2)}</h1>`;
        if (line.startsWith('## ')) return `<h2 class="text-lg font-semibold text-[var(--text-primary)] mt-5 mb-2 pb-1 border-b border-[var(--border-light)]">${line.slice(3)}</h2>`;
        if (line.startsWith('### ')) return `<h3 class="text-base font-semibold text-[var(--text-secondary)] mt-3 mb-1">${line.slice(4)}</h3>`;
        if (line.startsWith('- ')) {
          const text = line.slice(2)
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
            .replace(/`(.*?)`/g, '<code class="text-xs bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-light)]">$1</code>');
          return `<div class="flex items-start gap-2 py-0.5 ml-2"><span class="text-[var(--accent-primary)] mt-0.5">•</span><span class="text-[var(--text-secondary)]">${text}</span></div>`;
        }
        if (line.trim() === '') return '<div class="h-2"></div>';
        const text = line
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[var(--text-primary)]">$1</strong>')
          .replace(/`(.*?)`/g, '<code class="text-xs bg-[var(--bg-card)] px-1.5 py-0.5 rounded border border-[var(--border-light)]">$1</code>');
        return `<p class="text-sm text-[var(--text-secondary)] py-0.5">${text}</p>`;
      })
      .join('');
  };

  return (
    <>
      {/* 可拖动浮动按钮 */}
      <DraggableWidget initialRight={24} initialBottom={80} zIndex={50} onMoved={(moved) => { dragMovedRef.current = moved; }}>
        <button
          onClick={() => { if (!dragMovedRef.current) setIsOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Sparkles size={16} />
          AI 助手
        </button>
      </DraggableWidget>

      {/* 弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[700px] max-h-[80vh] bg-[var(--bg-primary)] rounded-2xl shadow-2xl border border-[var(--border-light)] flex flex-col overflow-hidden">
            {/* 头部 + Tab */}
            <div className="px-6 pt-4 pb-0 border-b border-[var(--border-light)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">AI 助手</h2>
                    <p className="text-xs text-[var(--text-tertiary)]">{tab === 'optimize' ? '把杂乱的文字整理成清晰描述' : '根据任务分析核心目标和排期'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {result && (
                    <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors">
                      {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      {copied ? '已复制' : '复制'}
                    </button>
                  )}
                  <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tab 切换 */}
              <div className="flex gap-1">
                <button
                  onClick={() => { setTab('optimize'); setResult(''); }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                    tab === 'optimize'
                      ? 'text-purple-500 border-purple-500'
                      : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <Wand2 size={14} />
                  文字优化
                </button>
                <button
                  onClick={() => { setTab('goals'); setResult(''); }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                    tab === 'goals'
                      ? 'text-blue-500 border-blue-500'
                      : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <Target size={14} />
                  目标分析
                </button>
                <button
                  onClick={() => setTab('settings')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all ml-auto ${
                    tab === 'settings'
                      ? 'text-gray-500 border-gray-500'
                      : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <Settings size={14} />
                  设置
                  {hasApiKey && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
                </button>
              </div>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* 文字优化 Tab */}
              {tab === 'optimize' && (
                <div className="space-y-3" onPaste={handlePaste}>
                  {/* 图片粘贴/上传区 */}
                  {imagePreview ? (
                    <div className="relative rounded-xl border border-[var(--border-light)] overflow-hidden">
                      <img src={imagePreview} alt="粘贴的图片" className="w-full max-h-48 object-contain bg-[var(--bg-card)]" />
                      <button
                        onClick={() => { setImagePreview(null); setImageData(null); }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('ring-2', 'ring-purple-500/40'); }}
                      onDragLeave={(e) => { e.currentTarget.classList.remove('ring-2', 'ring-purple-500/40'); }}
                      onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('ring-2', 'ring-purple-500/40'); if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-[var(--border-light)] cursor-pointer hover:border-purple-500/40 hover:bg-purple-500/5 transition-all"
                    >
                      <ImageIcon size={18} className="text-purple-500" />
                      <div className="flex-1">
                        <div className="text-sm text-[var(--text-secondary)]">截图粘贴 / 点击上传 / 拖拽图片</div>
                        <div className="text-xs text-[var(--text-tertiary)]">Ctrl+V 粘贴截图，AI 自动识别任务</div>
                      </div>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); }}
                  />

                  {/* 文字输入框 */}
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="或者输入文字描述，AI 帮你整理成清晰明了的话语..."
                    className="w-full h-28 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none"
                  />

                  {/* 操作按钮 */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleOptimize}
                      disabled={loading || !inputText.trim()}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      <Wand2 size={14} />
                      {loading ? '处理中...' : '优化文字'}
                    </button>
                    {imageData && (
                      <button
                        onClick={handleExtractImage}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-teal-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        <ImageIcon size={14} />
                        {loading ? '识别中...' : '识别图片'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 目标分析 Tab */}
              {tab === 'goals' && !result && !loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                    <Target size={28} className="text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">分析你的任务，提炼核心目标</div>
                    <div className="text-xs text-[var(--text-tertiary)]">共 {tasks.length} 个任务 · {projects.length} 个项目</div>
                  </div>
                  <button
                    onClick={handleAnalyze}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Target size={14} />
                    开始分析
                  </button>
                </div>
              )}

              {/* 设置 Tab */}
              {tab === 'settings' && (
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">API Key</label>
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-... 或你的 API Key"
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">API 地址（可选，默认 OpenAI）</label>
                    <input
                      type="text"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://api.openai.com/v1/chat/completions"
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">支持 OpenAI / DeepSeek / 其他兼容接口</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">模型名称</label>
                    <input
                      type="text"
                      value={apiModel}
                      onChange={(e) => setApiModel(e.target.value)}
                      placeholder="gpt-4o-mini"
                      className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">推荐：gpt-4o-mini / deepseek-chat / glm-4-flash</p>
                  </div>
                  <button
                    onClick={saveKeyConfig}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {keySaved ? <Check size={14} /> : <Settings size={14} />}
                    {keySaved ? '已保存' : '保存配置'}
                  </button>
                  {!hasApiKey && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs">
                      💡 配置 API Key 后，文字优化、图片识别、目标分析都将使用 AI 智能处理。不配置则使用本地规则引擎（功能有限）。
                    </div>
                  )}
                </div>
              )}

              {/* 加载中 */}
              {loading && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center animate-pulse">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">{loadingMsg || (tab === 'optimize' ? '正在优化文字...' : '正在分析任务数据...')}</div>
                </div>
              )}

              {/* 结果 */}
              {result && !loading && (
                <>
                  {tab === 'goals' && (
                    <button
                      onClick={handleAnalyze}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors mb-3"
                    >
                      <RefreshCw size={14} />
                      重新分析
                    </button>
                  )}
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
                  />
                </>
              )}
            </div>

            {/* 底部 */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-light)] bg-[var(--bg-secondary)]">
              <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                <span>📋 {tasks.filter(t => !t.isCompleted).length} 待完成</span>
                <span>✅ {tasks.filter(t => t.isCompleted).length} 已完成</span>
                <span>📁 {projects.length} 个项目</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
