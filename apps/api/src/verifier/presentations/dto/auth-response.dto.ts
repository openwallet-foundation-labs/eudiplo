/**
 * AuthResponse DTO
 */
export interface AuthResponse {
  /**
   * The VP token containing the presentation data.
   */
  vp_token: {
    /**
     * Key-value pairs representing the VP token data.
     */
    [key: string]: string;
  };
  /**
   * The state parameter to maintain state between the request and callback.
   */
  state: string;
}
