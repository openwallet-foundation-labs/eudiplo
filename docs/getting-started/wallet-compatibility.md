# Wallet Compatibility

EUDIPLO is designed to work with **EUDI-compliant wallets** that implement the
supported protocols
([OID4VCI](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html),
[OID4VP](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html),
and
[SD-JWT VC](https://www.ietf.org/archive/id/draft-ietf-oauth-selective-disclosure-jwt-08.html)).

This page provides information about tested wallets, compatibility status, and
guidance for testing new wallets with EUDIPLO.

---

## Officially Tested Wallets

The following wallets have been officially tested and verified to work with
EUDIPLO:

| Wallet              | Reported Version | Status | Contributor | Last Updated |
| ------------------- | ---------------- | ------ | ----------- | ------------ |
| _None reported yet_ | -                | -      | -           | -            |

---

## Community-Verified Wallets

These wallets have been reported as compatible by community members:

| Wallet              | Reported Version | Status | Contributor | Last Updated |
| ------------------- | ---------------- | ------ | ----------- | ------------ |
| _None reported yet_ | -                | -      | -           | -            |

!!! note "Help us expand this list!"

    If you have successfully tested EUDIPLO with a wallet not listed here, please [reach out to us](https://github.com/openwallet-foundation-labs/eudiplo/issues/new?template=wallet-compatibility.md) so we can add it to this list.

---

## Compatibility Requirements

For a wallet to be compatible with EUDIPLO, it must support:

### **Issuance Flow (OID4VCI)**

- ✅ Authorization Code Flow
- ✅ Pre-authorized Code Flow
- ✅ SD-JWT VC format
- ✅ Proof of possession (DPoP or client attestation)

### **Presentation Flow (OID4VP)**

- ✅ Authorization Request via deep link or QR code
- ✅ VP Token submission
- ✅ Selective disclosure of SD-JWT VC claims
- ✅ Response mode `direct_post`

### **General Requirements**

- ✅ HTTPS endpoints support
- ✅ JSON Web Token (JWT) handling
- ✅ Cryptographic key management (ES256, EdDSA)

---

## Known Compatibility Issues

### **Common Issues**

- **Deep Link Handling**: Some wallets may have different URL scheme
  requirements
- **Certificate Validation**: Strict certificate chain validation may require
  proper CA setup
- **Timeout Handling**: Different wallets may have varying timeout expectations

### **Workarounds**

Most compatibility issues can be resolved through:

- Proper SSL certificate configuration
- Adjusting timeout values in EUDIPLO configuration
- Using appropriate redirect URIs for the wallet's URL scheme

---

## Testing New Wallets

If you want to test EUDIPLO with a new wallet, follow these steps:

### **1. Setup Test Environment**

```bash
# Run EUDIPLO with proper HTTPS endpoint
docker run -p 3000:3000 \
  -e PUBLIC_URL=https://your-domain.com \
  -e JWT_SECRET=your-secret-key-here-minimum-32-characters \
  ghcr.io/openwallet-foundation-labs/eudiplo:latest
```

### **2. Test Credential Issuance**

1. Configure a test credential template
2. Initiate issuance flow via API
3. Complete the flow in your wallet
4. Verify credential is stored correctly

### **3. Test Credential Presentation**

1. Create a presentation request
2. Generate QR code or deep link
3. Present credential from wallet
4. Verify presentation is received and validated

### **4. Document Results**

Please document:

- Wallet name and version
- Test results (success/failure)
- Any configuration adjustments needed
- Error messages or issues encountered

---

## Contributing Compatibility Information

### **Reporting Compatible Wallets**

If you have successfully tested a wallet with EUDIPLO:

1. **Create an Issue**: Open a
   [new issue](https://github.com/openwallet-foundation-labs/eudiplo/issues/new)
   on GitHub
2. **Use Template**: Select the "Wallet Compatibility Report" template
3. **Provide Details**: Include wallet name, version, test results, and any
   configuration notes
4. **Screenshots**: Attach screenshots of successful flows if possible

### **Reporting Issues**

If you encounter compatibility problems:

1. **Check Known Issues**: Review the section above first
2. **Gather Information**: Collect logs, error messages, and configuration
   details
3. **Create Bug Report**: Open an issue with detailed reproduction steps
4. **Community Support**: Ask for help in our
   [Discord community](https://discord.gg/58ys8XfXDu)

---

## Version Compatibility Matrix

| EUDIPLO Version | Protocol Versions                                     | Notes               |
| --------------- | ----------------------------------------------------- | ------------------- |
| 1.x.x           | OID4VCI draft-15, OID4VP draft-24, SD-JWT VC draft-08 | Current stable      |
| Latest (main)   | Latest draft versions                                 | Development version |

!!! warning "Protocol Evolution"

    EUDI wallet protocols are still evolving. Compatibility may change as new protocol versions are adopted. We track the latest specifications and update EUDIPLO accordingly.

---

## Need Help?

- 📖 **Documentation**: Check our
  [Getting Started guide](../getting-started/quick-start.md)
- 🐛 **Issues**: Report problems on
  [GitHub Issues](https://github.com/openwallet-foundation-labs/eudiplo/issues)
- 💬 **Community**: Join our [Discord server](https://discord.gg/58ys8XfXDu)
- 📧 **Contact**: Reach out to the EUDIPLO team through GitHub discussions
