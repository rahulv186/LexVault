import os
from alembic.config import Config
from alembic import command
from app.core.config import settings

def run():
    # Force the database URL to lexvault_clean for this operation
    db_url = "postgresql://postgres:postgres@localhost:5432/lexvault_clean"
    
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", db_url)
    
    print(f"Applying baseline to {db_url}...")
    command.upgrade(alembic_cfg, "head")
    print("Upgrade complete.")

if __name__ == "__main__":
    run()
