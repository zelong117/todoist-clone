const { request } = require('../../utils/api');
Page({
  data: { email: '', password: '', error: '' },
  emailInput(event) { this.setData({ email: event.detail.value }); },
  passwordInput(event) { this.setData({ password: event.detail.value }); },
  async signIn() {
    this.setData({ error: '' });
    try {
      const data = await request('/auth/login', { method: 'POST', data: { email: this.data.email, password: this.data.password } });
      getApp().globalData.token = data.token;
      wx.setStorageSync('taskflow_token', data.token);
      wx.reLaunch({ url: '/pages/index/index' });
    } catch { this.setData({ error: 'Unable to sign in. Check the configured API domain.' }); }
  },
  async wechatSignIn() {
    this.setData({ error: '' });
    try {
      const login = await new Promise((resolve, reject) => wx.login({ success: resolve, fail: reject }));
      if (!login.code) throw new Error('WeChat did not return a login code');
      const data = await request('/auth/wechat/mini-login', { method: 'POST', data: { code: login.code } });
      getApp().globalData.token = data.token;
      wx.setStorageSync('taskflow_token', data.token);
      wx.reLaunch({ url: '/pages/index/index' });
    } catch { this.setData({ error: 'WeChat sign-in is not available until the server AppID, AppSecret, and HTTPS domain are configured.' }); }
  },
});
