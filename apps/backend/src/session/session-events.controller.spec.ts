import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { firstValueFrom, take, toArray } from "rxjs";
import { Mock, describe, it, expect, beforeEach, vi } from "vitest";
import { JwtService as AuthJwtService } from "../auth/jwt.service";
import { Session, SessionStatus } from "./entities/session.entity";
import { SessionService } from "./session.service";
import { SessionEventsController } from "./session-events.controller";
import { SessionEventsService } from "./session-events.service";

describe("SessionEventsController", () => {
    let controller: SessionEventsController;
    let mockSessionService: Partial<SessionService>;
    let mockSessionEventsService: Partial<SessionEventsService>;
    let mockJwtService: Partial<AuthJwtService>;

    const mockSession: Partial<Session> = {
        id: "test-session-id",
        tenantId: "test-tenant",
        status: SessionStatus.Active,
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
    };

    beforeEach(async () => {
        mockSessionService = {
            get: vi.fn(),
        };

        mockSessionEventsService = {
            getSessionEvents: vi.fn(),
        };

        mockJwtService = {
            verifyToken: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SessionEventsController],
            providers: [
                { provide: SessionService, useValue: mockSessionService },
                {
                    provide: SessionEventsService,
                    useValue: mockSessionEventsService,
                },
                { provide: AuthJwtService, useValue: mockJwtService },
            ],
        }).compile();

        controller = module.get<SessionEventsController>(
            SessionEventsController,
        );
    });

    it("should be defined", () => {
        expect(controller).toBeDefined();
    });

    describe("subscribeToSessionEvents", () => {
        it("should throw UnauthorizedException when no token provided", async () => {
            await expect(
                controller.subscribeToSessionEvents("session-id", ""),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("should throw UnauthorizedException when token is invalid", async () => {
            (mockJwtService.verifyToken as Mock).mockRejectedValue(
                new Error("Invalid token"),
            );

            await expect(
                controller.subscribeToSessionEvents(
                    "session-id",
                    "invalid-token",
                ),
            ).rejects.toThrow(UnauthorizedException);
        });

        it("should throw NotFoundException when session does not exist", async () => {
            (mockJwtService.verifyToken as Mock).mockResolvedValue({
                sub: "test-user",
            });
            (mockSessionService.get as Mock).mockRejectedValue(
                new Error("Not found"),
            );

            await expect(
                controller.subscribeToSessionEvents(
                    "non-existent-session",
                    "valid-token",
                ),
            ).rejects.toThrow(NotFoundException);
        });

        it("should return observable with initial status when session exists", async () => {
            (mockJwtService.verifyToken as Mock).mockResolvedValue({
                sub: "test-user",
            });
            (mockSessionService.get as Mock).mockResolvedValue(mockSession);

            // Create a mock observable that just completes
            const { Subject } = await import("rxjs");
            const mockSubject = new Subject<MessageEvent>();
            (mockSessionEventsService.getSessionEvents as Mock).mockReturnValue(
                mockSubject.asObservable(),
            );

            const observable = await controller.subscribeToSessionEvents(
                mockSession.id as string,
                "valid-token",
            );

            // Get the first emitted value (the initial status)
            const firstEvent = await firstValueFrom(
                observable.pipe(take(1), toArray()),
            );

            expect(firstEvent).toHaveLength(1);

            const messageData = JSON.parse(firstEvent[0].data as string);
            expect(messageData.id).toBe(mockSession.id);
            expect(messageData.status).toBe(SessionStatus.Active);
            expect(messageData.updatedAt).toBe("2024-01-01T00:00:00.000Z");

            mockSubject.complete();
        });

        it("should call sessionEventsService.getSessionEvents with correct session id", async () => {
            (mockJwtService.verifyToken as Mock).mockResolvedValue({
                sub: "test-user",
            });
            (mockSessionService.get as Mock).mockResolvedValue(mockSession);

            const { Subject } = await import("rxjs");
            const mockSubject = new Subject<MessageEvent>();
            (mockSessionEventsService.getSessionEvents as Mock).mockReturnValue(
                mockSubject.asObservable(),
            );

            await controller.subscribeToSessionEvents(
                mockSession.id as string,
                "valid-token",
            );

            expect(
                mockSessionEventsService.getSessionEvents,
            ).toHaveBeenCalledWith(mockSession.id);

            mockSubject.complete();
        });
    });
});
