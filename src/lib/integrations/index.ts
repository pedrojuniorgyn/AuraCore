/**
 * Integrations Module
 * 
 * Exports all integration utilities for Slack, Teams, and custom webhooks.
 */

// Slack
export { 
  sendSlackMessage, 
  formatSlackNotification,
  type SlackMessage,
  type SlackBlock,
  type SlackAttachment,
  type MessageFormat as SlackMessageFormat,
} from './slack';

// Teams
export { 
  sendTeamsMessage, 
  formatTeamsNotification,
  type TeamsMessage,
  type TeamsSection,
  type TeamsAction,
  type MessageFormat as TeamsMessageFormat,
} from './teams';

// Webhook
export {
  sendWebhook,
  generateSignature,
  applyTemplate,
  validateSignature,
  type WebhookPayload,
  type WebhookConfig,
} from './webhook';
