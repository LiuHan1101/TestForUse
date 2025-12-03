const cloud = require('wx-server-sdk');
cloud.init();
const db = cloud.database();

/**
 * sendMessage 云函数
 * 输入参数：{ receiverId, type, content, goodsId, orderId, chatId }
 * 主要流程：
 * 1. 计算或使用 chatId
 * 2. 存储消息到 messages 集合
 * 3. 更新或创建 chats（会话）记录的 lastMessage / lastTime
 * 4. 触发 sendNotification 云函数通知接收者（可做模板消息/订阅消息）
 */
exports.main = async (event, context) => {
  try {
    const { receiverId, type = 'text', content = '', goodsId, orderId, chatId: incomingChatId } = event;
    const wxContext = cloud.getWXContext();
    const senderId = wxContext.OPENID;

    if (!receiverId) {
      return { success: false, message: 'receiverId required' };
    }

    // 生成 chatId：两端 id 按字典序排列，附加 goodsId 或 orderId
    let chatId = incomingChatId;
    if (!chatId) {
      const users = [senderId, receiverId].sort();
      chatId = users.join('_');
      if (orderId) chatId += `_${orderId}`;
      else if (goodsId) chatId += `_${goodsId}`;
    }

    const timestamp = new Date().getTime();

    // 构造消息对象
    const messageDoc = {
      chatId,
      senderId,
      receiverId,
      type,
      content,
      imageUrl: type === 'image' ? (event.imageUrl || '') : '',
      fileInfo: event.fileInfo || null,
      read: false,
      timestamp,
      relatedOrderId: orderId || null,
      relatedGoodsId: goodsId || null
    };

    // 存储消息
    const addRes = await db.collection('messages').add({ data: messageDoc });

    // 更新/创建 chats 会话记录，保存最后一条消息和时间
    const chatsColl = db.collection('chats');
    const q = await chatsColl.where({ chatId }).get();
    if (q.data && q.data.length > 0) {
      // 更新
      await chatsColl.where({ chatId }).update({ data: { lastMessage: content, lastTime: timestamp } });
    } else {
      // 创建
      await chatsColl.add({ data: { chatId, participants: [senderId, receiverId], lastMessage: content, lastTime: timestamp, createdAt: timestamp } });
    }

    // 异步触发通知云函数（不阻塞主流程）
    try {
      await cloud.callFunction({
        name: 'sendNotification',
        data: {
          toOpenId: receiverId,
          title: '您有新消息',
          content: content || (type === 'image' ? '[图片]' : ''),
          extra: { chatId }
        }
      });
    } catch (notifyErr) {
      console.warn('发送通知失败：', notifyErr);
    }

    return { success: true, messageId: addRes._id, chatId };
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
};
