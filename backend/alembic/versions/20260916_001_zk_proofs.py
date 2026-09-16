"""add zk proofs table

Revision ID: 20260916_001_zk_proofs
Revises: be1a6d6cbd3c
Create Date: 2026-09-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260916_001_zk_proofs"
down_revision: Union[str, None] = "be1a6d6cbd3c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "zk_proofs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("proof_id", sa.String(), nullable=False),
        sa.Column("evidence_id", sa.Integer(), nullable=False),
        sa.Column("circuit_name", sa.String(), nullable=False),
        sa.Column("circuit_version", sa.String(), nullable=False),
        sa.Column("proving_system", sa.String(), nullable=False),
        sa.Column("public_inputs", sa.JSON(), nullable=False),
        sa.Column("public_signals", sa.JSON(), nullable=False),
        sa.Column("proof_data", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(), server_default="GENERATED", nullable=False),
        sa.Column("verification_result", sa.Boolean(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["evidence_id"], ["evidence.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_zk_proofs_id"), "zk_proofs", ["id"], unique=False)
    op.create_index(op.f("ix_zk_proofs_proof_id"), "zk_proofs", ["proof_id"], unique=True)
    op.create_index(op.f("ix_zk_proofs_evidence_id"), "zk_proofs", ["evidence_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_zk_proofs_evidence_id"), table_name="zk_proofs")
    op.drop_index(op.f("ix_zk_proofs_proof_id"), table_name="zk_proofs")
    op.drop_index(op.f("ix_zk_proofs_id"), table_name="zk_proofs")
    op.drop_table("zk_proofs")
