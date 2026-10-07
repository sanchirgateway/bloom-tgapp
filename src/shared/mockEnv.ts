import { emitEvent, isTMA, mockTelegramEnv } from "@tma.js/sdk-react";

if (import.meta.env.DEV) {
  if (!(await isTMA("complete"))) {
    const themeParams = {
      bg_color: "#17212b",
      text_color: "#f5f5f5",
      hint_color: "#708499",
      link_color: "#6ab3f3",
      button_color: "#5288c1",
      button_text_color: "#ffffff",
      secondary_bg_color: "#232e3c",
    } as const;
    const noInsets = { left: 0, top: 0, bottom: 0, right: 0 } as const;

    mockTelegramEnv({
      onEvent(e) {
        if (e.name === "web_app_request_theme")
          return emitEvent("theme_changed", { theme_params: themeParams });
        if (e.name === "web_app_request_viewport")
          return emitEvent("viewport_changed", {
            height: window.innerHeight,
            width: window.innerWidth,
            is_expanded: true,
            is_state_stable: true,
          });
        if (e.name === "web_app_request_content_safe_area")
          return emitEvent("content_safe_area_changed", noInsets);
        if (e.name === "web_app_request_safe_area")
          return emitEvent("safe_area_changed", noInsets);
      },
      launchParams: new URLSearchParams([
        ["tgWebAppThemeParams", JSON.stringify(themeParams)],
        [
          "tgWebAppData",
          new URLSearchParams([
            ["auth_date", String((Date.now() / 1000) | 0)],
            ["hash", "some-hash"],
            ["signature", "some-signature"],
            ["user", JSON.stringify({ id: 1, first_name: "Dev" })],
          ]).toString(),
        ],
        ["tgWebAppVersion", "8.4"],
        ["tgWebAppPlatform", "tdesktop"],
      ]),
    });
  }
}
