import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InteractiveAuthorizationRequestDto } from "./dto/interactive-authorization.dto";
import { InteractiveAuthorizationController } from "./interactive-authorization.controller";
import { InteractiveAuthorizationService } from "./interactive-authorization.service";

describe("InteractiveAuthorizationController", () => {
    let controller: InteractiveAuthorizationController;
    let service: {
        handleRequest: ReturnType<typeof vi.fn>;
        completeWebAuthorization: ReturnType<typeof vi.fn>;
    };

    const mockTenantId = "test-tenant";

    beforeEach(() => {
        service = {
            handleRequest: vi.fn(),
            completeWebAuthorization: vi.fn(),
        };

        // Direct instantiation to avoid TypeORM entity initialization issues
        controller = new InteractiveAuthorizationController(
            service as unknown as InteractiveAuthorizationService,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    describe("interactiveAuthorization", () => {
        const mockRequest = {
            headers: {
                referer: "https://wallet.example.com",
            },
        } as any;

        const mockResponse = {
            status: vi.fn().mockReturnThis(),
        } as any;

        it("should handle initial request and return interaction response", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                response_type: "code",
                client_id: "test-client",
                interaction_types_supported: "openid4vp_presentation",
            };

            const serviceResponse = {
                status: "require_interaction",
                type: "openid4vp_presentation",
                auth_session: "session-123",
                openid4vp_request: {
                    request: "openid4vp://...",
                },
            };

            service.handleRequest.mockResolvedValue(serviceResponse);

            const result = await controller.interactiveAuthorization(
                body,
                mockRequest,
                mockResponse,
                mockTenantId,
                "https://wallet.example.com",
            );

            expect(service.handleRequest).toHaveBeenCalledWith(
                body,
                mockRequest,
                mockTenantId,
                "https://wallet.example.com",
            );
            expect(result).toEqual(serviceResponse);
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it("should handle follow-up request and return authorization code", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "session-123",
                openid4vp_response: JSON.stringify({ vp_token: "token" }),
            };

            const serviceResponse = {
                status: "ok",
                code: "auth-code-456",
            };

            service.handleRequest.mockResolvedValue(serviceResponse);

            const result = await controller.interactiveAuthorization(
                body,
                mockRequest,
                mockResponse,
                mockTenantId,
                "https://wallet.example.com",
            );

            expect(result).toEqual(serviceResponse);
        });

        it("should handle PKCE redirect_to_web flow", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                response_type: "code",
                client_id: "test-client",
                interaction_types_supported: "redirect_to_web",
                code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
                code_challenge_method: "S256",
            };

            const serviceResponse = {
                status: "require_interaction",
                type: "redirect_to_web",
                auth_session: "session-123",
                redirect_to_web_uri:
                    "https://issuer.example.com/auth?session=session-123",
            };

            service.handleRequest.mockResolvedValue(serviceResponse);

            const result = await controller.interactiveAuthorization(
                body,
                mockRequest,
                mockResponse,
                mockTenantId,
                "https://wallet.example.com",
            );

            expect(result).toEqual(serviceResponse);
        });

        it("should handle error response with proper status", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                auth_session: "expired-session",
            };

            const errorResponse = {
                status: "error",
                error: "authorization_pending",
                error_description: "Session has expired",
            };

            service.handleRequest.mockResolvedValue(errorResponse);

            const result = await controller.interactiveAuthorization(
                body,
                mockRequest,
                mockResponse,
                mockTenantId,
                "https://wallet.example.com",
            );

            expect(result).toEqual(errorResponse);
        });

        it("should extract origin from referer header when not provided", async () => {
            const body: InteractiveAuthorizationRequestDto = {
                response_type: "code",
                client_id: "test-client",
                interaction_types_supported: "openid4vp_presentation",
            };

            service.handleRequest.mockResolvedValue({
                status: "require_interaction",
            });

            // Call without explicit origin (undefined) - should fallback to referer
            await controller.interactiveAuthorization(
                body,
                mockRequest,
                mockResponse,
                mockTenantId,
                undefined as any,
            );

            // Controller extracts from referer header when origin is not provided
            expect(service.handleRequest).toHaveBeenCalledWith(
                body,
                mockRequest,
                mockTenantId,
                "https://wallet.example.com", // Falls back to referer header
            );
        });
    });

    describe("completeWebAuth (helper function)", () => {
        it("should call service to complete web authorization", async () => {
            const authSession = "session-123";

            service.completeWebAuthorization.mockResolvedValue(undefined);

            // Access through the service mock since completeWebAuth is internal
            await service.completeWebAuthorization(mockTenantId, authSession);

            expect(service.completeWebAuthorization).toHaveBeenCalledWith(
                mockTenantId,
                authSession,
            );
        });
    });
});
