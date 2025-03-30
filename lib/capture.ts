import { browser } from "wxt/browser";
import ExtMessage, { MessageFrom, MessageType } from "@/entrypoints/types";
import { toast } from "sonner";
import { showCustomToast, showSuccessToast, showErrorToast, showCaptureToast, showInfoToast } from "@/components/ui/custom-toast";

// Capture types enum
export enum CaptureType {
  TEXT = 'text',
  HTML = 'html',
  MARKDOWN = 'markdown',
  SCREENSHOT = 'screenshot',
  FULLPAGE = 'fullpage'
}

// Interface for page metadata
export interface PageMetadata {
  title?: string;
  description?: string;
  favIconUrl?: string;
  ogImage?: string;
  siteName?: string;
  styling?: Record<string, string>; // Add styling information
  format?: string; // Support existing format property
  [key: string]: any; // Allow additional properties
}

// Interface for captured content
export interface CapturedContent {
  type: CaptureType;
  content: string;
  title: string;
  url: string;
  timestamp: number;
  metadata?: PageMetadata;
}

// Toast notification configuration
export interface ToastOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  showProgress?: boolean;
}

// Default toast options
const defaultToastOptions: ToastOptions = {
  duration: 3000,
  position: 'bottom-right',
  showProgress: false
};

// Update toastTracker to have more robust deduplication
const toastTracker = {
  lastToastMessage: '',
  lastToastTime: 0,
  recentToasts: new Map<string, number>(), // Track all recent toast messages
  minInterval: 5000, // Increased to 5 seconds (from 1 second) to prevent frequent duplicate toasts
  
  // Check if this is a duplicate toast
  isDuplicate(message: string): boolean {
    const now = Date.now();
    
    // Clean up old entries
    this.cleanup(now);
    
    // Check if we've shown this toast recently
    if (this.recentToasts.has(message)) {
      const timestamp = this.recentToasts.get(message) || 0;
      return (now - timestamp) < this.minInterval;
    }
    
    // Not a duplicate, update trackers
    this.lastToastMessage = message;
    this.lastToastTime = now;
    this.recentToasts.set(message, now);
    return false;
  },
  
  // Clean up old toast records
  cleanup(now: number) {
    for (const [message, timestamp] of this.recentToasts.entries()) {
      if (now - timestamp > this.minInterval) {
        this.recentToasts.delete(message);
      }
    }
  }
};

// Add a similar tracker for content capture deduplication
const captureTracker = {
  recentCaptures: new Map<string, number>(), // Track all recent capture hashes
  deduplicationWindow: 10000, // 10 seconds deduplication window
  
  // Create a hash for a captured content object
  getContentHash(content: CapturedContent): string {
    // Generate a unique hash based on content type, url, and a sample of the content
    const contentSample = content.content.substring(0, 100).replace(/\s+/g, '');
    return `${content.type}-${content.url || ''}-${contentSample}`;
  },
  
  // Check if this is a duplicate capture
  isDuplicate(content: CapturedContent): boolean {
    const hash = this.getContentHash(content);
    const now = Date.now();
    
    // Clean up old entries
    this.cleanup(now);
    
    // Check if we've captured this content recently
    if (this.recentCaptures.has(hash)) {
      const timestamp = this.recentCaptures.get(hash) || 0;
      log(`Duplicate capture detected: ${(now - timestamp)}ms ago`);
      return (now - timestamp) < this.deduplicationWindow;
    }
    
    // Not a duplicate, store it
    this.recentCaptures.set(hash, now);
    log(`New capture stored with hash: ${hash.substring(0, 20)}...`);
    return false;
  },
  
  // Clean up old capture records
  cleanup(now: number) {
    let count = 0;
    for (const [hash, timestamp] of this.recentCaptures.entries()) {
      if (now - timestamp > this.deduplicationWindow) {
        this.recentCaptures.delete(hash);
        count++;
      }
    }
    
    if (count > 0) {
      log(`Cleaned up ${count} old capture records`);
    }
  }
};

// Helper for logging
function log(message: string, data?: any) {
  console.log(`RKO Capture: ${message}`, data || '');
}

