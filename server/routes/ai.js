const express = require('express');
const router = express.Router();

// POST /api/ai/extract-image - 从图片提取任务描述
router.post('/extract-image', async (req, res) => {
  try {
    const { image, clientApiKey, clientApiUrl, clientModel } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: '需要提供图片数据' });
    }

    // 检查图片大小（base64 约 5MB 限制）
    if (image.length > 5 * 1024 * 1024) {
      return res.status(413).json({ error: '图片太大，请小于 5MB' });
    }

    let aiResult = null;

    const effApiKey = clientApiKey || process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    const effApiUrl = clientApiUrl || process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    const effModel = clientModel || process.env.AI_VISION_MODEL || process.env.AI_MODEL || 'gpt-4o-mini';

    // 尝试用 AI 视觉 API
    if (effApiKey) {
      try {
        const response = await fetch(effApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${effApiKey}`,
          },
          body: JSON.stringify({
            model: effModel,
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
    const { text, tasks, projects, clientApiKey, clientApiUrl, clientModel } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: '需要提供文字内容' });
    }

    // 尝试 AI API（优先用前端传来的 Key，其次用 .env 配置）
    let aiResult = null;
    const effApiKey = clientApiKey || process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    const effApiUrl = clientApiUrl || process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    const effModel = clientModel || process.env.AI_MODEL || 'gpt-4o-mini';

    if (effApiKey) {
      const prompt = `你是一个文字优化助手。请把下面这段杂乱的描述整理成清晰明了的话语，保持原意不变，语言简洁专业。

原始描述：
${text}

请直接输出优化后的文字，不要加额外说明。`;

      try {
        const response = await fetch(effApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${effApiKey}`,
          },
          body: JSON.stringify({
            model: effModel,
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
    }

    // 本地优化规则
    if (!aiResult) {
      aiResult = optimizeTextLocal(text);
    }

    res.json({ result: aiResult });
  } catch (error) {
    console.error('AI optimize-text error:', error);
    res.status(500).json({ error: '文字优化失败' });
  }
});

// 本地文字优化
function optimizeTextLocal(text) {
  let result = text.trim();

  // 去除多余空格
  result = result.replace(/\s+/g, ' ');
  // 去除多余标点
  result = result.replace(/([，。！？、])\1+/g, '$1');
  // 去除口语化废话
  const fillers = ['就是说', '然后的话', '这样子', '就是说啊', '然后呢', '就是', '那个', '嗯', '啊', '吧', '的话'];
  fillers.forEach(f => {
    result = result.replace(new RegExp(f, 'g'), '');
  });
  // 整理换行
  result = result.replace(/\n{3,}/g, '\n\n');
  // 首字母大写（英文）
  result = result.replace(/^([a-z])/, (m, c) => c.toUpperCase());
  // 句末加句号
  if (result && !/[。！？.!?]$/.test(result)) {
    result += '。';
  }

  return result;
}

// POST /api/ai/organize - AI 整理目标和任务
router.post('/organize', async (req, res) => {
  try {
    const { tasks, projects, sections, clientApiKey, clientApiUrl, clientModel } = req.body;

    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({ error: '需要提供任务数据' });
    }

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

    // 尝试调用 AI API（优先用前端传来的 Key）
    let aiResult = null;

    const effApiKey = clientApiKey || process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    const effApiUrl = clientApiUrl || process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
    const effModel = clientModel || process.env.AI_MODEL || 'gpt-4o-mini';

    if (effApiKey) {
      try {
        const response = await fetch(effApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${effApiKey}`,
          },
          body: JSON.stringify({
            model: effModel,
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
    }

    // 方案3: 本地规则引擎（不需要 API Key）
    if (!aiResult) {
      aiResult = generateLocalAnalysis(tasks, projects, sections);
    }

    res.json({ result: aiResult, prompt });
  } catch (error) {
    console.error('AI organize error:', error);
    res.status(500).json({ error: 'AI 整理失败' });
  }
});

// 本地规则引擎 - 不需要 API Key 也能用
function generateLocalAnalysis(tasks, projects, sections) {
  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);
  const overdueTasks = pendingTasks.filter(t => {
    if (!t.dueDate) return false;
    return new Date(t.dueDate) < new Date();
  });
  const highPriority = pendingTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
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
      const priority = t.priority === 'urgent' ? '🔴' : t.priority === 'high' ? '🟠' : t.priority === 'medium' ? '🟡' : '🔵';
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
