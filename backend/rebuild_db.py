from sqlalchemy import create_engine, text
from app.db.database import Base
from app.db import models
import os

# Use current user 'rahul' as the role for the connection
DATABASE_URL = "postgresql://rahul@localhost:5432/lexvault_clean"

def rebuild():
    print(f"Creating schema in {DATABASE_URL}...")
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as conn:
        # Wrap raw SQL in text() for SQLAlchemy 2.0
        conn.execute(text("DROP SCHEMA public CASCADE;"))
        conn.execute(text("CREATE SCHEMA public;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO rahul;"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        conn.commit()
    
    # Create all tables from models
    Base.metadata.create_all(bind=engine)
    print("Schema created successfully.")

if __name__ == "__main__":
    rebuild()
