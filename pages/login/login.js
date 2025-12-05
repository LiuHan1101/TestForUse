// pages/login/login.js
Page({
  data: { 
    isLogging: false 
  },

  onLoad() {
    console.log('【login】页面加载');
    
    wx.cloud.init({ 
      env: 'cloud1-8gw6xrycfea6d00b', 
      traceUser: true 
    });
    
    // 检查是否已登录
    this.checkLoginStatus();
  },

  // 检查登录状态
  async checkLoginStatus() {
    const token = wx.getStorageSync('token');
    
    if (token) {
      console.log('【login】发现本地token，验证有效性');
      
      try {
        // 检查session是否有效
        await new Promise((resolve, reject) => {
          wx.checkSession({
            success: resolve,
            fail: reject
          });
        });
        
        // session有效，直接跳转到首页
        console.log('【login】session有效，自动跳转到首页');
        wx.switchTab({ url: '/pages/index/index' });
        
      } catch (error) {
        console.log('【login】session失效，需要重新登录');
        // session失效，清除本地token，让用户手动登录
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
        wx.removeStorageSync('openid');
      }
    }
  },

  // 微信登录
  async onWechatLogin() {
    if (this.data.isLogging) return;
    
    this.setData({ isLogging: true });
    
    try {
      // 1. 获取微信登录凭证
      const { code } = await this.getWxCode();
      
      // 2. 调用云函数处理登录
      wx.showLoading({ title: '登录中...' });
      
      const cloudRes = await wx.cloud.callFunction({
        name: 'login',
        data: { code: code }
      });
      
      // 3. 存储用户标识
      const { openid, isNewUser, token } = cloudRes.result;
      wx.setStorageSync('openid', openid);
      wx.setStorageSync('token', token);
      
      wx.hideLoading();
      
      // 4. 根据是否新用户跳转
      if (isNewUser) {
        wx.showToast({ title: '新用户，请完善信息', icon: 'success' });
        setTimeout(() => {
          wx.reLaunch({ url: '/pages/register/register' });
        }, 1500);
      } else {
        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' });
        }, 1500);
      }
      
    } catch (error) {
      console.error('登录失败:', error);
      wx.hideLoading();
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isLogging: false });
    }
  },

  getWxCode: () => {
    return new Promise((resolve, reject) => {
      wx.login({
        success: resolve,
        fail: reject
      });
    });
  }
});