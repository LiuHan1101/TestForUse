// cloudfunctions/cleanOrphanFavorites/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 清理孤儿收藏数据
exports.main = async (event, context) => {
  try {
    const db = cloud.database();
    const _ = db.command;
    
    console.log('开始清理孤儿收藏数据...');
    
    // 1. 获取所有收藏记录
    const allFavorites = await db.collection('favorites')
      .field({ postId: true, _id: true })
      .get();
    
    console.log(`共有 ${allFavorites.data.length} 条收藏记录`);
    
    if (allFavorites.data.length === 0) {
      return { success: true, message: '没有收藏记录需要清理' };
    }
    
    // 2. 提取所有postId
    const postIds = allFavorites.data.map(item => item.postId);
    const uniquePostIds = [...new Set(postIds)];
    
    console.log(`需要检查 ${uniquePostIds.length} 个商品`);
    
    // 3. 批量检查商品是否存在
    const validPostIds = [];
    const batchSize = 20;
    
    for (let i = 0; i < uniquePostIds.length; i += batchSize) {
      const batch = uniquePostIds.slice(i, i + batchSize);
      
      const postsRes = await db.collection('POST')
        .where({ _id: _.in(batch) })
        .field({ _id: true })
        .get();
      
      const existingIds = postsRes.data.map(post => post._id);
      validPostIds.push(...existingIds);
    }
    
    // 4. 找出无效的收藏记录
    const invalidFavorites = allFavorites.data.filter(
      fav => !validPostIds.includes(fav.postId)
    );
    
    console.log(`找到 ${invalidFavorites.length} 条无效收藏记录`);
    
    if (invalidFavorites.length === 0) {
      return { success: true, message: '没有无效的收藏记录' };
    }
    
    // 5. 批量删除无效收藏记录
    const deletePromises = invalidFavorites.map(fav =>
      db.collection('favorites').doc(fav._id).remove()
    );
    
    await Promise.all(deletePromises);
    
    console.log(`成功清理 ${invalidFavorites.length} 条孤儿收藏记录`);
    
    return {
      success: true,
      message: `清理了 ${invalidFavorites.length} 条孤儿收藏记录`,
      cleanedCount: invalidFavorites.length
    };
    
  } catch (error) {
    console.error('清理孤儿数据失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};