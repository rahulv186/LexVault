"""add ipfs metadata to evidence

Revision ID: 20260906_004_ipfs
Revises: 20260906_003_custody
Create Date: 2026-09-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260906_004_ipfs'
down_revision = '20260906_003_custody'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('evidence', sa.Column('ipfs_cid', sa.String(), nullable=True))
    op.add_column('evidence', sa.Column('ipfs_uploaded_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('evidence', sa.Column('ipfs_status', sa.String(), nullable=True, server_default='pending'))
    op.create_index('ix_evidence_ipfs_cid', 'evidence', ['ipfs_cid'], unique=False)

def downgrade():
    op.drop_index('ix_evidence_ipfs_cid', table_name='evidence')
    op.drop_column('evidence', 'ipfs_status')
    op.drop_column('evidence', 'ipfs_uploaded_at')
    op.drop_column('evidence', 'ipfs_cid')
