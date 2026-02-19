import { Injectable } from '@angular/core';
import {
  sessionControllerDeleteSession,
  sessionControllerGetAllSessions,
  sessionControllerGetSession,
  Session,
} from '@eudiplo/sdk-core';
@Injectable({
  providedIn: 'root',
})
export class SessionManagementService {
  constructor() {}

  /**
   * Get all sessions
   */
  async getAllSessions(): Promise<Session[]> {
    try {
      const response = await sessionControllerGetAllSessions();
      return response.data || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw new Error('Failed to load sessions', { cause: error });
    }
  }

  /**
   * Get a specific session by ID
   */
  async getSession(id: string): Promise<Session> {
    return sessionControllerGetSession({
      path: { id },
    }).then((response) => {
      if (response.data) {
        return response.data;
      } else {
        throw new Error('Session not found');
      }
    });
  }

  /**
   * Format a date string for display
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  }

  /**
   * Get session status display text
   */
  getStatusDisplay(status: any): string {
    if (typeof status === 'object' && status !== null) {
      return JSON.stringify(status);
    }
    return status?.toString() || 'Unknown';
  }

  /**
   * Revoke/delete a session by ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await sessionControllerDeleteSession({
        path: { id: sessionId },
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error(`Failed to delete session ${sessionId}`, { cause: error });
    }
  }
}
