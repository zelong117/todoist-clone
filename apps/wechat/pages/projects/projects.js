const { request } = require('../../utils/api');

Page({
  data: { projects: [], name: '', loading: true, creating: false },
  onShow() { this.refresh(); },
  async refresh() {
    if (!getApp().globalData.token) return wx.reLaunch({ url: '/pages/login/login' });
    this.setData({ loading: true });
    try { this.setData({ projects: await request('/projects') }); }
    catch { wx.showToast({ title: '项目同步失败', icon: 'none' }); }
    finally { this.setData({ loading: false }); }
  },
  nameInput(event) { this.setData({ name: event.detail.value }); },
  async createProject() {
    const name = this.data.name.trim();
    if (!name || this.data.creating) return;
    this.setData({ creating: true });
    try { await request('/projects', { method: 'POST', data: { name, color: '#e64b2e' } }); this.setData({ name: '' }); await this.refresh(); }
    catch { wx.showToast({ title: '项目创建失败', icon: 'none' }); }
    finally { this.setData({ creating: false }); }
  },
});
