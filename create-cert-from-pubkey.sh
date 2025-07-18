#!/bin/bash
set -euo pipefail

# TODO: check if this script is still needed

# Creates a certificate that is signed by a self-signed issuer certificate. Needed for the issuance process.

FOLDER="assets/keys"
PUBKEY="$FOLDER/public-key.pem"
SUBJECT="EUDIPLO"
URI="service.eudi-wallet.dev"

ISSUER_KEY="$FOLDER/issuer_key.pem"
ISSUER_CERT="$FOLDER/issuer_cert.pem"
DUMMY_KEY="$FOLDER/dummy_key.pem"
DUMMY_CSR="$FOLDER/dummy.csr"
CERT_OUT="$FOLDER/signing-certificate.pem"
SAN_EXT="$FOLDER/san.ext"

# Step 1: Check for required public key
if [ ! -f "$PUBKEY" ]; then
  echo "❌ Public key not found at $PUBKEY"
  exit 1
fi
echo "✅ Found public key: $PUBKEY"

# Step 2: Generate issuer key pair (EC)
echo "🔐 Generating EC issuer key pair"
openssl ecparam -name prime256v1 -genkey -noout -out "$ISSUER_KEY"

# Step 3: Create self-signed issuer certificate with SAN
echo "📄 Creating self-signed issuer certificate"
openssl req -x509 -new -key "$ISSUER_KEY" \
  -subj "/CN=$SUBJECT" \
  -addext "subjectAltName=DNS:$URI" \
  -days 365 \
  -out "$ISSUER_CERT"

# Step 4: Create dummy key and CSR
echo "📝 Creating dummy key and CSR"
openssl ecparam -name prime256v1 -genkey -noout -out "$DUMMY_KEY"
openssl req -new -key "$DUMMY_KEY" \
  -subj "/CN=$SUBJECT" \
  -addext "subjectAltName=DNS:$URI" \
  -out "$DUMMY_CSR"

# Step 5: Prepare SAN extension file
echo "📦 Writing SAN extension file"
echo "subjectAltName=DNS:$URI" > "$SAN_EXT"

# Step 6: Sign CSR using issuer and attach SAN
echo "🔏 Signing certificate"
openssl x509 -req \
  -in "$DUMMY_CSR" \
  -force_pubkey "$PUBKEY" \
  -CA "$ISSUER_CERT" \
  -CAkey "$ISSUER_KEY" \
  -CAcreateserial \
  -days 365 \
  -extfile "$SAN_EXT" \
  -out "$CERT_OUT"

# Step 7: Clean up
echo "🧹 Cleaning up temporary files"
rm -f "$ISSUER_KEY" "$ISSUER_CERT" "$DUMMY_KEY" "$DUMMY_CSR" "$FOLDER/issuer_cert.srl" "$SAN_EXT"

echo "✅ Done! Signed certificate written to: $CERT_OUT"
