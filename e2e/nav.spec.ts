import { expect, test } from '@playwright/test'

test.describe('Nav-Du', () => {
  test('home loads and has basic UI', async ({ page }) => {
    await page.goto('/')

    await expect(page.locator('.search-input')).toBeVisible()
    await expect(page.locator('.sidebar')).toBeVisible()
    await expect(page.locator('.grid').first()).toBeVisible()
  })

  test('search results are grouped by category', async ({ page }) => {
    await page.goto('/')

    await page.locator('.search-input').fill('GitHub')

    const sections = page.locator('.section-block')
    await expect(sections.first()).toBeVisible()
    await expect(page.locator('.grid .card').first()).toBeVisible()
  })

  test('desktop sidebar stays fixed while page scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const sidebar = page.locator('.sidebar')

    const before = await sidebar.evaluate((el) => el.getBoundingClientRect().top)
    await page.mouse.wheel(0, 1600)
    await page.waitForTimeout(200)
    const after = await sidebar.evaluate((el) => el.getBoundingClientRect().top)

    expect(Math.abs(before - after)).toBeLessThan(1)
  })

  test('desktop can toggle sidebar visibility', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')

    const appShell = page.locator('.app-shell')
    await expect(appShell).not.toHaveClass(/app-shell--sidebar-hidden/)

    const fabToggle = page.locator('.fab-btn-sidebar-toggle')

    await fabToggle.click()
    await expect(appShell).toHaveClass(/app-shell--sidebar-hidden/)

    await fabToggle.click()
    await expect(appShell).not.toHaveClass(/app-shell--sidebar-hidden/)
  })

  test('theme toggle switches html data-theme', async ({ page }) => {
    await page.goto('/')

    const html = page.locator('html')
    const before = await html.getAttribute('data-theme')

    await page.locator('.fab-btn-theme-toggle').click()

    await expect
      .poll(async () => html.getAttribute('data-theme'))
      .not.toBe(before)
  })

  test('mobile drawer opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const sidebar = page.locator('.sidebar')

    await page.locator('.mobile-menu-btn').click()
    await expect(sidebar).toHaveClass(/is-open/)

    const overlay = page.locator('.sidebar-overlay')
    const box = await overlay.boundingBox()
    if (box) {
      await page.mouse.click(box.x + box.width - 8, box.y + 8)
    } else {
      await overlay.click({ force: true })
    }

    await expect(sidebar).not.toHaveClass(/is-open/)
  })
})
