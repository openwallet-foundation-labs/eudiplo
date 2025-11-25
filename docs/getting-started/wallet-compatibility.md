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

## Tested Wallets

The following wallets have been tested and verified to work with
EUDIPLO:

| Wallet         | Provider                    | Download                                                                                                                                              | Features                   |
| -------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Heidi Wallet   | [Ubique](https://ubique.ch) | [Android](https://play.google.com/store/apps/details?id=ch.ubique.heidi.android) / [iOS](https://apps.apple.com/ch/app/heidi-wallet/id6741428702)     | [Details](#heidi-wallet)   |
| Paradym Wallet | [Animo](https://animo.id)   | [Android](https://play.google.com/store/apps/details?id=id.paradym.wallet) / [iOS](https://apps.apple.com/nl/app/paradym-wallet/id6449846111?l=en-GB) | [Details](#paradym-wallet) |

### Feature Support Details

#### Feature Legend

- **Issuance (OID4VCI)**
    - **Auth**: Authorization Code Flow
    - **Pre**: Pre-authorized Code Flow
    - **PDI**: Presentation during issuance
    - **DPoP**: DPoP proof of possession
    - **Att**: Client attestation
- **Presentation (OID4VP)**
    - **DC API**: Digital Credentials API support
- **Credential Format**
    - **SD-JWT**: SD-JWT VC support

!!! note "KISS: Keep It Simple, Stupid"

    The legend above explains the abbreviations used in the feature matrix below. If you think any other features should be tracked, please let us know!

#### Feature Matrix

| Wallet         | Auth | Pre | PDI | DPoP | Att | DC API | SD-JWT |
| -------------- | ---- | --- | --- | ---- | --- | ------ | ------ |
| Heidi Wallet   | ✅   | ✅  | n/a | ✅   | n/a | ✅     | ✅     |
| Paradym Wallet | ✅   | ✅  | n/a | ✅   | n/a | ✅     | ✅     |

#### Individual Wallet Details

##### Heidi Wallet

- **Version tested**: 1.0.4
- **Last verified**: October 11, 2025
- **Notes**: Got stuck in the presentation during issuance during the issuance process (credential got issued, but got not stored)

##### Paradym Wallet

- **Version tested**: 1.16.2
- **Last verified**: November 25, 2025

!!! note "Help us expand this list!"

    If you have successfully tested EUDIPLO with a wallet not listed here, please [reach out to us](https://github.com/openwallet-foundation-labs/eudiplo/issues/new?template=wallet-compatibility.md) so we can add it to this list.

---

## Testing New Wallets

If you want to test EUDIPLO with a new wallet, follow these steps:

### **1. Setup Test Environment**

```bash
# Run EUDIPLO with proper HTTPS endpoint
docker run -p 3000:3000 \
  -e PUBLIC_URL=https://your-domain.com \
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

| EUDIPLO Version | Protocol Versions                       | Notes               |
| --------------- | --------------------------------------- | ------------------- |
| 1.x.x           | OID4VCI 1, OID4VP 1, SD-JWT VC draft-11 | Current stable      |
| Latest (main)   | Latest draft versions                   | Development version |

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
