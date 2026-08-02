const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getUserPlan } = require('../services/plans');
const { queryAll } = require('../db');
const { mapProject, mapTask } = require('../utils');
const { logActivity } = require('../domain');

const IMAGE_DATA_URL_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/i;
const MAX_IMAGE_DATA_URL_BYTES = 5 * 1024 * 1024;

function isSupportedImageData(image) {
  return typeof image === 'string' && image.length <= MAX_IMAGE_DATA_URL_BYTES && IMAGE_DATA_URL_PATTERN.test(image);
}

// Meter successful AI operations without persisting prompts, task snapshots, or image bytes.
router.use((req, res, next) => {
  res.on('finish', () => {
    if (req.method === 'POST' && req.user?.id && res.locals.aiMetered !== false && res.statusCode >= 200 && res.statusCode < 300) {
      logActivity(req.user.id, 'ai_usage', 'ai', req.path, `AI ${req.path} completed`);
    }
  });
  next();
});

// 检查用户套餐是否为商务版
function hasHostedAiAccess(userId) {
  const user = getUserPlan(userId);
  return Boolean(user?.entitlement?.hostedAi);
}

// 获取 AI 配置（服务器端或客户端）
const ALLOWED_AI_ENDPOINTS = new Set([
  'https://openrouter.ai/api/v1/chat/completions',
  'https://api.openai.com/v1/chat/completions',
]);

function getAIConfig() {
  const configuredUrl = process.env.AI_API_URL || 'https://openrouter.ai/api/v1/chat/completions';
  const apiUrl = ALLOWED_AI_ENDPOINTS.has(configuredUrl)
    ? configuredUrl
    : 'https://openrouter.ai/api/v1/chat/completions';
  return {
    apiKey: process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '',
    apiUrl,
    model: process.env.AI_MODEL || 'openai/gpt-4o-mini',
  };
}

// POST /api/ai/extract-image - 从图片提取任务描述（商务版）
router.post('/extract-image', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image || !isSupportedImageData(image)) {
      return res.status(400).json({ error: '需要提供图片数据' });
    }

    if (image.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: '图片太大，请小于 5MB' });
    }

    const config = getAIConfig();
    const canUseAI = config.apiKey && hasHostedAiAccess(req.user.id);

    if (!canUseAI) {
      res.locals.aiMetered = false;
      return res.json({
        result: '## ⚠️ 图片识别需要商务版\n\n免费版不支持 AI 图片识别功能。\n\n请在管理后台升级到商务版后使用。',
        mode: 'blocked'
      });
    }

    let aiResult = null;

    if (config.apiKey) {
      try {
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: '请仔细识别这张图片中的所有文字内容，提取出其中的任务、目标、待办事项。用清晰的格式输出，每个任务一行。如果图片中没有明确的任务信息，请描述图片主要内容。' },
                { type: 'image_url', image_url: { url: image } }
              ]
            }],
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });
        const data = await response.json();
        aiResult = data.choices?.[0]?.message?.content;
      } catch (e) {
        console.error('AI Vision API error:', e.message);
      }
    }

    // 没有 API Key 时返回提示
    if (!aiResult) {
      aiResult = `## ⚠️ 需要 AI API Key 才能识别图片\n\n当前没有配置 AI API，无法识别图片内容。\n\n### 配置方法\n在 \`server/.env\` 中添加：\n\`\`\`\nOPENAI_API_KEY=你的key\n# 或\nAI_API_URL=你的AI接口地址\nAI_API_KEY=你的key\nAI_VISION_MODEL=支持视觉的模型\n\`\`\`\n\n### 临时方案\n请手动输入文字描述，使用「文字优化」功能整理。`;
    }

    res.json({ result: aiResult });
  } catch (error) {
    console.error('AI extract-image error:', error);
    res.status(500).json({ error: '图片识别失败' });
  }
});

// POST /api/ai/optimize-text - 文字优化
router.post('/optimize-text', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '需要提供文字内容' });
    }

    const config = getAIConfig();
    const canUseAI = config.apiKey && hasHostedAiAccess(req.user.id);

    if (canUseAI) {
      // 商务版：用 AI API 智能优化
      let aiResult = null;
      const prompt = `你是一个文字优化助手。请把下面这段杂乱的描述整理成清晰明了的话语，保持原意不变，语言简洁专业。

原始描述：
${text}

请直接输出优化后的文字，不要加额外说明。`;

      try {
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 1000,
          }),
        });
        const data = await response.json();
        aiResult = data.choices?.[0]?.message?.content;
      } catch (e) {
        console.error('AI API error:', e.message);
      }
      if (!aiResult) {
        // AI 调用失败，降级到本地规则
        aiResult = optimizeTextLocal(text);
      }
      res.json({ result: aiResult, mode: 'ai' });
    } else {
      // 免费版：本地规则引擎
      res.json({ result: optimizeTextLocal(text), mode: 'local' });
    }
  } catch (error) {
    console.error('AI optimize-text error:', error);
    res.status(500).json({ error: '文字优化失败' });
  }
});

