const cloud = require('wx-server-sdk');
cloud.init();

/**
 * sendNotification 云函数（模板消息/订阅消息占位实现）
 * 输入参数：{ toOpenId, title, content, extra }
 * 注意：真正发送订阅消息需要在小程序后台申请模板并获得用户订阅权限，模板 ID 请替换为真实值。
 */
exports.main = async (event, context) => {
  try {
    const { toOpenId, title = '', content = '', extra = {} } = event;
    if (!toOpenId) return { success: false, message: 'toOpenId required' };

    // 占位：调用小程序订阅消息接口（需要在云函数环境下使用 openapi）
    try {
      const res = await cloud.openapi.subscribeMessage.send({
        touser: toOpenId,
        page: `pages/chatdetail/chatdetail?chatId=${extra.chatId || ''}`,
        // TODO: 请替换以下 templateId 为真实申请到的模板 ID
        templateId: process.env.TEMPLATE_ID || 'TEMPLATE_ID_PLACEHOLDER',
        data: {
          thing1: { value: title },
          thing2: { value: content }
        }
      });
      return { success: true, res };
    } catch (openapiErr) {
      console.warn('openapi subscribeMessage 发送失败：', openapiErr);
      // 记录日志到数据库，以便后续重试或人工处理
      const db = cloud.database();
      await db.collection('notificationLogs').add({ data: { toOpenId, title, content, extra, error: String(openapiErr), createdAt: new Date().getTime() } });
      return { success: false, error: String(openapiErr) };
    }
  } catch (err) {
    console.error(err);
    return { success: false, error: err.message };
  }
};
