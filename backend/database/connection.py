"""
SQLAlchemy engine, session factory, and base declarative class.

All models import Base from here; all route handlers receive a Session
via the get_db() dependency injected by FastAPI.
"""
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from config import config


class Base(DeclarativeBase):
    """Common declarative base for all ORM models."""
    pass


engine = create_engine(
    config.DATABASE_URL,
    echo=config.SQLALCHEMY_ECHO,
    pool_pre_ping=config.DB_POOL_PRE_PING,
    pool_recycle=config.DB_POOL_RECYCLE,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db():
    """FastAPI dependency — yields a scoped database session."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
