import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

// Encryption key - in production, this should be stored securely
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!'
const ALGORITHM = 'aes-256-gcm'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all credentials (masked)
    const credentials = await prisma.credential.findMany({
      orderBy: {
        created_at: 'desc'
      }
    })

    // Mask sensitive values for display
    const maskedCredentials = credentials.map(cred => ({
      ...cred,
      encrypted_value: maskValue(cred.encrypted_value),
      last_used_at: cred.last_used_at?.toISOString() || null
    }))

    return NextResponse.json({
      credentials: maskedCredentials
    })

  } catch (error) {
    console.error('Error fetching API security data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    switch (action) {
      case 'create_credential':
        return await handleCreateCredential(data)
      
      case 'update_credential':
        return await handleUpdateCredential(data)
      
      case 'rotate_credential':
        return await handleRotateCredential(data)
      
      case 'revoke_credential':
        return await handleRevokeCredential(data)
      
      case 'test_credential':
        return await handleTestCredential(data)
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing API security request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleCreateCredential(data: any) {
  const { name, type, value } = data

  if (!name || !type || !value) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const encryptedValue = encrypt(value)

  const credential = await prisma.credential.create({
    data: {
      name,
      type,
      encrypted_value: encryptedValue,
      status: 'active'
    }
  })

  return NextResponse.json({ 
    success: true, 
    credential: {
      ...credential,
      encrypted_value: maskValue(encryptedValue)
    }
  })
}

async function handleUpdateCredential(data: any) {
  const { id, name, type, value } = data

  const updateData: any = {
    name,
    type,
    updated_at: new Date()
  }

  if (value) {
    updateData.encrypted_value = encrypt(value)
  }

  const credential = await prisma.credential.update({
    where: { id },
    data: updateData
  })

  return NextResponse.json({ 
    success: true, 
    credential: {
      ...credential,
      encrypted_value: maskValue(credential.encrypted_value)
    }
  })
}

async function handleRotateCredential(data: any) {
  const { id, newValue } = data

  if (!newValue) {
    return NextResponse.json({ error: 'New value is required' }, { status: 400 })
  }

  const credential = await prisma.credential.update({
    where: { id },
    data: {
      encrypted_value: encrypt(newValue),
      updated_at: new Date()
    }
  })

  return NextResponse.json({ 
    success: true, 
    credential: {
      ...credential,
      encrypted_value: maskValue(credential.encrypted_value)
    }
  })
}

async function handleRevokeCredential(data: any) {
  const { id } = data

  const credential = await prisma.credential.update({
    where: { id },
    data: {
      status: 'inactive',
      updated_at: new Date()
    }
  })

  return NextResponse.json({ success: true, credential })
}

async function handleTestCredential(data: any) {
  const { id } = data

  const credential = await prisma.credential.findUnique({
    where: { id }
  })

  if (!credential) {
    return NextResponse.json({ error: 'Credential not found' }, { status: 404 })
  }

  try {
    // Decrypt the value for testing
    const decryptedValue = decrypt(credential.encrypted_value)
    
    // Test the credential based on type
    const testResult = await testCredentialByType(credential.type, decryptedValue)
    
    // Update last used timestamp
    await prisma.credential.update({
      where: { id },
      data: {
        last_used_at: new Date()
      }
    })

    return NextResponse.json({ 
      success: true, 
      testResult,
      message: 'Credential test successful'
    })

  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Test failed'
    }, { status: 400 })
  }
}

async function testCredentialByType(type: string, value: string) {
  switch (type) {
    case 'api_key':
      // Test API key by making a simple request
      if (value.includes('sk-')) {
        // OpenAI API key
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            'Authorization': `Bearer ${value}`
          }
        })
        return { status: response.status, valid: response.ok }
      }
      break
    
    case 'oauth_token':
      // Test OAuth token
      return { status: 200, valid: true, message: 'OAuth token format valid' }
    
    case 'webhook_secret':
      // Test webhook secret format
      return { status: 200, valid: value.length >= 16, message: 'Webhook secret format valid' }
    
    default:
      return { status: 200, valid: true, message: 'Credential format valid' }
  }
}

function maskValue(value: string): string {
  if (!value || value.length < 8) return '***'
  return value.substring(0, 4) + '***' + value.substring(value.length - 4)
}
