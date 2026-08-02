const { apiBaseUrl } = require('./config');

function request(path, options = {}) {
  const token = getApp().globalData.token;
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${apiBaseUrl}${path}`,
      method: options.method || 'GET',
      data: options.data,
      header: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data);
        else reject(response.data);
      },
      fail: reject,
    });
  });
}

module.exports = { request };
