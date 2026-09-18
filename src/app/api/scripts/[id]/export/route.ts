import { NextResponse, type NextRequest } from 'next/server'
import { requireApiUser, UnauthorizedError } from '@/lib/auth/guard'
import { getScript } from '@/lib/data'
import { recordEvent } from '@/lib/learning'
import { scriptToPlainText } from '@/lib/scripts/prompts'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireApiUser()
    const script = await getScript(user.id, params.id)
    if (!script) return NextResponse.json({ error: 'That script was not found.' }, { status: 404 })

    const format = request.nextUrl.searchParams.get('format') ?? 'txt'
    await recordEvent(user.id, 'script.exported', { format })

    const safeName = script.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'bhasika-script'

    if (format === 'json') {
      return new NextResponse(JSON.stringify(script, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${safeName}.json"`,
        },
      })
    }

    return new NextResponse(scriptToPlainText(script), {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}.txt"`,
      },
    })
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'The export failed. Please try again.' }, { status: 500 })
  }
}
