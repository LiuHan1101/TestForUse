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
    userId: null, // 添加用户ID字段
    tempFilePath: '' // 添加临时文件路径
  },

  onLoad(options) {
    console.log('编辑页面加载完成');
    this.loadUserInfo();
  },

  // 加载用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo');
      const openid = wx.getStorageSync('openid');
      console.log('从缓存加载的用户信息:', userInfo);
      
      if (userInfo) {
        const collegeIndex = this.data.colleges.indexOf(userInfo.college);
        this.setData({
          userId: userInfo._id, // 保存用户ID
          avatarUrl: userInfo.avatar || userInfo.avatarUrl || '/images/avatar.png',
          nickname: userInfo.nickname || userInfo.nickName || '',
          college: userInfo.college || '',
          collegeIndex: collegeIndex >= 0 ? collegeIndex : 0,
          bio: userInfo.bio || '',
          gender: userInfo.gender || 0,
          wordCount: (userInfo.bio || '').length
        });
      }
      
      if (!openid) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }, 1500);
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
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
      return null; // 没有新头像，返回null
    }

    try {
      console.log('开始上传头像...');
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substr(2, 8);
      const cloudPath = `avatars/${timestamp}_${randomStr}.jpg`;
      
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.tempFilePath
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
      // 获取用户openid
      const openid = wx.getStorageSync('openid');
      if (!openid) {
        throw new Error('用户未登录');
      }

      let avatarFileID = null;
      
      // 1. 上传头像（如果有新头像）
      if (this.data.tempFilePath) {
        avatarFileID = await this.uploadAvatar();
      }

      // 2. 构建更新数据
      const updateData = {
        nickname: this.data.nickname.trim(),
        college: this.data.college,
        bio: this.data.bio.trim(),
        gender: this.data.gender,
        isVerified: true,
        updateTime: new Date()
      };

      // 如果有新头像，添加到更新数据中
      if (avatarFileID) {
        updateData.avatar = avatarFileID;
        updateData.avatarUrl = avatarFileID; // 兼容字段
      }

      console.log('准备更新的数据:', updateData);
      console.log('用户ID:', this.data.userId);
      console.log('用户openid:', openid);

      const db = wx.cloud.database();
      
      // 3. 更新数据库
      if (this.data.userId) {
        // 方式1：使用用户ID更新（最准确）
        await db.collection('users').doc(this.data.userId).update({
          data: updateData
        });
        console.log('通过ID更新成功');
      } else {
        // 方式2：通过openid查找并更新（备用方案）
        const userQuery = await db.collection('users')
          .where({ openid: openid })
          .get();
        
        if (userQuery.data.length === 0) {
          throw new Error('找不到用户记录');
        }
        
        await db.collection('users').doc(userQuery.data[0]._id).update({
          data: updateData
        });
        console.log('通过openid更新成功');
        
        // 保存用户ID
        this.setData({ userId: userQuery.data[0]._id });
      }

      // 4. 更新本地缓存
      const currentUserInfo = wx.getStorageSync('userInfo') || {};
      const updatedUserInfo = {
        ...currentUserInfo,
        ...updateData,
        _id: this.data.userId || currentUserInfo._id,
        _openid: openid,
        openid: openid
      };
      
      wx.setStorageSync('userInfo', updatedUserInfo);
      console.log('本地用户信息已更新:', updatedUserInfo);

      // 5. 更新全局数据
      const app = getApp();
      if (app && app.globalData) {
        app.globalData.userInfo = updatedUserInfo;
        console.log('全局数据已更新');
      }

      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500
      });

      // 6. 返回上一页
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
  }
});