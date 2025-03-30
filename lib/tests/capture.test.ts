import { CaptureType, detectCaptureType, extractSelectionStyles, shouldUseHTMLCapture } from '../capture';

// Mock the window.getSelection() function
const mockGetSelection = jest.fn();
Object.defineProperty(window, 'getSelection', {
  value: mockGetSelection,
  writable: true
});

// Mock the window.getComputedStyle() function
const mockGetComputedStyle = jest.fn();
Object.defineProperty(window, 'getComputedStyle', {
  value: mockGetComputedStyle,
  writable: true
});

describe('Smart Capture Type Detection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('shouldUseHTMLCapture', () => {
    it('should detect simple text selections as not requiring HTML capture', () => {
      // Mock a simple text selection
      const mockRange = {
        cloneContents: jest.fn().mockReturnValue({
          childNodes: [{ nodeType: Node.TEXT_NODE, textContent: 'Simple text selection' }],
          querySelectorAll: jest.fn().mockReturnValue([])
        })
      };
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(mockRange)
      };
      
      expect(shouldUseHTMLCapture(mockSelection as unknown as Selection)).toBe(false);
    });
    
    it('should detect rich HTML content as requiring HTML capture', () => {
      // Mock an HTML selection with links
      const mockFragment = {
        childNodes: [
          { nodeType: Node.ELEMENT_NODE, tagName: 'DIV', attributes: [] }
        ],
        querySelectorAll: jest.fn().mockImplementation((selector) => {
          if (selector === '*') {
            return [{ tagName: 'A' }, { tagName: 'P' }];
          }
          return [];
        })
      };
      
      const mockRange = {
        cloneContents: jest.fn().mockReturnValue(mockFragment)
      };
      
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(mockRange)
      };
      
      expect(shouldUseHTMLCapture(mockSelection as unknown as Selection)).toBe(true);
    });
  });
  
  describe('detectCaptureType', () => {
    it('should return null when there is no selection', () => {
      mockGetSelection.mockReturnValue(null);
      expect(detectCaptureType()).toBeNull();
      
      mockGetSelection.mockReturnValue({ rangeCount: 0 });
      expect(detectCaptureType()).toBeNull();
      
      mockGetSelection.mockReturnValue({ rangeCount: 1, toString: () => '' });
      expect(detectCaptureType()).toBeNull();
    });
    
    it('should detect plain text content', () => {
      // Mock a simple text selection
      const mockRange = {
        cloneContents: jest.fn().mockReturnValue({
          childNodes: [{ nodeType: Node.TEXT_NODE, textContent: 'Simple text selection' }],
          querySelectorAll: jest.fn().mockReturnValue([])
        })
      };
      
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(mockRange),
        toString: () => 'Simple text selection'
      };
      
      mockGetSelection.mockReturnValue(mockSelection);
      
      expect(detectCaptureType()).toBe(CaptureType.TEXT);
    });
    
    it('should detect HTML content', () => {
      // Mock an HTML selection with images (not suitable for Markdown)
      const mockFragment = {
        childNodes: [
          { nodeType: Node.ELEMENT_NODE, tagName: 'DIV', attributes: [] }
        ],
        querySelectorAll: jest.fn().mockImplementation((selector) => {
          if (selector === '*') {
            return [{ tagName: 'DIV' }, { tagName: 'IMG' }];
          } else if (selector === 'img, video, canvas, svg, table, iframe') {
            return [{ tagName: 'IMG' }];
          }
          return [];
        })
      };
      
      const mockRange = {
        cloneContents: jest.fn().mockReturnValue(mockFragment)
      };
      
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(mockRange),
        toString: () => 'HTML with image'
      };
      
      mockGetSelection.mockReturnValue(mockSelection);
      
      expect(detectCaptureType()).toBe(CaptureType.HTML);
    });
    
    it('should detect Markdown-suitable content', () => {
      // Mock a selection good for Markdown (headings, paragraphs, links)
      const mockFragment = {
        childNodes: [
          { nodeType: Node.ELEMENT_NODE, tagName: 'DIV', attributes: [] }
        ],
        querySelectorAll: jest.fn().mockImplementation((selector) => {
          if (selector === '*') {
            return [
              { tagName: 'H1' }, 
              { tagName: 'P' }, 
              { tagName: 'A' }, 
              { tagName: 'UL' }
            ];
          } else if (selector === 'img, video, canvas, svg, table, iframe') {
            return []; // No complex elements
          }
          return [];
        })
      };
      
      const mockRange = {
        cloneContents: jest.fn().mockReturnValue(mockFragment)
      };
      
      const mockSelection = {
        rangeCount: 1,
        getRangeAt: jest.fn().mockReturnValue(mockRange),
        toString: () => 'Markdown friendly content'
      };
      
      mockGetSelection.mockReturnValue(mockSelection);
      
      expect(detectCaptureType()).toBe(CaptureType.MARKDOWN);
    });
  });
  
  describe('extractSelectionStyles', () => {
    it('should extract styles from the selection', () => {
      // Mock a node with styles
      const mockElement = {};
      const mockNode = {
        parentElement: mockElement
      };
      
      const mockSelection = {
        anchorNode: mockNode
      };
      
      // Mock computed styles
      const mockStyles = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontWeight: 'bold',
        fontStyle: 'italic',
        color: '#333333',
        backgroundColor: '#f5f5f5',
        textDecoration: 'underline',
        textAlign: 'left',
        lineHeight: '1.5'
      };
      
      mockGetComputedStyle.mockReturnValue(mockStyles);
      
      const styles = extractSelectionStyles(mockSelection as unknown as Selection);
      
      expect(mockGetComputedStyle).toHaveBeenCalledWith(mockElement);
      expect(styles).toEqual(mockStyles);
    });
    
    it('should handle missing parent element gracefully', () => {
      // Mock a node without parent
      const mockSelection = {
        anchorNode: { parentElement: null }
      };
      
      const styles = extractSelectionStyles(mockSelection as unknown as Selection);
      
      expect(styles).toEqual({});
    });
    
    it('should handle empty background colors', () => {
      // Mock a node with transparent background
      const mockElement = {};
      const mockNode = {
        parentElement: mockElement
      };
      
      const mockSelection = {
        anchorNode: mockNode
      };
      
      // Mock computed styles with transparent background
      const mockStyles = {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontWeight: 'normal',
        fontStyle: 'normal',
        color: '#333333',
        backgroundColor: 'rgba(0, 0, 0, 0)', // Transparent
        textDecoration: 'none',
        textAlign: 'left',
        lineHeight: '1.5'
      };
      
      mockGetComputedStyle.mockReturnValue(mockStyles);
      
      const styles = extractSelectionStyles(mockSelection as unknown as Selection);
      
      expect(styles.backgroundColor).toBe('');
    });
  });
}); 