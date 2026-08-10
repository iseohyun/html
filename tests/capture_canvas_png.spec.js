const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Capture canvas PNG and evaluate alignment, Ctrl guide, and Ctrl+Click copy', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  await page.setViewportSize({ width: 1080, height: 2340 });

  const filePath = path.resolve(__dirname, '../small-project/KakaoTalk/index.html');
  const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
  await page.goto(fileUrl);

  const sampleText = `- me-name: 구인호
- your-name: 양양 맛집 모임

2026년 7월 19일 오전 11:37, 구인호 : 재현아 우리 양양 갔을 때 먹었던 가오리찜 가게 이름이 뭐냐

2026년 7월 22일 오전 11:35
2026년 7월 22일 오전 11:35, 정재현 : 황가네
2026년 7월 22일 오전 11:36, 구인호 : 빠르네 ㅋㅋㅋ
2026년 7월 22일 오전 11:46, 최경은 : ㅋㅋㅋㅋㅋ
2026년 7월 22일 오전 11:47, 구인호 : 우리가 가려던 식당인 듯하군
2026년 7월 22일 오전 11:47, 구인호 : 그런느낌
2026년 7월 22일 오전 11:49, 구인호 : 다른곳이라고 답이 옴 ㅋㅋ
2026년 7월 22일 오후 2:16, 정재현 : 이모네?
2026년 7월 22일 오후 2:16, 정재현 : 거긴 매콤하고 황가네는 좀 달콤하고
2026년 7월 22일 오후 2:17, 정재현 : 근데 거긴 속촌데 양양은 모르겠다
2026년 7월 22일 오후 2:23, 구인호 : 숙소가 고성이라 속초 양양 어디로 갈지는 모름
2026년 7월 22일 오후 4:22, 정재현 : 고성이랑 양양은 한시간 거린데
2026년 7월 22일 오후 4:23, 구인호 : 일단 만석닭강정은 감`;

  await page.locator('#btn-icon-raw').click();
  await page.waitForTimeout(300);

  const textarea = page.locator('#chat-input');
  await textarea.fill(sampleText);
  await textarea.dispatchEvent('input');
  await page.waitForTimeout(1000);

  const pngBase64 = await page.evaluate(() => {
    window.currentScrollY = 0;
    window.targetScrollY = 0;
    const canvas = document.getElementById('chat-canvas');
    const ctx = canvas.getContext('2d');
    const config = window.ChatInterface.gatherConfigFromUI();
    const text = window.ChatInterface.getChatInputVal();
    const { dialogs } = window.ChatInterface.parseInputText(text);
    const avatarSettingsMap = window.ChatInterface.getAvatarSettingsMap();
    window.ChatEngine.drawCanvasChat(canvas, ctx, config, dialogs, avatarSettingsMap);
    return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
  });

  const artifactDir = 'C:\\Users\\iseoh\\.gemini\\antigravity\\brain\\44a921d9-3184-400f-8feb-12cdec5af86f';
  const pngPath = path.join(artifactDir, 'current_canvas_capture.png');
  fs.writeFileSync(pngPath, Buffer.from(pngBase64, 'base64'));
});
