const DEFAULT_DUTY_NOTE_WHATSAPP_ENDPOINT =
  'https://script.google.com/macros/s/AKfycbz0Axc_vnnLBPsKOZQCE8RHrv2SU9SMyqEcnUYaVUJk5uBlDqLA_qtAlUjTEF0pRyxWdQ/exec';

const DUTY_NOTE_WHATSAPP_ENDPOINT =
  import.meta.env.VITE_DUTY_NOTE_WHATSAPP_ENDPOINT?.trim() ||
  import.meta.env.VITE_WHATSAPP_WEBHOOK_URL?.trim() ||
  DEFAULT_DUTY_NOTE_WHATSAPP_ENDPOINT;

const SARPRAS_WHATSAPP_NUMBERS = import.meta.env.VITE_DUTY_NOTE_SARPRAS_WHATSAPP_NUMBERS?.trim() || '';
const LEADER_WHATSAPP_NUMBER = import.meta.env.VITE_DUTY_NOTE_LEADER_WHATSAPP_NUMBER?.trim() || '+6285102077853';

const splitNumbers = (value: string) => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizePhoneNumber = (value: string) => {
  const compact = value.replace(/[^\d+]/g, '');
  if (!compact) return '';
  if (compact.startsWith('+')) return compact;
  if (compact.startsWith('0')) return `+62${compact.slice(1)}`;
  if (compact.startsWith('62')) return `+${compact}`;
  return compact;
};

const getDutyNoteWhatsAppRecipients = () => {
  const sarprasNumbers = splitNumbers(SARPRAS_WHATSAPP_NUMBERS).map(normalizePhoneNumber);
  const leaderNumber = normalizePhoneNumber(LEADER_WHATSAPP_NUMBER);
  const uniqueNumbers = Array.from(new Set([...sarprasNumbers, leaderNumber].filter(Boolean)));

  return uniqueNumbers.map((phone) => ({
    phone,
    group: phone === leaderNumber ? 'pimpinan' : 'anggota_sarpras',
  }));
};

type DutyNoteWhatsAppPayload = {
  mode: 'created' | 'updated';
  noteId: string;
  senderName: string;
  category: string;
  priority: string;
  message: string;
  followup?: string;
};

export const sendDutyNoteWhatsAppNotification = async (payload: DutyNoteWhatsAppPayload) => {
  const recipients = getDutyNoteWhatsAppRecipients();
  if (recipients.length === 0 || !DUTY_NOTE_WHATSAPP_ENDPOINT) return;

  const messageLines = [
    payload.mode === 'updated' ? '*Update Catatan Piket*' : '*Catatan Piket Baru*',
    `Dari: ${payload.senderName}`,
    `Kategori: ${payload.category}`,
    `Prioritas: ${payload.priority}`,
    `Catatan: ${payload.message}`,
  ];

  if (payload.followup?.trim()) {
    messageLines.push(`Tindak lanjut: ${payload.followup.trim()}`);
  }

  messageLines.push('Buka dashboard Sarpramoklet untuk detail dan tindak lanjut.');

  try {
    await fetch(DUTY_NOTE_WHATSAPP_ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'SEND_WHATSAPP_NOTIFICATION',
        channel: 'whatsapp',
        scope: 'duty_notes',
        recipients,
        phones: recipients.map((recipient) => recipient.phone),
        message: messageLines.join('\n'),
        note: payload,
      }),
    });
  } catch (error) {
    console.warn('Duty note WhatsApp notification failed:', error);
  }
};
