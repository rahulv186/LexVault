from alembic.config import Config
from alembic import command
import os

def run():
    alembic_cfg = Config("alembic.ini")
    # Double check the URL in the config
    print(f"Using URL: {alembic_cfg.get_main_option('sqlalchemy.url')}")
    
    try:
        print("Running upgrade head...")
        command.upgrade(alembic_cfg, "head")
        print("Upgrade complete.")
    except Exception as e:
        print(f"Upgrade failed: {e}")

if __name__ == "__main__":
    run()