// Helper for escaping HTML content for display in toast
function escapeHtml(html: string): string {
  const truncatedHtml = html.length > 100 ? html.substring(0, 100) + '...' : html;
  return truncatedHtml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Helper for creating a clean preview of HTML content
function createContentPreview(content: string, type: CaptureType): string {
  // For HTML content, extract the text content
  if (type === CaptureType.HTML || type === CaptureType.FULLPAGE) {
    try {
      // Create a temporary element to parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      
      // Extract clean text
      const textContent = doc.body.textContent || '';
      
      // Return a preview (up to 120 chars)
      return textContent.trim().substring(0, 120) + (textContent.length > 120 ? '...' : '');
    } catch (e) {
      console.error('Error parsing HTML for preview:', e);
      return escapeHtml(content.substring(0, 80) + (content.length > 80 ? '...' : ''));
    }
  }
  
  // For other content types, just return a substring
  return content.substring(0, 120) + (content.length > 120 ? '...' : '');
}

// Simple function to sanitize HTML
function sanitizeHtml(html: string): string {
  // A basic implementation - in production you'd want a proper sanitizer library
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframes
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ''); // Remove styles
}

// Simple function to convert markdown to HTML
function markdownToHtml(markdown: string): string {
  // A basic implementation - in production you'd want a proper markdown parser
  let html = markdown;
  
  // Headers
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  html = html.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  html = html.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Replace paragraph tags
  html = html.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Replace links
  html = html.replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Replace strong/bold
  html = html.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
  
  // Replace em/italic
  html = html.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
  
  // Replace line breaks
  html = html.replace(/<br[^>]*>/gi, '\n');
  
  // Remove remaining HTML tags
  html = html.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  html = html.replace(/&nbsp;/g, ' ');
  html = html.replace(/&amp;/g, '&');
  html = html.replace(/&lt;/g, '<');
  html = html.replace(/&gt;/g, '>');
  html = html.replace(/&quot;/g, '"');
  
  log(`Markdown conversion complete: ${html.length} characters`);
  return html;
}

/**
 * Extract meaningful metadata from the current page
 * @returns An object containing relevant metadata from meta tags
 */
function extractPageMetadata(): Record<string, string> {
  console.log('Extracting page metadata');
  
  // Create an object to store metadata
  const metadata: Record<string, string> = {};
  
  try {
    // Get base page information
    metadata.title = document.title || '';
    metadata.url = window.location.href;
    metadata.domain = window.location.hostname;
    
    // Extract meta tags
    const metaTags = Array.from(document.getElementsByTagName('meta'));
    
    // Process each meta tag
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name');
      const property = tag.getAttribute('property');
      const content = tag.getAttribute('content');
      
      // Skip tags without content
      if (!content) return;
      
      // Process by name attribute (e.g., <meta name="description" content="...">)
      if (name) {
        // Focus on descriptive meta tags
        if (name.match(/^(description|author|keywords|twitter:|og:|article:|publication|image|canonical)/) ||
            name === 'viewport' || name === 'theme-color' || name === 'application-name') {
          metadata[name] = content;
        }
      }
      
      // Process by property attribute (e.g., <meta property="og:title" content="...">)
      if (property) {
        // Filter to get only meaningful properties (skip fb:admins, fb:app_id, etc.)
        if (property.match(/^(og:|twitter:|article:|book:|product|music|video|description|image|title|url|type|site_name)/)) {
          metadata[property] = content;
        }
      }
    });
    
    // Extract canonical URL
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink && canonicalLink.getAttribute('href')) {
      metadata.canonicalUrl = canonicalLink.getAttribute('href') || '';
    }
    
    // Add basic page text statistics
    const textContent = document.body.textContent || '';
    metadata.wordCount = textContent.split(/\s+/).filter(Boolean).length.toString();
    metadata.characterCount = textContent.length.toString();
    
    // Generate a short excerpt
    metadata.excerpt = textContent.substring(0, 300).trim().replace(/\s+/g, ' ') + (textContent.length > 300 ? '...' : '');
    
    console.log('Extracted metadata:', metadata);
    return metadata;
  } catch (error) {
    console.error('Error extracting page metadata:', error);
    // Return basic metadata even if extraction partially fails
    return metadata;
  }
}

/**
 * Determines if the selection would benefit from HTML capture
 * @param selection The current selection
 * @returns Boolean indicating if HTML capture is preferred
 */
export function shouldUseHTMLCapture(selection: Selection): boolean {
  if (!selection || selection.rangeCount === 0) return false;
  
  // Get selection contents
  const range = selection.getRangeAt(0);
  const fragment = range.cloneContents();
  
  // Check if there are any elements that would benefit from HTML capture
  const hasFormattedContent = Array.from(fragment.childNodes).some(node => 
    node.nodeType === Node.ELEMENT_NODE && 
    !(['BR', 'P', 'DIV', 'SPAN'].includes((node as Element).tagName) && 
      !(node as Element).attributes.length)
  );
  
  // Also check for meaningful HTML elements like links, lists, etc.
  const htmlElements = ['A', 'UL', 'OL', 'LI', 'TABLE', 'IMG', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'STRONG', 'EM', 'CODE'];
  const hasHtmlElements = Array.from(fragment.querySelectorAll('*')).some(el => 
    htmlElements.includes(el.tagName)
  );
  
  return hasFormattedContent || hasHtmlElements;
}

