const fs = require('fs');
const path = require('path');

describe('accessibility markup', () => {
  it('contains skip link and live region', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
    expect(html).toContain('skip-link');
    expect(html).toContain('a11y-live-region');
  });
});
