import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { captureContent, CaptureType } from '@/lib/capture';

// Create a single toolbar container and root that persists
let toolbarContainer: HTMLDivElement | null = null;
let toolbarRoot: ReactDOM.Root | null = null;
let isInitialized = false;

// Simple component for the toolbar buttons
const FloatingToolbar: React.FC = () => {
  // Track which buttons are currently capturing
  const [isCapturing, setIsCapturing] = useState<{[key: string]: boolean}>({
    text: false,
    html: false,
    markdown: false
  });
  
  const handleCapture = async (type: CaptureType, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Prevent multiple rapid clicks
    if (isCapturing[type === CaptureType.TEXT ? 'text' : 
       type === CaptureType.HTML ? 'html' : 'markdown']) {
      return;
    }
    
    // Update the capture state
    setIsCapturing(prev => ({
      ...prev,
      [type === CaptureType.TEXT ? 'text' : 
       type === CaptureType.HTML ? 'html' : 'markdown']: true
    }));
    
    // Store the current selection
    const selection = window.getSelection();
    let savedRange = null;
    
    if (selection && selection.rangeCount > 0) {
      savedRange = selection.getRangeAt(0).cloneRange();
    }
    
    try {
      // Capture the content
      await captureContent(type);
    } catch (error) {
      console.error('Error capturing content:', error);
    } finally {
      // Reset capture state almost immediately to allow rapid captures
      setTimeout(() => {
        setIsCapturing(prev => ({
          ...prev,
          [type === CaptureType.TEXT ? 'text' : 
           type === CaptureType.HTML ? 'html' : 'markdown']: false
        }));
      }, 100); // Reduced from 200ms to 100ms for even better responsiveness
      
      // Restore the selection
      if (savedRange) {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(savedRange);
        }
      }
    }
  };
  
  return (
    <div className="rko-floating-toolbar">
      <button 
        onClick={(e) => handleCapture(CaptureType.TEXT, e)}
        className={`rko-toolbar-btn ${isCapturing.text ? 'rko-capturing' : ''}`}
        disabled={isCapturing.text}
        title="Capture as Text"
      >
        <span className="rko-btn-icon">T</span>
        <span className="rko-btn-text">{isCapturing.text ? 'Capturing...' : 'Text'}</span>
      </button>
      
      <button 
        onClick={(e) => handleCapture(CaptureType.HTML, e)}
        className={`rko-toolbar-btn ${isCapturing.html ? 'rko-capturing' : ''}`}
        disabled={isCapturing.html}
        title="Capture as HTML"
      >
        <span className="rko-btn-icon">&lt;&gt;</span>
        <span className="rko-btn-text">{isCapturing.html ? 'Capturing...' : 'HTML'}</span>
      </button>
      
      <button 
        onClick={(e) => handleCapture(CaptureType.MARKDOWN, e)}
        className={`rko-toolbar-btn ${isCapturing.markdown ? 'rko-capturing' : ''}`}
        disabled={isCapturing.markdown}
        title="Capture as Markdown"
      >
        <span className="rko-btn-icon">MD</span>
        <span className="rko-btn-text">{isCapturing.markdown ? 'Capturing...' : 'Markdown'}</span>
      </button>
    </div>
  );
};

