import { NextResponse } from 'next/server';
import { getAnalysisStats } from '@/lib/store';

export async function GET() {
    try {
        const stats = await getAnalysisStats();
        return NextResponse.json(stats);
    } catch (error) {
        console.error('Failed to fetch stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch stats' },
            { status: 500 }
        );
    }
}