/**
 * Extracts style information from the selected text
 * @param selection The current selection
 * @returns Object containing style properties
 */
export function extractSelectionStyles(selection: Selection): Record<string, string> {
  const stylingInfo: Record<string, string> = {};
  
  try {
    // Get the most relevant parent element for styling info
    const selectedNode = selection.anchorNode;
    if (selectedNode && selectedNode.parentElement) {
      const computedStyle = window.getComputedStyle(selectedNode.parentElement);
      
      stylingInfo.fontFamily = computedStyle.fontFamily;
      stylingInfo.fontSize = computedStyle.fontSize;
      stylingInfo.fontWeight = computedStyle.fontWeight;
      stylingInfo.fontStyle = computedStyle.fontStyle;
      stylingInfo.color = computedStyle.color;
      stylingInfo.backgroundColor = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? 
        computedStyle.backgroundColor : '';
      stylingInfo.textDecoration = computedStyle.textDecoration;
      stylingInfo.textAlign = computedStyle.textAlign;
      stylingInfo.lineHeight = computedStyle.lineHeight;
    }
  } catch (error) {
    console.error('Error extracting style information:', error);
  }
  
  return stylingInfo;
}

/**
 * Extracts plain text from HTML content
 * @param html HTML content to extract text from
 * @returns Plain text version of the HTML
 */
function extractTextFromHtml(html: string): string {
  try {
    // Create a temporary element
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    // Get text content
    return tempDiv.textContent || tempDiv.innerText || '';
  } catch (error) {
    console.error('Error extracting text from HTML:', error);
    return '';
  }
}

// Capture text selection
export function captureTextSelection(showToast = true, sendMessage = true): CapturedContent | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
    console.log('RKO: No text selected');
    return null;
  }

  // Extract selected text
  const text = selection.toString();
  
  // Extract styling information
  const stylingInfo = extractSelectionStyles(selection);
  
  // Get page metadata
  const pageMetadata = extractPageMetadata();
  
  // Add styling to metadata
  const enhancedMetadata = {
    ...pageMetadata,
    styling: stylingInfo
  };
  
  console.log('RKO: Text captured:', text);

  const textContent: CapturedContent = {
    type: CaptureType.TEXT,
    content: text,
    title: document.title,
    url: window.location.href,
    timestamp: new Date().getTime(),
    metadata: enhancedMetadata
  };

  // Send message to background script
  if (sendMessage) {
    sendCapturedContent(textContent);
  }

  // Show toast notification
  if (showToast) {
    // Use styling info in the toast
    showCaptureToast(
      "Text", 
      textContent.content, 
      document.title, 
      { styling: stylingInfo }
    );
  }

  return textContent;
}

// Capture HTML selection
export function captureHtmlSelection(showToast = true, sendMessage = true): CapturedContent | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
    console.log('RKO: No HTML selected');
    return null;
  }

  // Clone the selected range
  const range = selection.getRangeAt(0);
  const clonedContent = range.cloneContents();
  
  // Create a wrapper element
  const wrapper = document.createElement('div');
  wrapper.appendChild(clonedContent);
  
  // Extract HTML content
  const html = wrapper.innerHTML;
  
  // Extract styling information
  const stylingInfo = extractSelectionStyles(selection);
  
  // Get page metadata
  const pageMetadata = extractPageMetadata();
  
  // Add styling to metadata
  const enhancedMetadata = {
    ...pageMetadata,
    styling: stylingInfo
  };
  
  console.log('RKO: HTML captured:', html);

  const htmlContent: CapturedContent = {
    type: CaptureType.HTML,
    content: html,
    title: document.title,
    url: window.location.href,
    timestamp: new Date().getTime(),
    metadata: enhancedMetadata
  };

  // Send message to background script
  if (sendMessage) {
    sendCapturedContent(htmlContent);
  }

  // Show toast notification
  if (showToast) {
    // Use styling info in the toast
    showCaptureToast(
      "HTML", 
      extractTextFromHtml(html), 
      document.title,
      { styling: stylingInfo }
    );
  }

  return htmlContent;
}

/**
 * Convert HTML to Markdown (simplified version)
 * @param html HTML content to convert
 * @returns Simplified markdown version of the HTML
 */
