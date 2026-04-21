export const ACTION_NOTIFICATIONS_STORAGE_KEY = 'sarpramoklet.actionNotifications';
export const ACTION_NOTIFICATIONS_EVENT = 'sarpramoklet:actionNotificationsChanged';

const MAX_ACTION_NOTIFICATIONS = 25;
const ACTION_NOTIFICATION_TTL = 1000 * 60 * 60 * 24 * 7;

export type ActionNotificationIconKey =
  | 'message'
  | 'alert'
  | 'heart'
  | 'edit'
  | 'trash'
  | 'upload';

export type ActionNotificationRecord = {
  id: string;
  dedupeKey?: string;
  type: string;
  title: string;
  message: string;
  path: string;
  timestamp: number;
  date?: string;
  iconKey?: ActionNotificationIconKey;
  color?: string;
  bg?: string;
};

const canUseWindow = () => typeof window !== 'undefined';

const normalizeNotifications = (items: unknown): ActionNotificationRecord[] => {
  if (!Array.isArray(items)) return [];

  const now = Date.now();

  return items
    .filter((item): item is ActionNotificationRecord => {
      if (!item || typeof item !== 'object') return false;

      const candidate = item as Partial<ActionNotificationRecord>;
      return Boolean(candidate.id && candidate.title && candidate.message && candidate.path);
    })
    .filter((item) => now - Number(item.timestamp || 0) <= ACTION_NOTIFICATION_TTL)
    .sort((left, right) => Number(right.timestamp || 0) - Number(left.timestamp || 0))
    .slice(0, MAX_ACTION_NOTIFICATIONS);
};

export const getActionNotifications = (): ActionNotificationRecord[] => {
  if (!canUseWindow()) return [];

  try {
    const raw = window.localStorage.getItem(ACTION_NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];

    const normalized = normalizeNotifications(JSON.parse(raw));
    window.localStorage.setItem(ACTION_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    console.error('Failed to read action notifications:', error);
    return [];
  }
};

export const pushActionNotification = (
  input: Omit<ActionNotificationRecord, 'timestamp' | 'date'> & {
    timestamp?: number;
    date?: string;
  }
) => {
  if (!canUseWindow()) return;

  const timestamp = input.timestamp || Date.now();
  const nextItem: ActionNotificationRecord = {
    ...input,
    timestamp,
    date: input.date || new Date(timestamp).toISOString(),
  };

  const existing = getActionNotifications();
  const next = normalizeNotifications([
    nextItem,
    ...existing.filter(
      (item) =>
        item.id !== nextItem.id &&
        (!nextItem.dedupeKey || item.dedupeKey !== nextItem.dedupeKey)
    ),
  ]);

  try {
    window.localStorage.setItem(ACTION_NOTIFICATIONS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(
      new CustomEvent(ACTION_NOTIFICATIONS_EVENT, {
        detail: nextItem,
      })
    );
  } catch (error) {
    console.error('Failed to persist action notification:', error);
  }
};
