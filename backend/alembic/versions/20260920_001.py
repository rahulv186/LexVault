"""baseline migration

Revision ID: 20260920_001
Revises: 
Create Date: 2026-09-20 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260920_001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Permissions
    op.create_table(
        'permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_permissions_id', 'permissions', ['id'], unique=False)
    op.create_index('ix_permissions_name', 'permissions', ['name'], unique=True)

    # Roles
    op.create_table(
        'roles',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_roles_id', 'roles', ['id'], unique=False)
    op.create_index('ix_roles_name', 'roles', ['name'], unique=True)

    # RolePermissions
    op.create_table(
        'role_permissions',
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('permission_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['permission_id'], ['permissions.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('role_id', 'permission_id')
    )

    # Users
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('wallet_address', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_id', 'users', ['id'], unique=False)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)
    op.create_index('ix_users_wallet_address', 'users', ['wallet_address'], unique=True)

    # Cases
    op.create_table(
        'cases',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('case_number', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('status', sa.String(), server_default='OPEN', nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('multisig_address', sa.String(), nullable=True),
        sa.Column('multisig_threshold', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_cases_case_number', 'cases', ['case_number'], unique=True)

    # CaseMembers
    op.create_table(
        'case_members',
        sa.Column('case_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(), nullable=False),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('case_id', 'user_id')
    )

    # Evidence
    op.create_table(
        'evidence',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('evidence_id', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=True),
        sa.Column('file_size', sa.BigInteger(), nullable=False),
        sa.Column('sha256', sa.String(), nullable=False),
        sa.Column('uploaded_by', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('verification_status', sa.String(), server_default='pending', nullable=False),
        sa.Column('wrapped_dek', sa.String(), nullable=False),
        sa.Column('storage_provider', sa.String(), server_default='local', nullable=False),
        sa.Column('storage_ref', sa.String(), nullable=False),
        sa.Column('encryption_version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('encrypted_file_size', sa.BigInteger(), nullable=True),
        sa.Column('case_id', sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_evidence_evidence_id', 'evidence', ['evidence_id'], unique=True)
    op.create_index('ix_evidence_id', 'evidence', ['id'], unique=False)
    op.create_index('ix_evidence_sha256', 'evidence', ['sha256'], unique=False)

    # CustodyEvents
    op.create_table(
        'custody_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('evidence_id', sa.UUID(), nullable=True),
        sa.Column('case_id', sa.UUID(), nullable=True),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('actor', sa.String(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('description', sa.String(), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('previous_event_hash', sa.String(), nullable=True),
        sa.Column('event_hash', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['evidence_id'], ['evidence.id'], ),
        sa.ForeignKeyConstraint(['case_id'], ['cases.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_custody_events_id', 'custody_events', ['id'], unique=False)
    op.create_index('ix_custody_events_evidence_id', 'custody_events', ['evidence_id'], unique=False)
    op.create_index('ix_custody_events_case_id', 'custody_events', ['case_id'], unique=False)
    op.create_index('ix_custody_events_event_hash', 'custody_events', ['event_hash'], unique=False)

    # EvidenceAccess
    op.create_table(
        'evidence_access',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('evidence_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('request_id', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['evidence_id'], ['evidence.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_evidence_access_id', 'evidence_access', ['id'], unique=False)
    op.create_index('ix_evidence_access_evidence_id', 'evidence_access', ['evidence_id'], unique=False)
    op.create_index('ix_evidence_access_user_id', 'evidence_access', ['user_id'], unique=False)

    # ZKProofs
    op.create_table(
        'zk_proofs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('proof_id', sa.String(), nullable=False),
        sa.Column('evidence_id', sa.UUID(), nullable=False),
        sa.Column('circuit_name', sa.String(), nullable=False),
        sa.Column('circuit_version', sa.String(), nullable=False),
        sa.Column('proving_system', sa.String(), nullable=False),
        sa.Column('public_inputs', sa.JSON(), nullable=False),
        sa.Column('public_signals', sa.JSON(), nullable=False),
        sa.Column('proof_data', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(), server_default='GENERATED', nullable=False),
        sa.Column('verification_result', sa.Boolean(), nullable=True),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['evidence_id'], ['evidence.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_zk_proofs_id', 'zk_proofs', ['id'], unique=False)
    op.create_index('ix_zk_proofs_proof_id', 'zk_proofs', ['proof_id'], unique=True)
    op.create_index('ix_zk_proofs_evidence_id', 'zk_proofs', ['evidence_id'], unique=False)

def downgrade():
    op.drop_table('zk_proofs')
    op.drop_table('evidence_access')
    op.drop_table('custody_events')
    op.drop_table('evidence')
    op.drop_table('case_members')
    op.drop_table('cases')
    op.drop_table('users')
    op.drop_table('role_permissions')
    op.drop_table('roles')
    op.drop_table('permissions')
