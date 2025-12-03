const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

/**
 * getUserInfo 云函数 - 增强版本
 * 功能：获取当前用户的完整信息
 */
exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    if (!openid) {
      return { 
        success: false, 
        message: 'openid required' 
      };
    }

    console.log('云函数 getUserInfo 被调用，openid:', openid);

    // 尝试多种方式查询用户信息
    let userQuery = null;
    
    // 方式1: 通过 _openid 查询
    try {
      userQuery = await db.collection('users')
        .where({ _openid: openid })
        .get();
      console.log('通过 _openid 查询结果:', userQuery.data.length);
    } catch (err) {
      console.log('通过 _openid 查询失败:', err);
    }

    // 方式2: 如果方式1没找到，尝试通过自定义 openid 字段查询
    if (!userQuery || userQuery.data.length === 0) {
      try {
        userQuery = await db.collection('users')
          .where({ openid: openid })
          .get();
        console.log('通过 openid 字段查询结果:', userQuery.data.length);
      } catch (err) {
        console.log('通过 openid 字段查询失败:', err);
      }
    }

    // 方式3: 如果仍然没找到，创建一个默认用户记录
    if (!userQuery || userQuery.data.length === 0) {
      console.log('用户不存在，创建默认用户记录');
      try {
        // 从微信获取用户基本信息
        const { userInfo } = event;
        const defaultUser = {
          _openid: openid,
          openid: openid,
          nickname: userInfo?.nickName || '上财同学',
          avatarUrl: userInfo?.avatarUrl || '/images/avatar.png',
          avatar: userInfo?.avatarUrl || '/images/avatar.png',
          college: '未知学院',
          isVerified: false,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        };

        const addResult = await db.collection('users').add({
          data: defaultUser
        });
        
        console.log('创建用户记录成功，ID:', addResult._id);
        
        return {
          success: true,
          data: {
            _id: addResult._id,
            _openid: openid,
            openid: openid,
            nickname: defaultUser.nickname,
            avatarUrl: defaultUser.avatarUrl,
            avatar: defaultUser.avatar,
            college: defaultUser.college,
            isVerified: defaultUser.isVerified,
            createTime: defaultUser.createTime
          }
        };
      } catch (createErr) {
        console.error('创建用户记录失败:', createErr);
        return {
          success: false,
          message: '创建用户记录失败'
        };
      }
    }

    // 找到用户记录，返回完整信息
    if (userQuery.data && userQuery.data.length > 0) {
      const userInfo = userQuery.data[0];
      console.log('找到用户记录:', userInfo);
      
      return {
        success: true,
        data: {
          _id: userInfo._id,
          _openid: userInfo._openid || openid,
          openid: userInfo.openid || openid,
          nickname: userInfo.nickname || userInfo.nickName || '上财同学',
          avatarUrl: userInfo.avatarUrl || userInfo.avatar || '/images/avatar.png',
          avatar: userInfo.avatar || userInfo.avatarUrl || '/images/avatar.png',
          college: userInfo.college || '未知学院',
          isVerified: userInfo.isVerified || false,
          createTime: userInfo.createTime
        }
      };
    } else {
      return { 
        success: false, 
        message: '用户信息不存在' 
      };
    }
  } catch (err) {
    console.error('getUserInfo 云函数出错:', err);
    return { 
      success: false, 
      error: err.message 
    };
  }
};