function htmlToMarkdown(html: string): string {
  log('Converting HTML to Markdown');
  // This is a very simplified converter. In a real implementation,
  // you'd want to use a proper HTML to Markdown converter library
  let markdown = html;
  
  // Replace h1-h6 with markdown equivalents
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');
  
  // Replace paragraph tags
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');
  
  // Replace links
  markdown = markdown.replace(/<a[^>]*href="(.*?)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  
  // Replace strong/bold
  markdown = markdown.replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, '**$2**');
  
  // Replace em/italic
  markdown = markdown.replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, '*$2*');
  
  // Replace line breaks
  markdown = markdown.replace(/<br[^>]*>/gi, '\n');
  
  // Remove remaining HTML tags
  markdown = markdown.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  markdown = markdown.replace(/&nbsp;/g, ' ');
  markdown = markdown.replace(/&amp;/g, '&');
  markdown = markdown.replace(/&lt;/g, '<');
  markdown = markdown.replace(/&gt;/g, '>');
  markdown = markdown.replace(/&quot;/g, '"');
  
  log(`Markdown conversion complete: ${markdown.length} characters`);
  return markdown;
}

/**
 * Capture the selected content as Markdown
 * @param showNotification Whether to show a toast notification (default: true)
 * @returns The captured Markdown content object
 */
export function captureMarkdownSelection(showNotification = true): CapturedContent | null {
  log('Capturing Markdown selection');
  // Get HTML content but explicitly don't show notification by passing false
  const htmlContent = captureHtmlSelection(false);
  
  if (!htmlContent) {
    log('No HTML content available for Markdown conversion');
    return null;
  }
  
  const markdownContent = htmlToMarkdown(htmlContent.content);
  log(`Markdown selection captured: ${markdownContent.length} characters`);
  
  // Extract page metadata from the HTML capture
  // We want to maintain styling information from the HTML capture
  const enhancedMetadata = htmlContent.metadata || extractPageMetadata();
  
  const capturedContent: CapturedContent = {
    type: CaptureType.MARKDOWN,
    content: markdownContent,
    title: htmlContent.title,
    url: htmlContent.url,
    timestamp: new Date().getTime(),
    metadata: enhancedMetadata
  };
  
  // Send message to background script if needed
  if (showNotification) {
    sendCapturedContent(capturedContent);
    
    // Show toast notification with preserved styling from HTML capture
    // Extract styling with proper type safety
    const styling = enhancedMetadata?.styling && typeof enhancedMetadata.styling === 'object' 
      ? enhancedMetadata.styling as Record<string, string>
      : undefined;
      
    showCaptureToast(
      "Markdown", 
      markdownContent, 
      document.title, 
      { styling }
    );
  }
  
  return capturedContent;
}

/**
 * Send captured content to the background script
 * @param capturedContent The content to send
 */
export function sendCapturedContent(capturedContent: CapturedContent): void {
  log(`Sending captured ${capturedContent.type} content to background`, {
    contentLength: capturedContent.content.length,
    url: capturedContent.url
  });
  
  // Define a function to attempt sending with retry logic
  const attemptSend = (retryCount = 0, maxRetries = 2) => {
    try {
      browser.runtime.sendMessage({
        messageType: MessageType.capturedSelection,
        from: MessageFrom.contentScript,
        content: capturedContent.content,
        metadata: {
          type: capturedContent.type,
          title: capturedContent.title,
          url: capturedContent.url,
          timestamp: capturedContent.timestamp,
          ...capturedContent.metadata
        }
      }).then(() => {
        log('Successfully sent content to background');
      }).catch(err => {
        // Check if we should retry
        if (retryCount < maxRetries) {
          log(`Message send failed, retrying (${retryCount + 1}/${maxRetries})...`);
          
          // Wait a short time before retrying to allow message channel to clear
          setTimeout(() => attemptSend(retryCount + 1, maxRetries), 200 * (retryCount + 1));
        } else {
          console.error('Failed to send captured content to background after retries:', err);
          showToast(`Failed to send captured content: ${err.message}`, {
            duration: 5000,
            position: 'top-right',
            showProgress: true
          });
        }
      });
    } catch (error) {
      console.error('Exception sending content to background:', error);
      
      // Check if we should retry
      if (retryCount < maxRetries) {
        log(`Message send exception, retrying (${retryCount + 1}/${maxRetries})...`);
        
        // Wait a short time before retrying
        setTimeout(() => attemptSend(retryCount + 1, maxRetries), 200 * (retryCount + 1));
      } else {
        showToast(`Error sending content: ${error instanceof Error ? error.message : 'Unknown error'}`, {
          duration: 5000,
          position: 'top-right',
          showProgress: true
        });
      }
    }
  };
  
  // Start the first attempt
  attemptSend();
}

/**
 * Show a toast notification with improved formatting and timing
 */
