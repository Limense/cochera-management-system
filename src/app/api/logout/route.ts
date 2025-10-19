import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, reason = 'manual' } = await request.json()
    
    // Log the logout attempt for debugging
    console.log(`Logout attempt for user ${userId} with reason: ${reason}`)
    
    // For now, we'll just return success
    // The actual logout will be handled by the client-side hooks
    return NextResponse.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      userId,
      reason
    })
  } catch (error) {
    console.error('Error in logout API:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

// Método GET para verificar estado
export async function GET() {
  return NextResponse.json({ 
    message: 'Logout API endpoint',
    timestamp: new Date().toISOString()
  })
}