// 本地文字优化
function optimizeTextLocal(text) {
  let result = text.trim();

  // 1. 去除多余空格和换行
  result = result.replace(/\s+/g, ' ');
  // 2. 去除重复标点
  result = result.replace(/([，。！？、,])\1+/g, '$1');
  result = result.replace(/[，。]$/g, '');

  // 3. 去除口语化废话
  const fillers = ['就是说', '然后的话', '这样子', '就是说啊', '然后呢', '就是', '那个', '嗯', '啊', '吧', '的话', '其实', '反正', '差不多', '基本上', '总之'];
  fillers.forEach(f => {
    result = result.replace(new RegExp(f, 'g'), '');
  });

  // 4. 修复断句：去掉句中多余逗号
  result = result.replace(/，\s*，/g, '，');
  result = result.replace(/^\s*，\s*/g, '');
  result = result.replace(/\s*，\s*$/g, '');

  // 5. 智能分段：如果有多个独立句子，按句号分段
  const sentences = result.split(/[。！？]/).filter(s => s.trim());
  if (sentences.length > 1) {
    result = sentences.map(s => {
      let trimmed = s.trim().replace(/^[，,\s]+/, '');
      if (trimmed && !/[。！？]$/.test(trimmed)) {
        trimmed += '。';
      }
      return trimmed;
    }).join('\n');
  } else {
    // 单句也整理
    result = result.replace(/\s+/g, ' ').trim();
    if (result && !/[。！？.!?]$/.test(result)) {
      result += '。';
    }
  }

  // 6. 首字母大写（英文）
  result = result.replace(/^([a-z])/, (m, c) => c.toUpperCase());

  return result;
}

// POST /api/ai/organize - AI 整理目标和任务
router.post('/organize', async (req, res) => {
  try {
    // Context is service-owned. Client snapshots must never decide what data the AI sees.
    const tasks = queryAll('SELECT * FROM tasks WHERE user_id = ? ORDER BY sort_order, created_at DESC', [req.user.id]).map(mapTask);
    const projects = queryAll('SELECT * FROM projects WHERE user_id = ? ORDER BY sort_order, created_at DESC', [req.user.id]).map(mapProject);
    const sections = queryAll('SELECT id, project_id, name FROM sections WHERE user_id = ? ORDER BY sort_order', [req.user.id])
      .map((section) => ({ id: section.id, projectId: section.project_id, name: section.name }));

    // 构建 prompt
    const taskList = tasks.map(t => {
      const project = projects?.find(p => p.id === t.projectId);
      const section = sections?.find(s => s.id === t.sectionId);
      return `- [${t.isCompleted ? '✅' : '⬜'}] ${t.title} | 项目: ${project?.name || '未分类'} | 分组: ${section?.name || '无'} | 优先级: ${t.priority || '无'} | 截止: ${t.dueDate || '无'} | 番茄: ${t.completedPomodoros || 0}/${t.pomodoroCount || 0} | 标签: ${(t.labels || []).join(',') || '无'}`;
    }).join('\n');

    const projectList = projects?.map(p => `- ${p.name} (收藏: ${p.isFavorite ? '是' : '否'}, 番茄: ${p.pomodoroEnabled ? '开' : '关'})`).join('\n') || '无';

    const prompt = `你是一个专业的目标管理和任务规划助手。请根据以下用户数据，帮他整理出清晰的目标和任务计划。

## 用户的项目
${projectList}

## 用户的任务
${taskList || '暂无任务'}

## 请输出以下内容（用中文）：

### 🎯 核心目标（从任务中提炼出 3-5 个核心目标）

### 📋 任务整理（按目标分组，每个目标下列出相关任务）

### ⏰ 推荐排期（根据优先级和截止日期，给出今天的执行建议）
- 上午做什么
- 下午做什么
- 需要延后处理的

### 💡 建议（针对任务管理给出 2-3 条改进建议）

请用 Markdown 格式输出，语言简洁明了。`;

    // 检查是否可以用 AI
    const config = getAIConfig();
    const canUseAI = config.apiKey && hasHostedAiAccess(req.user.id);

    if (canUseAI) {
      // 商务版：AI 智能分析
      let aiResult = null;
      try {
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });
        const data = await response.json();
        aiResult = data.choices?.[0]?.message?.content || data.result || data.response;
      } catch (e) {
        console.error('AI API error:', e.message);
      }
      if (aiResult) {
        res.json({ result: aiResult, mode: 'ai' });
      } else {
        res.json({ result: generateLocalAnalysis(tasks, projects, sections), mode: 'local' });
      }
    } else {
      // 免费版：本地规则引擎
      res.json({ result: generateLocalAnalysis(tasks, projects, sections), mode: 'local' });
    }
  } catch (error) {
    console.error('AI organize error:', error);
    res.status(500).json({ error: 'AI 整理失败' });
  }
});

