import './style.css';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import {i18nConfig} from "@/components/i18nConfig.ts";
import initTranslations from "@/components/i18n.ts";
import {ThemeProvider} from "@/components/theme-provider.tsx";
import {browser} from "wxt/browser";
import ExtMessage, {MessageFrom, MessageType} from "@/entrypoints/types.ts";
import { captureContent, CaptureType, showToast, sendCapturedContent, CapturedContent } from "@/lib/capture";
import { showFloatingToolbar, hideFloatingToolbar, cleanupFloatingToolbar, resetToolbarState } from "@/lib/floating-toolbar";
import { SonnerToaster } from "@/components/ui/sonner-toast";
import { toast, Toaster } from 'sonner';
import { showCaptureToast, showErrorToast } from "@/components/ui/custom-toast";

// Add a very obvious startup message to verify the content script is loading
console.log('🔴 RKO CONTENT SCRIPT LOADING - DEBUG TEST', { time: new Date().toISOString() });

// Function to handle keyboard shortcuts for text capture
function handleKeyboardShortcut(event: KeyboardEvent) {
    console.log('Keyboard shortcut detected:', event.key, 'with modifiers:', { ctrl: event.ctrlKey, shift: event.shiftKey });
    
    // Ctrl+Shift+S keyboard shortcut for capturing text selection
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        console.log('🔍 CAPTURE DEBUG: Triggered text capture shortcut (Ctrl+Shift+S)');
        captureContent(CaptureType.TEXT);
    }
    
    // Ctrl+Shift+H keyboard shortcut for capturing HTML selection
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        console.log('🔍 CAPTURE DEBUG: Triggered HTML capture shortcut (Ctrl+Shift+H)');
        captureContent(CaptureType.HTML);
    }
    
    // Ctrl+Shift+M keyboard shortcut for capturing Markdown selection
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        console.log('🔍 CAPTURE DEBUG: Triggered Markdown capture shortcut (Ctrl+Shift+M)');
        captureContent(CaptureType.MARKDOWN);
    }
    
    // Ctrl+Shift+F keyboard shortcut for full page capture
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        console.log('🔍 CAPTURE DEBUG: Triggered full page capture shortcut (Ctrl+Shift+F)');
        captureContent(CaptureType.FULLPAGE);
    }
    
    // Ctrl+Shift+P keyboard shortcut for screenshot capture
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        console.log('🔍 CAPTURE DEBUG: Triggered screenshot capture shortcut (Ctrl+Shift+P)');
        captureContent(CaptureType.SCREENSHOT);
    }
}

// Separate handlers for mouseup and selection change
function handleMouseUp() {
    const selection = window.getSelection();
    
    // Only show toolbar for valid selections on mouseup
    if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        showFloatingToolbar(selection);
    }
}

// For selection change, we only use this to show the toolbar, not hide it
function handleSelectionChange() {
    const selection = window.getSelection();
    
    // Only show the toolbar for valid selections, don't hide it
    if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        showFloatingToolbar(selection);
    }
}

// Document click handler to hide toolbar when clicking outside
function handleDocumentClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    
    // Don't hide if clicking on the toolbar
    if (target.closest('#rko-toolbar-container')) {
        return;
    }
    
    // Get the current selection
    const selection = window.getSelection();
    
    // If there's a valid selection, check if we're clicking within it
    if (selection && selection.rangeCount > 0 && selection.toString().trim() !== '') {
        // Get the clicked node
        const clickedNode = document.elementFromPoint(e.clientX, e.clientY);
        
        // Check if the clicked node is within the selection range
        if (clickedNode) {
            try {
                // Check if the range intersects with the clicked node
                const range = selection.getRangeAt(0);
                if (range.intersectsNode(clickedNode)) {
                    // Clicking in selection - don't hide toolbar
                    return;
                }
            } catch (error) {
                console.error('Error checking selection intersection:', error);
            }
        }
    }
    
    // Use a small delay to avoid flickering and to give other click handlers time to run
    setTimeout(() => {
        hideFloatingToolbar();
    }, 10);
}

