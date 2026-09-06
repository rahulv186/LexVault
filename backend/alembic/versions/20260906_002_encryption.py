"""add encryption metadata to evidence

Revision ID: 20260906_002
Revises: 20260906_001
Create Date: 2026-09-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260906_002'
down_revision = '20260906_001'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('evidence', sa.Column('encryption_algorithm', sa.String(), nullable=True))
    op.add_column('evidence', sa.Column('encryption_nonce', sa.String(), nullable=True))
    op.add_column('evidence', sa.Column('encrypted_file_size', sa.BigInteger(), nullable=True))

def downgrade():
    op.drop_column('evidence', 'encrypted_file_size')
    op.drop_column('evidence', 'encryption_nonce')
    op.drop_column('evidence', 'encryption_algorithm')
