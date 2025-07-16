# Step 1: Generate the private key (P-256 curve for ES256)
openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out private-key.pem


# Step 2: Generate the certificate signing request (CSR)
openssl req -new -key private-key.pem -out es256.csr -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"

# Step 3: Generate a self-signed certificate valid for 365 days
openssl x509 -req -in es256.csr -signkey private-key.pem -out access-certificate.pem -days 365

rm -f es256.csr