/**
 * Microsoft Teams Integration Module
 * 
 * Handles sending notifications to Teams via Incoming Webhooks (Connectors).
 * @see https://docs.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors
 */

export interface TeamsMessage {
  '@type': 'MessageCard';
  '@context': 'http://schema.org/extensions';
  themeColor?: string;
  summary: string;
  sections?: TeamsSection[];
  potentialAction?: TeamsAction[];
}

export interface TeamsSection {
  activityTitle?: string;
  activitySubtitle?: string;
  activityImage?: string;
  facts?: { name: string; value: string }[];
  text?: string;
  markdown?: boolean;
}

export interface TeamsAction {
  '@type': 'OpenUri' | 'HttpPOST' | 'ActionCard';
  name: string;
  targets?: { os: string; uri: string }[];
}

export type MessageFormat = 'compact' | 'detailed' | 'rich';

interface SendTeamsMessageOptions {
  webhookUrl: string;
  message: TeamsMessage;
}

/**
 * Send a message to Microsoft Teams via Incoming Webhook
 */
export async function sendTeamsMessage({ 
  webhookUrl, 
  message 
}: SendTeamsMessageOptions): Promise<{ success: boolean; error?: string }> {
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
      return { success: false, error: `Teams error: ${text}` };
    }

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Format a notification event for Microsoft Teams
 */
export function formatTeamsNotification(
  eventType: string,
  data: Record<string, unknown>,
  format: MessageFormat = 'detailed'
): TeamsMessage {
  const eventLabels: Record<string, { title: string; color: string }> = {
    'kpi.critical': { title: '🚨 Alerta Crítico', color: 'ef4444' },
    'kpi.target_reached': { title: '🎯 Meta Atingida', color: '22c55e' },
    'action.overdue': { title: '⚠️ Ação Atrasada', color: 'eab308' },
    'action.completed': { title: '✅ Ação Concluída', color: '22c55e' },
    'achievement.unlocked': { title: '🏆 Conquista Desbloqueada', color: 'a855f7' },
    'report.generated': { title: '📊 Relatório Gerado', color: '3b82f6' },
  };

  const eventConfig = eventLabels[eventType] || { title: eventType, color: '6366f1' };
  const description = String(data.description || data.message || '');
  const link = String(data.link || '');

  if (format === 'compact') {
    return {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor: eventConfig.color,
      summary: `${eventConfig.title}: ${description}`,
    };
  }

  const sections: TeamsSection[] = [
    {
      activityTitle: eventConfig.title,
      activitySubtitle: new Date().toLocaleString('pt-BR'),
      text: description,
      markdown: true,
    },
  ];

  if (format === 'rich') {
    // Add facts (key-value pairs)
    const facts = Object.entries(data)
      .filter(([key]) => !['description', 'message', 'link'].includes(key))
      .slice(0, 5)
      .map(([key, value]) => ({ name: key, value: String(value) }));

    if (facts.length > 0) {
      sections.push({ facts });
    }
  }

  const message: TeamsMessage = {
    '@type': 'MessageCard',
    '@context': 'http://schema.org/extensions',
    themeColor: eventConfig.color,
    summary: eventConfig.title,
    sections,
  };

  // Add action button if link is provided
  if (link) {
    message.potentialAction = [
      {
        '@type': 'OpenUri',
        name: 'Ver detalhes',
        targets: [{ os: 'default', uri: link }],
      },
    ];
  }

  return message;
}
