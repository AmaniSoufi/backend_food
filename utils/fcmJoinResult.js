const admin = require('firebase-admin');

/**
 * Notify applicant of join-request decision (accept / reject).
 */
async function sendJoinRequestResultNotification(fcmToken, accepted) {
  if (!fcmToken || !String(fcmToken).trim()) {
    console.log('No FCM token — skip join-request result push');
    return;
  }
  if (!admin.apps || admin.apps.length === 0) {
    console.log('Firebase Admin not initialized — skip join-request push');
    return;
  }

  const title = accepted ? 'تم قبول طلب انضمامك' : 'تم رفض طلب الانضمام';
  const body = accepted
    ? 'تم قبول طلبك! راجع بريدك أو تواصل مع الإدارة لاستلام كلمة المرور ثم سجّل الدخول.'
    : 'نأسف، تم رفض طلب الانضمام من قبل إدارة التطبيق.';

  try {
    await admin.messaging().send({
      token: String(fcmToken).trim(),
      notification: { title, body },
      data: {
        type: 'join_request_result',
        accepted: accepted ? 'true' : 'false',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'food_delivery_channel',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: { sound: 'default' },
        },
      },
    });
    console.log('Join-request result FCM sent');
  } catch (e) {
    console.error('Join-request FCM error:', e.message);
  }
}

module.exports = { sendJoinRequestResultNotification };