// Escape key handler to hide toolbar
function handleEscapeKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        hideFloatingToolbar();
    }
}

// Create a counter to ensure each screenshot toast has a unique key
let screenshotCaptureCounter = 0;
let activeScreenshotCapture = false;
let lastScreenshotTime = 0;
const SCREENSHOT_COOLDOWN = 1000; // Minimum time between screenshot attempts (ms)

// Handle screenshot capture
async function handleScreenshotCapture() {
    // Check if we're still in cooldown period
    const now = Date.now();
    const timeSinceLastCapture = now - lastScreenshotTime;
    
    if (timeSinceLastCapture < SCREENSHOT_COOLDOWN) {
        console.log(`Screenshot request ignored, in cooldown (${timeSinceLastCapture}ms since last capture)`);
        return;
    }
    
    // If a capture is already in progress, don't start another one
    if (activeScreenshotCapture) {
        console.log('Screenshot capture already in progress, ignoring request');
        showErrorToast('Screenshot Error', 'A screenshot capture is already in progress');
        return;
    }

    try {
        // Update state tracking
        activeScreenshotCapture = true;
        lastScreenshotTime = now;
        const captureId = ++screenshotCaptureCounter;
        
        console.log(`Processing screenshot capture request #${captureId}`);
        
        // We no longer show an initial loading toast here - it's now handled in the captureScreenshot function
        // with proper toast ID management to ensure consistent sequence
        
        // Set a timeout to prevent hanging on permission issues
        const timeoutId = setTimeout(() => {
            console.log(`Screenshot capture #${captureId} timed out`);
            showErrorToast('Screenshot Failed', 'The operation timed out. Please try again.');
            activeScreenshotCapture = false;
        }, 15000);
        
        // Handle screenshot capture asynchronously
        const capturePromise = captureContent(CaptureType.SCREENSHOT, true);
        
        if (capturePromise instanceof Promise) {
            // Handle the promise using try/catch for better error handling
            try {
                const captured = await capturePromise;
                
                // Clear the timeout since we got a response
                clearTimeout(timeoutId);
                
                if (captured && captured.content) {
                    console.log(`Screenshot #${captureId} capture completed successfully`);
                    
                    // Validate the screenshot content
                    const content = captured.content.trim();
                    if (content && (content.startsWith('data:image') || content.match(/^[A-Za-z0-9+/=]+$/))) {
                        // Ensure content is properly formatted
                        const formattedContent = content.startsWith('data:image') ? content : `data:image/png;base64,${content}`;
                        
                        // Send to storage first
                        await sendCapturedContent({
                            ...captured,
                            content: formattedContent
                        });
                        
                        // No need to show success toast - it's now handled in the captureScreenshot function
                        console.log(`Screenshot #${captureId} sent to storage`);
                    } else {
                        console.error(`Screenshot #${captureId} has invalid content format`);
                        showErrorToast('Screenshot Error', 'Invalid screenshot data received');
                    }
                } else {
                    console.log(`Screenshot #${captureId} capture returned empty result`);
                    // No need to show error toast as the capture function already showed one
                }
            } catch (error) {
                // Clear the timeout since we got an error
                clearTimeout(timeoutId);
                
                console.error(`Screenshot #${captureId} capture error:`, error);
                
                // Check for specific permission errors
                if (error instanceof Error) {
                    const errorMessage = error.message.toLowerCase();
                    if (errorMessage.includes('permission') || errorMessage.includes('not allowed')) {
                        showErrorToast(
                            'Screenshot Permission Required',
                            'Please grant the extension permission to capture screenshots. Click the extension icon and check the permissions settings.'
                        );
                    } else {
                        handleCaptureError(error, 'screenshot');
                    }
                } else {
                    handleCaptureError(error instanceof Error ? error : new Error(`${error}`), 'screenshot');
                }
            }
        } else {
            // Clear the timeout since we got a non-promise result
            clearTimeout(timeoutId);
            
            console.error(`Screenshot #${captureId} capture did not return a Promise as expected`);
            showErrorToast('Screenshot Failed', 'Unexpected capture result type');
        }
    } catch (error) {
        console.error(`Screenshot capture error:`, error);
        // Check for specific permission errors
        if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase();
            if (errorMessage.includes('permission') || errorMessage.includes('not allowed')) {
                showErrorToast(
                    'Screenshot Permission Required',
                    'Please grant the extension permission to capture screenshots. Click the extension icon and check the permissions settings.'
                );
            } else {
                handleCaptureError(error, 'screenshot');
            }
        } else {
            handleCaptureError(error instanceof Error ? error : new Error(`${error}`), 'screenshot');
        }
    } finally {
        activeScreenshotCapture = false;
    }
}

