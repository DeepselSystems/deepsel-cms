from deepsel.utils.crypto import (
    generate_recovery_codes,
    hash_text,
    verify_hashed_text,
    verify_recovery_codes,
    get_valid_recovery_code_index,
    encrypt as _encrypt,
    decrypt as _decrypt,
)
from deepsel.utils.filename import sanitize_filename  # noqa: F401

from settings import APP_SECRET


def encrypt(text):
    return _encrypt(text, APP_SECRET)


def decrypt(encrypted_data_str):
    return _decrypt(encrypted_data_str, APP_SECRET)
