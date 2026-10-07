# POWIĄZANIA
# Cel: hashowanie i weryfikacja haseł.
# Przy zmianie: używane przez routers/auth.py i storage.
# AUTO używany przez: backend/routers/auth.py
# /POWIĄZANIA
import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


