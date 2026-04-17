const fs = require('fs');
const path = require('path');

describe('Accessibility markup baseline', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

  test('includes skip link and live region for screen readers', () => {
    expect(html).toContain('class="skip-link"');
    expect(html).toContain('id="sr-announcer"');
    expect(html).toContain('aria-live="polite"');
  });

  test('interactive map toggles are keyboard accessible', () => {
    expect(html).toContain('id="toggle-heatmap" role="button" tabindex="0"');
    expect(html).toContain('id="toggle-flow" role="button" tabindex="0"');
    expect(html).toContain('id="toggle-predicted" role="button" tabindex="0"');
  });

  test('form controls have explicit aria labels', () => {
    expect(html).toContain('id="current-zone" aria-label=');
    expect(html).toContain('id="destination" aria-label=');
    expect(html).toContain('id="preference" aria-label=');
    expect(html).toContain('id="chat-input"');
  });
});
