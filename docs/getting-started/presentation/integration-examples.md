# Integration Examples

This guide provides real-world integration examples for implementing credential
presentation flows with EUDIPLO. Learn how to build complete solutions for
common use cases.

---

## Example 1: Age Verification for Content Access

### Scenario

A streaming platform needs to verify user age before allowing access to
age-restricted content.

### Implementation

#### 1. Create Age Verification Configuration

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "age-verification-streaming",
    "dcql_query": {
        "credentials": [
            {
                "id": "age-credential",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://government.gov/credentials/vct/pid"]
                },
                "claims": [
                    {
                        "path": ["age_over_18"]
                    }
                ]
            }
        ]
    },
    "registrationCert": {
        "body": {
            "privacy_policy": "https://streamingapp.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Age verification for access to age-restricted content"
                },
                {
                    "locale": "de-DE",
                    "name": "Altersverifikation für den Zugang zu altersbeschränkten Inhalten"
                }
            ],
            "contact": {
                "website": "https://streamingapp.com/contact",
                "email": "privacy@streamingapp.com",
                "phone": "+1 555 STREAM1"
            },
            "legal_basis": "Legitimate interest for content age restrictions compliance",
            "data_retention": "Verification status stored for 24 hours maximum"
        }
    },
    "webhook": {
        "url": "https://api.streamingapp.com/age-verification-webhook"
    }
  }'
```

#### 2. Web Application Integration

```javascript
// Frontend: Request age verification
async function requestAgeVerification(userId) {
    try {
        const response = await fetch('/api/request-age-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify({ userId }),
        });

        const result = await response.json();

        // Display QR code or link to user
        showVerificationModal(result.uri, result.session_id);

        // Poll for completion
        pollVerificationStatus(result.session_id);
    } catch (error) {
        console.error('Age verification request failed:', error);
        showErrorMessage('Unable to start age verification. Please try again.');
    }
}

// Poll for verification completion
async function pollVerificationStatus(sessionId) {
    const pollInterval = setInterval(async () => {
        try {
            const response = await fetch(
                `/api/verification-status/${sessionId}`,
            );
            const status = await response.json();

            if (status.completed) {
                clearInterval(pollInterval);
                if (status.ageVerified) {
                    redirectToRestrictedContent();
                } else {
                    showAgeVerificationFailed();
                }
            }
        } catch (error) {
            console.error('Status polling error:', error);
        }
    }, 2000);

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 300000);
}
```

#### 3. Backend Implementation

```javascript
const express = require('express');
const app = express();

// Store verification sessions temporarily
const verificationSessions = new Map();

// Request age verification endpoint
app.post('/api/request-age-verification', async (req, res) => {
    try {
        const { userId } = req.body;

        // Create presentation request
        const presentationResponse = await fetch(
            'http://localhost:3000/presentation-management/request',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${eudiploBearerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    response_type: 'uri',
                    requestId: 'age-verification-streaming',
                }),
            },
        );

        const presentationData = await presentationResponse.json();

        // Store session for tracking
        verificationSessions.set(presentationData.session_id, {
            userId,
            status: 'pending',
            createdAt: new Date(),
        });

        res.json({
            uri: presentationData.uri,
            session_id: presentationData.session_id,
        });
    } catch (error) {
        console.error('Age verification request error:', error);
        res.status(500).json({
            error: 'Failed to create verification request',
        });
    }
});

