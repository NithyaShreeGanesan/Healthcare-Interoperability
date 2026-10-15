"""Generate self-signed SSL/TLS certificates for local development over HTTPS."""

import datetime
import os
import ipaddress
from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization


def generate_self_signed_cert(output_dir: str = "backend/scripts/certs") -> None:
    """Generate a self-signed RSA certificate and private key valid for 365 days.

    Args:
        output_dir: Target directory to save cert.pem and key.pem.
    """
    os.makedirs(output_dir, exist_ok=True)
    cert_path = os.path.join(output_dir, "cert.pem")
    key_path = os.path.join(output_dir, "key.pem")

    if os.path.exists(cert_path) and os.path.exists(key_path):
        print(f"Certificates already exist at: {cert_path} and {key_path}")
        return

    print("Generating 2048-bit RSA private key...")
    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "State"),
        x509.NameAttribute(NameOID.LOCALITY_NAME, "City"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Healthcare Interoperability Dev"),
        x509.NameAttribute(NameOID.COMMON_NAME, "localhost"),
    ])

    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + datetime.timedelta(days=365))
        .add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName("localhost"),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
            ]),
            critical=False,
        )
        .sign(key, hashes.SHA256())
    )

    # Write private key
    with open(key_path, "wb") as f:
        f.write(
            key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption(),
            )
        )

    # Write certificate
    with open(cert_path, "wb") as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    print(f"Self-signed certificate written to: {cert_path}")
    print(f"Private key written to: {key_path}")


if __name__ == "__main__":
    certs_dir = os.path.join(os.path.dirname(__file__), "certs")
    generate_self_signed_cert(certs_dir)
