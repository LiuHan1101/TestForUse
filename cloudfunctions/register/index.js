// cloudfunctions/register/index.js
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()

  // 1. 从事件参数中解构数据
  const { 
    token, // 从login云函数获得的简易token，用于简单验证
    studentId, 
    name, 
    phone, 
    avatarFileID // 小程序端上传图片后得到的文件ID
  } = event

  // 2. (可选) 简单的token验证
  // 这里只是示例，实际应与login函数生成的逻辑对应
  const expectedTokenPrefix = wxContext.OPENID + '_'
  if (!token || !token.startsWith(expectedTokenPrefix)) {
    return { code: 401, message: '身份验证失败，请重新登录' }
  }

  // 3. 构建要存入数据库的用户资料对象
  const userData = {
    _openid: wxContext.OPENID, // 云数据库会自动添加，也可显式写入
    studentId: studentId,
    name: name,
    phone: phone,
    avatar: avatarFileID, // 存储的是云文件ID，不是临时路径
    lastUpdateTime: new Date() // 使用服务器时间
  }

  try {
    // 4. 查询用户是否已有记录（用于更新而非重复创建）
    const userRecord = await db.collection('users').where({
      _openid: wxContext.OPENID
    }).get()

    let result
    if (userRecord.data.length > 0) {
      // 已有记录，更新信息（例如，用户重新填写资料）
      result = await db.collection('users').doc(userRecord.data[0]._id).update({
        data: userData
      })
    } else {
      // 新记录，添加创建时间
      userData.createTime = new Date()
      result = await db.collection('users').add({
        data: userData
      })
    }

    // 5. 返回成功信息
    return {
      code: 0,
      message: '用户信息保存成功',
      data: result
    }

  } catch (err) {
    console.error('云函数[register]执行失败：', err)
    // 6. 返回错误信息
    return {
      code: 500,
      message: '服务器内部错误，信息保存失败'
    }
  }
}