export function showToast(message: string, options: ToastOptions = {}): void {
  const defaultToastOptions: Required<ToastOptions> = {
    duration: 5000,
    position: 'top-right',
    showProgress: true
  };
  
  options = { ...defaultToastOptions, ...options };
  
  try {
    // Figure out what type of toast we're showing
    if (message.toLowerCase().includes('captured')) {
      // Extract content type and preview from the message
      let contentPreview = message;
      let contentType = 'Content';
      
      // Determine what type of content was captured
      const captureType = message.toLowerCase().includes('text selection') ? CaptureType.TEXT :
                       message.toLowerCase().includes('html') ? CaptureType.HTML :
                       message.toLowerCase().includes('markdown') ? CaptureType.MARKDOWN :
                       message.toLowerCase().includes('full page') || message.toLowerCase().includes('fullpage') ? CaptureType.FULLPAGE : 
                       CaptureType.SCREENSHOT;
      
      if (message.includes('"')) {
        const previewMatch = message.match(/"([^"]*)"/);
        if (previewMatch && previewMatch[1]) {
          // Create a more readable preview based on content type
          contentPreview = createContentPreview(previewMatch[1], captureType);
        }
      }
      
      // Create a card-like styled toast
      const source = document.title || "Web Page";
      
      // For screenshot captures, add a setTimeout to ensure it appears after the "capturing" toast
      if (captureType === CaptureType.SCREENSHOT && message.includes('captured')) {
        setTimeout(() => {
          showCaptureToast(contentType, contentPreview, source);
        }, 500); // Delay the completion toast
      } else {
        // Use the React component-based toast immediately for other content types
        showCaptureToast(contentType, contentPreview, source);
      }
    } else if (message.includes('<div') || message.includes('<span')) {
      // This is raw HTML content - we need to extract the text
      const plainTextPreview = createContentPreview(message, CaptureType.HTML);
      
      // Convert to a regular notification
      showCustomToast({
        title: "Notification",
        description: plainTextPreview,
        timestamp: new Date()
      });
    } else {
      // For other messages, use a standard toast
      showCustomToast({
        title: message,
        timestamp: new Date()
      });
    }
  } catch (error) {
    console.error('Error showing toast:', error);
    // Fallback to standard toast if there was an error with the custom formatting
    toast(message, {
      duration: options.duration || defaultToastOptions.duration,
      dismissible: true
    });
  }
}

/**
 * Capture the entire web page content
 * @returns The captured full page content object
 */
export function captureFullPage(): CapturedContent | null {
  log('Capturing full page');
  try {
    // Get document metadata
    const title = document.title;
    const url = window.location.href;
    const domain = window.location.hostname;
    
    // Start performance measurement
    const startTime = performance.now();
    
    // Prevent default navigation
    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
      log('Click intercepted during full page capture');
      return false;
    };
    
    // For very large pages, we should be selective about what we capture
    // to prevent memory issues and improve performance
    
    // Get the main content of the page, if possible
    let mainContent = '';
    let contentNode = null;
    
    // Try to identify the main content area of the page using common selectors
    // This helps reduce the size of captured content on large pages
    const contentSelectors = [
      'main', 
      'article', 
      '#content', 
      '.content', 
      '#main', 
      '.main', 
      '.post-content',
      '.article-content',
      'div[role="main"]'
    ];
    
    // Try each selector until we find a main content area
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerHTML.length > 500) { // Only if it has substantial content
        contentNode = element;
        break;
      }
    }

    // If we found a main content node, use it; otherwise use the whole body
    // This helps optimize performance for large pages
    if (contentNode) {
      mainContent = contentNode.outerHTML;
      log(`Using main content node: ${contentSelectors.find(s => document.querySelector(s) === contentNode)}`);
    } else {
      // Fallback to full document HTML, but with possible size limit
      mainContent = document.documentElement.outerHTML;
      log('Using full document HTML (no main content node found)');
    }
    
    // Restore original click behavior
    setTimeout(() => {
      HTMLAnchorElement.prototype.click = originalClick;
    }, 0);
    
    // Calculate approximate content size for metadata
    const contentSize = mainContent.length;
    const contentSizeKB = Math.round(contentSize / 1024);
    log(`Full page content size: ${contentSizeKB}KB`);
    
    // Generate a document excerpt for preview
    const documentText = document.body.innerText;
    const excerpt = documentText.length > 300 
      ? documentText.substring(0, 300) + '...' 
      : documentText;
    
    // End performance measurement
    const endTime = performance.now();
    const captureTime = Math.round(endTime - startTime);
    
    // Extract all meaningful page metadata
    const pageMetadata = extractPageMetadata();
    
    // Add capture-specific metadata
    pageMetadata.contentSizeKB = contentSizeKB.toString();
    pageMetadata.hasMainContentNode = contentNode ? 'true' : 'false';
    pageMetadata.mainContentSelector = contentNode ? 
      contentSelectors.find(s => document.querySelector(s) === contentNode) || '' : '';
    pageMetadata.captureTime = captureTime.toString();
    pageMetadata.captureDate = new Date().toISOString();
    pageMetadata.userAgent = navigator.userAgent;
    
    const capturedContent: CapturedContent = {
      type: CaptureType.FULLPAGE,
      content: mainContent,
      title,
      url,
      timestamp: new Date().getTime(),
      metadata: pageMetadata
    };
    
    // Log performance information
    log(`Full page capture completed in ${captureTime}ms, size: ${contentSizeKB}KB`);
    
    // Return the captured content object to be handled by the standardized flow
    // instead of sending to background directly
    return capturedContent;
  } catch (error) {
    console.error('Error capturing full page:', error);
    // Show error toast
    showToast(`Error capturing page: ${error instanceof Error ? error.message : 'Unknown error'}`, {
      duration: 5000,
      position: 'top-right',
      showProgress: true
    });
    return null;
  }
}

