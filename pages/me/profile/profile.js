// pages/me/edit-profile/edit-profile.js
Page({
  data: {
    avatarUrl: '/images/avatar.png',
    nickname: '',
    college: '',
    collegeIndex: 0,
    bio: '',
    gender: 0,
    genders: ['未知', '男', '女'],
    colleges: [
      '会计学院',
      '金融学院', 
      '经济学院',
      '商学院',
      '计算机学院',
      '数学学院',
      '艺术学院',
      '其他学院'
    ],
    isSaving: false,
    wordCount: 0,
    userId: null,
    tempFilePath: ''
  },

  onLoad(options) {
    console.log('编辑页面加载完成');
    this.loadUserInfo();
  },

  // 加载用户信息（从云数据库获取最新数据）
  async loadUserInfo() {
    try {
      wx.showLoading({ title: '加载中...', mask: true });
      
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        wx.hideLoading();
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }, 1500);
        return;
      }

      const db = wx.cloud.database();
      
      // 1. 从云数据库获取最新的用户信息
      const userQuery = await db.collection('users')
        .where({ openid: openid })
        .get();
      
      console.log('从云数据库查询的用户信息:', userQuery);
      
      if (userQuery.data.length === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '用户信息不存在',
          icon: 'none'
        });
        return;
      }
      
      const userInfo = userQuery.data[0];
      console.log('获取到的用户信息:', userInfo);
      
      // 2. 更新本地存储
      const localUserInfo = {
        ...userInfo,
        _openid: openid,
        openid: openid
      };
      wx.setStorageSync('userInfo', localUserInfo);
      
      // 3. 更新全局数据
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = localUserInfo;
      }
      
      // 4. 设置页面数据
      const collegeIndex = this.data.colleges.indexOf(userInfo.college || '');
      this.setData({
        userId: userInfo._id,
        avatarUrl: userInfo.avatar || userInfo.avatarUrl || '/images/avatar.png',
        nickname: userInfo.nickname || userInfo.nickName || '',
        college: userInfo.college || '',
        collegeIndex: collegeIndex >= 0 ? collegeIndex : 0,
        bio: userInfo.bio || '',
        gender: userInfo.gender || 0,
        wordCount: (userInfo.bio || '').length
      });
      
      wx.hideLoading();
      
    } catch (error) {
      console.error('加载用户信息失败:', error);
      wx.hideLoading();
      
      // 失败时尝试从本地缓存加载
      try {
        const cachedUserInfo = wx.getStorageSync('userInfo');
        if (cachedUserInfo) {
          const collegeIndex = this.data.colleges.indexOf(cachedUserInfo.college || '');
          this.setData({
            userId: cachedUserInfo._id,
            avatarUrl: cachedUserInfo.avatar || cachedUserInfo.avatarUrl || '/images/avatar.png',
            nickname: cachedUserInfo.nickname || cachedUserInfo.nickName || '',
            college: cachedUserInfo.college || '',
            collegeIndex: collegeIndex >= 0 ? collegeIndex : 0,
            bio: cachedUserInfo.bio || '',
            gender: cachedUserInfo.gender || 0,
            wordCount: (cachedUserInfo.bio || '').length
          });
        }
      } catch (cacheError) {
        console.error('从缓存加载失败:', cacheError);
      }
    }
  },

  // 选择头像
  onChooseAvatar() {
    console.log('选择头像');
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      maxWidth: 800,
      maxHeight: 800,
      success: (res) => {
        console.log('选择的图片:', res.tempFiles[0].tempFilePath);
        this.setData({
          avatarUrl: res.tempFiles[0].tempFilePath,
          tempFilePath: res.tempFiles[0].tempFilePath
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 输入昵称
  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value
    });
  },

  // 输入个人简介
  onBioInput(e) {
    const bio = e.detail.value;
    this.setData({
      bio: bio,
      wordCount: bio.length
    });
  },

  // 选择学院
  onCollegeChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      collegeIndex: index,
      college: this.data.colleges[index]
    });
  },

  // 选择性别
  onGenderChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      gender: index
    });
  },

  // 上传头像到云存储
  async uploadAvatar() {
    if (!this.data.tempFilePath) {
      return null;
    }

    try {
      console.log('开始上传头像...');
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 8);
      const cloudPath = `avatars/${timestamp}_${randomStr}.jpg`;
      
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.tempFilePath,
        config: {
          env: 'cloud1-8gw6xrycfea6d00b'
        }
      });
      
      console.log('头像上传成功:', uploadRes.fileID);
      return uploadRes.fileID;
    } catch (uploadError) {
      console.error('头像上传失败:', uploadError);
      throw new Error('头像上传失败');
    }
  },

  // 保存信息
  async onSave() {
    if (this.data.isSaving) return;

    // 验证表单
    if (!this.data.nickname.trim()) {
      wx.showToast({ 
        title: '请输入昵称', 
        icon: 'none' 
      });
      return;
    }

    if (this.data.nickname.trim().length > 20) {
      wx.showToast({ 
        title: '昵称不能超过20个字符', 
        icon: 'none' 
      });
      return;
    }

    if (this.data.bio.length > 100) {
      wx.showToast({ 
        title: '个人简介不能超过100个字符', 
        icon: 'none' 
      });
      return;
    }

    if (!this.data.college) {
      wx.showToast({ 
        title: '请选择学院', 
        icon: 'none' 
      });
      return;
    }

    this.setData({ isSaving: true });
    wx.showLoading({ 
      title: '保存中...', 
      mask: true 
    });

    try {
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        throw new Error('用户未登录');
      }

      let avatarFileID = null;
      
      // 1. 上传头像（如果有新头像）
      if (this.data.tempFilePath) {
        avatarFileID = await this.uploadAvatar();
      }

      const db = wx.cloud.database();
      
      // 2. 构建更新数据 - 使用云数据库的 serverDate
      const updateData = {
        nickname: this.data.nickname.trim(),
        college: this.data.college,
        bio: this.data.bio.trim(),
        gender: this.data.gender,
        isVerified: true,
        updateTime: db.serverDate()  // 关键修改：使用云数据库的服务器时间
      };

      // 如果有新头像，添加到更新数据中
      if (avatarFileID) {
        updateData.avatar = avatarFileID;
        updateData.avatarUrl = avatarFileID;
      }

      console.log('准备更新的数据:', updateData);
      console.log('用户ID:', this.data.userId);

      // 3. 更新数据库
      if (this.data.userId) {
        await db.collection('users').doc(this.data.userId).update({
          data: updateData
        });
        console.log('通过ID更新成功');
      } else {
        // 如果页面没有userId，通过openid查找
        const userQuery = await db.collection('users')
          .where({ openid: openid })
          .get();
        
        if (userQuery.data.length === 0) {
          throw new Error('找不到用户记录');
        }
        
        const userId = userQuery.data[0]._id;
        await db.collection('users').doc(userId).update({
          data: updateData
        });
        
        this.setData({ userId: userId });
        console.log('通过openid更新成功');
      }

      // 4. 重新从数据库获取最新数据
      const updatedUserQuery = await db.collection('users')
        .where({ openid: openid })
        .get();
      
      if (updatedUserQuery.data.length > 0) {
        const updatedUserInfo = {
          ...updatedUserQuery.data[0],
          _openid: openid,
          openid: openid
        };
        
        // 更新本地存储
        wx.setStorageSync('userInfo', updatedUserInfo);
        console.log('本地缓存已更新:', updatedUserInfo);
        
        // 更新全局数据
        const app = getApp();
        if (app && app.globalData) {
          app.globalData.userInfo = updatedUserInfo;
        }
        
        // 更新页面数据（可选）
        const collegeIndex = this.data.colleges.indexOf(updatedUserInfo.college || '');
        this.setData({
          avatarUrl: updatedUserInfo.avatar || updatedUserInfo.avatarUrl || '/images/avatar.png',
          nickname: updatedUserInfo.nickname || updatedUserInfo.nickName || '',
          college: updatedUserInfo.college || '',
          collegeIndex: collegeIndex >= 0 ? collegeIndex : 0,
          bio: updatedUserInfo.bio || '',
          gender: updatedUserInfo.gender || 0,
          wordCount: (updatedUserInfo.bio || '').length
        });
      }

      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      });

      // 5. 返回上一页
      setTimeout(() => {
        wx.navigateBack({
          success: () => {
            // 通知上一个页面刷新数据
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            if (prevPage && prevPage.onShow) {
              prevPage.onShow();
            }
          }
        });
      }, 1500);

    } catch (error) {
      console.error('保存失败:', error);
      wx.hideLoading();
      
      let errorMsg = '保存失败，请重试';
      if (error.errMsg) {
        if (error.errMsg.includes('invalid document id')) {
          errorMsg = '用户信息错误，请重新登录';
        } else if (error.errMsg.includes('permission denied')) {
          errorMsg = '权限不足，无法修改';
        }
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 3000
      });
    } finally {
      this.setData({ isSaving: false });
    }
  },

  // 取消
  onCancel() {
    wx.navigateBack();
  },

  // 页面显示时重新加载数据
  onShow() {
    this.loadUserInfo();
  }
});