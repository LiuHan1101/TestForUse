// app.js
App({
    onLaunch() {
      // 小程序启动时，检查登录状态
      wx.cloud.init({
        env: "cloud1-8gw6xrycfea6d00b",
        traceUser: true
      });
  
      const token = wx.getStorageSync('token');
      if (token) {
        // 验证token是否过期
        this.checkSession();
      } else {
        // 跳转到登录页或静默登录
        this.login();
      }
    },
  
    globalData: {
      userInfo: null,
      baseURL: 'https://your-backend-api.com/api/v1',
      // 莫兰迪色系颜色变量
      colors: {
        primaryRed: '#E8B4B8',
        primaryPink: '#F5D5D0',
        primaryCoral: '#F4A6A3',
        accentYellow: '#F7E4C8',
        accentBeige: '#F2E8D5',
        accentGold: '#E8D0B3',
        neutralLight: '#FAF7F2',
        neutralGray: '#D8CFC7',
        neutralDark: '#8C7B6C',
        neutralText: '#5D534A'
      }
    },
  
    // 检查登录状态
    async checkSession() {
      try {
        // 检查微信session是否有效
        await new Promise((resolve, reject) => {
          wx.checkSession({
            success: resolve,
            fail: reject
          });
        });
        
        // 验证自定义token是否有效
        const userInfo = await this.getUserInfo();
        this.globalData.userInfo = userInfo;
        
        console.log('登录状态有效');
      } catch (error) {
        console.log('session已过期，重新登录', error);
        // 清除过期的token
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
        // 重新登录
        this.login();
      }
    },
  
    // 封装登录方法
    async login() {
      try {
        // 1. 获取微信code
        const loginRes = await new Promise((resolve, reject) => {
          wx.login({
            success: resolve,
            fail: reject
          });
        });
  
        if (!loginRes.code) {
          throw new Error('获取微信登录code失败');
        }
  
        // 2. 发送code到后端，换取自定义token和用户信息
        const authRes = await this.request({
          url: '/auth/login',
          method: 'POST',
          data: {
            code: loginRes.code
          },
          header: {
            'Content-Type': 'application/json'
          }
        });
  
        if (authRes.success && authRes.data) {
          // 存储token和用户信息
          wx.setStorageSync('token', authRes.data.token);
          wx.setStorageSync('userInfo', authRes.data.userInfo);
          this.globalData.userInfo = authRes.data.userInfo;
          
          console.log('登录成功', authRes.data.userInfo);
          
          // 登录成功后的回调
          if (this.loginSuccessCallback) {
            this.loginSuccessCallback(authRes.data.userInfo);
          }
          
          return authRes.data;
        } else {
          throw new Error(authRes.message || '登录失败');
        }
  
      } catch (error) {
        console.error('登录失败:', error);
        
        // 登录失败，跳转到登录页面
        this.navigateToLogin();
        throw error;
      }
    },
  
    // 跳转到登录页面
    navigateToLogin() {
      // 检查当前页面是否是登录页，避免重复跳转
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      
      if (currentPage.route !== 'pages/login/login') {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }
    },
  
    // 获取用户信息（需要用户授权）
    async getUserProfile() {
      return new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: (res) => {
            const userInfo = res.userInfo;
            // 更新用户信息到后端
            this.updateUserInfo(userInfo).then(() => {
              resolve(userInfo);
            }).catch(reject);
          },
          fail: (err) => {
            reject(err);
          }
        });
      });
    },
  
    // 更新用户信息到后端
    async updateUserInfo(userInfo) {
      try {
        const res = await this.request({
          url: '/user/update',
          method: 'POST',
          data: userInfo
        });
  
        if (res.success) {
          // 更新本地存储的用户信息
          const updatedUserInfo = { ...this.globalData.userInfo, ...userInfo };
          wx.setStorageSync('userInfo', updatedUserInfo);
          this.globalData.userInfo = updatedUserInfo;
          
          return res.data;
        }
      } catch (error) {
        console.error('更新用户信息失败:', error);
        throw error;
      }
    },
  
    // 获取用户信息
    async getUserInfo() {
      try {
        const res = await this.request({
          url: '/user/info',
          method: 'GET'
        });
  
        if (res.success) {
          return res.data;
        } else {
          throw new Error(res.message || '获取用户信息失败');
        }
      } catch (error) {
        console.error('获取用户信息失败:', error);
        throw error;
      }
    },
  
    // 退出登录
    async logout() {
      try {
        // 调用后端退出接口
        await this.request({
          url: '/auth/logout',
          method: 'POST'
        });
      } catch (error) {
        console.error('退出登录失败:', error);
      } finally {
        // 清除本地存储
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
        this.globalData.userInfo = null;
        
        // 跳转到登录页
        this.navigateToLogin();
      }
    },
  
    // 检查登录状态
    checkLogin() {
      const token = wx.getStorageSync('token');
      if (!token) {
        this.navigateToLogin();
        return false;
      }
      return true;
    },
  
    // 设置登录成功回调
    setLoginSuccessCallback(callback) {
      this.loginSuccessCallback = callback;
    },
  
    // 图片加载失败处理
    onImageError(e) {
      const index = e.currentTarget.dataset.index;
      const { activeTab, cashGoodsList, swapGoodsList } = this.data;
  
      const defaultImage = '/images/default.jpg';
  
      if (activeTab === 'cash') {
        const key = `cashGoodsList[${index}].image`;
        this.setData({ [key]: defaultImage });
      } else {
        const key = `swapGoodsList[${index}].image`;
        this.setData({ [key]: defaultImage });
      }
    },
  
    // 封装请求方法
    request(options) {
      return new Promise((resolve, reject) => {
        wx.request({
          ...options,
          url: this.globalData.baseURL + options.url,
          header: {
            'Authorization': 'Bearer ' + wx.getStorageSync('token'),
            'Content-Type': 'application/json',
            ...options.header
          },
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res.data);
            } else if (res.statusCode === 401) {
              // token过期，重新登录
              this.login().then(() => {
                this.request(options).then(resolve).catch(reject);
              }).catch(() => {
                this.navigateToLogin();
                reject(res);
              });
            } else {
              reject(res);
            }
          },
          fail: reject
        });
      });
    }
  });