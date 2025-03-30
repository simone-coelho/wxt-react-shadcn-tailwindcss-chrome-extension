import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "@/components/ui/use-toast";
import { QuillEditor } from "@/components/ui/quill-editor";
import { HtmlPreview } from "@/components/ui/html-preview";
import { Label } from "@/components/ui/label";

interface ContentEditorProps {
  item: {
    id: number;
    content: string;
    type: string;
    title?: string;
    url?: string;
    metadata?: any;
  };
  onSave: (updatedItem: any) => void;
  onCancel: () => void;
}

export function ContentEditor({ item, onSave, onCancel }: ContentEditorProps) {
  const [editedContent, setEditedContent] = useState(item.content);
  const [editedTitle, setEditedTitle] = useState(item.title || '');
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  
  const isHtmlContent = item.type === 'html' || item.type === 'fullpage';

  // Set initial state from props
  useEffect(() => {
    setEditedContent(item.content);
    setEditedTitle(item.title || '');
  }, [item]);

  // Handle content change from the Quill editor
  const handleContentChange = (content: string) => {
    setEditedContent(content);
  };

  const handleSave = () => {
    // Update the item with edited content
    const updatedItem = {
      ...item,
      content: editedContent,
      title: editedTitle
    };
    
    onSave(updatedItem);
    
    // Show success toast
    toast({
      title: "Content Updated",
      description: "Your changes have been saved.",
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <h3 className="text-lg font-semibold mb-4">Edit Content</h3>
      
      {/* Content area with scroll */}
      <div className="flex-1 overflow-auto mb-16">
        <Card className="p-4 mb-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                placeholder="Enter title"
                className="w-full"
              />
            </div>
            
            {item.url && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Source:</span> 
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-500 hover:underline">
                  {item.url}
                </a>
              </div>
            )}
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="content">Content</Label>
                
                {isHtmlContent && (
                  <div className="flex rounded-md overflow-hidden border">
                    <Button
                      type="button"
                      variant={viewMode === 'edit' ? 'default' : 'outline'}
                      className="rounded-r-none px-3 py-1 h-8 text-xs"
                      onClick={() => setViewMode('edit')}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant={viewMode === 'preview' ? 'default' : 'outline'}
                      className="rounded-l-none px-3 py-1 h-8 text-xs"
                      onClick={() => setViewMode('preview')}
                    >
                      Preview
                    </Button>
                  </div>
                )}
              </div>
              
              {isHtmlContent ? (
                <>
                  {viewMode === 'edit' ? (
                    <QuillEditor
                      value={editedContent}
                      onChange={handleContentChange}
                      contentType={item.type as any}
                      className="border rounded-md overflow-x-hidden"
                    />
                  ) : (
                    <HtmlPreview 
                      html={editedContent} 
                      className="min-h-[200px] overflow-x-hidden"
                    />
                  )}
                </>
              ) : (
                <QuillEditor
                  value={editedContent}
                  onChange={handleContentChange}
                  contentType={item.type as any}
                  className="border rounded-md overflow-x-hidden"
                />
              )}
            </div>
          </div>
        </Card>
      </div>
      
      {/* Fixed position button bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          Save Changes
        </Button>
      </div>
    </div>
  );
} 