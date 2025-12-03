const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

/**
 * updateUserInfo 云函数
 * 功能：更新或创建用户信息
 * 输入参数：{ openid, nickname, avatarUrl, phoneNumber, email }
 */
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { success: false, message: 'openid required' };
    }

    const { nickname, avatarUrl, phoneNumber, email } = event;

    // 检查用户是否已存在
    const userQuery = await db.collection('users').where({ openid }).get();

    if (userQuery.data.length > 0) {
      // 更新用户信息
      await db.collection('users').where({ openid }).update({
        data: { nickname, avatarUrl, phoneNumber, email, updatedAt: new Date() }
      });
      return { success: true, message: '用户信息已更新' };
    } else {
      // 创建新用户
      await db.collection('users').add({
        data: { openid, nickname, avatarUrl, phoneNumber, email, createdAt: new Date(), updatedAt: new Date() }
      });
      return { success: true, message: '用户信息已创建' };
    }
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
};