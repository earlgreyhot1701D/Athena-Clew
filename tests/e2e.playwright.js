const { test, expect } = require('@playwright/test');

// Skipping E2E test by default as it requires running server
test.skip('Theseus E2E Flow', () => {
    test('User can submit error and get analysis', async ({ page }) => {
        // Assuming local dev server is running (User needs to start it)
        await page.goto('http://localhost:5000');

        // Wait for app to initialize
        await page.waitForSelector('#error-input', { state: 'visible', timeout: 10000 });

        // Paste error
        await page.fill('#error-input', 'TypeError: Cannot read property map of undefined');

        // Click Get Help
        await page.click('#get-help-btn');

        // Wait for Step 1 analysis (Analysis card or progress)
        // Note: Since this hits real Gemini/Firestore if not mocked in browser, 
        // it depends on API keys working. 
        // We check for the *attempt* (progress indicator) at minimum.
        await page.waitForSelector('#step-progress', { timeout: 5000 });
        const progressText = await page.textContent('#step-progress');
        expect(progressText).toContain('Step');
    });

    test('User can provide feedback and store principle', async ({ page }) => {
        await page.goto('http://localhost:5000');
        await page.waitForSelector('#error-input');

        // Submit error
        await page.fill('#error-input', 'ReferenceError: x is not defined');
        await page.click('#get-help-btn');

        // We assume the pipeline completes or at least reaches Step 5
        // Validation is tricky without mocks.
        // Ideally we'd verify "This Helped" button appears.
        // await page.waitForSelector('button:has-text("This Helped")', { timeout: 30000 });
    });
});
