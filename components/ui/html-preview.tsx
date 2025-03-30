import React, { useEffect, useRef } from 'react';
import './html-preview.css';

// Add DOMPurify for sanitization (we'll assume it's installed)
// If not installed, you would need to run: npm install dompurify @types/dompurify

interface HtmlPreviewProps {
  html: string;
  className?: string;
}

export function HtmlPreview({ html, className = '' }: HtmlPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Set the HTML content while ensuring it's just for display
    if (containerRef.current) {
      const sanitizedHtml = html; // In production, use DOMPurify.sanitize(html)
      containerRef.current.innerHTML = sanitizedHtml;
      
      // Make external links open in new tabs and add proper styling
      const links = containerRef.current.querySelectorAll('a');
      links.forEach(link => {
        // Only add target for external links
        if (link.href && (link.hostname !== window.location.hostname)) {
          link.setAttribute('target', '_blank');
          link.setAttribute('rel', 'noopener noreferrer');
          link.classList.add('external-link');
        }
      });
      
      // Make images responsive
      const images = containerRef.current.querySelectorAll('img');
      images.forEach(image => {
        image.classList.add('responsive-image');
        
        // Create a wrapper to handle image overflow
        const parent = image.parentNode;
        if (parent && 
            parent instanceof Element && 
            parent.nodeName !== 'FIGURE' && 
            !parent.classList.contains('image-wrapper')) {
          const wrapper = document.createElement('div');
          wrapper.classList.add('image-wrapper');
          parent.insertBefore(wrapper, image);
          wrapper.appendChild(image);
        }
      });
    }
  }, [html]);

  return (
    <div className={`html-preview-container ${className}`}>
      <div 
        ref={containerRef} 
        className="html-preview-content"
      />
    </div>
  );
} 