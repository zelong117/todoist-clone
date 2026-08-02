import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { showTaskOperationError } from '../utils';
import { aiAPI } from '../api';
import { Mic, MicOff, Image as ImageIcon, X, Sparkles, CheckSquare, Plus } from 'lucide-react';

interface QuickCaptureProps {
  onClose: () => void;
}

interface ExtractedTask {
  title: string;
  priority: string;
  dueDate: string;
  selected: boolean;
}

function toTaskPriority(value: string): 1 | 2 | 3 | 4 {
  if (value === 'urgent') return 1;
  if (value === 'high') return 2;
  if (value === 'low') return 4;
  return 3;
}

export default function QuickCapture({ onClose }: QuickCaptureProps) {
  const { addTask, projects, sections } = useStore();
  const [mode, setMode] = useState<'idle' | 'recording' | 'processing' | 'result'>('idle');
  const [transcript, setTranscript] = useState('');
  const [imageData, setImageData] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [error, setError] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // 初始化语音识别
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError('语音识别出错: ' + event.error);
        }
        setMode('idle');
      };

      recognition.onend = () => {
        if (mode === 'recording') {
          // 自动重新开始录音
          try { recognition.start(); } catch {}
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // 开始/停止录音
  const toggleRecording = useCallback(() => {
    if (mode === 'recording') {
      recognitionRef.current?.stop();
      setMode('idle');
    } else {
      setTranscript('');
      setMode('recording');
      try {
        recognitionRef.current?.start();
      } catch (e) {
        setError('浏览器不支持语音识别，请使用 Chrome');
      }
    }
  }, [mode]);

  // 处理图片
  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageData(dataUrl);
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  // 粘贴处理
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

  // AI 提取任务
  const handleExtract = useCallback(async () => {
    if (!transcript.trim() && !imageData) return;

    // 如果没有选择项目，默认选第一个
    if (!selectedProject && projects.length > 0) {
      setSelectedProject(projects[0].id);
    }

    setMode('processing');
    setError('');

    try {
      const data = await aiAPI.extractTasks(transcript, imageData);

      if (data.tasks && data.tasks.length > 0) {
        setExtractedTasks(data.tasks.map((t: any) => ({
          title: t.title || t,
          priority: t.priority || 'medium',
          dueDate: t.dueDate || '',
          selected: true,
        })));
        setMode('result');
      } else {
        setError('没有识别到任务，请重试');
        setMode('idle');
      }
    } catch (e) {
      setError('网络错误，请检查后端');
      setMode('idle');
    }
  }, [transcript, imageData, projects, selectedProject]);

  // 确认创建任务
  const handleConfirm = useCallback(async () => {
    const tasksToCreate = extractedTasks.filter(t => t.selected);
    const targetProject = selectedProject || projects[0]?.id;
    const targetSection = sections.find(s => s.projectId === targetProject)?.id || '__default__';

    try {
      for (const task of tasksToCreate) {
        await addTask({
        title: task.title,
        description: '',
        projectId: targetProject,
        sectionId: targetSection,
        priority: toTaskPriority(task.priority),
        dueDate: task.dueDate || null,
        labels: [],
        pomodoroCount: 1,
        plannedPomodoros: 1,
        estimatedMinutes: 25,
        isCompleted: false,
        completedPomodoros: 0,
        order: 0,
        parentId: null,
        isRecurring: false,
        recurrenceRule: null,
        completedAt: null,
        });
      }
    } catch (error) {
      showTaskOperationError(error);
      return;
    }

    onClose();
  }, [extractedTasks, selectedProject, projects, sections, addTask, onClose]);

  // 切换任务选中状态
  const toggleTask = (index: number) => {
    setExtractedTasks(prev => prev.map((t, i) =>
      i === index ? { ...t, selected: !t.selected } : t
    ));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm" onPaste={handlePaste}>
      <div className="w-[520px] max-h-[85vh] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <Sparkles size={16} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">快速录入</h2>
              <p className="text-xs text-gray-400">语音 / 截图 / 文字 → AI 自动创建待办</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {mode === 'idle' && (
            <>
              {/* 语音按钮 */}
              <button
                onClick={toggleRecording}
                className="w-full flex items-center justify-center gap-3 py-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center">
                  <Mic size={24} className="text-red-500" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">点击开始语音输入</div>
                  <div className="text-xs text-gray-400">说出你要做的事情，AI 自动整理</div>
                </div>
              </button>

              {/* 图片上传 */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:border-red-300 dark:hover:border-red-700 transition-colors"
              >
                <ImageIcon size={18} className="text-gray-400" />
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">粘贴截图 / 点击上传</div>
                  <div className="text-xs text-gray-400">Ctrl+V 粘贴截图，配合语音一起分析</div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleImageFile(e.target.files[0]); }}
              />

              {/* 图片预览 */}
              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                  <img src={imagePreview} alt="截图" className="w-full max-h-32 object-contain bg-gray-50 dark:bg-gray-800" />
                  <button
                    onClick={() => { setImagePreview(null); setImageData(null); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              {/* 文字输入 */}
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="或者直接输入文字... 例如：明天下午3点开会，周五前交报销单"
                className="w-full h-24 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              />

              {/* 选择项目 */}
              {projects.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">保存到项目</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 提取按钮 */}
              <button
                onClick={handleExtract}
                disabled={!transcript.trim() && !imageData}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Sparkles size={16} />
                AI 提取任务
              </button>
            </>
          )}

          {mode === 'recording' && (
            <div className="flex flex-col items-center py-8 gap-4">
              <button
                onClick={toggleRecording}
                className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center animate-pulse shadow-lg shadow-red-500/30"
              >
                <MicOff size={32} className="text-white" />
              </button>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">正在录音...</div>
              <div className="text-xs text-gray-400">点击停止</div>
              {transcript && (
                <div className="w-full p-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300">
                  {transcript}
                </div>
              )}
            </div>
          )}

          {mode === 'processing' && (
            <div className="flex flex-col items-center py-12 gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center animate-pulse">
                <Sparkles size={24} className="text-white" />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">AI 正在分析你的输入...</div>
            </div>
          )}

          {mode === 'result' && (
            <>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                识别到 {extractedTasks.length} 个任务，点击取消不需要的：
              </div>
              <div className="space-y-2">
                {extractedTasks.map((task, i) => (
                  <div
                    key={i}
                    onClick={() => toggleTask(i)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                      task.selected
                        ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-500/5'
                        : 'border-gray-200 dark:border-gray-700 opacity-50'
                    }`}
                  >
                    <CheckSquare
                      size={18}
                      className={task.selected ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.priority && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            task.priority === 'urgent' ? 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400' :
                            task.priority === 'high' ? 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400' :
                            'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className="text-[10px] text-gray-400">截止: {task.dueDate}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 选择项目 */}
              {projects.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">保存到项目</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => { setMode('idle'); setExtractedTasks([]); }}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  重新输入
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={extractedTasks.filter(t => t.selected).length === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  <Plus size={14} />
                  创建 {extractedTasks.filter(t => t.selected).length} 个任务
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
