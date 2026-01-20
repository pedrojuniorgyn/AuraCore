/**
 * Slack Integration Module
 * 
 * Handles sending notifications to Slack via Incoming Webhooks.
 * @see https://api.slack.com/messaging/webhooks
 */

export interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

export interface SlackBlock {
  type: 'section' | 'divider' | 'header' | 'context' | 'actions';
  text?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  };
  fields?: {
    type: 'mrkdwn' | 'plain_text';
    text: string;
  }[];
  accessory?: {
    type: 'button' | 'image';
    text?: {
      type: 'plain_text';
      text: string;
    };
    url?: string;
    image_url?: string;
    alt_text?: string;
  };
}

export interface SlackAttachment {
  color?: string;
  fallback?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: {
    title: string;
    value: string;
    short?: boolean;
  }[];
  footer?: string;
  ts?: number;
}

export type MessageFormat = 'compact' | 'detailed' | 'rich';

interface SendSlackMessageOptions {
  webhookUrl: string;
  message: SlackMessage;
}

/**
 * Send a message to Slack via Incoming Webhook
 */
export async function sendSlackMessage({ 
  webhookUrl, 
  message 
}: SendSlackMessageOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Slack error: ${text}` };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Format a notification event for Slack
 */
export function formatSlackNotification(
  eventType: string,
  data: Record<string, unknown>,
  format: MessageFormat = 'detailed'
): SlackMessage {
  const eventLabels: Record<string, string> = {
    'kpi.critical': '🚨 Alerta Crítico',
    'kpi.target_reached': '🎯 Meta Atingida',
    'action.overdue': '⚠️ Ação Atrasada',
    'action.completed': '✅ Ação Concluída',
    'achievement.unlocked': '🏆 Conquista Desbloqueada',
    'report.generated': '📊 Relatório Gerado',
  };

  const title = eventLabels[eventType] || eventType;
  const description = String(data.description || data.message || '');
  const link = String(data.link || '');

  if (format === 'compact') {
    return { text: `${title}: ${description}` };
  }

  if (format === 'detailed') {
    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: { type: 'plain_text', text: title },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: description },
      },
    ];

    if (link) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `<${link}|Ver detalhes>` },
      });
    }

    return { text: title, blocks };
  }

  // Rich format with attachments
  return {
    text: title,
    attachments: [
      {
        color: eventType.includes('critical') || eventType.includes('overdue') 
          ? '#ef4444' 
          : '#22c55e',
        title,
        text: description,
        title_link: link || undefined,
        fields: Object.entries(data)
          .filter(([key]) => !['description', 'message', 'link'].includes(key))
          .slice(0, 5)
          .map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true,
          })),
        footer: 'AuraCore Strategic',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}
