const { request } = require('../../utils/api');
Page({
  data: { tasks: [], loading: true, view: 'today', title: '', creating: false },
  onShow() { this.refresh(); },
  setView(event) { this.setData({ view: event.currentTarget.dataset.view }, () => this.refresh()); },
  async refresh() {
    if (!getApp().globalData.token) return wx.reLaunch({ url: '/pages/login/login' });
    this.setData({ loading: true });
    try {
      const tasks = await request('/tasks');
      const today = new Date().toISOString().slice(0, 10);
      const visible = this.data.view === 'today'
        ? tasks.filter((task) => !task.isCompleted && task.dueDate === today)
        : tasks.filter((task) => !task.isCompleted && !task.projectId);
      this.setData({ tasks: visible });
    }
    catch { wx.showToast({ title: 'Sync failed', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },
  titleInput(event) { this.setData({ title: event.detail.value }); },
  async createTask() {
    const title = this.data.title.trim();
    if (!title || this.data.creating) return;
    this.setData({ creating: true });
    try {
      await request('/tasks', { method: 'POST', data: { title, dueDate: this.data.view === 'today' ? new Date().toISOString().slice(0, 10) : null } });
      this.setData({ title: '' });
      await this.refresh();
    } catch { wx.showToast({ title: '任务创建失败', icon: 'none' }); }
    finally { this.setData({ creating: false }); }
  },
  async completeTask(event) {
    try { await request(`/tasks/${event.currentTarget.dataset.id}/complete`, { method: 'POST' }); await this.refresh(); }
    catch { wx.showToast({ title: '任务更新失败', icon: 'none' }); }
  },
});
