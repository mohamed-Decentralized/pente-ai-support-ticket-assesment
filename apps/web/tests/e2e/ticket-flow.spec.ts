import { expect, test } from '@playwright/test';

test('Complete Ticket Lifecycle', async ({ page }) => {
  const customerEmail = `e2e-${Date.now()}@example.com`;
  let ticketNumber = '';

  await test.step('Customer creates a ticket', async () => {
    page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('response', (resp) => console.log('RESPONSE:', resp.url(), resp.status()));
    await page.goto('/tickets/create');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="customerName"]', 'E2E Customer');
    await page.fill('input[name="customerEmail"]', customerEmail);
    await page.fill('input[name="subject"]', 'Cannot login to my account');
    await page.fill(
      'textarea[name="description"]',
      'I am trying to login but it keeps saying invalid password.',
    );
    await page.click('button:has-text("Create ticket")');

    // Wait for the success panel and extract ticket number
    try {
      await expect(page.locator('.successPanel')).toBeVisible({ timeout: 5000 });
    } catch (e) {
      console.log(
        'Error panel text:',
        await page
          .locator('.errorPanel')
          .textContent()
          .catch(() => 'No error panel found'),
      );
      console.log('Field errors:', await page.locator('.invalidField').allTextContents());
      throw e;
    }
    const successPanel = page.locator('.successPanel');
    await expect(successPanel).toBeVisible();

    const text = await successPanel.locator('strong').textContent();
    const match = text?.match(/(TKT-\d+)/);
    ticketNumber = match ? match[1] : '';
    expect(ticketNumber).toMatch(/^TKT-\d+$/);
  });

  await test.step('Agent logs in and replies', async () => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'bob@pente.ai');
    await page.fill('input[name="password"]', 'PenteDemo123!'); // From seed data
    await page.click('button:has-text("Sign in")');

    await expect(page).toHaveURL('/dashboard');

    await page.goto(`/staff/tickets/${ticketNumber}`);
    await expect(page.locator('h1').first()).toContainText('Cannot login to my account');

    await page.route(`**/api/v1/tickets/${ticketNumber}/ai/summary`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ticket: {
            id: 'mock-id-123',
            ticketNumber,
            customerName: 'E2E Customer',
            customerEmail: customerEmail,
            subject: 'Cannot login to my account',
            description: 'I am trying to login but it keeps saying invalid password.',
            priority: 'Medium',
            status: 'Open',
            slaDueAt: new Date(Date.now() + 86400000).toISOString(),
            slaBreached: false,
            assignedTo: { _id: 'agent123', name: 'Agent', email: 'agent@pente.ai' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            conversations: [
              {
                message: 'I am trying to login but it keeps saying invalid password.',
                authorType: 'Customer',
                aiGenerated: false,
                timestamp: new Date().toISOString(),
              },
              {
                message:
                  'Issue\n\nCustomer cannot login, encountering invalid password error.\n\nActions taken\n\nNone yet.\n\nCurrent situation\n\nCustomer is blocked from logging in.\n\nNext step\n\nReset password and notify customer.',
                authorType: 'System',
                aiGenerated: true,
                timestamp: new Date().toISOString(),
              },
            ],
            auditLog: [],
          },
          replaced: false,
        }),
      });
    });

    // Assign to Bob before interacting
    await page.locator('label:has-text("Assignee") select').selectOption('bob@pente.ai');
    await page.locator('label:has-text("Status") select').selectOption('In Progress');
    await expect(page.locator('span.badge:has-text("IN PROGRESS")')).toBeVisible();

    await page.click('button:has-text("Create AI summary")');
    await expect(
      page.locator('text=Customer cannot login, encountering invalid password error.'),
    ).toBeVisible();
    // Close the AI modal so the underlying page is interactive again
    await page.click('button:has-text("Close")');
    await expect(
      page.locator('text=Customer cannot login, encountering invalid password error.'),
    ).toBeHidden();

    await page.fill(
      'textarea[name="message"]',
      'Hello, I have reset your password. Please check your email.',
    );
    await page.click('button:has-text("Send reply")');
    // Wait for the form to reset — confirms submission was successful before continuing
    await expect(page.locator('textarea[name="message"]')).toHaveValue('');

    // Change status to Waiting for Customer using the select
    await page.locator('label:has-text("Status") select').selectOption('Waiting for Customer');
    await expect(page.locator('span.badge:has-text("WAITING")')).toBeVisible();
  });

  await test.step('Customer views the reply', async () => {
    await page.context().clearCookies();
    await page.evaluate(() => window.sessionStorage.clear());

    await page.goto('/tickets/lookup');
    await page.fill('input[name="email"]', customerEmail);
    await page.click('button:has-text("Find tickets")');

    await page.click(`text=${ticketNumber}`);

    await expect(
      page.locator('text=Hello, I have reset your password. Please check your email.'),
    ).toBeVisible();
  });
});