// Initialize the toolbar once
const initializeToolbar = () => {
  if (isInitialized && toolbarContainer) return;
  
  // Create container element
  toolbarContainer = document.createElement('div');
  toolbarContainer.id = 'rko-toolbar-container';
  toolbarContainer.style.display = 'none';
  toolbarContainer.style.position = 'absolute';
  toolbarContainer.style.zIndex = '2147483647';
  toolbarContainer.style.backgroundColor = 'white';
  toolbarContainer.style.border = '1px solid #ccc';
  toolbarContainer.style.borderRadius = '8px';
  toolbarContainer.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)';
  toolbarContainer.style.padding = '6px';
  toolbarContainer.style.transform = 'translate(-50%, -120%)';
  
  // Add to document
  document.body.appendChild(toolbarContainer);
  
  // Create React root once
  toolbarRoot = ReactDOM.createRoot(toolbarContainer);
  toolbarRoot.render(<FloatingToolbar />);
  
  // Style the buttons
  const style = document.createElement('style');
  style.textContent = `
    .rko-floating-toolbar {
      display: flex;
      /* Make sure toolbar doesn't interfere with other elements */
      box-sizing: border-box;
    }
    
    .rko-toolbar-btn {
      display: flex;
      align-items: center;
      padding: 6px 10px;
      margin: 0 2px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: background-color 0.2s ease, opacity 0.2s ease;
    }
    
    .rko-toolbar-btn:nth-child(1) {
      background-color: #f1f5f9;
    }
    
    .rko-toolbar-btn:nth-child(2) {
      background-color: #e0f2fe;
    }
    
    .rko-toolbar-btn:nth-child(3) {
      background-color: #f3e8ff;
    }
    
    .rko-toolbar-btn:disabled,
    .rko-toolbar-btn.rko-capturing {
      opacity: 0.7;
      cursor: not-allowed;
    }
    
    .rko-btn-icon {
      margin-right: 4px;
      font-weight: bold;
    }
    
    /* Fix for toast styling - ensure toasts have proper spacing and no overflow */
    #rko-sonner-container .sonner-toast {
      padding: 16px;
      max-width: 360px;
      width: 100%;
      box-sizing: border-box;
    }
    
    #rko-sonner-container .sonner-toast-content {
      overflow-wrap: break-word;
      word-wrap: break-word;
      word-break: break-word;
      white-space: normal;
      padding: 8px;
    }
    
    #rko-sonner-container .sonner-loader {
      width: 100%;
      box-sizing: border-box;
      padding: 0 16px;
    }
  `;
  document.head.appendChild(style);
  
  isInitialized = true;
};

// Get selection coordinates
const getSelectionCoordinates = (selection: Selection) => {
  if (!selection.rangeCount) return null;
  
  const range = selection.getRangeAt(0);
  const rects = range.getClientRects();
  
  if (!rects.length) return null;
  
  const { left, top, width } = rects[0];
  
  // Calculate scrolling offset
  const scrollX = window.scrollX || document.documentElement.scrollLeft;
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  
  return {
    x: left + scrollX,
    y: top + scrollY,
    width
  };
};

// Position the toolbar based on selection
const positionToolbar = (selection: Selection) => {
  if (!toolbarContainer) return;
  
  const coordinates = getSelectionCoordinates(selection);
  
  if (!coordinates) {
    toolbarContainer.style.display = 'none';
    return;
  }
  
  // Center horizontally over the selection
  const toolbarX = coordinates.x + (coordinates.width / 2);
  
  // Position above the selection with a margin
  const toolbarY = coordinates.y;
  
  // Set the position
  toolbarContainer.style.left = `${toolbarX}px`;
  toolbarContainer.style.top = `${toolbarY}px`;
  toolbarContainer.style.display = 'block';
};

// Exported function to show toolbar
export const showFloatingToolbar = (selection: Selection) => {
  // Initialize if needed
  if (!isInitialized) {
    initializeToolbar();
  }
  
  // Only show for non-empty selections
  if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
    if (toolbarContainer) {
      toolbarContainer.style.display = 'none';
    }
    return;
  }
  
  // Position the toolbar
  positionToolbar(selection);
};

// Exported function to hide toolbar
export const hideFloatingToolbar = () => {
  if (toolbarContainer) {
    toolbarContainer.style.display = 'none';
  }
};

// Clean up function
export const cleanupFloatingToolbar = () => {
  if (toolbarRoot) {
    toolbarRoot.unmount();
  }
  
  if (toolbarContainer && toolbarContainer.parentNode) {
    toolbarContainer.parentNode.removeChild(toolbarContainer);
  }
  
  toolbarRoot = null;
  toolbarContainer = null;
  isInitialized = false;
};

// For API compatibility
export const resetToolbarState = hideFloatingToolbar; 