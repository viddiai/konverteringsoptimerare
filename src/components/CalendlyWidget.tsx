'use client';

import Script from "next/script";

export default function CalendlyWidget() {
    return (
        <Script
            src="https://assets.calendly.com/assets/external/widget.js"
            strategy="lazyOnload"
            onLoad={() => {
                // @ts-expect-error Calendly is loaded from external script
                if (typeof Calendly !== 'undefined') {
                    // @ts-expect-error Calendly is loaded from external script
                    Calendly.initBadgeWidget({
                        url: 'https://calendly.com/stefan-245/30min',
                        text: 'Boka konsultation: få fler kvalificerade leads →',
                        color: '#10b981',
                        textColor: '#ffffff',
                        branding: false
                    });
                }
            }}
        />
    );
}
