
import os
import hashlib
from base64 import b64encode, b64decode
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization
from django.conf import settings

# Paths for system-wide RSA keys
PRIVATE_KEY_PATH = os.path.join(settings.BASE_DIR, 'keys', 'private.pem')
PUBLIC_KEY_PATH = os.path.join(settings.BASE_DIR, 'keys', 'public.pem')

def ensure_keys_exist():
    """Generates RSA keys if they don't exist"""
    if not os.path.exists(PRIVATE_KEY_PATH):
        os.makedirs(os.path.dirname(PRIVATE_KEY_PATH), exist_ok=True)
        
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        
        # Save private key
        pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        with open(PRIVATE_KEY_PATH, 'wb') as f:
            f.write(pem)
            
        # Save public key
        public_key = private_key.public_key()
        pub_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        with open(PUBLIC_KEY_PATH, 'wb') as f:
            f.write(pub_pem)

def get_document_hash(file_path):
    """Calculates SHA-256 hash of a file"""
    hash_sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_sha256.update(chunk)
    return hash_sha256.hexdigest()

def sign_hash(data_hash_hex):
    """Signs a hex hash string with the private key"""
    ensure_keys_exist()
    
    with open(PRIVATE_KEY_PATH, "rb") as key_file:
        private_key = serialization.load_pem_private_key(
            key_file.read(),
            password=None
        )
    
    # Convert hex hash back to bytes
    hash_bytes = bytes.fromhex(data_hash_hex)
    
    signature = private_key.sign(
        hash_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH
        ),
        hashes.SHA256()
    )
    
    return b64encode(signature).decode('utf-8')

def verify_signature(data_hash_hex, signature_b64):
    """Verifies a signature against a hex hash string"""
    ensure_keys_exist()
    
    try:
        with open(PUBLIC_KEY_PATH, "rb") as key_file:
            public_key = serialization.load_pem_public_key(
                key_file.read()
            )
            
        hash_bytes = bytes.fromhex(data_hash_hex)
        signature = b64decode(signature_b64)
        
        public_key.verify(
            signature,
            hash_bytes,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return True
    except Exception:
        return False
