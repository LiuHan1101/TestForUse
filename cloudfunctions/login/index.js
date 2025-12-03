// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const { code } = event;
  
  // 这里可以直接获取openid，不需要appsecret
  const openid = wxContext.OPENID;
  const appid = wxContext.APPID;
  
  // 检查用户是否已存在
  const db = cloud.database();
  const userRes = await db.collection('users')
    .where({ _openid: openid })
    .get();
  
  const isNewUser = userRes.data.length === 0;
  
  // 生成简单token（实际可用更复杂逻辑）
  const token = cloud.getWXContext().OPENID + '_' + Date.now();
  
  return {
    openid,
    appid,
    isNewUser,
    token,
    // 如果是新用户，还没有其他信息
    userInfo: isNewUser ? null : userRes.data[0]
  };
};