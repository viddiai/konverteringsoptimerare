import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Link } from '@react-pdf/renderer';
import { AnalysisResult } from '@/types/analysis';

// Register fonts
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 'normal' },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 'bold' },
    ],
});

// Portalfabriken Dark Theme Colors
const colors = {
    background: '#0d1117',
    cardBg: '#161b22',
    white: '#ffffff',
    white90: '#e5e5e5',
    white70: '#b3b3b3',
    white50: '#808080',
    white30: '#4d4d4d',
    white10: '#1a1a1a',
    emerald: '#10b981',
    emeraldLight: '#34d399',
    emeraldDark: '#059669',
    red: '#ef4444',
    redLight: '#fca5a5',
    redBg: 'rgba(239, 68, 68, 0.1)',
    yellow: '#eab308',
    yellowLight: '#fde047',
    yellowBg: 'rgba(234, 179, 8, 0.1)',
    border: '#30363d',
};

const styles = StyleSheet.create({
    page: {
        padding: 0,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: colors.background,
    },
    content: {
        padding: 40,
        paddingTop: 30,
    },
    // Header
    header: {
        backgroundColor: colors.cardBg,
        padding: 30,
        paddingBottom: 25,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 36,
        height: 36,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 16,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: 2,
    },
    headerUrl: {
        fontSize: 9,
        color: colors.white50,
    },
    // Score Section
    scoreSection: {
        backgroundColor: colors.cardBg,
        marginHorizontal: 40,
        marginTop: 20,
        padding: 30,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    scoreNumber: {
        fontSize: 56,
        fontWeight: 'bold',
    },
    scoreMax: {
        fontSize: 20,
        color: colors.white30,
    },
    scoreCategory: {
        fontSize: 16,
        color: colors.white70,
        marginTop: 8,
        marginBottom: 15,
    },
    progressBarBg: {
        width: '60%',
        height: 8,
        backgroundColor: colors.cardBg,
        borderRadius: 4,
        marginBottom: 20,
        overflow: 'hidden',
    },
    progressBar: {
        height: 8,
        backgroundColor: colors.emerald,
        borderRadius: 4,
    },
    summary: {
        fontSize: 10,
        color: colors.white50,
        textAlign: 'center',
        lineHeight: 1.6,
        maxWidth: '90%',
    },
    dateText: {
        fontSize: 8,
        color: colors.white30,
        marginTop: 15,
    },
    // Section Headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 25,
    },
    sectionDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.white70,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    // Category Cards
    categoryCard: {
        backgroundColor: colors.cardBg,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 1,
        overflow: 'hidden',
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    categoryIconBox: {
        width: 28,
        height: 28,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryIcon: {
        fontSize: 12,
    },
    categoryName: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.white,
    },
    categoryScore: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    // Problem Boxes
    problemsContainer: {
        padding: 14,
    },
    problemBox: {
        backgroundColor: colors.background,
        borderRadius: 6,
        padding: 12,
        marginBottom: 8,
    },
    problemLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: 4,
    },
    problemText: {
        fontSize: 9,
        color: colors.white70,
        lineHeight: 1.5,
        marginBottom: 10,
    },
    recommendationLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.emerald,
        marginBottom: 4,
    },
    recommendationText: {
        fontSize: 9,
        color: colors.emerald,
        lineHeight: 1.5,
    },
    // Strengths Section
    strengthCard: {
        backgroundColor: colors.cardBg,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        overflow: 'hidden',
    },
    strengthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    strengthLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    strengthIconBox: {
        width: 26,
        height: 26,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    strengthName: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.white,
    },
    strengthScore: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.emerald,
    },
    strengthReasonContainer: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    strengthReason: {
        fontSize: 9,
        color: colors.white70,
        lineHeight: 1.5,
    },
    // Action List
    actionCard: {
        backgroundColor: colors.cardBg,
        borderRadius: 10,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    actionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    actionNumber: {
        width: 20,
        height: 20,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    actionNumberText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    actionText: {
        flex: 1,
        fontSize: 9,
        color: colors.white70,
        lineHeight: 1.5,
    },
    // CTA Section
    ctaSection: {
        backgroundColor: colors.cardBg,
        borderRadius: 10,
        padding: 25,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        alignItems: 'center',
    },
    ctaIconBox: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    ctaIcon: {
        fontSize: 18,
    },
    ctaTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: 8,
    },
    ctaText: {
        fontSize: 10,
        color: colors.white50,
        textAlign: 'center',
        marginBottom: 15,
    },
    ctaButton: {
        backgroundColor: colors.emerald,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    ctaButtonText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.white,
    },
    ctaLink: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.emerald,
        textDecoration: 'underline',
    },
    // Footer
    footer: {
        textAlign: 'center',
        marginTop: 25,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerText: {
        fontSize: 8,
        color: colors.white30,
    },
});

