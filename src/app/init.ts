import {
  init as initSDK,
  setDebug,
  backButton,
  mainButton,
  miniApp,
  themeParams,
  viewport,
  initData,
} from "@tma.js/sdk-react";

export async function init(debug: boolean) {
  setDebug(debug);
  initSDK();

  backButton.mount.ifAvailable();
  mainButton.mount.ifAvailable();
  initData.restore();

  if (miniApp.mount.isAvailable()) {
    themeParams.mount();
    miniApp.mount();
    themeParams.bindCssVars(); // → --tg-theme-bg-color, --tg-theme-text-color ...
    miniApp.bindCssVars(); // → --tg-bg-color, --tg-header-color ...
  }

  if (viewport.mount.isAvailable()) {
    await viewport.mount();
    viewport.bindCssVars(); // → --tg-viewport-height, --tg-viewport-safe-area-inset-top ...
    viewport.expand.ifAvailable();
  }

  miniApp.ready.ifAvailable(); // убрать лоадер Telegram
}