// Webhook handler for verification results
app.post('/age-verification-webhook', (req, res) => {
    try {
        const { sessionId, verifiedClaims, status } = req.body;

        if (verificationSessions.has(sessionId)) {
            const session = verificationSessions.get(sessionId);

            if (status === 'completed' && verifiedClaims['age-credential']) {
                const ageVerified =
                    verifiedClaims['age-credential'].age_over_18;

                // Update session status
                session.status = 'completed';
                session.ageVerified = ageVerified;
                session.completedAt = new Date();

                // Grant or deny access
                if (ageVerified) {
                    grantRestrictedContentAccess(session.userId);
                }

                verificationSessions.set(sessionId, session);
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Status check endpoint
app.get('/api/verification-status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const session = verificationSessions.get(sessionId);

    if (session) {
        res.json({
            completed: session.status === 'completed',
            ageVerified: session.ageVerified || false,
        });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

function grantRestrictedContentAccess(userId) {
    // Set user permission for 24 hours
    const accessExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    userDatabase.updateRestrictedAccess(userId, true, accessExpiry);
}
```

---

## Example 2: Employee Access Control System

### Scenario

A corporate facility requires employee credential verification for secure area
access.

### Implementation

#### 1. Employee Verification Configuration

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "employee-access-control",
    "dcql_query": {
        "credentials": [
            {
                "id": "employee-badge",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://company.com/credentials/vct/employee"]
                },
                "claims": [
                    {
                        "path": ["employee_id"]
                    },
                    {
                        "path": ["department"]
                    },
                    {
                        "path": ["clearance_level"]
                    },
                    {
                        "path": ["employment_status"]
                    },
                    {
                        "path": ["valid_until"]
                    }
                ]
            }
        ]
    },
    "registrationCert": {
        "body": {
            "privacy_policy": "https://company.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Employee verification for secure facility access control"
                }
            ],
            "contact": {
                "website": "https://company.com/hr-contact",
                "email": "hr-privacy@company.com",
                "phone": "+1 555 COMPANY"
            },
            "legal_basis": "Legitimate interest for facility security and employee safety",
            "data_retention": "Access logs retained for security audit purposes only"
        }
    },
    "webhook": {
        "url": "https://access-control.company.com/employee-verification-webhook"
    }
  }'
```

#### 2. Access Control Terminal Integration

```python
import requests
import qrcode
import time
from datetime import datetime, timedelta

class AccessControlTerminal:
    def __init__(self, terminal_id, eudiplo_token):
        self.terminal_id = terminal_id
        self.eudiplo_token = eudiplo_token
        self.base_url = "http://localhost:3000"
        self.pending_sessions = {}

    def request_employee_verification(self, door_id):
        """Request employee credential verification"""
        try:
            response = requests.post(
                f"{self.base_url}/presentation-management/request",
                headers={
                    "Authorization": f"Bearer {self.eudiplo_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "response_type": "qrcode",
                    "requestId": "employee-access-control"
                }
            )

            if response.status_code == 200:
                # Display QR code on terminal screen
                qr_image = response.content
                self.display_qr_code(qr_image)

                # Extract session ID from response headers or separate call
                session_id = self.get_session_id()

                # Track verification session
                self.pending_sessions[session_id] = {
                    'door_id': door_id,
                    'requested_at': datetime.now(),
                    'status': 'pending'
                }

                return session_id

        except Exception as e:
            print(f"Verification request failed: {e}")
            self.display_error("Verification system unavailable")
            return None

    def display_qr_code(self, qr_image_data):
        """Display QR code on terminal screen"""
        # Implementation depends on terminal hardware
        print("QR Code displayed on terminal")

    def display_error(self, message):
        """Display error message on terminal"""
        print(f"ERROR: {message}")

    def grant_access(self, door_id, employee_data):
        """Grant access based on employee verification"""
        clearance_required = self.get_door_clearance_requirement(door_id)
        employee_clearance = employee_data.get('clearance_level')

        if self.check_clearance(employee_clearance, clearance_required):
            self.unlock_door(door_id)
            self.log_access_granted(door_id, employee_data['employee_id'])
            self.display_message("Access Granted", color="green")
        else:
            self.log_access_denied(door_id, employee_data['employee_id'], "Insufficient clearance")
            self.display_message("Access Denied - Insufficient Clearance", color="red")

    def check_clearance(self, employee_level, required_level):
        """Check if employee clearance meets requirements"""
        clearance_hierarchy = {
            'Level 1': 1,
            'Level 2': 2,
            'Level 3': 3,
            'Level 4': 4,
            'Executive': 5
        }

        employee_rank = clearance_hierarchy.get(employee_level, 0)
        required_rank = clearance_hierarchy.get(required_level, 0)

        return employee_rank >= required_rank

# Webhook handler for terminal
from flask import Flask, request, jsonify

app = Flask(__name__)
terminal = AccessControlTerminal("TERM001", "your-eudiplo-token")

@app.route('/employee-verification-webhook', methods=['POST'])
def handle_employee_verification():
    try:
        data = request.get_json()
        session_id = data.get('sessionId')
        verified_claims = data.get('verifiedClaims', {})
        status = data.get('status')

        if session_id in terminal.pending_sessions:
            session = terminal.pending_sessions[session_id]

            if status == 'completed' and 'employee-badge' in verified_claims:
                employee_data = verified_claims['employee-badge']

                # Validate employment status
                if employee_data.get('employment_status') == 'Active':
                    terminal.grant_access(session['door_id'], employee_data)
                else:
                    terminal.display_message("Access Denied - Employment Status Invalid", color="red")

                # Clean up session
                del terminal.pending_sessions[session_id]

        return jsonify({'received': True})

    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

---

## Example 3: Professional License Verification

### Scenario

A marketplace platform verifying service provider credentials before allowing
them to offer services.

### Implementation

#### 1. License Verification Configuration

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "professional-license-verification",
    "dcql_query": {
        "credentials": [
            {
                "id": "professional-license",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": [
                        "https://medical-board.gov/credentials/vct/medical-license",
                        "https://law-society.org/credentials/vct/law-license",
                        "https://engineering-board.org/credentials/vct/engineering-license"
                    ]
                },
                "claims": [
                    {
                        "path": ["license_number"]
                    },
                    {
                        "path": ["license_type"]
                    },
                    {
                        "path": ["holder_name"]
                    },
                    {
                        "path": ["issuing_authority"]
                    },
                    {
                        "path": ["issue_date"]
                    },
                    {
                        "path": ["expiration_date"]
                    },
                    {
                        "path": ["specializations"]
                    }
                ]
            },
            {
                "id": "identity-document",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://government.gov/credentials/vct/pid"]
                },
                "claims": [
                    {
                        "path": ["given_name"]
                    },
                    {
                        "path": ["family_name"]
                    }
                ]
            }
        ]
    },
    "registrationCert": {
        "body": {
            "privacy_policy": "https://marketplace.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Professional license verification for service provider qualification"
                }
            ],
            "contact": {
                "website": "https://marketplace.com/support",
                "email": "verification@marketplace.com",
                "phone": "+1 555 MARKET1"
            },
            "legal_basis": "Contractual necessity for service provider onboarding",
            "data_retention": "License verification data retained for regulatory compliance"
        }
    },
    "webhook": {
        "url": "https://api.marketplace.com/license-verification-webhook"
    }
  }'
```

#### 2. Service Provider Onboarding

```javascript
const express = require('express');
const mongoose = require('mongoose');

// Service Provider Schema
const ServiceProviderSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'expired'],
        default: 'pending',
    },
    licenseData: {
        number: String,
        type: String,
        authority: String,
        expirationDate: Date,
        specializations: [String],
    },
    verifiedAt: Date,
    nextVerificationDue: Date,
});

const ServiceProvider = mongoose.model(
    'ServiceProvider',
    ServiceProviderSchema,
);

class LicenseVerificationService {
    async startVerificationProcess(userId, serviceCategory) {
        try {
            // Create or update service provider record
            let provider = await ServiceProvider.findOne({ userId });
            if (!provider) {
                provider = new ServiceProvider({
                    userId,
                    verificationStatus: 'pending',
                });
                await provider.save();
            }

            // Request license verification
            const response = await fetch(
                'http://localhost:3000/presentation-management/request',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${process.env.EUDIPLO_TOKEN}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        response_type: 'uri',
                        requestId: 'professional-license-verification',
                    }),
                },
            );

            const result = await response.json();

            // Store session mapping
            await this.storeVerificationSession(result.session_id, userId);

            return {
                verificationUri: result.uri,
                sessionId: result.session_id,
                status: 'verification_requested',
            };
        } catch (error) {
            console.error('Verification process error:', error);
            throw new Error('Failed to start verification process');
        }
    }

    async processVerificationResult(sessionId, verifiedClaims) {
        try {
            const userId = await this.getUserFromSession(sessionId);
            const provider = await ServiceProvider.findOne({ userId });

            if (!provider) {
                throw new Error('Service provider not found');
            }

            const licenseData = verifiedClaims['professional-license'];
            const identityData = verifiedClaims['identity-document'];

            // Validate license expiration
            const expirationDate = new Date(licenseData.expiration_date);
            const now = new Date();

            if (expirationDate <= now) {
                provider.verificationStatus = 'rejected';
                await provider.save();

                await this.notifyUser(
                    userId,
                    'verification_failed',
                    'License has expired',
                );
                return;
            }

            // Validate name matching
            const licenseHolderName = licenseData.holder_name.toLowerCase();
            const providedName =
                `${identityData.given_name} ${identityData.family_name}`.toLowerCase();

            if (!this.namesMatch(licenseHolderName, providedName)) {
                provider.verificationStatus = 'rejected';
                await provider.save();

                await this.notifyUser(
                    userId,
                    'verification_failed',
                    'Name mismatch between license and identity',
                );
                return;
            }

            // Cross-check with licensing authority
            const licenseValid = await this.verifyWithLicensingAuthority(
                licenseData.license_number,
                licenseData.issuing_authority,
            );

            if (!licenseValid) {
                provider.verificationStatus = 'rejected';
                await provider.save();

                await this.notifyUser(
                    userId,
                    'verification_failed',
                    'License verification failed with issuing authority',
                );
                return;
            }

            // Update provider with verified license data
            provider.licenseData = {
                number: licenseData.license_number,
                type: licenseData.license_type,
                authority: licenseData.issuing_authority,
                expirationDate: expirationDate,
                specializations: licenseData.specializations || [],
            };
            provider.verificationStatus = 'verified';
            provider.verifiedAt = new Date();
            provider.nextVerificationDue =
                this.calculateNextVerificationDate(expirationDate);

            await provider.save();

            // Enable service provider capabilities
            await this.enableServiceProviderAccess(userId, licenseData);

            await this.notifyUser(
                userId,
                'verification_successful',
                'License verified successfully',
            );
        } catch (error) {
            console.error('Verification result processing error:', error);
            throw error;
        }
    }

    async verifyWithLicensingAuthority(licenseNumber, authority) {
        // Implementation depends on specific licensing authority APIs
        try {
            const response = await fetch(`${authority}/api/verify-license`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ license_number: licenseNumber }),
            });

            const result = await response.json();
            return result.valid === true;
        } catch (error) {
            console.error('Authority verification error:', error);
            return false;
        }
    }

    namesMatch(licenseName, providedName) {
        // Implement fuzzy name matching logic
        return (
            licenseName.includes(providedName) ||
            providedName.includes(licenseName)
        );
    }

    calculateNextVerificationDate(licenseExpiration) {
        // Schedule re-verification 30 days before license expires
        const reVerificationDate = new Date(licenseExpiration);
        reVerificationDate.setDate(reVerificationDate.getDate() - 30);
        return reVerificationDate;
    }

    async enableServiceProviderAccess(userId, licenseData) {
        // Enable specific service categories based on license type
        const serviceCategories = this.mapLicenseToServiceCategories(
            licenseData.license_type,
        );

        // Update user permissions in your system
        await this.updateUserPermissions(userId, serviceCategories);
    }
}

// Webhook endpoint
app.post('/license-verification-webhook', async (req, res) => {
    try {
        const { sessionId, verifiedClaims, status } = req.body;

        if (status === 'completed' && verifiedClaims) {
            const verificationService = new LicenseVerificationService();
            await verificationService.processVerificationResult(
                sessionId,
                verifiedClaims,
            );
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('License verification webhook error:', error);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});
```

---

## Example 4: Multi-Factor Identity Verification

### Scenario

A financial services platform requiring multi-credential verification for
high-value transactions.

### Implementation

```bash
curl -X 'POST' \
  'http://localhost:3000/presentation-management' \
  -H 'Authorization: Bearer eyJhb...npoNk' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "financial-multi-factor-verification",
    "dcql_query": {
        "credentials": [
            {
                "id": "government-id",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://government.gov/credentials/vct/pid"]
                },
                "claims": [
                    {
                        "path": ["given_name"]
                    },
                    {
                        "path": ["family_name"]
                    },
                    {
                        "path": ["birth_date"]
                    },
                    {
                        "path": ["document_number"]
                    }
                ]
            },
            {
                "id": "bank-account",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://central-bank.gov/credentials/vct/bank-account"]
                },
                "claims": [
                    {
                        "path": ["account_holder_name"]
                    },
                    {
                        "path": ["account_number"]
                    },
                    {
                        "path": ["bank_name"]
                    },
                    {
                        "path": ["account_status"]
                    }
                ]
            },
            {
                "id": "address-proof",
                "format": "dc+sd-jwt",
                "meta": {
                    "vct_values": ["https://utility-company.com/credentials/vct/address-proof"]
                },
                "claims": [
                    {
                        "path": ["full_address"]
                    },
                    {
                        "path": ["resident_name"]
                    },
                    {
                        "path": ["verification_date"]
                    }
                ]
            }
        ]
    },
    "registrationCert": {
        "body": {
            "privacy_policy": "https://financeapp.com/privacy-policy",
            "purpose": [
                {
                    "locale": "en-US",
                    "name": "Multi-factor identity verification for high-value financial transactions"
                }
            ],
            "contact": {
                "website": "https://financeapp.com/contact",
                "email": "compliance@financeapp.com",
                "phone": "+1 555 FINANCE"
            },
            "legal_basis": "Legal obligation for anti-money laundering compliance",
            "data_retention": "KYC data retained as required by financial regulations"
        }
    },
    "webhook": {
        "url": "https://api.financeapp.com/multi-factor-verification-webhook"
    }
  }'
```

This multi-factor verification ensures:

- **Identity verification** through government-issued credentials
- **Financial standing** through bank account verification
- **Address verification** through utility credentials
- **Cross-credential validation** to prevent fraud

---

## Next Steps

- Review [Authentication](authentication.md) for security implementation details
- Explore the main [Presentation Guide](index.md) for architectural concepts