const getScoreColor = (score: number) => {
    if (score < 2) return colors.red;
    if (score < 3) return '#ea580c';
    if (score < 3.5) return colors.yellow;
    if (score < 4.5) return colors.emerald;
    return colors.emeraldDark;
};

interface AnalysisReportPDFProps {
    analysis: AnalysisResult;
}

export const AnalysisReportPDF: React.FC<AnalysisReportPDFProps> = ({ analysis }) => {
    const criticalCategories = analysis.categories.filter(c => c.status === 'critical');
    const improvementCategories = analysis.categories.filter(c =>
        c.status === 'improvement' || c.status === 'neutral' || c.status === 'not_identified'
    );
    const goodCategories = analysis.categories.filter(c => c.status === 'good');

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <View style={styles.headerLeft}>
                            <View style={styles.iconBox}>
                                <Text style={styles.iconText}>📊</Text>
                            </View>
                            <View>
                                <Text style={styles.headerTitle}>Konverteringsanalys</Text>
                                <Text style={styles.headerUrl}>{analysis.url}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Score Section */}
                <View style={styles.scoreSection}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.scoreNumber, { color: getScoreColor(analysis.overall_score) }]}>
                            {analysis.overall_score_rounded}
                        </Text>
                        <Text style={styles.scoreMax}> / 5</Text>
                    </View>
                    <Text style={styles.scoreCategory}>{analysis.overall_category}</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBar, { width: `${(analysis.overall_score / 5) * 100}%` }]} />
                    </View>
                    <Text style={styles.summary}>{analysis.overall_summary}</Text>
                    <Text style={styles.dateText}>
                        Genererad: {new Date(analysis.analyzed_at).toLocaleDateString('sv-SE')}
                    </Text>
                </View>

                <View style={styles.content}>
                    {/* Critical Issues */}
                    {criticalCategories.length > 0 && (
                        <>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionDot, { backgroundColor: colors.red }]} />
                                <Text style={styles.sectionTitle}>Kritiska problem</Text>
                            </View>
                            {criticalCategories.map(category => (
                                <View key={category.id} style={[styles.categoryCard, { borderColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                    <View style={styles.categoryHeader}>
                                        <View style={styles.categoryLeft}>
                                            <View style={[styles.categoryIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                                <Text style={styles.categoryIcon}>{category.icon}</Text>
                                            </View>
                                            <Text style={styles.categoryName}>{category.name}</Text>
                                        </View>
                                        <Text style={[styles.categoryScore, { color: colors.red }]}>
                                            {category.score}/5
                                        </Text>
                                    </View>
                                    <View style={styles.problemsContainer}>
                                        {category.problems.map((problem, i) => (
                                            <View key={i} style={styles.problemBox}>
                                                <Text style={styles.problemLabel}>Problem:</Text>
                                                <Text style={styles.problemText}>{problem.description}</Text>
                                                <Text style={styles.recommendationLabel}>Rekommendation:</Text>
                                                <Text style={styles.recommendationText}>{problem.recommendation}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    {/* Improvement Opportunities */}
                    {improvementCategories.length > 0 && (
                        <>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionDot, { backgroundColor: colors.yellow }]} />
                                <Text style={styles.sectionTitle}>Förbättringsmöjligheter</Text>
                            </View>
                            {improvementCategories.map(category => (
                                <View key={category.id} style={[styles.categoryCard, { borderColor: 'rgba(234, 179, 8, 0.2)' }]}>
                                    <View style={styles.categoryHeader}>
                                        <View style={styles.categoryLeft}>
                                            <View style={[styles.categoryIconBox, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
                                                <Text style={styles.categoryIcon}>{category.icon}</Text>
                                            </View>
                                            <Text style={styles.categoryName}>{category.name}</Text>
                                        </View>
                                        <Text style={[styles.categoryScore, { color: colors.yellow }]}>
                                            {category.score}/5
                                        </Text>
                                    </View>
                                    {category.problems.length > 0 && (
                                        <View style={styles.problemsContainer}>
                                            {category.problems.slice(0, 1).map((problem, i) => (
                                                <View key={i} style={styles.problemBox}>
                                                    <Text style={styles.problemLabel}>Problem:</Text>
                                                    <Text style={styles.problemText}>{problem.description}</Text>
                                                    <Text style={styles.recommendationLabel}>Rekommendation:</Text>
                                                    <Text style={styles.recommendationText}>{problem.recommendation}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}
                        </>
                    )}

                    {/* Strengths */}
                    {goodCategories.length > 0 && (
                        <>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionDot, { backgroundColor: colors.emerald }]} />
                                <Text style={styles.sectionTitle}>Styrkor</Text>
                            </View>
                            {goodCategories.map((category) => (
                                <View key={category.id} style={styles.strengthCard}>
                                    <View style={styles.strengthHeader}>
                                        <View style={styles.strengthLeft}>
                                            <View style={styles.strengthIconBox}>
                                                <Text style={{ fontSize: 11 }}>{category.icon}</Text>
                                            </View>
                                            <Text style={styles.strengthName}>{category.name}</Text>
                                        </View>
                                        <Text style={styles.strengthScore}>{category.score}/5</Text>
                                    </View>
                                    {category.strength_reason && (
                                        <View style={styles.strengthReasonContainer}>
                                            <Text style={styles.strengthReason}>{category.strength_reason}</Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </>
                    )}

                    {/* Action List */}
                    {analysis.action_list.length > 0 && (
                        <>
                            <View style={styles.sectionHeader}>
                                <View style={[styles.sectionDot, { backgroundColor: colors.white50 }]} />
                                <Text style={styles.sectionTitle}>Prioriterad åtgärdslista</Text>
                            </View>
                            <View style={styles.actionCard}>
                                {analysis.action_list.slice(0, 6).map((action, i) => (
                                    <View key={i} style={styles.actionItem}>
                                        <View style={[
                                            styles.actionNumber,
                                            {
                                                backgroundColor: action.priority === 'critical'
                                                    ? 'rgba(239, 68, 68, 0.2)'
                                                    : action.priority === 'important'
                                                        ? 'rgba(234, 179, 8, 0.2)'
                                                        : 'rgba(255, 255, 255, 0.1)'
                                            }
                                        ]}>
                                            <Text style={[
                                                styles.actionNumberText,
                                                {
                                                    color: action.priority === 'critical'
                                                        ? colors.red
                                                        : action.priority === 'important'
                                                            ? colors.yellow
                                                            : colors.white50
                                                }
                                            ]}>
                                                {i + 1}
                                            </Text>
                                        </View>
                                        <Text style={styles.actionText}>{action.action}</Text>
                                    </View>
                                ))}
                            </View>
                        </>
                    )}

                    {/* CTA */}
                    <View style={styles.ctaSection}>
                        <View style={styles.ctaIconBox}>
                            <Text style={styles.ctaIcon}>📞</Text>
                        </View>
                        <Text style={styles.ctaTitle}>Nästa steg</Text>
                        <Text style={styles.ctaText}>
                            Vill du ha hjälp att implementera dessa förbättringar och öka din konvertering?
                        </Text>
                        <Link src="https://calendly.com/stefan-245/30min" style={styles.ctaLink}>
                            Boka genomgång för ökad konvertering
                        </Link>
                    </View>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Rapport genererad av Konverteramera • Ett verktyg från Portalfabriken
                        </Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

export default AnalysisReportPDF;
