from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import hashlib
import hmac
from app.core.config import settings

# bcrypt 호환성 이슈로 SHA-256 + HMAC 사용
_HASH_SECRET = settings.SECRET_KEY.encode()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(
        get_password_hash(plain_password),
        hashed_password
    )


def get_password_hash(password: str) -> str:
    return hmac.new(
        _HASH_SECRET,
        password.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
