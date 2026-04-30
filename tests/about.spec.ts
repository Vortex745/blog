import { expect, test } from "@playwright/test";

const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

async function setMarkdownSelection(
  page: import("@playwright/test").Page,
  value: string,
  start: number,
  end = start,
) {
  await page.locator("#philosophy-content").evaluate(
    (textarea, selection) => {
      const source = textarea as HTMLTextAreaElement;
      source.value = selection.value;
      source.setSelectionRange(selection.start, selection.end);
      source.dispatchEvent(new Event("input", { bubbles: true }));
    },
    { value, start, end },
  );

  await page.waitForFunction(
    (expected) =>
      (document.querySelector("#philosophy-content") as HTMLTextAreaElement | null)?.value === expected &&
      Boolean(document.querySelector("[data-markdown-live-editor]")),
    value,
  );

  await page.locator("#philosophy-content").evaluate(
    (textarea, selection) => {
      const source = textarea as HTMLTextAreaElement;

      const editor = source.parentElement?.querySelector<HTMLElement>("[data-markdown-live-editor]");
      const line = editor?.querySelector("[data-live-line]")?.firstChild;
      if (!editor || !line) return;

      const range = document.createRange();
      range.setStart(line, Math.min(selection.start, line.textContent?.length || 0));
      range.setEnd(line, Math.min(selection.end, line.textContent?.length || 0));
      const windowSelection = window.getSelection();
      windowSelection?.removeAllRanges();
      windowSelection?.addRange(range);
      document.dispatchEvent(new Event("selectionchange"));
    },
    { value, start, end },
  );
  await page.waitForTimeout(50);
}

test.describe("关于模块", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("admin-auth", "1");
    });
  });

  test("后台编辑、头像上传兜底、Markdown 工具栏和前台数据互通正常", async ({ page }) => {
    await page.route("**/api/upload/cover", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, message: "mock upload unavailable" }),
      });
    });

    await page.goto("/admin/about");
    await page.evaluate(() => localStorage.removeItem("admin-about-data"));
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.locator(".admin-page-title")).toHaveText("关于管理");

    await page.locator("#about-name").fill("关于功能测试用户");
    await page.locator("#about-role").fill("前后台联调角色");
    await page.locator("#about-bio").fill("这是首页与关于模块共用的简介。");
    await page.locator("#about-desc").fill("这是关于页展示的详细描述。");

    await page.locator("#avatar-input").setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await expect(page.locator("#avatar-status")).toContainText("本地头像");
    await expect
      .poll(async () => page.locator("#avatar-data").inputValue())
      .toMatch(/^data:image\//);

    await setMarkdownSelection(page, "核心理念", 0, 2);
    await page.locator('.toolbar-btn[data-action="bold"]').click();
    await expect(page.locator("#philosophy-content")).toHaveValue("**核心**理念");

    await setMarkdownSelection(page, "核心理念", 2, 4);
    await page.locator('.toolbar-btn[data-action="italic"]').click();
    await expect(page.locator("#philosophy-content")).toHaveValue("核心*理念*");

    await setMarkdownSelection(page, "标题", 0, 2);
    await page.locator('.toolbar-btn[data-action="heading"]').click();
    await expect(page.locator("#philosophy-content")).toHaveValue("\n### 标题\n");

    await setMarkdownSelection(page, "引用", 0, 2);
    await page.locator('.toolbar-btn[data-action="quote"]').click();
    await expect(page.locator("#philosophy-content")).toHaveValue("\n> 引用\n");

    await setMarkdownSelection(page, "官网", 0, 2);
    await page.locator('.toolbar-btn[data-action="link"]').click();
    await expect(page.locator("#philosophy-content")).toHaveValue("[官网](https://)");

    await setMarkdownSelection(page, "列表项", 0, 3);
    await page.locator('.toolbar-btn[data-action="ul"]').click();
    await expect(page.locator("#philosophy-content")).toHaveValue("\n- 列表项\n");

    await setMarkdownSelection(page, "# 测试理念\n\n- 模块功能正常\n\n> 前后台数据互通", 0);
    await page.locator("#skill-input").fill("Astro");
    await page.keyboard.press("Enter");
    await page.locator("#skill-input").fill("Markdown");
    await page.keyboard.press("Enter");
    await expect(page.locator("#skill-list")).toContainText("Astro");
    await expect(page.locator("#skill-list")).toContainText("Markdown");

    await page.getByRole("button", { name: "保存更改" }).click();
    await expect(page.locator("#save-status")).toContainText("已保存到本地存储");

    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("admin-about-data") || "{}"));
    expect(saved).toMatchObject({
      name: "关于功能测试用户",
      role: "前后台联调角色",
      bio: "这是首页与关于模块共用的简介。",
      description: "这是关于页展示的详细描述。",
      philosophy: ["# 测试理念", "- 模块功能正常", "> 前后台数据互通"],
      skills: ["Astro", "Markdown"],
    });
    expect(saved.avatar).toMatch(/^data:image\//);

    await page.goto("/about");
    await expect(page.locator("#about-profile-name")).toHaveText("关于功能测试用户");
    await expect(page.locator("#about-profile-role")).toHaveText("前后台联调角色");
    await expect(page.locator("#about-profile-bio")).toHaveText("这是首页与关于模块共用的简介。");
    await expect(page.locator("#about-profile-desc")).toHaveText("这是关于页展示的详细描述。");
    await expect(page.locator("#about-avatar")).toHaveAttribute("src", /^data:image\//);
    await expect(page.locator("#about-philosophy h1")).toHaveText("测试理念");
    await expect(page.locator("#about-philosophy")).toContainText("模块功能正常");
    await expect(page.locator("#about-philosophy")).toContainText("前后台数据互通");
    await expect(page.locator("#about-skills")).toContainText("Astro");
    await expect(page.locator("#about-skills")).toContainText("Markdown");
  });
});
