import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { AnalysisReportPDF } from '@/components/AnalysisReportPDF';
import { AnalysisResult } from '@/types/analysis';
import React from 'react';

export async function POST(request: NextRequest) {
    try {
        const analysis: AnalysisResult = await request.json();

        if (!analysis || !analysis.url || !analysis.categories) {
            return NextResponse.json(
                { error: 'Invalid analysis data' },
                { status: 400 }
            );
        }

        // Generate PDF buffer - use type assertion to fix @react-pdf/renderer types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfBuffer = await renderToBuffer(
            React.createElement(AnalysisReportPDF, { analysis }) as any
        );

        // Convert Buffer to Uint8Array for NextResponse
        const uint8Array = new Uint8Array(pdfBuffer);

        // Return PDF as response
        return new NextResponse(uint8Array, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="konverteringsanalys-${new Date().toISOString().split('T')[0]}.pdf"`,
            },
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json(
            { error: 'Failed to generate PDF', details: message },
            { status: 500 }
        );
    }
}
