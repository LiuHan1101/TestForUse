// pages/login/login.js
Page({
  data: { isLogging: false },

  onLoad() {
    wx.cloud.init({ env: 'cloud1-8gw6xrycfea6d00b', traceUser: true });
  },

  // 微信登录（云开发版）
  async onWechatLogin() {
    console.log('【DEBUG】onWechatLogin 函数开始执行'); // 调试
    this.setData({ isLogging: true });
    
    try {
      // 1. 获取微信登录凭证
      const { code } = await this.getWxCode(); // ✅ 现在this指向正确
      console.log('获取到的code:', code);
      
      // 2. 调用云函数处理登录
      const cloudRes = await wx.cloud.callFunction({
        name: 'login',
        data: { code: code },
        config: { env: 'cloud1-8gw6xrycfea6d00b' }
      });
      
      console.log('云函数调用结果:', cloudRes);
      
      // 3. 从结果中解构数据
      const { openid, isNewUser, token } = cloudRes.result;
      console.log('解构出的数据:', { openid, isNewUser, token });
      
      // 4. 存储用户标识
      wx.setStorageSync('openid', openid);
      wx.setStorageSync('token', token);
      getApp().globalData.openid = openid;
      
      // 5. 根据是否新用户跳转
      if (isNewUser) {
        wx.showToast({ title: '新用户，请完善信息', icon: 'success' });
        setTimeout(() => wx.navigateTo({ url: '/pages/register/register' }), 1500);
      } else {
        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 1500);
      }
      
    } catch (error) {
      console.error('登录全过程失败:', error);
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    } finally {
      this.setData({ isLogging: false });
    }
  },

  // ✅ 关键修改：使用箭头函数
  getWxCode: () => {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          console.log('wx.login 成功:', res);
          resolve(res);
        },
        fail: reject
      });
    });
  }
});