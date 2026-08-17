from passlib.context import CryptContext
from sqlalchemy import create_engine, text

from config import config

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

engine = create_engine(config.DATABASE_URL)
with engine.connect() as conn:
    row = conn.execute(text("SELECT rgm, password_hash, role FROM users WHERE rgm='00000001'")).fetchone()
    if not row:
        print("ERRO: usuario admin nao encontrado no banco!")
    else:
        print(f"Usuario: rgm={row[0]} role={row[2]}")
        print(f"Hash: {row[1][:30]}...")
        ok = pwd_ctx.verify("C3SUC4R.@DM1N", row[1])
        print(f"Senha correta: {ok}")
