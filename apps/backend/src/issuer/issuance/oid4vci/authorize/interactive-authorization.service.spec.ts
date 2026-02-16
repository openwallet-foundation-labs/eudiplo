import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    InteractiveAuthorizationRequestDto,
    InteractiveAuthorizationRequestType,
} from "./dto/interactive-authorization.dto";
import { InteractiveAuthorizationService } from "./interactive-authorization.service";

describe("InteractiveAuthorizationService", () => {
    let service: InteractiveAuthorizationService;
    let authSessionRepository: {
        save: ReturnType<typeof vi.fn>;
        findOne: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
    };
    let sessionService: {
        create: ReturnType<typeof vi.fn>;
        add: ReturnType<typeof vi.fn>;
    };
    let credentialsService: { getCredentialConfig: ReturnType<typeof vi.fn> };
    let oid4vpService: { createRequest: ReturnType<typeof vi.fn> };
    let presentationsService: {
        getPresentationConfigs: ReturnType<typeof vi.fn>;
    };

    const mockTenantId = "test-tenant";
    const mockPublicUrl = "https://issuer.example.com";

    beforeEach(() => {
        authSessionRepository = {
            save: vi.fn(),
            findOne: vi.fn(),
            update: vi.fn(),
            remove: vi.fn(),
        };

        const mockConfigService = {
            getOrThrow: vi.fn((key: string) => {
                if (key === "PUBLIC_URL") return mockPublicUrl;
                throw new Error(`Unknown config key: ${key}`);
            }),
        };

        sessionService = {
            create: vi.fn(),
            add: vi.fn(),
        };

        credentialsService = {
            getCredentialConfig: vi.fn(),
        };

        oid4vpService = {
            createRequest: vi.fn(),
        };

        presentationsService = {
            getPresentationConfigs: vi.fn(),
        };

        const mockCryptoService = {};
        const mockIssuanceService = {};

        // Direct instantiation - constructor order matches service
        // configService, cryptoService, sessionService, issuanceService,
        // credentialsService, oid4vpService, presentationsService, authSessionRepository
        service = new InteractiveAuthorizationService(
            mockConfigService as any,
            mockCryptoService as any,
            sessionService as any,
            mockIssuanceService as any,
            credentialsService as any,
            oid4vpService as any,
            presentationsService as any,
            authSessionRepository as any,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("getAuthorizationServerMetadata", () => {
        it("should return metadata with interactive_authorization_endpoint", () => {
            const metadata =
                service.getAuthorizationServerMetadata(mockTenantId);

            expect(metadata.issuer).toBe(`${mockPublicUrl}/${mockTenantId}`);
            expect(metadata.interactive_authorization_endpoint).toBe(
                `${mockPublicUrl}/${mockTenantId}/authorize/interactive`,
            );
        });
    });

    describe("parseRequest", () => {
        const mockRequest = {
            headers: {},
        } as any;

        it("should parse initial request with interaction_types_supported", () => {
            const body: InteractiveAuthorizationRequestDto = {
                response_type: "code",
                client_id: "test-client",
                interaction_types_supported:
                    "openid4vp_presentation,redirect_to_web",
                redirect_uri: "https://wallet.example.com/callback",
                scope: "openid",
            };

            const result = service.parseRequest(
                body,
                mockRequest,
                mockTenantId,
            );

            expect(result.type).toBe(
                InteractiveAuthorizationRequestType.INITIAL,
            );
            expect((result.request as any).client_id).toBe("test-client");
            expect((result.request as any).interaction_types_supported).toBe(
                "openid4vp_presentation,redirect_to_web",
            );
        });

        it("should parse follow-up request with auth_session", () => {
            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "session-123",
                openid4vp_response: JSON.stringify({ vp_token: "token" }),
            };

            const result = service.parseRequest(
                body,
                mockRequest,
                mockTenantId,
            );

            expect(result.type).toBe(
                InteractiveAuthorizationRequestType.FOLLOW_UP,
            );
            expect((result.request as any).auth_session).toBe("session-123");
            expect((result.request as any).openid4vp_response).toBeDefined();
        });

        it("should throw BadRequestException when neither auth_session nor interaction_types_supported", () => {
            const body: InteractiveAuthorizationRequestDto = {
                client_id: "test-client",
            };

            expect(() =>
                service.parseRequest(body, mockRequest, mockTenantId),
            ).toThrow(BadRequestException);
        });

        it("should extract client attestation headers", () => {
            const mockRequestWithHeaders = {
                headers: {
                    "oauth-client-attestation": "attestation-jwt",
                    "oauth-client-attestation-pop": "attestation-pop-jwt",
                },
            } as any;

            const body: InteractiveAuthorizationRequestDto = {
                response_type: "code",
                client_id: "test-client",
                interaction_types_supported: "openid4vp_presentation",
            };

            const result = service.parseRequest(
                body,
                mockRequestWithHeaders,
                mockTenantId,
            );

            expect(result.clientAttestation).toBeDefined();
            expect(result.clientAttestation?.clientAttestationJwt).toBe(
                "attestation-jwt",
            );
            expect(result.clientAttestation?.clientAttestationPopJwt).toBe(
                "attestation-pop-jwt",
            );
        });
    });

    describe("handleRequest - Initial Request", () => {
        const mockRequest = { headers: {} } as any;
        const origin = "https://wallet.example.com";

        it("should return openid4vp interaction response", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                response_type: "code",
                client_id: "test-client",
                interaction_types_supported: "openid4vp_presentation",
            };

            authSessionRepository.save.mockResolvedValue({} as any);
            presentationsService.getPresentationConfigs.mockResolvedValue([
                { id: "presentation-config-1" } as any,
            ]);
            oid4vpService.createRequest.mockResolvedValue({
                uri: "openid4vp://request?request_uri=https://issuer.example.com/vp-request",
            });

            const result = await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            expect(result.status).toBe("require_interaction");
            expect(result.type).toBe("openid4vp_presentation");
            expect(result.auth_session).toBeDefined();
            expect(result.openid4vp_request).toBeDefined();
        });

        it("should return redirect_to_web response with PKCE", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                response_type: "code",
                client_id: "test-client",
                interaction_types_supported: "redirect_to_web",
                code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
                code_challenge_method: "S256",
            };

            authSessionRepository.save.mockResolvedValue({} as any);

            const result = await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            expect(result.status).toBe("require_interaction");
            expect(result.type).toBe("redirect_to_web");
            expect(result.auth_session).toBeDefined();
            expect(result.request_uri).toBeDefined();
        });

        it("should return redirect_to_web response without PKCE", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                response_type: "code",
                client_id: "test-client",
                interaction_types_supported: "redirect_to_web",
            };

            authSessionRepository.save.mockResolvedValue({} as any);

            const result = await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            // redirect_to_web works without PKCE but stores the session
            expect(result.status).toBe("require_interaction");
            expect(result.type).toBe("redirect_to_web");
        });

        it("should store authorization_details in session", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                response_type: "code",
                client_id: "test-client",
                interaction_types_supported: "openid4vp_presentation",
                authorization_details: JSON.stringify([
                    {
                        type: "openid_credential",
                        credential_configuration_id: "IdentityCredential",
                    },
                ]),
            };

            authSessionRepository.save.mockResolvedValue({} as any);
            presentationsService.getPresentationConfigs.mockResolvedValue([
                { id: "presentation-config-1" } as any,
            ]);
            oid4vpService.createRequest.mockResolvedValue({
                uri: "openid4vp://request",
            });

            await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            expect(authSessionRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    authorizationDetails:
                        expect.stringContaining("IdentityCredential"),
                }),
            );
        });

        it("should use credential-specific presentation config when available", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                response_type: "code",
                client_id: "test-client",
                interaction_types_supported: "openid4vp_presentation",
                authorization_details: JSON.stringify([
                    {
                        type: "openid_credential",
                        credential_configuration_id: "IdentityCredential",
                    },
                ]),
            };

            credentialsService.getCredentialConfig.mockResolvedValue({
                id: "IdentityCredential",
                requiredPresentationConfigId: "specific-presentation-config",
            });

            presentationsService.getPresentationConfigs.mockResolvedValue([
                { id: "specific-presentation-config" } as any,
            ]);

            authSessionRepository.save.mockResolvedValue({} as any);
            oid4vpService.createRequest.mockResolvedValue({
                uri: "openid4vp://request",
            });

            await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            expect(credentialsService.getCredentialConfig).toHaveBeenCalledWith(
                "IdentityCredential",
                mockTenantId,
            );
        });
    });

    describe("handleRequest - Follow-up Request", () => {
        const mockRequest = { headers: {} } as any;
        const origin = "https://wallet.example.com";

        it("should return authorization code on successful VP verification", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "session-123",
                openid4vp_response: JSON.stringify({ vp_token: "valid-token" }),
            };

            authSessionRepository.findOne.mockResolvedValue({
                id: "session-123",
                authSession: "session-123",
                tenantId: mockTenantId,
                status: "pending",
                interactionType: "openid4vp_presentation",
                interactionTypesSupported: "openid4vp_presentation",
                vpSessionId: "vp-session-id",
                clientId: "test-client",
                redirectUri: "https://wallet.example.com/callback",
                expiresAt: new Date(Date.now() + 600000),
                iaeActions: JSON.stringify([
                    {
                        type: "openid4vp_presentation",
                        presentationConfigId: "test-id",
                    },
                ]),
                currentStepIndex: 0,
                completedStepsData: JSON.stringify([]),
            });

            sessionService.add.mockResolvedValue({
                credentialsToSubmit: [{ verified: true }],
            });

            authSessionRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            expect(result.status).toBe("ok");
            expect(result.code).toBeDefined();
            expect(authSessionRepository.update).toHaveBeenCalled();
        });

        it("should return error for expired session", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "session-123",
                openid4vp_response: JSON.stringify({ vp_token: "token" }),
            };

            authSessionRepository.findOne.mockResolvedValue({
                id: "session-123",
                authSession: "session-123",
                status: "pending",
                expiresAt: new Date(Date.now() - 1000), // Expired
            });

            const result = await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            expect(result.error).toBeDefined();
        });

        it("should return error for invalid session", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "invalid-session",
                openid4vp_response: JSON.stringify({ vp_token: "token" }),
            };

            authSessionRepository.findOne.mockResolvedValue(null);

            const result = await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            expect(result.error).toBe("invalid_request");
            expect(result.error_description).toContain(
                "Invalid or expired auth_session",
            );
        });

        it("should handle redirect_to_web callback with valid code_verifier", async () => {
            const codeChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
            const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "session-123",
                code_verifier: codeVerifier,
            };

            authSessionRepository.findOne.mockResolvedValue({
                id: "session-123",
                authSession: "session-123",
                tenantId: mockTenantId,
                status: "web_auth_completed",
                interactionType: "redirect_to_web",
                interactionTypesSupported: "redirect_to_web",
                codeChallenge: codeChallenge,
                codeChallengeMethod: "S256",
                clientId: "test-client",
                redirectUri: "https://wallet.example.com/callback",
                expiresAt: new Date(Date.now() + 600000),
                iaeActions: JSON.stringify([
                    { type: "redirect_to_web", url: "https://example.com" },
                ]),
                currentStepIndex: 0,
                completedStepsData: JSON.stringify([]),
            });

            authSessionRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            expect(result.status).toBe("ok");
            expect(result.code).toBeDefined();
        });

        it("should return error for invalid code_verifier", async () => {
            const codeChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "session-123",
                code_verifier: "wrong-verifier",
            };

            authSessionRepository.findOne.mockResolvedValue({
                id: "session-123",
                authSession: "session-123",
                tenantId: mockTenantId,
                status: "web_auth_completed",
                interactionType: "redirect_to_web",
                interactionTypesSupported: "redirect_to_web",
                codeChallenge: codeChallenge,
                codeChallengeMethod: "S256",
                expiresAt: new Date(Date.now() + 600000),
                iaeActions: JSON.stringify([
                    { type: "redirect_to_web", url: "https://example.com" },
                ]),
                currentStepIndex: 0,
                completedStepsData: JSON.stringify([]),
            });

            const result = await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            expect(result.error).toBe("invalid_grant");
            expect(result.error_description).toContain("Invalid code_verifier");
        });
    });

    describe("completeWebAuthorization", () => {
        it("should mark session as complete", async () => {
            const authSession = "session-123";

            authSessionRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.completeWebAuthorization(
                authSession,
                mockTenantId,
            );

            expect(result).toBe(true);
            expect(authSessionRepository.update).toHaveBeenCalledWith(
                { authSession, tenantId: mockTenantId },
                { status: "web_auth_completed" },
            );
        });

        it("should return false for invalid session", async () => {
            authSessionRepository.update.mockResolvedValue({ affected: 0 });

            const result = await service.completeWebAuthorization(
                "invalid",
                mockTenantId,
            );

            expect(result).toBe(false);
        });
    });

    describe("Multi-step IAE Flow", () => {
        const mockRequest = { headers: {} } as any;
        const origin = "https://wallet.example.com";

        it("should advance to next step after completing first action in multi-step flow", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "session-123",
                openid4vp_response: JSON.stringify({ vp_token: "valid-token" }),
            };

            // Session with 2 IAE actions: openid4vp first, then redirect_to_web
            authSessionRepository.findOne.mockResolvedValue({
                id: "session-123",
                authSession: "session-123",
                tenantId: mockTenantId,
                status: "pending",
                interactionType: "openid4vp_presentation",
                interactionTypesSupported:
                    "openid4vp_presentation,redirect_to_web",
                vpSessionId: "vp-session-id",
                clientId: "test-client",
                redirectUri: "https://wallet.example.com/callback",
                expiresAt: new Date(Date.now() + 600000),
                iaeActions: JSON.stringify([
                    {
                        type: "openid4vp_presentation",
                        presentationConfigId: "verify-pid",
                    },
                    {
                        type: "redirect_to_web",
                        url: "https://portal.example.com/verify",
                        description: "Complete identity verification",
                    },
                ]),
                currentStepIndex: 0,
                completedStepsData: JSON.stringify([]),
            });

            sessionService.add.mockResolvedValue({
                credentialsToSubmit: [{ verified: true }],
            });

            authSessionRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            // Should return next action (redirect_to_web) instead of authorization code
            expect(result.status).toBe("require_interaction");
            expect(result.type).toBe("redirect_to_web");
            expect(result.request_uri).toBeDefined();
            expect(result.auth_session).toBe("session-123");

            // Should have advanced step index
            expect(authSessionRepository.update).toHaveBeenCalledWith(
                "session-123",
                expect.objectContaining({
                    currentStepIndex: 1,
                    status: "pending",
                }),
            );
        });

        it("should issue authorization code after completing all steps in multi-step flow", async () => {
            const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
            const codeChallenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "session-123",
                code_verifier: codeVerifier,
            };

            // Session at step 1 (redirect_to_web) - last step
            authSessionRepository.findOne.mockResolvedValue({
                id: "session-123",
                authSession: "session-123",
                tenantId: mockTenantId,
                status: "web_auth_completed",
                interactionType: "redirect_to_web",
                interactionTypesSupported:
                    "openid4vp_presentation,redirect_to_web",
                codeChallenge: codeChallenge,
                codeChallengeMethod: "S256",
                clientId: "test-client",
                redirectUri: "https://wallet.example.com/callback",
                expiresAt: new Date(Date.now() + 600000),
                iaeActions: JSON.stringify([
                    {
                        type: "openid4vp_presentation",
                        presentationConfigId: "verify-pid",
                    },
                    {
                        type: "redirect_to_web",
                        url: "https://portal.example.com/verify",
                    },
                ]),
                currentStepIndex: 1, // At last step
                completedStepsData: JSON.stringify([
                    {
                        stepIndex: 0,
                        type: "openid4vp_presentation",
                        completedAt: "2026-02-11T10:00:00Z",
                    },
                ]),
            });

            authSessionRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            // Should issue authorization code since all steps are complete
            expect(result.status).toBe("ok");
            expect(result.code).toBeDefined();

            // Should have updated status to AllStepsCompleted
            expect(authSessionRepository.update).toHaveBeenCalledWith(
                "session-123",
                expect.objectContaining({
                    status: "all_steps_completed",
                }),
            );
        });

        it("should track completedStepsData across steps", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "session-123",
                openid4vp_response: JSON.stringify({
                    vp_token: "valid-token",
                    presentation_submission: { id: "sub-1" },
                }),
            };

            authSessionRepository.findOne.mockResolvedValue({
                id: "session-123",
                authSession: "session-123",
                tenantId: mockTenantId,
                status: "pending",
                interactionType: "openid4vp_presentation",
                interactionTypesSupported:
                    "openid4vp_presentation,redirect_to_web",
                expiresAt: new Date(Date.now() + 600000),
                iaeActions: JSON.stringify([
                    {
                        type: "openid4vp_presentation",
                        presentationConfigId: "verify-pid",
                    },
                    { type: "redirect_to_web", url: "https://example.com" },
                ]),
                currentStepIndex: 0,
                completedStepsData: JSON.stringify([]),
            });

            sessionService.add.mockResolvedValue({});
            authSessionRepository.update.mockResolvedValue({ affected: 1 });

            await service.handleRequest(
                body,
                mockRequest,
                mockTenantId,
                origin,
            );

            // Should have stored step completion data
            expect(authSessionRepository.update).toHaveBeenCalledWith(
                "session-123",
                expect.objectContaining({
                    completedStepsData: expect.stringContaining(
                        "openid4vp_presentation",
                    ),
                }),
            );
        });
    });
});