export default defineContentScript({
    matches: ['*://*/*'],
    cssInjectionMode: 'ui',
    async main(ctx) {
        console.log('RKO Content Script Loaded on:', window.location.href);
        
        // Initialize translations
        initTranslations(i18nConfig.defaultLocale, ["common", "content"]);
        
        // Inject Sonner toaster directly into the DOM for visibility
        const toasterContainer = document.createElement('div');
        toasterContainer.id = 'rko-sonner-container';
        toasterContainer.style.position = 'fixed';
        toasterContainer.style.top = '0';
        toasterContainer.style.right = '0';
        toasterContainer.style.zIndex = '9999999';
        document.body.appendChild(toasterContainer);
        
        // Render Sonner's Toaster directly into this container
        const root = ReactDOM.createRoot(toasterContainer);
        root.render(
          <Toaster position="top-right" richColors />
        );
        
        console.log('🔴 SONNER TOASTER DIRECTLY INJECTED INTO DOM');
        
        // Listen for messages from background script
        browser.runtime.onMessage.addListener((message: ExtMessage, sender, sendResponse) => {
            console.log('Content script received message:', message);
            
            // Handle specific message types
            if (message.messageType === MessageType.requestTextSelection) {
                const captured = captureContent(CaptureType.TEXT, false);
                console.log('Requested text selection, captured:', captured);
                // Return true for async handling
            } else if (message.messageType === MessageType.requestCapture) {
                const captureTypeStr = message.content as string;
                let captureType: CaptureType = CaptureType.TEXT; // Initialize with default value
                
                switch (captureTypeStr) {
                    case 'screenshot':
                        captureType = CaptureType.SCREENSHOT;
                        break;
                    case 'html':
                        captureType = CaptureType.HTML;
                        break;
                    case 'markdown':
                        captureType = CaptureType.MARKDOWN;
                        break;
                    case 'fullpage':
                        captureType = CaptureType.FULLPAGE;
                        break;
                    case 'text':
                    default:
                        captureType = CaptureType.TEXT;
                        break;
                }
                
                console.log(`Requested capture of type: ${captureType} from background`);
                captureContent(captureType);
            } else if (message.messageType === MessageType.sidePanelLoaded) {
                // Handle automatic notification after load
                console.log("Sidepanel loaded, sending content URL");
                // Send back the source URL to the sidepanel for page context
                browser.runtime.sendMessage({
                    messageType: MessageType.contentScriptLoaded,
                    from: MessageFrom.contentScript,
                    content: window.location.href
                }).catch(err => console.error('Failed to send load notification:', err));
            }
            
            return true;
        });
        
        // Add event listeners for text selection
        document.addEventListener('mouseup', handleMouseUp);
        document.addEventListener('selectionchange', handleSelectionChange);
        
        // Add click handler to hide toolbar when clicking outside
        document.addEventListener('click', handleDocumentClick);
        
        // Add keyboard shortcut listener
        document.addEventListener('keydown', handleKeyboardShortcut);
        
        // Add escape key handler to hide toolbar
        document.addEventListener('keydown', handleEscapeKey);
        
        // Create UI
        const ui = await createShadowRootUi(ctx, {
            name: 'rko-content-ui',
            position: 'inline',
            onMount: (container) => {
                console.log('RKO UI container mounted:', container);
                const root = ReactDOM.createRoot(container);
                root.render(
                    <ThemeProvider>
                        <App/>
                        <SonnerToaster />
                    </ThemeProvider>
                );
                return root;
            },
            onRemove: (root) => {
                console.log('RKO UI container removed');
                root?.unmount();
                
                // Clean up event listeners
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('selectionchange', handleSelectionChange);
                document.removeEventListener('click', handleDocumentClick);
                document.removeEventListener('keydown', handleKeyboardShortcut);
                document.removeEventListener('keydown', handleEscapeKey);
                
                // Make sure toolbar is removed
                cleanupFloatingToolbar();
            },
        });
        
        ui.mount();
        
        // Ensure keyboard shortcuts are still active after UI is mounted
        setTimeout(() => {
            if (!document.onkeydown) {
                console.log('Re-adding keyboard shortcut listener after UI mount');
                document.addEventListener('keydown', handleKeyboardShortcut);
            }
            
            // Re-add selection events if they were somehow removed
            // This ensures the floating toolbar will still appear when text is selected
            console.log('Ensuring selection listeners are active');
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('click', handleDocumentClick);
            document.removeEventListener('keydown', handleEscapeKey);
            
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('selectionchange', handleSelectionChange);
            document.addEventListener('click', handleDocumentClick);
            document.addEventListener('keydown', handleEscapeKey);
        }, 1000);
        
        // Notify background that content script is loaded
        browser.runtime.sendMessage({
            messageType: MessageType.contentScriptLoaded,
            from: MessageFrom.contentScript,
            content: window.location.href
        }).catch(err => console.error('Failed to send load notification:', err));
    }
});