/**
 * Captures a screenshot of the current page
 * @returns Promise resolving to the captured screenshot
 */
function captureScreenshot(): Promise<CapturedContent | null> {
  return new Promise(async (resolve) => {
    try {
      // Define a toast ID for consistent replacement
      const screenshotToastId = `screenshot-${Date.now()}`;
      
      // Show "capturing screenshot" notification first with specific ID
      showInfoToast("Capturing Screenshot", "Taking a screenshot of the current tab...", {
        id: screenshotToastId,
        duration: 10000 // Long duration to ensure it's visible until replaced
      });
      
      // Set a timeout to prevent hanging if permission isn't granted
      const timeoutId = setTimeout(() => {
        console.error('Screenshot capture timed out waiting for permission');
        showErrorToast(
          'Screenshot Capture Failed',
          'The operation timed out. Please try again and grant screen capture permission when prompted.',
          { id: screenshotToastId } // Replace the loading toast
        );
        resolve(null);
      }, 15000); // 15 second timeout
      
      try {
        // Extract page metadata
        const pageMetadata = extractPageMetadata();
        
        // Try to capture using browser API first (doesn't require additional permissions)
        try {
          if (browser.tabs && browser.tabs.captureVisibleTab) {
            // Add a delay to ensure permission dialog is gone
            await new Promise(r => setTimeout(r, 200));
            
            // Now take the screenshot
            const dataUrl = await browser.tabs.captureVisibleTab(undefined, { format: 'png' });
            
            // Clear the timeout since we got the screenshot
            clearTimeout(timeoutId);
            
            log(`Screenshot captured successfully via browser API: ${dataUrl.substring(0, 50)}... (${dataUrl.length} chars)`);
            
            // Create the content object
            const capturedContent: CapturedContent = {
              type: CaptureType.SCREENSHOT,
              content: dataUrl,
              title: document.title,
              url: window.location.href,
              timestamp: new Date().getTime(),
              metadata: {
                ...pageMetadata,
                format: "png",
                isBase64: true,
                captureMethod: "browser-api"
              }
            };
            
            // Add a small delay to ensure the permission dialog is closed
            // before showing the success toast
            setTimeout(() => {
              // Success Toast with same ID to replace loading toast
              showCaptureToast('Screenshot', dataUrl, document.title, { id: screenshotToastId });
            }, 1500); // Delay by 1.5 seconds to give the permission dialog time to close
            
            resolve(capturedContent);
            return;
          }
        } catch (browserApiError) {
          console.error('Browser API screenshot capture failed, trying display media:', browserApiError);
          // Continue to display media approach if browser API fails
        }
        
        // Fall back to display media API
        // @ts-ignore - Chrome specific API
        let stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // @ts-ignore - Chrome specific property
            cursor: "always",
            displaySurface: "browser"
          },
          audio: false
        });
        
        // Add delay after permission is granted but before capturing
        await new Promise(r => setTimeout(r, 200));
        
        // Clear the timeout since we got permission
        clearTimeout(timeoutId);
        
        // Get the video track
        const track = stream.getVideoTracks()[0];
        
        // Create a video element to capture the stream
        const video = document.createElement('video');
        video.srcObject = stream;
        
        // Wait for the video to be ready
        await new Promise<void>((resolveVideo) => {
          video.onloadedmetadata = () => {
            video.play();
            resolveVideo();
          };
        });
        
        // Create a canvas to capture the video frame
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the video frame to the canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error("Could not get canvas context");
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Stop the stream
        track.stop();
        stream.getTracks().forEach(track => track.stop());
        
        // Convert the canvas to a data URL
        const dataUrl = canvas.toDataURL('image/png');
        
        // Create the content object
        const capturedContent: CapturedContent = {
          type: CaptureType.SCREENSHOT,
          content: dataUrl,
          title: document.title,
          url: window.location.href,
          timestamp: new Date().getTime(),
          metadata: {
            ...pageMetadata,
            format: "png",
            isBase64: true,
            width: canvas.width.toString(),
            height: canvas.height.toString(),
            captureMethod: "screen-capture-api"
          }
        };
        
        // Add a small delay to ensure the permission dialog is fully closed
        // before showing the success toast
        setTimeout(() => {
          // Success Toast with same ID to replace loading toast
          showCaptureToast('Screenshot', dataUrl, document.title, { id: screenshotToastId });
        }, 1500); // Delay by 1.5 seconds to give the permission dialog time to close
        
        resolve(capturedContent);
      } catch (error) {
        // Clear the timeout if there's an error
        clearTimeout(timeoutId);
        
        console.error('Error with screen capture:', error);
        
        // Check if this is a permission error
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
        if (errorMessage.includes('permission') || 
            errorMessage.includes('not allowed') || 
            errorMessage.includes('denied') ||
            errorMessage.includes('security') ||
            errorMessage.includes('access')) {
          showErrorToast(
            'Screenshot Permission Required',
            'Please allow screen capture when prompted. Click the extension icon and try again.',
            { id: screenshotToastId } // Replace the loading toast
          );
        } else {
          showErrorToast(
            'Screenshot Failed',
            `Error during screenshot capture: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { id: screenshotToastId } // Replace the loading toast
          );
        }
        
        resolve(null);
      }
    } catch (error) {
      console.error('Exception during screenshot capture:', error);
      
      showErrorToast(
        'Screenshot Failed',
        `Error during screenshot capture: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      
      resolve(null);
    }
  });
}

