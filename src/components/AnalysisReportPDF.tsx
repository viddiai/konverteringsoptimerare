import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { AnalysisResult } from '@/types/analysis';

// Register a standard font
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 'normal' },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 'bold' },
    ],
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#00D9A3',
        paddingBottom: 15,
        backgroundColor: '#000000',
        marginHorizontal: -40,
        marginTop: -40,
        paddingHorizontal: 40,
        paddingTop: 40,
    },
    logo: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 10,
        color: '#00D9A3',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 5,
    },
    url: {
        fontSize: 12,
        color: '#00D9A3',
        marginBottom: 5,
    },
    date: {
        fontSize: 9,
        color: '#888888',
    },
    scoreSection: {
        textAlign: 'center',
        marginVertical: 25,
        padding: 20,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e5e5e5',
    },
    scoreNumber: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    scoreCategory: {
        fontSize: 16,
        color: '#333333',
        marginTop: 5,
    },
    summary: {
        fontSize: 11,
        color: '#444444',
        marginTop: 15,
        lineHeight: 1.5,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333333',
        marginTop: 20,
        marginBottom: 10,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#00D9A3',
    },
    criticalSection: {
        backgroundColor: '#FFF1F2', // Light Coral
        padding: 12,
        marginBottom: 10,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#FF6B6B',
    },
    improvementSection: {
        backgroundColor: '#FAFAF9',
        padding: 12,
        marginBottom: 10,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#F59E0B',
    },
    strengthSection: {
        backgroundColor: '#F0FDF4',
        padding: 12,
        marginBottom: 10,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: '#00D9A3',
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    categoryName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    categoryScore: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    problemBox: {
        backgroundColor: '#ffffff',
        padding: 10,
        marginTop: 8,
        borderRadius: 4,
    },
    problemLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#666666',
        marginBottom: 3,
    },
    problemText: {
        fontSize: 10,
        color: '#333333',
        marginBottom: 8,
        lineHeight: 1.4,
    },
    recommendationLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#00D9A3',
        marginBottom: 3,
    },
    recommendationText: {
        fontSize: 10,
        color: '#00D9A3',
        lineHeight: 1.4,
    },
    actionItem: {
        flexDirection: 'row',
        marginBottom: 6,
        alignItems: 'flex-start',
    },
    actionNumber: {
        width: 20,
        fontSize: 10,
        color: '#666666',
    },
    actionText: {
        flex: 1,
        fontSize: 10,
        color: '#333333',
    },
    actionPriority: {
        fontSize: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    criticalPriority: {
        backgroundColor: '#FFF1F2',
        color: '#FF6B6B',
    },
    importantPriority: {
        backgroundColor: '#FEF3C7',
        color: '#D97706',
    },
    improvementPriority: {
        backgroundColor: '#F3F4F6',
        color: '#6B7280',
    },
    strengthItem: {
        flexDirection: 'row',
        marginBottom: 4,
        alignItems: 'center',
    },
    checkmark: {
        color: '#00D9A3',
        marginRight: 8,
        fontSize: 12,
    },
    ctaSection: {
        marginTop: 30,
        padding: 20,
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#00D9A3',
    },
    ctaTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    ctaText: {
        fontSize: 11,
        color: '#444444',
        marginBottom: 12,
    },
    ctaLink: {
        fontSize: 12,
        color: '#00D9A3',
        fontWeight: 'bold',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 8,
        color: '#888888',
        borderTopWidth: 1,
        borderTopColor: '#e5e5e5',
        paddingTop: 10,
    },
});

const getScoreColor = (score: number) => {
    if (score < 2) return '#DC2626';
    if (score < 3) return '#EA580C';
    if (score < 3.5) return '#CA8A04';
    if (score < 4.5) return '#16A34A';
    return '#059669';
};

interface AnalysisReportPDFProps {
    analysis: AnalysisResult;
}

