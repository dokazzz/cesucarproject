"""AuthService — authentication and registration business logic."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from config import config
from database.models.user import User
from database.repositories.audit_log_repository import AuditLogRepository
from database.repositories.user_repository import UserRepository

# bcrypt context — passlib handles salt generation automatically
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

RGM_RE = re.compile(r"^\d{8}$")


class AuthError(Exception):
    """Raised for authentication/authorization failures."""

    def __init__(self, message: str, status_code: int = 401) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class AuthService:
    """
    Handles user registration, login, token creation, and admin bootstrapping.

    Uses OOP: each instance holds a scoped DB session and operates through
    the UserRepository and AuditLogRepository data-access objects.
    """

    def __init__(self, db: Session) -> None:
        self.db = db
        self._users = UserRepository(db)
        self._audit = AuditLogRepository(db)

    # ── Password helpers ───────────────────────────────────────────────────────

    @staticmethod
    def hash_password(plain: str) -> str:
        return _pwd_context.hash(plain)

    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        return _pwd_context.verify(plain, hashed)

    # ── JWT helpers ────────────────────────────────────────────────────────────

    @staticmethod
    def create_token(user: User) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "rgm": user.rgm,
            "role": user.role,
            "iat": now,
            "exp": now + timedelta(hours=config.JWT_EXPIRES_HOURS),
        }
        return jwt.encode(payload, config.JWT_SECRET_KEY, algorithm=config.JWT_ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> dict:
        try:
            return jwt.decode(
                token, config.JWT_SECRET_KEY, algorithms=[config.JWT_ALGORITHM]
            )
        except Exception as exc:
            raise AuthError("Token inválido ou expirado.", 401) from exc

    # ── Validation ────────────────────────────────────────────────────────────

    @staticmethod
    def validate_rgm(rgm: str) -> None:
        if not RGM_RE.match(rgm):
            raise AuthError("RGM deve conter exatamente 8 dígitos numéricos.", 400)

    @staticmethod
    def validate_password(password: str) -> None:
        if not password or len(password) < 6:
            raise AuthError("A senha deve ter pelo menos 6 caracteres.", 400)

    @staticmethod
    def validate_role(role: str) -> None:
        if role not in ("passenger", "driver"):
            raise AuthError("Tipo de usuário inválido. Use 'passenger' ou 'driver'.", 400)

    # ── Business operations ───────────────────────────────────────────────────

    def login(self, rgm: str, password: str) -> tuple[str, User]:
        """
        Authenticate a user by RGM and password.

        Returns:
            (jwt_token, user) on success.

        Raises:
            AuthError on invalid credentials.
        """
        self.validate_rgm(rgm)
        if not password:
            raise AuthError("Informe sua senha.", 400)

        user = self._users.find_by_rgm(rgm)
        if not user or not self.verify_password(password, user.password_hash):
            # Uniform error to prevent user enumeration
            raise AuthError("RGM ou senha inválidos.", 401)

        # Checked only after the password is verified, so this cannot be used
        # to discover which RGMs exist -- reaching this line already requires
        # the correct credentials.
        if not user.is_active:
            self._audit.log(
                action="USER_LOGIN",
                user_id=user.id,
                details={"rgm": rgm, "rejected": "account_disabled"},
            )
            self.db.commit()
            raise AuthError(
                "Esta conta está desativada. Procure a administração do CESUCA.", 403
            )

        token = self.create_token(user)
        self._audit.log(
            action="USER_LOGIN",          # matches AuditAction.USER_LOGIN
            user_id=user.id,
            details={"rgm": rgm},
        )
        self.db.commit()
        return token, user

    def register(
        self,
        full_name: str,
        rgm: str,
        password: str,
        role: str = "passenger",
        course: str | None = None,
        city: str | None = None,
        neighborhood: str | None = None,
        phone: str | None = None,
        vehicle_model: str | None = None,
        vehicle_brand: str | None = None,
        vehicle_color: str | None = None,
        vehicle_seats: int | None = None,
        vehicle_plate: str | None = None,
    ) -> tuple[str, User]:
        """
        Register a new user.

        Returns:
            (jwt_token, user) on success.

        Raises:
            AuthError on validation failure or duplicate RGM.
        """
        if not full_name or not full_name.strip():
            raise AuthError("Informe o nome completo.", 400)
        self.validate_rgm(rgm)
        self.validate_password(password)
        self.validate_role(role)

        # Block admin RGM from self-registration
        if rgm == config.ADMIN_RGM:
            raise AuthError("Este RGM não está disponível para cadastro.", 400)

        if self._users.exists_by_rgm(rgm):
            raise AuthError("Este RGM já está cadastrado. Faça login ou use outro RGM.", 409)

        user = self._users.create(
            full_name=full_name.strip(),
            rgm=rgm,
            password_hash=self.hash_password(password),
            role=role,
            course=course,
            city=city,
            neighborhood=neighborhood,
            phone=phone,
            vehicle_model=vehicle_model,
            vehicle_brand=vehicle_brand,
            vehicle_color=vehicle_color,
            vehicle_seats=vehicle_seats,
            vehicle_plate=vehicle_plate,
        )

        self._audit.log(
            action="USER_REGISTERED",     # matches AuditAction.USER_REGISTERED
            user_id=user.id,
            details={"rgm": rgm, "role": role},
        )
        self.db.commit()
        self.db.refresh(user)

        token = self.create_token(user)
        return token, user

    def get_current_user(self, user_id) -> User:
        """Load user by ID or raise 401."""
        user = self._users.find_by_id(user_id)
        if not user:
            raise AuthError("Usuário não encontrado.", 404)
        return user

    def update_self(self, user_id, body) -> User:
        """Allow a user to update their own profile, including role switch."""
        user = self.get_current_user(user_id)
        fields = {k: v for k, v in body.model_dump().items() if v is not None}
        # Admins cannot downgrade their own role via this endpoint
        if user.role == "ADMIN":
            fields.pop("role", None)
        updated = self._users.update(user.id, **fields)
        self._audit.log(
            action="USER_UPDATED",
            user_id=user.id,
            details={"fields": list(fields.keys())},
        )
        self.db.commit()
        return updated

    # ── Admin bootstrap ────────────────────────────────────────────────────────

    def ensure_admin_exists(self) -> None:
        """
        Called at application startup.

        Creates the administrator account (RGM 00000001) if it does not exist.
        Password must be set via the ADMIN_PASSWORD environment variable.
        """
        if self._users.exists_by_rgm(config.ADMIN_RGM):
            return

        admin_password = config.ADMIN_PASSWORD
        if not admin_password:
            raise RuntimeError(
                "ADMIN_PASSWORD environment variable is not set. "
                "Set it in .env before starting the server."
            )
        if len(admin_password) < 8:
            raise RuntimeError("ADMIN_PASSWORD must be at least 8 characters.")

        self._users.create(
            full_name=config.ADMIN_FULL_NAME,
            rgm=config.ADMIN_RGM,
            password_hash=self.hash_password(admin_password),
            role="admin",
        )
        self._audit.log(
            action="ADMIN_ACTION",        # matches AuditAction.ADMIN_ACTION
            user_id=None,
            details={"event": "admin_account_created", "rgm": config.ADMIN_RGM},
        )
        self.db.commit()
        print(f"[CESUCAR] Admin account created — RGM: {config.ADMIN_RGM}")