/**
 * Intelligently detects the most appropriate capture type for the current selection
 * @returns The recommended capture type, or null if no selection
 */
export function detectCaptureType(): CaptureType | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
    log('No selection found for capture type detection');
    return null;
  }
  
  // Check if selection contains elements that would benefit from HTML
  if (shouldUseHTMLCapture(selection)) {
    // Determine if the content would benefit from Markdown conversion
    // Check for specific kinds of content that are well-represented in Markdown
    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();
    
    // Elements that are particularly well-suited for Markdown
    const markdownElements = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'UL', 'OL', 'LI', 'A', 'CODE', 'BLOCKQUOTE'];
    
    // Check if selection contains primarily text-based content with simple formatting
    // that would render nicely in Markdown
    const hasMarkdownElements = Array.from(fragment.querySelectorAll('*')).some(el => 
      markdownElements.includes(el.tagName)
    );
    
    // Count total elements and image/specialized elements
    const totalElements = fragment.querySelectorAll('*').length;
    const specialElements = fragment.querySelectorAll('img, video, canvas, svg, table, iframe').length;
    
    // Calculate the percentage of specialized elements
    const specialRatio = totalElements > 0 ? specialElements / totalElements : 0;
    
    // Use Markdown if the content has Markdown-friendly elements and doesn't have 
    // too many specialized elements that would be lost in MD conversion
    if (hasMarkdownElements && specialRatio < 0.2) {
      log('Smart detection chose Markdown capture based on content structure');
      return CaptureType.MARKDOWN;
    }
    
    // Default to HTML for rich content
    log('Smart detection chose HTML capture based on rich content');
    return CaptureType.HTML;
  }
  
  // Default to plain text for simple selections
  log('Smart detection chose Text capture');
  return CaptureType.TEXT;
}

/**
 * Universal capture function that handles all capture types
 * @param type Type of capture to perform
 * @param showToastNotification Whether to show a toast notification
 * @returns The captured content or null if nothing was captured
 */