// POST /api/ai/extract-tasks - 从语音/文字/图片提取任务
router.post('/extract-tasks', authenticate, async (req, res) => {
  try {
    const { text, image } = req.body;
    const userId = req.user.id;

    if (image && !isSupportedImageData(image)) {
      return res.status(400).json({ error: 'Only PNG, JPEG, or WebP image data is supported' });
    }

    if (!text && !image) {
      return res.status(400).json({ error: '需要提供文字或图片' });
    }

    const config = getAIConfig();
    const canUseAI = config.apiKey && hasHostedAiAccess(userId);

    if (canUseAI) {
      // 商务版：AI 智能提取
      let prompt = `你是一个任务提取助手。请从以下内容中提取出所有待办任务。

要求：
1. 每个任务一行
2. 返回 JSON 数组格式
3. 每个任务包含：title（标题）、priority（优先级：urgent/high/medium/low）、dueDate（截止日期，YYYY-MM-DD 格式，没有则为空字符串）
4. 保持原始语言（中文就中文，英文就英文）
5. 只返回 JSON，不要其他文字

`;

      const messages = [];

      if (text && image) {
        prompt += `语音/文字内容：\n${text}\n\n请同时分析图片内容，提取其中的任务。`;
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } }
          ]
        });
      } else if (image) {
        prompt += '请从图片中提取所有待办任务。';
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: image } }
          ]
        });
      } else {
        prompt += `内容：\n${text}`;
        messages.push({ role: 'user', content: prompt });
      }

      try {
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages,
            temperature: 0.3,
            max_tokens: 1500,
          }),
        });
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';

        // 尝试解析 JSON
        let tasks = [];
        try {
          // 提取 JSON 部分（可能被 markdown 包裹）
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            tasks = JSON.parse(jsonMatch[0]);
          }
        } catch {}

        if (tasks.length > 0) {
          res.json({ tasks, mode: 'ai' });
        } else {
          // AI 返回了内容但解析失败，用本地规则
          res.json({ tasks: extractTasksLocal(text || ''), mode: 'local' });
        }
      } catch (e) {
        console.error('AI extract-tasks error:', e.message);
        res.json({ tasks: extractTasksLocal(text || ''), mode: 'local' });
      }
    } else {
      // 免费版：本地规则提取
      res.json({ tasks: extractTasksLocal(text || ''), mode: 'local' });
    }
  } catch (error) {
    console.error('Extract tasks error:', error);
    res.status(500).json({ error: '任务提取失败' });
  }
});

// 本地任务提取规则
function extractTasksLocal(text) {
  if (!text.trim()) return [];

  // 按常见分隔符拆分
  const separators = /[，。；\n、,;]/;
  const parts = text.split(separators).filter(s => s.trim().length > 1);

  const tasks = parts.map(part => {
    let title = part.trim();
    let priority = 'medium';
    let dueDate = '';

    // 识别优先级
    if (/紧急|急|马上|立刻|ASAP/i.test(title)) priority = 'urgent';
    else if (/重要|优先|尽快/i.test(title)) priority = 'high';
    else if (/不急|稍后|有空/i.test(title)) priority = 'low';

    // 识别日期
    const today = new Date();
    if (/今天|今日/.test(title)) {
      dueDate = today.toISOString().split('T')[0];
    } else if (/明天|明日/.test(title)) {
      dueDate = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
    } else if (/后天/.test(title)) {
      dueDate = new Date(today.getTime() + 172800000).toISOString().split('T')[0];
    } else if (/周[一二三四五六日天]/.test(title)) {
      const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
      const match = title.match(/周([一二三四五六日天])/);
      if (match) {
        const targetDay = dayMap[match[1]];
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        dueDate = new Date(today.getTime() + daysUntil * 86400000).toISOString().split('T')[0];
      }
    }

    // 清理标题中的日期词
    title = title.replace(/今天|今日|明天|明日|后天|周[一二三四五六日天]|紧急|急|马上|立刻|重要|优先|尽快|不急|稍后|有空/g, '').trim();

    return { title, priority, dueDate };
  }).filter(t => t.title.length > 0);

  return tasks;
}

