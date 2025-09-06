
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

// Test API integration
export async function POST(request: NextRequest) {
  try {
    const { keyName } = await request.json();

    if (!keyName) {
      return NextResponse.json(
        { error: 'keyName is required' },
        { status: 400 }
      );
    }

    // Get the API key from database
    const setting = await prisma.apiSettings.findUnique({
      where: { key_name: keyName }
    });

    if (!setting || !setting.key_value) {
      return NextResponse.json({
        success: false,
        message: 'API key not found or empty'
      });
    }

    // Test the integration based on key type
    let testResult: TestResult;

    switch (keyName) {
      case 'abacusai_api_key':
        testResult = await testAbacusAI(setting.key_value);
        break;
      case 'openai_api_key':
        testResult = await testOpenAI(setting.key_value);
        break;
      case 'google_analytics_id':
        testResult = await testGoogleAnalytics(setting.key_value);
        break;
      case 'google_search_console_key':
        testResult = await testGoogleSearchConsole(setting.key_value);
        break;
      case 'instagram_access_token':
        testResult = await testInstagram(setting.key_value);
        break;
      case 'tiktok_access_token':
        testResult = await testTikTok(setting.key_value);
        break;
      case 'smtp_host':
        testResult = await testSMTP(keyName);
        break;
      case 'database_url':
        testResult = await testDatabase(setting.key_value);
        break;
      default:
        testResult = {
          success: false,
          message: `No test implementation for ${keyName}`
        };
    }

    // Update test status in database
    await prisma.apiSettings.update({
      where: { key_name: keyName },
      data: {
        test_status: testResult.success ? 'success' : 'failed',
        last_tested: new Date()
      }
    });

    return NextResponse.json(testResult);

  } catch (error) {
    console.error('Integration test failed:', error);
    return NextResponse.json({
      success: false,
      message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

async function testAbacusAI(apiKey: string): Promise<TestResult> {
  try {
    const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Test connection. Reply with "OK"' }
        ],
        max_tokens: 10
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'AbacusAI API connection successful',
        details: { model: 'gpt-4o-mini', response: data.choices?.[0]?.message?.content }
      };
    } else {
      return {
        success: false,
        message: `AbacusAI API error: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `AbacusAI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function testOpenAI(apiKey: string): Promise<TestResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (response.ok) {
      return {
        success: true,
        message: 'OpenAI API connection successful'
      };
    } else {
      return {
        success: false,
        message: `OpenAI API error: ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `OpenAI connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function testGoogleAnalytics(measurementId: string): Promise<TestResult> {
  // Basic validation of GA4 measurement ID format
  if (measurementId.startsWith('G-') && measurementId.length >= 10) {
    return {
      success: true,
      message: 'Google Analytics ID format is valid'
    };
  } else {
    return {
      success: false,
      message: 'Invalid Google Analytics ID format (should start with G-)'
    };
  }
}

async function testGoogleSearchConsole(serviceAccountKey: string): Promise<TestResult> {
  try {
    // Try to parse as JSON
    const keyData = JSON.parse(serviceAccountKey);
    
    if (keyData.type === 'service_account' && keyData.client_email && keyData.private_key) {
      return {
        success: true,
        message: 'Google Search Console service account key is valid',
        details: { email: keyData.client_email }
      };
    } else {
      return {
        success: false,
        message: 'Invalid service account key format'
      };
    }
  } catch {
    return {
      success: false,
      message: 'Service account key must be valid JSON'
    };
  }
}

async function testInstagram(accessToken: string): Promise<TestResult> {
  try {
    const response = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`);
    
    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Instagram API connection successful',
        details: { username: data.username, id: data.id }
      };
    } else {
      return {
        success: false,
        message: `Instagram API error: ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Instagram connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function testTikTok(accessToken: string): Promise<TestResult> {
  try {
    // TikTok API test (simplified)
    const response = await fetch('https://open-api.tiktok.com/oauth/userinfo/', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.ok) {
      return {
        success: true,
        message: 'TikTok API connection successful'
      };
    } else {
      return {
        success: false,
        message: `TikTok API error: ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `TikTok connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function testSMTP(keyName: string): Promise<TestResult> {
  try {
    // Get SMTP settings
    const smtpSettings = await prisma.apiSettings.findMany({
      where: {
        key_name: {
          in: ['smtp_host', 'smtp_port', 'smtp_username', 'smtp_password']
        }
      }
    });

    const settings: Record<string, string> = {};
    smtpSettings.forEach((s: any) => {
      settings[s.key_name] = s.key_value;
    });

    if (!settings.smtp_host || !settings.smtp_username || !settings.smtp_password) {
      return {
        success: false,
        message: 'SMTP configuration incomplete. Need host, username, and password.'
      };
    }

    // Basic validation (actual SMTP test would require nodemailer)
    return {
      success: true,
      message: `SMTP configuration appears valid for ${settings.smtp_host}`,
      details: { host: settings.smtp_host, port: settings.smtp_port || '587' }
    };

  } catch (error) {
    return {
      success: false,
      message: `SMTP test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function testDatabase(databaseUrl: string): Promise<TestResult> {
  try {
    // Test database connection by running a simple query
    await prisma.$queryRaw`SELECT 1 as test`;
    
    return {
      success: true,
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      success: false,
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