// Add helper function for forced selection capture
// This can be added at the bottom of the file before the closing export default
function captureForceSelection(type: CaptureType): CapturedContent | null {
    // This is a fallback when normal capture fails
    // It tries to get the selection directly
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
        return null;
    }
    
    const selectedText = selection.toString();
    if (!selectedText || selectedText.trim() === '') {
        return null;
    }
    
    console.log('Force capturing selection:', selectedText.substring(0, 30));
    
    let content = selectedText;
    if (type === CaptureType.HTML) {
        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        content = tempDiv.innerHTML;
    } else if (type === CaptureType.MARKDOWN) {
        // Simple HTML to markdown conversion for the selection
        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);
        const html = tempDiv.innerHTML;
        
        // Very simple conversion - a real implementation would use a library
        content = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
            .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
            .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
            .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]*>/g, '');
    }
    
    // Extract metadata
    const extractMetadata = () => {
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
                
                // Process name attribute (description, author, keywords, etc.)
                if (name) {
                    if (name.match(/^(description|author|keywords|twitter:|og:|article:|publication|image|canonical)/) ||
                        name === 'viewport' || name === 'theme-color' || name === 'application-name') {
                        metadata[name] = content;
                    }
                }
                
                // Process property attribute (og:title, og:description, etc.)
                if (property) {
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
            
            // Add basic page info
            const textContent = document.body.textContent || '';
            metadata.wordCount = textContent.split(/\s+/).filter(Boolean).length.toString();
            metadata.characterCount = textContent.length.toString();
            metadata.excerpt = textContent.substring(0, 300).trim().replace(/\s+/g, ' ') + (textContent.length > 300 ? '...' : '');
            
            return metadata;
        } catch (error) {
            console.error('Error extracting metadata:', error);
            // Return basic metadata even if extraction fails
            return metadata;
        }
    };
    
    // Get page metadata
    const pageMetadata = extractMetadata();
    
    return {
        type: type,
        content: content,
        title: document.title,
        url: window.location.href,
        timestamp: Date.now(),
        metadata: pageMetadata
    };
}

// Handle errors during content capture
function handleCaptureError(error: Error, type: string) {
    console.error(`Error capturing ${type} content:`, error);
    
    showErrorToast(
        "Capture Failed", 
        `Failed to capture ${type} content: ${error.message}`
    );
}
