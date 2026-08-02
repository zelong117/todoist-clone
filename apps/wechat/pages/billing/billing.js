const { request } = require('../../utils/api');
Page({ data: { subscription: null, loading: true }, onShow() { this.refresh(); }, async refresh() { this.setData({ loading: true }); try { this.setData({ subscription: await request('/billing/subscription') }); } catch { wx.showToast({ title: 'Could not load plan details', icon: 'none' }); } finally { this.setData({ loading: false }); } } });
