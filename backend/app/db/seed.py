from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.db.models import Role, Permission, RolePermission

def seed_iam():
    db = SessionLocal()
    try:
        # 1. Define Permissions
        permissions_data = [
            ("evidence:create", "Create and upload evidence"),
            ("evidence:read", "Read evidence metadata"),
            ("evidence:verify", "Perform integrity verification"),
            ("evidence:custody:read", "Read custody chain"),
            ("evidence:custody:verify", "Verify custody chain integrity"),
            ("evidence:delete", "Delete evidence records"),
            ("users:read", "Read user profiles"),
            ("users:manage", "Manage users and roles"),
        ]

        permission_map = {}
        for name, desc in permissions_data:
            perm = db.query(Permission).filter(Permission.name == name).first()
            if not perm:
                perm = Permission(name=name, description=desc)
                db.add(perm)
            permission_map[name] = perm

        db.commit()

        # 2. Define Roles and their permissions
        roles_config = {
            "ADMIN": [
                "evidence:create", "evidence:read", "evidence:verify",
                "evidence:custody:read", "evidence:custody:verify",
                "evidence:delete", "users:read", "users:manage"
            ],
            "INVESTIGATOR": [
                "evidence:create", "evidence:read", "evidence:verify",
                "evidence:custody:read", "evidence:custody:verify"
            ],
            "FORENSIC_ANALYST": [
                "evidence:read", "evidence:verify",
                "evidence:custody:read", "evidence:custody:verify"
            ],
            "AUDITOR": [
                "evidence:read", "evidence:custody:read", "evidence:custody:verify"
            ],
            "VIEWER": [
                "evidence:read"
            ],
        }

        for role_name, perms in roles_config.items():
            role = db.query(Role).filter(Role.name == role_name).first()
            if not role:
                role = Role(name=role_name, description=f"Role for {role_name}")
                db.add(role)
                db.commit()
                db.refresh(role)

            # Link permissions to role
            for perm_name in perms:
                perm = permission_map[perm_name]
                # Avoid duplicates
                exists = db.query(RolePermission).filter(
                    RolePermission.role_id == role.id,
                    RolePermission.permission_id == perm.id
                ).first()
                if not exists:
                    rp = RolePermission(role_id=role.id, permission_id=perm.id)
                    db.add(rp)

        db.commit()
        print("IAM seeding completed successfully.")
    except Exception as e:
        print(f"Error seeding IAM: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_iam()
