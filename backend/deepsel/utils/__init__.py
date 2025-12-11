import base64
import random
import string
from datetime import UTC, datetime, timedelta

import jwt
from cryptography.fernet import Fernet
from passlib.context import CryptContext

from constants import APP_SECRET, AUTH_ALGORITHM

crypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def generate_recovery_codes(num_codes=16, code_length=10):
    codes = []
    for _ in range(num_codes):
        code = "".join(
            random.choices(string.ascii_uppercase + string.digits, k=code_length)
        )
        codes.append(code)
    return codes


def hash_text(text):
    return crypt_context.hash(text)


def verify_hashed_text(text, hashed_text):
    return crypt_context.verify(text, hashed_text)


def verify_recovery_codes(code, hashed_recovery_codes):
    if not code:
        return False
    for hashed_code in hashed_recovery_codes:
        if verify_hashed_text(code, hashed_code):
            return True
    return False


def get_valid_recovery_code_index(code, hashed_recovery_codes):
    if not code or not hashed_recovery_codes:
        return -1
    for index, hashed_code in enumerate(hashed_recovery_codes):
        if verify_hashed_text(code, hashed_code):
            return index
    return -1


def _get_key_from_plain_text(plain_text):
    # Plain text password
    plain_text_password = plain_text.encode()
    # Pad or truncate the plain text password to 32 bytes
    padded_password = plain_text_password.ljust(32, b"\0")
    # Base64 encode the padded password
    key = base64.urlsafe_b64encode(padded_password)
    return key


def encrypt(text):
    key = _get_key_from_plain_text(APP_SECRET)
    cipher = Fernet(key)
    # Encrypt data
    encrypted_data = cipher.encrypt(text.encode("utf-8"))
    encrypted_data_str = base64.urlsafe_b64encode(encrypted_data).decode()
    return encrypted_data_str


def decrypt(encrypted_data_str):
    key = _get_key_from_plain_text(APP_SECRET)
    cipher = Fernet(key)
    decoded_encrypted_data = base64.urlsafe_b64decode(encrypted_data_str)
    decrypted_text = cipher.decrypt(decoded_encrypted_data)
    return decrypted_text


def create_access_token(data: dict, expires_delta: timedelta = timedelta(minutes=1)):
    to_encode = data.copy()
    expire = datetime.now(UTC) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, APP_SECRET, algorithm=AUTH_ALGORITHM)
    return encoded_jwt


def sanitize_filename(filename):
    if not filename:
        return ""
    special_chars = "~!@#$%^&*()"
    sanitized = "".join(char for char in filename if char not in special_chars)
    return sanitized
