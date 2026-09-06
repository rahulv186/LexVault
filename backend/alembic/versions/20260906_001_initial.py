"""initial migration

Revision ID: 20260906_001
Revises:
Create Date: 2026-09-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260906_001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'evidence',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('evidence_id', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('stored_filename', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('sha256', sa.String(), nullable=False),
        sa.Column('uploaded_by', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('verification_status', sa.String(), server_default='pending', nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('evidence_id')
    )
    op.create_index('ix_evidence_evidence_id', 'evidence', ['evidence_id'], unique=False)
    op.create_index('ix_evidence_sha256', 'evidence', ['sha256'], unique=False)
    op.create_index('ix_evidence_id', 'evidence', ['id'], unique=False)

def downgrade():
    op.drop_table('evidence')