// GET /api/ai/plan - 查看当前套餐
router.get('/plan', authenticate, async (req, res) => {
  try {
    const user = getUserPlan(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({
      plan: user.plan,
      planExpiresAt: user.plan_expires_at,
      isBusiness: user.plan === 'business',
      entitlement: user.entitlement,
    });
  } catch {
    res.status(500).json({ error: '查询失败' });
  }
});

// 本地规则引擎 - 不需要 API Key 也能用
function generateLocalAnalysis(tasks, projects) {
  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });
  const highPriority = pendingTasks.filter((task) => task.priority <= 2);
  const todayTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    const today = new Date();
    return due.toDateString() === today.toDateString();
  });

  // 按项目分组
  const byProject = {};
  pendingTasks.forEach(t => {
    const pname = projects?.find(p => p.id === t.projectId)?.name || '未分类';
    if (!byProject[pname]) byProject[pname] = [];
    byProject[pname].push(t);
  });

  let result = `# 🎯 AI 任务整理报告\n\n`;

  // 核心目标
  result += `## 🎯 核心目标\n\n`;
  const projectNames = Object.keys(byProject);
  if (projectNames.length > 0) {
    projectNames.forEach((name, i) => {
      const count = byProject[name].length;
      result += `**目标 ${i + 1}：${name}** — 完成 ${count} 个待办任务\n`;
    });
  } else {
    result += `暂无任务数据，请先添加一些任务。\n`;
  }

  // 任务整理
  result += `\n## 📋 任务整理\n\n`;
  projectNames.forEach(name => {
    result += `### ${name}\n`;
    byProject[name].forEach(t => {
      const priority = t.priority === 1 ? '🔴' : t.priority === 2 ? '🟠' : t.priority === 3 ? '🟡' : '🔵';
      const due = t.dueDate ? `截止: ${t.dueDate}` : '无截止日期';
      result += `- ${priority} ${t.title} (${due})\n`;
    });
    result += `\n`;
  });

  // 排期建议
  result += `## ⏰ 推荐排期\n\n`;
  result += `### 上午（高优先级）\n`;
  if (highPriority.length > 0) {
    highPriority.slice(0, 3).forEach(t => {
      result += `- 🔴 ${t.title}\n`;
    });
  } else if (todayTasks.length > 0) {
    todayTasks.slice(0, 3).forEach(t => {
      result += `- ${t.title}\n`;
    });
  } else {
    result += `- 暂无紧急任务\n`;
  }

  result += `\n### 下午（常规任务）\n`;
  const remaining = pendingTasks.filter(t => !highPriority.includes(t) && !todayTasks.includes(t));
  if (remaining.length > 0) {
    remaining.slice(0, 5).forEach(t => {
      result += `- ${t.title}\n`;
    });
  } else {
    result += `- 暂无更多任务\n`;
  }

  if (overdueTasks.length > 0) {
    result += `\n### ⚠️ 需要延后/重新安排\n`;
    overdueTasks.forEach(t => {
      result += `- ⏰ ${t.title} (已过期: ${t.dueDate})\n`;
    });
  }

  // 统计
  result += `\n## 📊 统计概览\n\n`;
  result += `- 待完成: ${pendingTasks.length} 个\n`;
  result += `- 已完成: ${completedTasks.length} 个\n`;
  result += `- 已过期: ${overdueTasks.length} 个\n`;
  result += `- 完成率: ${tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0}%\n`;

  // 建议
  result += `\n## 💡 建议\n\n`;
  if (overdueTasks.length > 0) {
    result += `1. **处理过期任务**：有 ${overdueTasks.length} 个任务已过期，建议优先处理或重新安排日期\n`;
  }
  if (pendingTasks.length > 10) {
    result += `2. **任务过多**：当前有 ${pendingTasks.length} 个待完成任务，建议拆分为更小的子任务\n`;
  }
  if (completedTasks.length > 0 && pendingTasks.length > 0) {
    const rate = Math.round((completedTasks.length / tasks.length) * 100);
    result += `3. **保持节奏**：当前完成率 ${rate}%，${rate >= 50 ? '不错，继续保持！' : '建议加快进度'}\n`;
  }
  if (projectNames.length === 0) {
    result += `1. **开始添加任务**：点击"添加任务"创建你的第一个任务\n`;
  }

  return result;
}

module.exports = router;
