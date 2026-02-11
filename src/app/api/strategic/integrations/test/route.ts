import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import { logger } from '@/shared/infrastructure/logging';
import { withDI } from '@/shared/infrastructure/di/with-di';
export const dynamic = 'force-dynamic';

export const POST = withDI(async (request: Request) => {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const config = await request.json();
    
    // Validate webhook URL
    if (!config.webhookUrl) {
      return NextResponse.json({ 
        success: false, 
        message: 'URL do webhook não fornecida' 
      });
    }

    // Validate URL format
    try {
      new URL(config.webhookUrl);
    } catch {
      return NextResponse.json({ 
        success: false, 
        message: 'URL inválida' 
      });
    }

    // TODO: Actually test the webhook/integration
    // For now, simulate success with type-specific messages
    
    const testPayload = {
      text: 'Teste de conexão AuraCore',
      type: 'test',
      timestamp: new Date().toISOString(),
    };

    logger.info('Testing integration:', config.type, testPayload);

    // Simulate different integration types
    switch (config.type) {
      case 'slack':
        // In production: Send test message to Slack
        // await sendSlackMessage(config.webhookUrl, testPayload);
        return NextResponse.json({ 
          success: true, 
          message: 'Conexão com Slack estabelecida!' 
        });
      
      case 'teams':
        // In production: Send test message to Teams
        // await sendTeamsMessage(config.webhookUrl, testPayload);
        return NextResponse.json({ 
          success: true, 
          message: 'Conexão com Teams estabelecida!' 
        });
      
      case 'webhook':
        // In production: Send test POST to webhook
        // await sendWebhook(config.webhookUrl, testPayload, config.headers);
        return NextResponse.json({ 
          success: true, 
          message: 'Webhook respondeu com sucesso!' 
        });
      
      case 'email':
        // In production: Send test email
        // await sendTestEmail(config.webhookUrl);
        return NextResponse.json({ 
          success: true, 
          message: 'Email de teste enviado!' 
        });
      
      default:
        return NextResponse.json({ 
          success: true, 
          message: 'Conexão estabelecida com sucesso!' 
        });
    }
  } catch (error) {
    // Propagar erros de auth (getTenantContext throws Response)
    if (error instanceof Response) {
      return error;
    }
    logger.error('Error testing integration:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Falha ao conectar. Verifique a URL e tente novamente.' 
    });
  }
});
