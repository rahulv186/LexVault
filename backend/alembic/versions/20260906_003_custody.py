"""add custody events table

Revision ID: 20260906_003_custody
Revises: 20260906_002
Create Date: 2026-09-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260906_003_custody'
down_revision = '20260906_002'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'custody_events',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('evidence_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('actor', sa.String(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('previous_event_hash', sa.String(), nullable=True),
        sa.Column('event_hash', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['evidence_id'], ['evidence.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_custody_events_id', 'custody_events', ['id'], unique=False)
    op.create_index('ix_custody_events_evidence_id', 'custody_events', ['evidence_id'], unique=False)
    op.create_index('ix_custody_events_event_hash', 'custody_events', ['event_hash'], unique=False)

def downgrade():
    op.drop_table('custody_events')
