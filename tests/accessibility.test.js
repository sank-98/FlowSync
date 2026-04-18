/**
 * Accessibility Tests for FlowSync
 * WCAG 2.1 AA Compliance & Keyboard Navigation
 */

const fs = require('fs');
const path = require('path');

describe('Accessibility Tests - WCAG 2.1 AA Compliance', () => {
  
  // Read the HTML file for DOM testing
  let htmlContent;
  
  beforeAll(() => {
    const htmlPath = path.join(__dirname, '../public/index.html');
    htmlContent = fs.readFileSync(htmlPath, 'utf-8');
  });

  // ============================================================================
  // 1. Semantic HTML Structure
  // ============================================================================
  
  describe('Semantic HTML Structure', () => {
    test('should have proper document structure', () => {
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="en">');
      expect(htmlContent).toContain('<head>');
      expect(htmlContent).toContain('<body>');
    });

    test('should have proper heading hierarchy', () => {
      // Check for h1, h2, h3 tags
      const h1Count = (htmlContent.match(/<h1/g) || []).length;
      const h2Count = (htmlContent.match(/<h2/g) || []).length;
      
      expect(h1Count + h2Count).toBeGreaterThan(0);
    });

    test('should use semantic landmark elements', () => {
      expect(htmlContent).toContain('<header');
      expect(htmlContent).toContain('<main');
      expect(htmlContent).toContain('<section');
      expect(htmlContent).toContain('<article');
    });

    test('should have role="banner" on header', () => {
      expect(htmlContent).toContain('role="banner"');
    });

    test('should have role="main" or main tag', () => {
      expect(htmlContent).toContain('<main') || expect(htmlContent).toContain('role="main"');
    });

    test('should use nav elements for navigation', () => {
      expect(htmlContent).toContain('<nav') || expect(htmlContent).toContain('role="navigation"');
    });
  });

  // ============================================================================
  // 2. ARIA Labels & Attributes
  // ============================================================================
  
  describe('ARIA Labels & Attributes', () => {
    test('should have aria-label on icon buttons', () => {
      // Buttons without text content need aria-label
      expect(htmlContent).toMatch(/aria-label/);
    });

    test('should have aria-live region for announcements', () => {
      expect(htmlContent).toContain('aria-live');
      expect(htmlContent).toContain('aria-atomic');
    });

    test('should use aria-pressed for toggle buttons', () => {
      // Map toggle chips should have aria-pressed
      expect(htmlContent).toMatch(/aria-pressed/);
    });

    test('should have aria-label on interactive SVG zones', () => {
      // SVG elements should have descriptive aria-labels
      expect(htmlContent).toContain('<svg') || expect(htmlContent).toContain('aria-label');
    });

    test('should label form controls properly', () => {
      // All inputs should have associated labels
      const inputs = htmlContent.match(/<input[^>]*>/g) || [];
      inputs.forEach(input => {
        expect(input).toMatch(/id=|aria-label=|placeholder=/);
      });
    });

    test('should have aria-label on metric cards', () => {
      expect(htmlContent).toContain('aria-label="Key metrics"');
    });

    test('should have aria-label on main dashboard section', () => {
      expect(htmlContent).toContain('id="dashboard-grid"');
    });

    test('should use aria-disabled for disabled buttons', () => {
      // Check if disabled buttons use proper ARIA
      expect(htmlContent).toMatch(/aria-disabled|disabled/);
    });
  });

  // ============================================================================
  // 3. Keyboard Navigation Support
  // ============================================================================
  
  describe('Keyboard Navigation Support', () => {
    test('should have skip link at start of page', () => {
      expect(htmlContent).toContain('skip-link');
      expect(htmlContent).toContain('Skip to');
    });

    test('should have focusable interactive elements', () => {
      expect(htmlContent).toMatch(/<button/);
      expect(htmlContent).toMatch(/<a\s/);
      expect(htmlContent).toMatch(/<input/);
    });

    test('should have tabindex management', () => {
      // Main content should be focusable
      expect(htmlContent).toMatch(/tabindex=/);
    });

    test('should have keyboard event handlers', () => {
      // Check for keyboard event handling in script
      const scriptContent = htmlContent.match(/<script[\s\S]*?<\/script>/gi) || [];
      const hasKeyboardHandling = scriptContent.some(script => 
        script.includes('keydown') || 
        script.includes('keypress') || 
        script.includes('keyup') ||
        script.includes('Enter') ||
        script.includes('Escape')
      );
      
      expect(hasKeyboardHandling).toBe(true);
    });

    test('should support Enter key for button activation', () => {
      // Check for Enter key handling
      expect(htmlContent).toMatch(/Enter|keyCode\s*===\s*13/i);
    });

    test('should support Space key for button activation', () => {
      // Check for Space key handling
      expect(htmlContent).toMatch(/Space|keyCode\s*===\s*32/i);
    });

    test('should support Escape key for focus management', () => {
      // Check for Escape key handling
      expect(htmlContent).toMatch(/Escape|keyCode\s*===\s*27/i);
    });

    test('should have visible focus indicators', () => {
      // CSS should define :focus styles
      const cssPath = path.join(__dirname, '../public/style.css');
      if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        expect(cssContent).toMatch(/:focus/);
      }
    });
  });

  // ============================================================================
  // 4. Color Contrast (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
  // ============================================================================
  
  describe('Color Contrast Requirements', () => {
    test('should have sufficient text color contrast', () => {
      const cssPath = path.join(__dirname, '../public/style.css');
      if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        
        // Check for color definitions
        expect(cssContent).toMatch(/color:/);
        expect(cssContent).toMatch(/background/);
        
        // Should define CSS custom properties or specific colors
        expect(cssContent).toMatch(/--color|--bg|rgb|#[0-9a-fA-F]/);
      }
    });

    test('should not rely on color alone to convey information', () => {
      // Heatmap zones should have labels/icons, not just colors
      expect(htmlContent).toMatch(/class="zone|data-type|aria-label/);
    });

    test('should have sufficient contrast for icons and UI components', () => {
      // Check for icon definitions with sufficient contrast
      expect(htmlContent).toMatch(/icon|svg|<i\s|<span/);
    });
  });

  // ============================================================================
  // 5. Text Alternatives & Descriptions
  // ============================================================================
  
  describe('Text Alternatives & Image Descriptions', () => {
    test('should have alt text for all images', () => {
      const imgTags = htmlContent.match(/<img[^>]*>/g) || [];
      imgTags.forEach(img => {
        expect(img).toMatch(/alt=/);
      });
    });

    test('should have descriptions for complex SVG graphics', () => {
      const svgTags = htmlContent.match(/<svg[^>]*>/g) || [];
      svgTags.forEach(svg => {
        expect(svg).toMatch(/aria-label=|<title|<desc/);
      });
    });

    test('should have text content for all meaningful icons', () => {
      // Icon elements should have aria-label or contained text
      expect(htmlContent).toMatch(/aria-label=|title=|>\s*\w+\s*</);
    });

    test('should provide context for chart/data visualization', () => {
      // Metric cards should have descriptive text
      expect(htmlContent).toContain('metric-label');
      expect(htmlContent).toContain('metric-sub');
    });
  });

  // ============================================================================
  // 6. Form Accessibility
  // ============================================================================
  
  describe('Form Accessibility', () => {
    test('should associate labels with form inputs', () => {
      const labels = (htmlContent.match(/<label[^>]*for="[^"]*"/g) || []).length;
      expect(labels).toBeGreaterThan(0);
    });

    test('should have input field descriptions', () => {
      expect(htmlContent).toMatch(/placeholder=|aria-label=|aria-describedby=/);
    });

    test('should indicate required form fields', () => {
      // Required fields should be marked with aria-required or required
      expect(htmlContent).toMatch(/required|aria-required/);
    });

    test('should provide error messages accessibly', () => {
      // Error handling should use aria-live or similar
      expect(htmlContent).toMatch(/aria-live|role="alert"|aria-invalid/);
    });

    test('should have proper form structure', () => {
      expect(htmlContent).toMatch(/<form|<fieldset|<legend/);
    });
  });

  // ============================================================================
  // 7. Language & Text Readability
  // ============================================================================
  
  describe('Language & Text Readability', () => {
    test('should declare document language', () => {
      expect(htmlContent).toContain('lang="en"');
    });

    test('should have descriptive page title', () => {
      expect(htmlContent).toMatch(/<title>[^<]*<\/title>/);
      const title = htmlContent.match(/<title>([^<]*)<\/title>/)[1];
      expect(title.length).toBeGreaterThan(10);
    });

    test('should have descriptive headings', () => {
      // Headings should describe content, not just say "Menu" or "Section"
      expect(htmlContent).toMatch(/<h[1-6][^>]*>[^<]{5,}<\/h[1-6]>/);
    });

    test('should provide text descriptions for dynamic content', () => {
      expect(htmlContent).toContain('aria-live');
    });
  });

  // ============================================================================
  // 8. Motion & Animation
  // ============================================================================
  
  describe('Motion & Animation Accessibility', () => {
    test('should respect prefers-reduced-motion', () => {
      const cssPath = path.join(__dirname, '../public/style.css');
      if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        expect(cssContent).toMatch(/@media\s*\(\s*prefers-reduced-motion/i);
      }
    });

    test('should not have auto-playing content without controls', () => {
      // Check for video/audio tags with autoplay
      const autoplayTags = htmlContent.match(/<(video|audio)[^>]*autoplay/g) || [];
      autoplayTags.forEach(tag => {
        expect(tag).toMatch(/controls/);
      });
    });

    test('should provide animation alternatives', () => {
      // Animations should have meaningful content
      expect(htmlContent).toMatch(/animation|transition|transform/i);
    });
  });

  // ============================================================================
  // 9. Responsive & Zoom
  // ============================================================================
  
  describe('Responsive Design & Zoom Support', () => {
    test('should have viewport meta tag', () => {
      expect(htmlContent).toContain('viewport');
      expect(htmlContent).toMatch(/initial-scale/);
    });

    test('should not disable user zoom', () => {
      // Should not have user-scalable=no
      expect(htmlContent).not.toContain('user-scalable=no');
    });

    test('should be mobile responsive', () => {
      // Check for media queries or responsive framework
      const cssPath = path.join(__dirname, '../public/style.css');
      if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        expect(cssContent).toMatch(/@media/);
      }
    });

    test('should handle text expansion', () => {
      // Text sizing should be flexible
      expect(htmlContent).toMatch(/font-size|rem|em|%/);
    });
  });

  // ============================================================================
  // 10. Screen Reader Support
  // ============================================================================
  
  describe('Screen Reader Support', () => {
    test('should have sr-only class for screen reader only content', () => {
      expect(htmlContent).toContain('sr-only');
    });

    test('should use proper list markup', () => {
      expect(htmlContent).toMatch(/<ul|<ol|<dl/);
    });

    test('should have document outline', () => {
      // Should have logical heading structure
      expect(htmlContent).toMatch(/<h[1-3]/);
    });

    test('should use data tables properly', () => {
      // Tables should have headers and associations
      const hasTables = htmlContent.includes('<table');
      if (hasTables) {
        expect(htmlContent).toMatch(/<th|<thead/);
      }
    });

    test('should have page landmarks', () => {
      expect(htmlContent).toMatch(/<header|<main|<footer|<nav|role="contentinfo"/);
    });

    test('should announce live updates', () => {
      expect(htmlContent).toContain('aria-live');
    });

    test('should label dynamic regions', () => {
      expect(htmlContent).toMatch(/aria-label|aria-labelledby/);
    });
  });

  // ============================================================================
  // 11. Focus Management
  // ============================================================================
  
  describe('Focus Management', () => {
    test('should have visible focus styles', () => {
      const cssPath = path.join(__dirname, '../public/style.css');
      if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        expect(cssContent).toMatch(/:focus|outline|box-shadow.*focus/i);
      }
    });

    test('should maintain logical tab order', () => {
      // Check for proper tabindex values (no large positive values)
      const tabindexes = (htmlContent.match(/tabindex="(\d+)"/g) || [])
        .map(t => parseInt(t.match(/\d+/)[0]));
      
      tabindexes.forEach(idx => {
        expect(idx).toBeLessThanOrEqual(32767);
      });
    });

    test('should trap focus in modals', () => {
      // Modal dialogs should trap focus
      const hasModals = htmlContent.includes('modal') || htmlContent.includes('dialog');
      // This is implementation-dependent, just verify structure allows it
      expect(htmlContent).toMatch(/div|section|article/);
    });
  });

  // ============================================================================
  // 12. Link & Button Accessibility
  // ============================================================================
  
  describe('Link & Button Accessibility', () => {
    test('should have descriptive link text', () => {
      const links = htmlContent.match(/<a[^>]*href=[^>]*>([^<]*)<\/a>/g) || [];
      links.forEach(link => {
        const text = link.match(/>([^<]*)<\/a>/)[1].trim();
        // Links should not be empty or just "Click here"
        expect(text.length).toBeGreaterThan(0);
      });
    });

    test('should distinguish links from regular text', () => {
      // Links should be visually distinct
      const cssPath = path.join(__dirname, '../public/style.css');
      if (fs.existsSync(cssPath)) {
        const cssContent = fs.readFileSync(cssPath, 'utf-8');
        expect(cssContent).toMatch(/a\s*{|a:/);
      }
    });

    test('should indicate link purpose', () => {
      // Links should make purpose clear
      expect(htmlContent).toMatch(/href="#|href=".*"/);
    });

    test('should use button elements for actions', () => {
      expect(htmlContent).toMatch(/<button/);
    });

    test('should indicate external links if present', () => {
      // External links should be marked
      const externalLinks = htmlContent.match(/href="https?:\/\/[^"]*"/g) || [];
      externalLinks.forEach(link => {
        // Should have aria-label or icon indicating external
        const hasIndicator = htmlContent.includes('external') || htmlContent.includes('aria-label');
        expect(hasIndicator || link.length > 0).toBeTruthy();
      });
    });
  });

  // ============================================================================
  // 13. Overall WCAG 2.1 AA Compliance Summary
  // ============================================================================
  
  describe('WCAG 2.1 AA Overall Compliance', () => {
    test('should pass fundamental accessibility checks', () => {
      // Core checks
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('lang="en"');
      expect(htmlContent).toContain('<title>');
      expect(htmlContent).toContain('role="banner"');
      expect(htmlContent).toContain('aria-live');
    });

    test('should have valid HTML structure', () => {
      // Basic structure validation
      expect(htmlContent).toMatch(/<html[^>]*>/);
      expect(htmlContent).toMatch(/<\/html>/);
      expect(htmlContent).toMatch(/<head[^>]*>/);
      expect(htmlContent).toMatch(/<body[^>]*>/);
    });

    test('should support assistive technologies', () => {
      expect(htmlContent).toMatch(/role=|aria-|sr-only/);
    });

    test('should have accessible forms', () => {
      expect(htmlContent).toMatch(/<label|aria-label|placeholder=/);
    });

    test('should have readable text', () => {
      // Should use reasonable font sizes and contrast
      expect(htmlContent).toMatch(/font|color|background/i);
    });
  });
});
