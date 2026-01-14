import { NextRequest, NextResponse } from 'next/server';
import { getAnalysisById } from '@/lib/store';

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID required' }, { status: 400 });
    }

    try {
        const analysis = await getAnalysisById(id);

        if (!analysis) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 });
        }

        return NextResponse.json(analysis);
    } catch (error) {
        console.error('Failed to fetch report:', error);
        return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 });
    }
}
