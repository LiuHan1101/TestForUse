// pages/me/my-goods/my-goods.js
Page({
  data: {
    type: '', // published, inProgress, completed, favorites
    goodsList: [],
    searchValue: '',
    isLoading: true,
    noData: false,
    noDataMessage: ''
  },

  onLoad(options) {
    const { type } = options;
    this.setData({ type });
    wx.setNavigationBarTitle({
      title: this.getPageTitle(type)
    });
    this.loadGoodsList();
  },

  onShow() {
    this.loadGoodsList();
  },

  // 获取页面标题
  getPageTitle(type) {
    const titleMap = {
      published: '已发布',
      inProgress: '进行中',
      completed: '已成交',
      favorites: '我的收藏'
    };
    return titleMap[type] || '我的商品';
  },

  // 加载商品列表
  async loadGoodsList() {
    try {
      this.setData({ 
        isLoading: true,
        noData: false,
        noDataMessage: '' 
      });
      
      // 先获取当前用户的openid
      const userInfo = wx.getStorageSync('userInfo');
      const openid = userInfo ? userInfo.openid : null;
      
      if (!openid) {
        console.error('未找到openid，用户未登录');
        this.setData({ 
          goodsList: [],
          isLoading: false,
          noData: true,
          noDataMessage: '请先登录查看'
        });
        wx.showToast({
          title: '请先登录',
          icon: 'none',
          duration: 1500
        });
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/login/login'
          });
        }, 1500);
        return;
      }
      
      console.log('当前用户openid:', openid, '类型:', this.data.type);
      
      const db = wx.cloud.database();
      let goodsList = [];
      
      // 根据类型设置查询条件
      if (this.data.type === 'favorites') {
        // 收藏逻辑
        try {
          // 第一步：查询用户的收藏记录
          const favoritesRes = await db.collection('favorites')
            .where({
              userId: openid
            })
            .orderBy('createTime', 'desc')
            .get();
          
          console.log('收藏记录数量:', favoritesRes.data.length);
          
          // 如果没有收藏记录
          if (favoritesRes.data.length === 0) {
            this.setData({
              goodsList: [],
              isLoading: false,
              noData: true,
              noDataMessage: '暂无收藏的商品'
            });
            return;
          }
          
          // 第二步：提取所有收藏的商品ID
          const postIds = favoritesRes.data.map(item => item.postId);
          console.log('收藏的商品ID列表:', postIds);
          
          // 第三步：查询对应的商品信息
          const postsRes = await db.collection('POST')
            .where({
              _id: db.command.in(postIds),
              deleted: db.command.neq(true)
            })
            .get();
          
          console.log('查询到的商品数量:', postsRes.data.length);
          
          // 第四步：按收藏时间顺序排序
          const sortedPosts = [];
          for (const favorite of favoritesRes.data) {
            const post = postsRes.data.find(p => p._id === favorite.postId);
            if (post) {
              sortedPosts.push(post);
            }
          }
          
          // 第五步：处理商品数据格式
          goodsList = this.processGoodsData(sortedPosts);
          
          // 添加收藏时间信息（可选）
          goodsList = goodsList.map((item, index) => {
            if (favoritesRes.data[index]) {
              item.favoriteTime = this.formatTime(favoritesRes.data[index].createTime);
            }
            return item;
          });
          
        } catch (error) {
          console.error('加载收藏失败:', error);
          
          // 错误处理
          if (error.errCode === -502005) {
            this.setData({
              goodsList: [],
              isLoading: false,
              noData: true,
              noDataMessage: '收藏功能暂未启用'
            });
          } else {
            wx.showToast({
              title: '加载收藏失败',
              icon: 'none'
            });
            this.setData({
              goodsList: [],
              isLoading: false,
              noData: true
            });
          }
          return;
        }
      } else {
        // 其他类型逻辑（已发布、进行中、已成交）
        let query = db.collection('POST');
        
        switch(this.data.type) {
          case 'published':
            query = query.where({
              _openid: openid,
              status: 'selling',
              deleted: db.command.neq(true)
            });
            break;
          case 'inProgress':
            query = query.where({
              _openid: openid,
              status: 'in_progress',
              deleted: db.command.neq(true)
            });
            break;
          case 'completed':
            query = query.where({
              _openid: openid,
              status: 'completed',
              deleted: db.command.neq(true)
            });
            break;
          default:
            query = query.where({
              _openid: openid,
              deleted: db.command.neq(true)
            });
        }
        
        const result = await query.orderBy('createTime', 'desc').get();
        console.log(`加载${this.data.type}商品数量:`, result.data.length);
        goodsList = this.processGoodsData(result.data);
      }
      
      this.setData({ 
        goodsList,
        isLoading: false,
        noData: goodsList.length === 0
      });
      
      if (goodsList.length === 0) {
        this.setData({
          noDataMessage: this.getNoDataMessage(this.data.type)
        });
      }
      
    } catch (error) {
      console.error('加载商品列表失败:', error);
      this.setData({ 
        goodsList: [],
        isLoading: false,
        noData: true,
        noDataMessage: '加载失败，请重试'
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  onCancelFavorite(e) {
    const index = e.currentTarget.dataset.index;
    const goods = this.data.goodsList[index];
    const that = this;
    
    wx.showModal({
      title: '确认取消收藏',
      content: '确定要取消收藏这个商品吗？',
      confirmColor: '#ff6b6b',
      success: async function (res) {
        if (res.confirm) {
          try {
            // 获取当前用户openid
            const userInfo = wx.getStorageSync('userInfo');
            const openid = userInfo ? userInfo.openid : null;
            
            if (!openid) {
              wx.showToast({
                title: '请先登录',
                icon: 'none'
              });
              return;
            }
            
            const db = wx.cloud.database();
            
            // 从favorites集合中删除收藏记录
            const result = await db.collection('favorites')
              .where({
                userId: openid,
                postId: goods.id
              })
              .remove();
            
            console.log('取消收藏结果:', result);
            
            if (result.stats.removed > 0) {
              wx.showToast({
                title: '已取消收藏',
                icon: 'success'
              });
              
              // 从列表中移除
              const goodsList = that.data.goodsList;
              goodsList.splice(index, 1);
              that.setData({ 
                goodsList,
                noData: goodsList.length === 0
              });
              
              // 更新本地存储（如果用了的话）
              const localFavorites = wx.getStorageSync('favorites') || [];
              const newLocalFavorites = localFavorites.filter(id => id !== goods.id);
              wx.setStorageSync('favorites', newLocalFavorites);
              
            } else {
              wx.showToast({
                title: '未找到收藏记录',
                icon: 'none'
              });
            }
            
          } catch (error) {
            console.error('取消收藏失败:', error);
            wx.showToast({
              title: '取消收藏失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  
  // 删除商品（只用于用户自己发布的商品）
  onDeleteGoods(e) {
    const index = e.currentTarget.dataset.index;
    const goods = this.data.goodsList[index];
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个商品吗？',
      confirmColor: '#ff6b6b',
      success: async function (res) {
        if (res.confirm) {
          try {
            const db = wx.cloud.database();
            
            // 标记为已删除，而不是真正删除数据
            await db.collection('POST').doc(goods.id).update({
              data: {
                deleted: true,
                deleteTime: db.serverDate()
              }
            });
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            // 从列表中移除
            const goodsList = that.data.goodsList;
            goodsList.splice(index, 1);
            that.setData({ goodsList });
            
          } catch (error) {
            console.error('删除失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  // 获取空数据提示信息
  getNoDataMessage(type) {
    const messageMap = {
      published: '您还没有发布过商品',
      inProgress: '没有进行中的交易',
      completed: '暂无已成交的商品',
      favorites: '暂无收藏的商品',
      default: '暂无数据'
    };
    return messageMap[type] || messageMap.default;
  },

  // 处理商品数据
  processGoodsData(goodsList) {
    return goodsList.map(item => {
      let imageUrl = '/images/default.jpg';
      if (item.images && item.images.length > 0) {
        imageUrl = item.images[0];
      }
      
      // 处理交易类型显示
      let transactionTypeText = '现金';
      if (item.transactionType === 'swap') {
        transactionTypeText = '换物';
      } else if (item.transactionType === 'both') {
        transactionTypeText = '均可';
      }
      
      return {
        id: item._id,
        title: item.title,
        description: item.description,
        price: parseFloat(item.price) || 0,
        image: imageUrl,
        transactionType: transactionTypeText,
        transactionTypeRaw: item.transactionType || 'cash',
        tag: item.categories || [],
        tags: item.categories || [], // 兼容两个字段
        createTime: this.formatTime(item.createTime),
        favoriteTime: item.favoriteTime || null,
        status: item.status || 'selling'
      };
    });
  },

  // 格式化时间
  formatTime(time) {
    if (!time) return '刚刚';
    try {
      if (time && time.$date) {
        const dateStr = time.$date;
        return dateStr.replace('T', ' ').substring(0, 16);
      }
      const date = new Date(time);
      if (isNaN(date.getTime())) {
        return String(time).substring(4, 21);
      }
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    } catch (error) {
      console.error('时间处理错误:', error);
      return String(time).substring(4, 21);
    }
  },

  // 点击商品 - 跳转到详情页
  onGoodsTap(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    
    if (!id) {
      console.error('商品ID为空');
      wx.showToast({
        title: '商品信息错误',
        icon: 'none'
      });
      return;
    }
    
    console.log('点击商品，ID:', id, '索引:', index);
    
    // 如果是收藏页面，需要传递完整的商品数据
    if (this.data.type === 'favorites') {
      const goods = this.data.goodsList[index];
      const goodsData = encodeURIComponent(JSON.stringify(goods));
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}&goodsData=${goodsData}`,
        fail: (err) => {
          console.error('跳转失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    } else {
      wx.navigateTo({
        url: `/pages/detail/detail?id=${id}`,
        fail: (err) => {
          console.error('跳转失败:', err);
          wx.showToast({
            title: '跳转失败',
            icon: 'none'
          });
        }
      });
    }
  },

  // 图片加载失败处理
  onImageError(e) {
    const index = e.currentTarget.dataset.index;
    const key = `goodsList[${index}].image`;
    this.setData({
      [key]: '/images/default.jpg'
    });
  },

  // 搜索点击
  onSearchTap() {
    wx.showToast({
      title: '搜索功能开发中',
      icon: 'none'
    });
  },

  // 编辑商品（收藏页面不显示编辑按钮）
  onEditGoods(e) {
    const index = e.currentTarget.dataset.index;
    const goods = this.data.goodsList[index];
    
    wx.navigateTo({
      url: `/pages/publish/publish?id=${goods.id}&mode=edit`
    });
  },

  // 删除商品（收藏页面不显示删除按钮）
  onDeleteGoods(e) {
    const index = e.currentTarget.dataset.index;
    const goods = this.data.goodsList[index];
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个商品吗？',
      confirmColor: '#ff6b6b',
      success: async function (res) {
        if (res.confirm) {
          try {
            const db = wx.cloud.database();
            
            // 标记为已删除，而不是真正删除数据
            await db.collection('POST').doc(goods.id).update({
              data: {
                deleted: true,
                deleteTime: db.serverDate()
              }
            });
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            // 从列表中移除
            const goodsList = that.data.goodsList;
            goodsList.splice(index, 1);
            that.setData({ goodsList });
            
          } catch (error) {
            console.error('删除失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadGoodsList().finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});