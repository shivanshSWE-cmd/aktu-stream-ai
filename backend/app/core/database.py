import logging
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import get_settings

logger = logging.getLogger("aktu_stream.database")
settings = get_settings()


class Base(DeclarativeBase):
    pass


def build_engine(url: str):
    kwargs = {
        "echo": False,
        "future": True,
    }
    if "sqlite" in url:
        kwargs["connect_args"] = {"check_same_thread": False}
    else:
        kwargs["pool_pre_ping"] = True
    return create_async_engine(url, **kwargs)


engine = build_engine(settings.DATABASE_URL)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def switch_to_sqlite_fallback():
    global engine, async_session_factory
    fallback_url = "sqlite+aiosqlite:///./aktu_stream.db"
    logger.warning(f"Falling back to local SQLite database: {fallback_url}")
    engine = build_engine(fallback_url)
    async_session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    return engine


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
