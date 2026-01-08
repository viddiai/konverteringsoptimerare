"""
SQLAlchemy database models for the Conversion Analyzer.
"""
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Numeric,
    CheckConstraint,
    JSON,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class Lead(Base):
    """
    Represents a captured lead who requested a full report.
    """
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    company_name = Column(String(255), nullable=True)
    analyzed_url = Column(String(500), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to reports
    reports = relationship("Report", back_populates="lead")

    def __repr__(self):
        return f"<Lead(id={self.id}, email={self.email})>"


class Report(Base):
    """
    Stores both short summary and full analysis report.
    """
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    url = Column(String(500), nullable=False, index=True)

    # Short summary shown publicly
    short_summary = Column(Text, nullable=True)
    company_name_detected = Column(String(255), nullable=True)
    company_description = Column(Text, nullable=True)

    # Full report data stored as JSON
    full_report = Column(JSON, nullable=True)

    # Scores
    overall_score = Column(Numeric(2, 1), nullable=True)
    issues_found = Column(Integer, default=0)

    # Access control
    access_token = Column(String(64), unique=True, nullable=True, index=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    lead = relationship("Lead", back_populates="reports")
    analysis_data = relationship("AnalysisData", back_populates="report", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Report(id={self.id}, url={self.url})>"


class AnalysisData(Base):
    """
    Individual analysis criteria scores and explanations.
    """
    __tablename__ = "analysis_data"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    criterion = Column(String(100), nullable=False)
    score = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=True)

    # Ensure score is between 1 and 5
    __table_args__ = (
        CheckConstraint("score >= 1 AND score <= 5", name="score_range_check"),
    )

    # Relationship
    report = relationship("Report", back_populates="analysis_data")

    def __repr__(self):
        return f"<AnalysisData(criterion={self.criterion}, score={self.score})>"


# Analysis criteria constants - 7 kategorier enligt analyzer_prompt.md
ANALYSIS_CRITERIA = [
    "value_proposition",  # Tydlighet i värdeerbjudande (×2.0)
    "call_to_action",     # Call to Action (×1.5)
    "social_proof",       # Social Proof (×1.0)
    "lead_magnets",       # Lead Magnets (×1.5)
    "form_design",        # Formulärdesign (×1.0)
    "guiding_content",    # Vägledande innehåll (×1.0)
    "offer_structure",    # Erbjudandets struktur (×1.0) - NY
]

CRITERIA_LABELS = {
    "value_proposition": "Värdeerbjudandets Tydlighet",
    "call_to_action": "Call to Action Effektivitet",
    "social_proof": "Social Proof & Trovärdighet",
    "lead_magnets": "Leadmagnet-kvalitet",
    "form_design": "Formulärdesign & Friktion",
    "guiding_content": "Vägledande Innehåll",
    "offer_structure": "Erbjudandets Struktur",
}
