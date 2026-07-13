import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { Sparkles, X, Copy, Check, RefreshCw } from 'lucide-react';

export default function AIOrganizer() {
  const { tasks, projects, sections } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleOrganize = useCallback(async () => {
    setLoading(true);
    setResult('');
    try {
      const res = await fetch('/api/ai/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks, projects, sections }),
      });
      const data = await res.json();
      if (data.result) {
        setResult(data.result);
      } else {
        setResult('整理失败，请重试。');
      }
    } catch (err) {
      setResult('网络错误，请检查后端是否运行。');
    }
    setLoading(false);
  }, [tasks, projects, sections]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Markdown 转简单 HTML
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
      {/* 浮动按钮 */}
      <button
        onClick={() => { setIsOpen(true); if (!result) handleOrganize(); }}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
      >
        <Sparkles size={16} />
        AI 整理
      </button>

      {/* 弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[700px] max-h-[80vh] bg-[var(--bg-primary)] rounded-2xl shadow-2xl border border-[var(--border-light)] flex flex-col overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-light)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">AI 任务整理</h2>
                  <p className="text-xs text-[var(--text-tertiary)]">自动分析你的目标和任务，生成清晰的执行计划</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result && (
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors"
                  >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {copied ? '已复制' : '复制'}
                  </button>
                )}
                <button
                  onClick={handleOrganize}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  重新整理
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center animate-pulse">
                    <Sparkles size={24} className="text-white" />
                  </div>
                  <div className="text-sm text-[var(--text-secondary)]">正在分析你的任务数据...</div>
                  <div className="text-xs text-[var(--text-tertiary)]">共 {tasks.length} 个任务 · {projects.length} 个项目</div>
                </div>
              ) : result ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(result) }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="text-4xl">🎯</div>
                  <div className="text-sm text-[var(--text-secondary)]">点击「重新整理」开始分析</div>
                </div>
              )}
            </div>

            {/* 底部统计 */}
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
