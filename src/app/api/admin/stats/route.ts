import { NextResponse } from 'next/server';
import { getAnalysisStats, seedDemoData, getAllAnalyses } from '@/lib/store';

export async function GET() {
    // Seed demo data if empty (for testing)
    if (getAllAnalyses().length === 0) {
        seedDemoData();
    }

    const stats = getAnalysisStats();
    return NextResponse.json(stats);
}
