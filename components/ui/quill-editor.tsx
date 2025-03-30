import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

// Add custom CSS to fix Quill editor layout issues
import './quill-overrides.css';

interface QuillEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
  contentType?: 'text' | 'html' | 'markdown' | 'fullpage';
}

export function QuillEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  readOnly = false,
  className = '',
  contentType = 'text'
}: QuillEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const containerIdRef = useRef<string>(`quill-editor-${Math.random().toString(36).substr(2, 9)}`);
  const [isInitialized, setIsInitialized] = useState(false);

  // Setup Quill instance on component mount
  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      // Cleanup any existing Quill instances for this element first
      if (editorRef.current.querySelector('.ql-toolbar')) {
        // If there's already a toolbar, there might be a previous instance
        // We'll re-create the editor element entirely
        while (editorRef.current.firstChild) {
          editorRef.current.removeChild(editorRef.current.firstChild);
        }
      }

      // Create a clean editor element
      const editorElement = document.createElement('div');
      editorElement.id = containerIdRef.current;
      editorRef.current.appendChild(editorElement);

      const quillOptions = {
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'script': 'sub' }, { 'script': 'super' }],
            ['link', 'image'],
            ['clean']
          ]
        },
        placeholder: placeholder,
        readOnly: readOnly,
        theme: 'snow'
      };
      
      // Special handling for different content types
      if (contentType === 'markdown' || contentType === 'text') {
        // Simpler toolbar for markdown and text
        quillOptions.modules.toolbar = [
          ['bold', 'italic', 'underline'],
          ['link'],
          ['clean']
        ];
      }

      // Initialize Quill on the new clean element
      quillRef.current = new Quill(`#${containerIdRef.current}`, quillOptions);
      
      // Set initial content - handle HTML and text differently
      if (contentType === 'html' || contentType === 'fullpage') {
        quillRef.current.clipboard.dangerouslyPasteHTML(value);
      } else if (contentType === 'markdown') {
        // For markdown, we can set as text but should support basic markdown preview
        // This is a simplified approach - ideally you'd use a Markdown-specific editor
        quillRef.current.setText(value);
      } else {
        // Plain text
        quillRef.current.setText(value);
      }
      
      // Register change event
      quillRef.current.on('text-change', () => {
        if (!quillRef.current) return;
        
        const content = contentType === 'html' || contentType === 'fullpage'
          ? quillRef.current.root.innerHTML
          : quillRef.current.getText();
          
        onChange(content);
      });
      
      setIsInitialized(true);
    }
    
    // Cleanup on unmount
    return () => {
      if (quillRef.current) {
        // Properly destroy the Quill instance
        try {
          // Find toolbar elements and remove them
          if (editorRef.current) {
            const toolbarElements = editorRef.current.querySelectorAll('.ql-toolbar');
            toolbarElements.forEach(el => el.remove());
          }
        } catch (err) {
          console.error('Error cleaning up Quill:', err);
        }
        quillRef.current = null;
      }
    };
  }, []);

  // Update content when value prop changes
  useEffect(() => {
    if (quillRef.current && isInitialized) {
      let currentContent;
      
      if (contentType === 'html' || contentType === 'fullpage') {
        currentContent = quillRef.current.root.innerHTML;
      } else if (contentType === 'markdown') {
        currentContent = quillRef.current.getText();
      } else {
        // Plain text
        currentContent = quillRef.current.getText();
      }
      
      // Only update if the content is different to prevent cursor jumps
      if (currentContent !== value) {
        if (contentType === 'html' || contentType === 'fullpage') {
          quillRef.current.clipboard.dangerouslyPasteHTML(value);
        } else if (contentType === 'markdown') {
          quillRef.current.setText(value);
        } else {
          // Plain text
          quillRef.current.setText(value);
        }
      }
    }
  }, [value, isInitialized, contentType]);

  return (
    <div className={`quill-editor-container max-w-full overflow-hidden ${className}`}>
      <div ref={editorRef} className="min-h-[200px]" />
    </div>
  );
} 