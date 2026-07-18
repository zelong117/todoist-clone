/**
 * 全局点击音效系统
 * 点击任何按钮、链接、交互元素时播放音效
 */

// 音效 URL（免费音效，用 Web Audio API 生成）
const audioCtx = typeof AudioContext !== 'undefined' ? new AudioContext() : null;

// 生成短促的点击音效
function playClickSound() {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
  } catch {}
}

// 生成成功音效
function playSuccessSound() {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523, audioCtx.currentTime);
    osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1);
    osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.3);
  } catch {}
}

// 生成删除/警告音效
function playDeleteSound() {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch {}
}

// 生成拖拽音效
function playDragSound() {
  if (!audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.06);
  } catch {}
}

// 全局事件监听
let soundEnabled = true;

export function setSoundEnabled(enabled: boolean) {
  soundEnabled = enabled;
  localStorage.setItem('sound-enabled', String(enabled));
}

export function getSoundEnabled(): boolean {
  return localStorage.getItem('sound-enabled') !== 'false';
}

// 初始化全局点击音效
export function initClickSounds() {
  soundEnabled = getSoundEnabled();

  document.addEventListener('click', (e) => {
    if (!soundEnabled) return;
    const target = e.target as HTMLElement;
    const closest = target.closest('button, a, [role="button"], input[type="checkbox"], [data-clickable]');

    if (closest) {
      // 判断类型播放不同音效
      if (target.closest('[data-delete], .delete, [title*="删除"], [title*="移除"]')) {
        playDeleteSound();
      } else if (target.closest('[data-success], .success')) {
        playSuccessSound();
      } else {
        playClickSound();
      }
    }
  }, true);

  // 拖拽开始音效
  document.addEventListener('mousedown', (e) => {
    if (!soundEnabled) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-task-card], [data-column-handle]')) {
      playDragSound();
    }
  }, true);
}

export { playClickSound, playSuccessSound, playDeleteSound, playDragSound };
