// pages/me/me.js
Page({
    data: {
      userInfo: {
        nickname: '加载中...',
        avatar: '/images/avatar.png',
        college: '',
        isVerified: false,
        joinDays: 0
      },
      stats: {
        published: 0,
        inProgress: 0,
        completed: 0,
        favorites: 0
      },
      menuItems: [
        {
          icon: '/images/credit.png',  
          title: '信用中心',
          type: 'navigate',
          url: '/pages/me/credit-center/credit-center',
          badge: 0
        },
        {
          icon: '/images/service.png',  
          title: '联系客服',
          type: 'contact',
          url: '',
          badge: 0
        },
        {
          icon: '/images/agreement.png',  
          title: '用户协议',
          type: 'navigate',
          url: '/pages/me/agreement/agreement',
          badge: 0
        },
        {
          icon: '/images/set.png',  
          title: '设置',
          type: 'navigate',
          url: '/pages/me/set/set',
          badge: 0
        },
        {
          icon: '/images/help.png', 
          title: '帮助与反馈',
          type: 'navigate',
          url: '/pages/me/help-feedback/help-feedback',
          badge: 0
        }
      ],
      isLoading: true,
      userOpenId: null
    },
  
    onLoad() {
      // 初始化时加载用户信息
      this.loadUserInfoFromDatabase();
      this.loadUserStats();
    },
  
    onShow() {
      // 每次页面显示时重新加载数据
      this.loadUserInfoFromDatabase();
      this.loadUserStats();
    },
  
    // 从云数据库加载当前登录用户的个人信息
    async loadUserInfoFromDatabase() {
      try {
        this.setData({ isLoading: true });
        
        // 1. 获取当前用户的openid
        const openid = wx.getStorageSync('openid');
        if (!openid) {
          console.log('未找到openid，用户可能未登录');
          this.setData({ 
            userInfo: {
              nickname: '请先登录',
              avatar: '/images/avatar.png',
              college: '',
              isVerified: false,
              joinDays: 0
            },
            isLoading: false 
          });
          return;
        }
        
        this.setData({ userOpenId: openid });
        
        const db = wx.cloud.database();
        
        // 2. 从本地缓存加载（快速显示）
        const cachedUserInfo = wx.getStorageSync('userInfo');
        if (cachedUserInfo && (cachedUserInfo.openid === openid || cachedUserInfo._openid === openid)) {
          console.log('使用缓存的用户信息:', cachedUserInfo);
          this.setData({
            userInfo: {
              ...this.data.userInfo,
              nickname: cachedUserInfo.nickname || '上财同学',
              avatar: cachedUserInfo.avatar || cachedUserInfo.avatarUrl || '/images/avatar.png',
              college: cachedUserInfo.college || '未知学院',
              isVerified: cachedUserInfo.isVerified || false,
              joinDays: this.calculateJoinDays(cachedUserInfo.createTime) || 0
            }
          });
        }
  
        // 3. 从云数据库加载最新数据（根据_openid查询）
        console.log('从云数据库查询用户信息，_openid:', openid);
        const userQuery = await db.collection('users')
          .where({
            _openid: openid  // 使用_openid查询当前用户
          })
          .get();
        
        console.log('云数据库查询结果:', userQuery);
  
        if (userQuery.data.length > 0) {
          // 找到当前用户的信息
          const userData = userQuery.data[0];
          console.log('获取到的当前用户信息:', userData);
          
          const newUserInfo = {
            _id: userData._id,
            openid: openid,
            _openid: openid,
            nickname: userData.nickname || userData.nickName || '上财同学',
            avatar: userData.avatar || userData.avatarUrl || '/images/avatar.png',
            college: userData.college || '未知学院',
            isVerified: userData.isVerified || false,
            joinDays: this.calculateJoinDays(userData.createTime) || 0,
            createTime: userData.createTime,
            updateTime: userData.updateTime,
            studentId: userData.studentId || '',
            phone: userData.phone || '',
            gender: userData.gender || 0,
            bio: userData.bio || ''
          };
          
          console.log('更新的用户信息:', newUserInfo);
          
          // 更新页面显示
          this.setData({
            userInfo: {
              nickname: newUserInfo.nickname,
              avatar: newUserInfo.avatar,
              college: newUserInfo.college,
              isVerified: newUserInfo.isVerified,
              joinDays: newUserInfo.joinDays
            }
          });
          
          // 更新本地缓存（包含完整信息）
          wx.setStorageSync('userInfo', newUserInfo);
          console.log('本地缓存已更新');
          
          // 更新全局数据
          const app = getApp();
          if (app && app.globalData) {
            app.globalData.userInfo = newUserInfo;
            app.globalData.isLoggedIn = true;
          }
          
        } else {
          console.log('未在数据库中找到该用户信息');
          // 可能是新用户，还没有注册信息
          if (!cachedUserInfo || (cachedUserInfo.openid !== openid && cachedUserInfo._openid !== openid)) {
            this.setData({
              userInfo: {
                nickname: '新用户',
                avatar: '/images/avatar.png',
                college: '请完善信息',
                isVerified: false,
                joinDays: 0
              }
            });
          }
        }
  
      } catch (error) {
        console.error('加载用户信息失败:', error);
        
        // 错误处理：显示缓存数据或默认数据
        const cachedUserInfo = wx.getStorageSync('userInfo');
        const openid = wx.getStorageSync('openid');
        
        if (cachedUserInfo && (cachedUserInfo.openid === openid || cachedUserInfo._openid === openid)) {
          this.setData({
            userInfo: {
              nickname: cachedUserInfo.nickname || '上财同学',
              avatar: cachedUserInfo.avatar || cachedUserInfo.avatarUrl || '/images/avatar.png',
              college: cachedUserInfo.college || '未知学院',
              isVerified: cachedUserInfo.isVerified || false,
              joinDays: this.calculateJoinDays(cachedUserInfo.createTime) || 0
            }
          });
        } else {
          // 显示登录提示
          this.setData({
            userInfo: {
              nickname: '请先登录',
              avatar: '/images/avatar.png',
              college: '',
              isVerified: false,
              joinDays: 0
            }
          });
        }
        
      } finally {
        this.setData({ isLoading: false });
      }
    },
  
    // 计算加入天数
    calculateJoinDays(createTime) {
      if (!createTime) return 1;
      
      let createDate;
      
      // 处理不同类型的日期格式
      if (typeof createTime === 'object' && createTime.constructor.name === 'Date') {
        // 如果是Date对象
        createDate = createTime;
      } else if (typeof createTime === 'string') {
        // 如果是字符串
        createDate = new Date(createTime);
      } else if (createTime.getTime) {
        // 如果是云数据库的服务器时间对象
        createDate = new Date(createTime.getTime());
      } else {
        console.log('无法解析的日期格式:', createTime);
        return 0;
      }
      
      // 检查日期是否有效
      if (isNaN(createDate.getTime())) {
        console.log('无效的日期:', createTime);
        return 0;
      }
      
      const now = new Date();
      const diffTime = now.getTime() - createDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // 如果是当天加入，显示1天
      return diffDays >= 0 ? diffDays + 1 : 0;
    },
  
    // 加载用户统计数据
    async loadUserStats() {
      try {
        const openid = wx.getStorageSync('openid');
        if (!openid) {
          console.log('未登录，跳过加载统计数据');
          return;
        }
        
        const db = wx.cloud.database();
        
        // 获取已发布商品数量（当前用户的，状态为selling）
        // 根据数据库记录，商品有_openid和status字段，但没有deleted字段
        const publishedResult = await db.collection('POST')
          .where({
            _openid: openid,  // 使用_openid查询
            status: 'selling'  // 状态为selling
          })
          .count();
        
        // 获取进行中商品数量
        const inProgressResult = await db.collection('POST')
          .where({
            _openid: openid,  // 使用_openid查询
            status: 'in_progress'  // 状态为in_progress
          })
          .count();
        
        // 获取收藏数量（当前用户的）
        const favoritesResult = await db.collection('wishes')
          .where({
            _openid: openid  // 使用_openid查询
            // 移除status条件，因为wishes表可能没有status字段
          })
          .count();
  
        console.log('统计查询结果:', {
          published: publishedResult.total,
          inProgress: inProgressResult.total,
          favorites: favoritesResult.total
        });
  
        this.setData({
          stats: {
            published: publishedResult.total || 0,
            inProgress: inProgressResult.total || 0,
            completed: 0,  // 需要已成交记录表
            favorites: favoritesResult.total || 0
          }
        });
  
        // 更新菜单徽章（注意：菜单徽章逻辑仍然不正确，收藏数显示在"帮助与反馈"菜单项上）
        this.updateMenuBadges();
  
      } catch (error) {
        console.error('加载统计数据失败:', error);
        // 使用默认数据
        this.setData({
          stats: {
            published: 0,
            inProgress: 0,
            completed: 0,
            favorites: 0
          }
        });
      }
    },
  
    // 更新菜单徽章
    updateMenuBadges() {
      const menuItems = [...this.data.menuItems];
      
      // 更新帮助与反馈徽章（现在索引为2）
      // 注意：这里逻辑仍然不正确，收藏数显示在"帮助与反馈"菜单项上
      menuItems[2].badge = this.data.stats.favorites;
      
      this.setData({ menuItems });
    },
  
    // 点击菜单项
    onMenuItemTap(e) {
      const index = e.currentTarget.dataset.index;
      const item = this.data.menuItems[index];
      
      console.log('点击菜单项:', item.title, '类型:', item.type);
      
      // 根据类型处理不同的菜单项
      switch (item.type) {
        case 'navigate':
          if (item.url) {
            wx.navigateTo({
              url: item.url,
              success: (res) => {
                console.log('跳转成功:', res);
              },
              fail: (err) => {
                console.error('跳转失败:', err);
                this.showNavigationError(item.title, err);
              }
            });
          } else {
            wx.showToast({
              title: `${item.title}功能开发中`,
              icon: 'none'
            });
          }
          break;
          
        case 'contact':
          // 处理联系客服
          this.contactCustomer();
          break;
          
        default:
          wx.showToast({
            title: `${item.title}功能开发中`,
            icon: 'none'
          });
      }
    },
    
    // 添加联系客服函数
    contactCustomer() {
      wx.showModal({
        title: '联系客服',
        content: '客服微信：shangcai-service\n工作时间：9:00-18:00\n邮箱：service@shangcai.com',
        showCancel: false,
        confirmText: '知道了'
      });
    },
  
    // 显示导航错误信息
    showNavigationError(title, error) {
      wx.showModal({
        title: '跳转失败',
        content: `无法打开${title}\n错误: ${error.errMsg}\n\n请检查页面文件是否存在`,
        showCancel: false,
        confirmText: '知道了'
      });
    },
  
    // 点击用户信息区域 - 唯一进入个人主页的入口
    onUserInfoTap() {
      console.log('跳转到个人主页');
      
      // 直接跳转到个人主页
      wx.navigateTo({
        url: '/pages/me/profile/profile',
        success: (res) => {
          console.log('跳转成功:', res);
        },
        fail: (err) => {
          console.error('跳转失败:', err);
          this.showNavigationError('个人主页', err);
        }
      });
    },
  
    // 点击数据统计项
    onStatItemTap(e) {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        wx.navigateTo({
          url: '/pages/login/login'
        });
        return;
      }
      
      const type = e.currentTarget.dataset.type;
      const statsMap = {
        published: '已发布商品',
        inProgress: '进行中交易',
        completed: '已成交',
        favorites: '收藏'
      };
      
      // 跳转到对应的列表页面
      let url = '';
      switch(type) {
        case 'published':
          url = '/pages/me/my-goods/my-goods?type=published';
          break;
        case 'inProgress':
          url = '/pages/me/my-goods/my-goods?type=inProgress';
          break;
        case 'completed':
          url = '/pages/me/my-goods/my-goods?type=completed';
          break;
        case 'favorites':
          url = '/pages/me/my-goods/my-goods?type=favorites';
          break;
      }
  
      if (url) {
        wx.navigateTo({
          url: url
        });
      }
      
      wx.showToast({
        title: `查看${statsMap[type]}`,
        icon: 'none'
      });
    },
  
    // 分享功能
    onShareAppMessage() {
      return {
        title: `${this.data.userInfo.nickname}邀请你使用上财易物`,
        path: '/pages/index/index',
        imageUrl: '/images/share-logo.png'
      };
    }
  });