export function captureContent(type: CaptureType, showToastNotification = true): CapturedContent | null | Promise<CapturedContent | null> {
  const captureId = `capture-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  log(`🔍 CAPTURE DEBUG [${captureId}]: Starting capture of type: ${type}`);
  
  try {
    let capturedContent: CapturedContent | null | Promise<CapturedContent | null> = null;
    
    // For automatic content type determination - ONLY when TEXT is explicitly requested with type detection enabled
    if (type === CaptureType.TEXT) {
      // When TEXT is requested, honor it directly without smart detection
      capturedContent = captureTextSelection(false);
    } else {
      // Use the explicitly requested capture type
      switch (type) {
        case CaptureType.HTML:
          capturedContent = captureHtmlSelection(false);
          break;
        case CaptureType.MARKDOWN:
          capturedContent = captureMarkdownSelection(false);
          break;
        case CaptureType.FULLPAGE:
          capturedContent = captureFullPage();
          break;
        case CaptureType.SCREENSHOT:
          // Return the promise for screenshot capture
          log(`🔍 CAPTURE DEBUG [${captureId}]: Starting screenshot capture`);
          return captureScreenshot().then(screenshot => {
            if (!screenshot) return null;
            
            // Remove duplicate detection but still track the capture
            // Store this capture in the tracker (but don't use it to filter duplicates)
            captureTracker.recentCaptures.set(
              captureTracker.getContentHash(screenshot), 
              Date.now()
            );
            
            // Send the screenshot to the background script
            log(`🔍 CAPTURE DEBUG [${captureId}]: Sending screenshot to background (${screenshot.content.length} chars)`);
            sendCapturedContent(screenshot);
            
            // We no longer show a success toast here - it's now handled in the captureScreenshot function
            // with proper toast ID management to replace the "Taking screenshot..." toast
            
            return screenshot;
          });
        default:
          log(`🔍 CAPTURE DEBUG [${captureId}]: Unknown capture type: ${type}`);
          return null;
      }
    }
    
    // For non-screenshot captures:
    if (capturedContent) {
      // Remove duplicate detection but still track the capture
      // Store this capture in the tracker (but don't use it to filter duplicates)
      captureTracker.recentCaptures.set(
        captureTracker.getContentHash(capturedContent), 
        Date.now()
      );
      
      // Send the content to the background script for storage
      log(`🔍 CAPTURE DEBUG [${captureId}]: Sending content to background (${capturedContent.content.length} chars)`);
      sendCapturedContent(capturedContent);
      
      // Show a toast notification if requested
      if (showToastNotification) {
        // Format type label for toast - not needed in title anymore as badge will show it
        const typeLabel = capturedContent.type.charAt(0).toUpperCase() + capturedContent.type.slice(1);
        
        // Format content properly for display in toast
        let formattedContent = '';
        
        if (capturedContent.type === CaptureType.HTML || capturedContent.type === CaptureType.FULLPAGE) {
          // For HTML, use the content directly but make sure it's safe
          // Extract a portion for the preview
          try {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = capturedContent.content.substring(0, 500); // Get a larger portion
            
            // Clean the HTML for safety
            const cleanHtml = sanitizeHtml(tempDiv.innerHTML);
            formattedContent = cleanHtml;
          } catch (e) {
            console.error('Error formatting HTML for toast:', e);
            formattedContent = capturedContent.content.substring(0, 200);
          }
        } else if (capturedContent.type === CaptureType.MARKDOWN) {
          // For markdown, convert to HTML for proper display
          try {
            formattedContent = markdownToHtml(capturedContent.content.substring(0, 300));
          } catch (e) {
            console.error('Error converting markdown to HTML:', e);
            formattedContent = capturedContent.content.substring(0, 200);
          }
        } else {
          // For plain text, just use a substring with appropriate formatting
          formattedContent = capturedContent.content.substring(0, 300);
        }
        
        // Get content size in KB for larger content
        const contentSizeKB = Math.round(capturedContent.content.length / 1024 * 10) / 10;
        const sizeInfo = contentSizeKB >= 1 ? ` (${contentSizeKB}KB)` : '';
            
        // Extract styling with proper type safety
        const styling = capturedContent.metadata?.styling && 
                       typeof capturedContent.metadata.styling === 'object' 
          ? capturedContent.metadata.styling as Record<string, string>
          : undefined;
            
        showCustomToast({
          title: `Captured${sizeInfo}`,
          description: formattedContent,
          source: capturedContent.title || capturedContent.url || document.title,
          timestamp: new Date(),
          variant: capturedContent.type as any, // Pass the content type as variant for proper badge
          styling
        });
      }
      
      return capturedContent;
    } else {
      log(`🔍 CAPTURE DEBUG [${captureId}]: No content captured for ${type}`);
      if (showToastNotification) {
        showCustomToast({
          title: `No ${type} content captured`,
          description: "Could not find any content to capture",
          variant: 'error'
        });
      }
      return null;
    }
  } catch (error) {
    console.error(`🔍 CAPTURE DEBUG [${captureId}]: Error during ${type} capture:`, error);
    if (showToastNotification) {
      showCustomToast({
        title: "Capture failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'error'
      });
    }
    return null;
  }
}