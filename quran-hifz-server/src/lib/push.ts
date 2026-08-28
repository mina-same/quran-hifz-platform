import { User } from '../models/User.model';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type PushRecipient = { userId: string; title: string; body: string };

/**
 * Best-effort Expo push notification send — looks up each recipient's stored
 * pushToken (registered by the mobile app post-login via PUT /auth/push-token)
 * and fires a batched request to Expo's push API. Never throws: a push outage
 * must not block the underlying in-app Message save that always happens
 * alongside it.
 */
export async function sendPushToUsers(recipients: PushRecipient[]): Promise<void> {
  if (recipients.length === 0) return;
  try {
    const userIds = recipients.map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds }, pushToken: { $exists: true, $ne: null } }).select('pushToken');
    const tokenById = new Map(users.map((u) => [String(u._id), u.pushToken as string]));

    const messages = recipients
      .filter((r) => tokenById.has(r.userId))
      .map((r) => ({ to: tokenById.get(r.userId)!, title: r.title, body: r.body, sound: 'default' }));

    if (messages.length === 0) return;

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
  } catch {
    // best-effort only
  }
}
