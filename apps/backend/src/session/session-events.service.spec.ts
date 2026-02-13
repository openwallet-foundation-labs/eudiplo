import { Test, TestingModule } from "@nestjs/testing";
import { firstValueFrom, take, timeout, toArray } from "rxjs";
import { describe, it, expect, beforeEach } from "vitest";
import { SessionStatus } from "./entities/session.entity";
import {
    SESSION_STATUS_CHANGED,
    SessionEventsService,
    SessionStatusChangedEvent,
} from "./session-events.service";

describe("SessionEventsService", () => {
    let service: SessionEventsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SessionEventsService],
        }).compile();

        service = module.get<SessionEventsService>(SessionEventsService);
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("getSessionEvents", () => {
        it("should return an observable", () => {
            const observable = service.getSessionEvents("test-session-id");
            expect(observable).toBeDefined();
            expect(typeof observable.subscribe).toBe("function");
        });

        it("should filter events by session ID", async () => {
            const targetSessionId = "target-session";
            const otherSessionId = "other-session";

            const observable = service.getSessionEvents(targetSessionId);

            // Set up subscription before emitting events
            const eventsPromise = firstValueFrom(
                observable.pipe(take(1), timeout(1000)),
            );

            // Emit event for other session (should be filtered out)
            service.handleSessionStatusChanged({
                sessionId: otherSessionId,
                status: SessionStatus.Completed,
                updatedAt: new Date(),
            });

            // Emit event for target session (should be received)
            service.handleSessionStatusChanged({
                sessionId: targetSessionId,
                status: SessionStatus.Completed,
                updatedAt: new Date(),
            });

            const event = await eventsPromise;
            const data = JSON.parse(event.data as string);
            expect(data.id).toBe(targetSessionId);
        });

        it("should format events as MessageEvent with JSON data", async () => {
            const sessionId = "test-session";
            const status = SessionStatus.Completed;
            const updatedAt = new Date("2024-01-15T12:00:00.000Z");

            const observable = service.getSessionEvents(sessionId);

            const eventsPromise = firstValueFrom(
                observable.pipe(take(1), timeout(1000)),
            );

            service.handleSessionStatusChanged({
                sessionId,
                status,
                updatedAt,
            });

            const event = await eventsPromise;

            expect(event).toBeInstanceOf(MessageEvent);
            expect(event.type).toBe("message");

            const data = JSON.parse(event.data as string);
            expect(data.id).toBe(sessionId);
            expect(data.status).toBe(status);
            expect(data.updatedAt).toBe("2024-01-15T12:00:00.000Z");
        });
    });

    describe("handleSessionStatusChanged", () => {
        it("should forward events to subscribers", async () => {
            const sessionId = "test-session";

            const observable = service.getSessionEvents(sessionId);

            const eventsPromise = firstValueFrom(
                observable.pipe(take(2), toArray(), timeout(1000)),
            );

            // Emit two events
            service.handleSessionStatusChanged({
                sessionId,
                status: SessionStatus.Fetched,
                updatedAt: new Date(),
            });

            service.handleSessionStatusChanged({
                sessionId,
                status: SessionStatus.Completed,
                updatedAt: new Date(),
            });

            const events = await eventsPromise;

            expect(events).toHaveLength(2);

            const firstData = JSON.parse(events[0].data as string);
            expect(firstData.status).toBe(SessionStatus.Fetched);

            const secondData = JSON.parse(events[1].data as string);
            expect(secondData.status).toBe(SessionStatus.Completed);
        });
    });

    describe("SESSION_STATUS_CHANGED constant", () => {
        it("should have the expected value", () => {
            expect(SESSION_STATUS_CHANGED).toBe("session.status.changed");
        });
    });
});
