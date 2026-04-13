import base64
import os

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding


def _get_encryption_key() -> bytes:
    key_str = os.environ.get("ENCRYPTION_KEY")
    if not key_str:
        raise ValueError("ENCRYPTION_KEY environment variable is not set")
    key_bytes = key_str.encode("utf-8")
    if len(key_bytes) < 32:
        key_bytes = key_bytes.ljust(32, b"\0")
    return key_bytes[:32]


def encrypt_password(plaintext: str) -> str:
    key = _get_encryption_key()
    iv = os.urandom(16)
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    
    padder = padding.PKCS7(128).padder()
    padded_data = padder.update(plaintext.encode("utf-8")) + padder.finalize()
    
    ciphertext = encryptor.update(padded_data) + encryptor.finalize()
    combined = iv + ciphertext
    return base64.b64encode(combined).decode("utf-8")


def decrypt_password(encrypted: str) -> str:
    key = _get_encryption_key()
    combined = base64.b64decode(encrypted.encode("utf-8"))
    iv = combined[:16]
    ciphertext = combined[16:]
    
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()
    
    unpadder = padding.PKCS7(128).unpadder()
    plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()
    return plaintext.decode("utf-8")
