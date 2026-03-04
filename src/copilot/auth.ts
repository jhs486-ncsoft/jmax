// Copilot OAuth Device Flow - GitHub Copilot 인증
// OpenCode와 동일한 Device Flow 방식

import type {
  CopilotAuth,
  DeviceCodeResponse,
  AccessTokenResponse,
} from "../types/index.js";
import { AuthStore } from "./auth-store.js";

// VS Code Copilot extension과 동일한 Client ID (OpenCode도 동일)
const CLIENT_ID = "Ov23li8tweQw6odWQebz";
const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_AGENT = "jmax/0.1.0";

// 폴링 안전 마진 (초)
const POLL_SAFETY_MARGIN = 3;

export class CopilotAuth_ {
  private store: AuthStore;

  constructor() {
    this.store = new AuthStore();
  }

  /**
   * 저장된 토큰이 있는지 확인
   */
  async isAuthenticated(): Promise<boolean> {
    return this.store.hasToken();
  }

  /**
   * 저장된 토큰 가져오기
   */
  async getToken(): Promise<string | null> {
    const auth = await this.store.load();
    return auth?.refresh ?? null;
  }

  /**
   * Device Flow로 GitHub 인증 수행
   * @returns true if login succeeded
   */
  async login(
    onUserCode: (verificationUri: string, userCode: string) => void,
    onPolling?: () => void
  ): Promise<boolean> {
    // Step 1: Device Code 요청
    const deviceCode = await this.requestDeviceCode();

    // Step 2: 사용자에게 코드 표시
    onUserCode(deviceCode.verification_uri, deviceCode.user_code);

    // Step 3: Access Token 폴링
    const token = await this.pollForToken(
      deviceCode.device_code,
      deviceCode.interval,
      deviceCode.expires_in,
      onPolling
    );

    if (!token) {
      return false;
    }

    // Step 4: 토큰 저장
    const auth: CopilotAuth = {
      type: "oauth",
      refresh: token,
      access: token,
      expires: 0,
    };

    await this.store.save(auth);
    return true;
  }

  /**
   * 로그아웃 (토큰 삭제)
   */
  async logout(): Promise<void> {
    await this.store.clear();
  }

  /**
   * Step 1: GitHub Device Code 요청
   */
  private async requestDeviceCode(): Promise<DeviceCodeResponse> {
    const response = await fetch(GITHUB_DEVICE_CODE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        scope: "read:user",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Device code request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as DeviceCodeResponse;

    if (!data.device_code || !data.user_code) {
      throw new Error("Invalid device code response from GitHub");
    }

    return data;
  }

  /**
   * Step 3: Access Token 폴링
   */
  private async pollForToken(
    deviceCode: string,
    interval: number,
    expiresIn: number,
    onPolling?: () => void
  ): Promise<string | null> {
    const deadline = Date.now() + expiresIn * 1000;
    let pollInterval = (interval + POLL_SAFETY_MARGIN) * 1000;

    while (Date.now() < deadline) {
      await this.sleep(pollInterval);

      if (onPolling) onPolling();

      const result = await this.requestAccessToken(deviceCode);

      if (result.access_token) {
        return result.access_token;
      }

      if (result.error === "authorization_pending") {
        // 계속 폴링
        continue;
      }

      if (result.error === "slow_down") {
        // interval 증가 (RFC 8628)
        pollInterval = ((result.interval || interval) + POLL_SAFETY_MARGIN + 5) * 1000;
        continue;
      }

      // 그 외 에러 → 실패
      throw new Error(
        result.error_description || result.error || "Authentication failed"
      );
    }

    throw new Error("Authentication timed out. Please try again.");
  }

  /**
   * Access Token 요청 (단일 폴)
   */
  private async requestAccessToken(
    deviceCode: string
  ): Promise<AccessTokenResponse> {
    const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Token request failed: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as AccessTokenResponse;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
