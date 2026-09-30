from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# asyncpg를 위한 URL 변환
# Neon 등 클라우드 DB 주소의 ?sslmode=require 는 asyncpg가 이해하지 못하므로 ssl 옵션으로 바꾼다.
_url = make_url(settings.DATABASE_URL).set(drivername="postgresql+asyncpg")
_connect_args = {}
if _url.query.get("sslmode") in ("require", "verify-ca", "verify-full"):
    _connect_args["ssl"] = True
_url = _url.difference_update_query(["sslmode", "channel_binding"])

engine = create_async_engine(
    _url,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=5,
    connect_args=_connect_args,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
