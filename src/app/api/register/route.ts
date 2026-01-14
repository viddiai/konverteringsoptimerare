import { NextRequest, NextResponse } from 'next/server';
import { storeAnalysis } from '@/lib/store';
import { AnalysisResult } from '@/types/analysis';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { analysis, email, firstName } = body as {
            analysis: AnalysisResult;
            email: string;
            firstName: string;
        };

        if (!analysis || !email || !firstName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const stored = await storeAnalysis(analysis, email, firstName);

        return NextResponse.json({ success: true, id: stored.id });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json(
            { error: 'Failed to save registration' },
            { status: 500 }
        );
    }
}