export const AnalysisReportPDF: React.FC<AnalysisReportPDFProps> = ({ analysis }) => {
    const criticalCategories = analysis.categories.filter(c => c.status === 'critical');
    const improvementCategories = analysis.categories.filter(c =>
        c.status === 'improvement' || c.status === 'neutral' || c.status === 'not_identified'
    );

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.logo}>Portalfabriken</Text>
                    <Text style={styles.subtitle}>Lead Generation Conversion Analyzer</Text>
                </View>

                {/* Title */}
                <Text style={styles.title}>KONVERTERINGSANALYS</Text>
                <Text style={styles.url}>{analysis.url}</Text>
                <Text style={styles.date}>
                    Genererad: {new Date(analysis.analyzed_at).toLocaleDateString('sv-SE')}
                </Text>

                {/* Score Section */}
                <View style={styles.scoreSection}>
                    <Text style={[styles.scoreNumber, { color: getScoreColor(analysis.overall_score) }]}>
                        {analysis.overall_score_rounded} / 5
                    </Text>
                    <Text style={styles.scoreCategory}>{analysis.overall_category}</Text>
                    <Text style={styles.summary}>{analysis.overall_summary}</Text>
                </View>

                {/* Critical Issues */}
                {criticalCategories.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>🔴 KRITISKA PROBLEM</Text>
                        {criticalCategories.map(category => (
                            <View key={category.id} style={styles.criticalSection}>
                                <View style={styles.categoryHeader}>
                                    <Text style={styles.categoryName}>{category.icon} {category.name}</Text>
                                    <Text style={[styles.categoryScore, { color: getScoreColor(category.score) }]}>
                                        {category.score}/5
                                    </Text>
                                </View>
                                {category.problems.map((problem, i) => (
                                    <View key={i} style={styles.problemBox}>
                                        <Text style={styles.problemLabel}>Problem:</Text>
                                        <Text style={styles.problemText}>{problem.description}</Text>
                                        <Text style={styles.recommendationLabel}>Rekommendation:</Text>
                                        <Text style={styles.recommendationText}>{problem.recommendation}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </>
                )}

                {/* Improvement Opportunities */}
                {improvementCategories.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>🟡 FÖRBÄTTRINGSMÖJLIGHETER</Text>
                        {improvementCategories.map(category => (
                            <View key={category.id} style={styles.improvementSection}>
                                <View style={styles.categoryHeader}>
                                    <Text style={styles.categoryName}>{category.icon} {category.name}</Text>
                                    <Text style={[styles.categoryScore, { color: getScoreColor(category.score) }]}>
                                        {category.score}/5
                                    </Text>
                                </View>
                                {category.problems.slice(0, 1).map((problem, i) => (
                                    <View key={i} style={styles.problemBox}>
                                        <Text style={styles.problemLabel}>Problem:</Text>
                                        <Text style={styles.problemText}>{problem.description}</Text>
                                        <Text style={styles.recommendationLabel}>Rekommendation:</Text>
                                        <Text style={styles.recommendationText}>{problem.recommendation}</Text>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </>
                )}

                {/* Strengths */}
                {analysis.strengths.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>🟢 STYRKOR</Text>
                        <View style={styles.strengthSection}>
                            {analysis.strengths.map((strength, i) => (
                                <View key={i} style={styles.strengthItem}>
                                    <Text style={styles.checkmark}>✓</Text>
                                    <Text style={{ fontSize: 10, color: '#1a1a1a' }}>{strength}</Text>
                                </View>
                            ))}
                        </View>
                    </>
                )}

                {/* Action List */}
                <Text style={styles.sectionTitle}>📋 PRIORITERAD ÅTGÄRDSLISTA</Text>
                {analysis.action_list.slice(0, 6).map((action, i) => (
                    <View key={i} style={styles.actionItem}>
                        <Text style={styles.actionNumber}>{i + 1}.</Text>
                        <Text style={styles.actionText}>{action.action}</Text>
                        <Text style={[
                            styles.actionPriority,
                            action.priority === 'critical' ? styles.criticalPriority :
                                action.priority === 'important' ? styles.importantPriority :
                                    styles.improvementPriority
                        ]}>
                            {action.priority === 'critical' ? 'Kritisk' :
                                action.priority === 'important' ? 'Viktig' : 'Förbättring'}
                        </Text>
                    </View>
                ))}

                {/* CTA */}
                <View style={styles.ctaSection}>
                    <Text style={styles.ctaTitle}>📞 Nästa steg</Text>
                    <Text style={styles.ctaText}>
                        Vill du ha hjälp att implementera dessa förbättringar och öka din konvertering?
                    </Text>
                    <Text style={styles.ctaLink}>
                        Boka genomgång → calendly.com/stefan-245/30min
                    </Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text>
                        Denna rapport skapades av Lead Generation Conversion Analyzer – portalfabriken.se/analysera
                    </Text>
                </View>
            </Page>
        </Document>
    );
};

export default AnalysisReportPDF;
