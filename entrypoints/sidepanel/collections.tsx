import React, { useEffect, useState, useRef, useCallback } from "react";
import {Card} from "@/components/ui/card.tsx";
import {Button} from "@/components/ui/button.tsx";
import {Badge} from "@/components/ui/badge.tsx";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import { ContentEditor } from "@/entrypoints/sidepanel/content-editor.tsx";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog.tsx";
import { TrashIcon, XCircleIcon, ChevronDownIcon, ChevronUpIcon, CopyIcon, SearchIcon } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { showSuccessToast, showErrorToast } from "@/components/ui/custom-toast";
import { browser } from "wxt/browser";
import { Input } from "@/components/ui/input.tsx";

interface CapturedItem {
    id: number;
    content: string;
    timestamp: Date;
    source: string;
    type: string; 
    title?: string;
    url?: string;
    metadata?: any;
}

interface CollectionsProps {
    capturedContent?: string | null;
    metadata?: {
        type?: string;
        title?: string;
        url?: string;
        timestamp?: Date;
        [key: string]: any;
    };
}

// Move formatMarkdown outside of the component so it can be reused
const formatMarkdown = (md: string) => {
    // Replace headings
    let formatted = md.replace(/^# (.*?)$/gm, '<h1 class="text-xl font-bold">$1</h1>');
    formatted = formatted.replace(/^## (.*?)$/gm, '<h2 class="text-lg font-bold">$1</h2>');
    
    // Replace bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Replace italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Replace links
    formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-500 hover:underline">$1</a>');
    
    // Replace line breaks
    formatted = formatted.replace(/\n/g, '<br />');
    
    return formatted;
};

// Component to render HTML content safely
const HtmlRenderer = ({ content }: { content: string }) => {
    return (
        <div 
            className="border p-2 rounded bg-secondary/10 max-h-[300px] overflow-auto text-sm w-full"
            dangerouslySetInnerHTML={{ __html: content }} 
        />
    );
};

// Component to render Markdown content
const MarkdownRenderer = ({ content }: { content: string }) => {
    return (
        <div 
            className="border p-2 rounded bg-secondary/10 max-h-[300px] overflow-auto text-sm w-full"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} 
        />
    );
};

// Component to render Screenshot content
const ScreenshotRenderer = ({ content }: { content: string }) => {
    // For screenshots, the content is a base64 encoded image
    return (
        <div className="border p-2 rounded bg-secondary/10 overflow-auto text-sm text-center">
            <img 
                src={content} 
                alt="Captured Screenshot" 
                className="max-w-full max-h-[300px] object-contain mx-auto"
            />
        </div>
    );
};

// Component to render content based on its type
const ContentRenderer = ({ item }: { item: CapturedItem }) => {
    switch (item.type) {
        case 'html':
            return <div dangerouslySetInnerHTML={{ __html: item.content }} />;
        case 'markdown':
            return <div dangerouslySetInnerHTML={{ __html: formatMarkdown(item.content) }} />;
        case 'screenshot':
            return (
                <div className="text-center">
                    <img 
                        src={item.content} 
                        alt="Captured Screenshot" 
                        className="max-w-full max-h-[300px] object-contain mx-auto"
                    />
                </div>
            );
        case 'fullpage':
            return (
                <div>
                    <div className="font-medium mb-1">{item.title}</div>
                    <div className="text-muted-foreground">{item.content.substring(0, 300)}...</div>
                </div>
            );
        case 'text':
        default:
            return (
                <div className="whitespace-pre-wrap break-words">
                    {item.content}
                </div>
            );
    }
};

export function Collections({ capturedContent, metadata }: CollectionsProps) {
    // Use useRef to track if we've processed this content already to prevent duplicates
    const processedContentRef = useRef<string | null>(null);
    const processedTimestampRef = useRef<number | null>(null);
    const lastClearTimestampRef = useRef<number | null>(null);
    
    // For debugging
    console.log("Collections render with props:", { 
        hasContent: !!capturedContent,
        contentLength: capturedContent?.length || 0,
        contentStart: capturedContent?.substring(0, 20) || '',
        metadata 
    });
    
    const [recentItems, setRecentItems] = useState<CapturedItem[]>([]);
    const [initialized, setInitialized] = useState(false);
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [activeCollection, setActiveCollection] = useState<number | null>(null);
    const clearingInProgressRef = useRef<boolean>(false);
    const [expandedItems, setExpandedItems] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    
    // Add a variable to track clear state across renders
    const hasClearedRef = useRef<boolean>(false);
    
    // New function to safely set items while respecting clear state
    const safeSetRecentItems = useCallback((items: CapturedItem[] | ((prev: CapturedItem[]) => CapturedItem[])) => {
        // Only basic check for active clearing operation
        if (clearingInProgressRef.current) {
            console.log("📊 BLOCKING setState during active clear operation");
            return;
        }
        
        // Safe to proceed, use the normal setter
        setRecentItems(items);
    }, []);
    
    // Handle the special case of the first render with no content but existing example
    useEffect(() => {
        // Initialize with example item only once
        if (!initialized) {
            setInitialized(true);
            console.log("Initializing with example item");
            
            // Only add example if we didn't get real content on first render
            if (!capturedContent) {
                setRecentItems([{ 
                    id: 1, // Special ID for the example item
                    content: "The Impact of AI on Research", 
                    timestamp: new Date(Date.now() - 7200000), // 2 hours ago
                    source: "Research Papers",
                    type: "text",
                    title: "Example Research Paper",
                    url: "https://example.com/research-paper"
                }]);
            }
        }
    }, [initialized]);
    
    // Add captured content to recent items when it's received
    useEffect(() => {
        console.log("Collections useEffect triggered with content:", 
            capturedContent ? `${capturedContent?.substring(0, 30)}... (${capturedContent.length} chars)` : 'none');
        
        // Skip if no content
        if (!capturedContent) {
            console.log("Skipping - no content");
            return;
        }
        
        // CRITICAL: Skip processing new content during clear operation
        if (clearingInProgressRef.current) {
            console.log("Skipping content processing - clear operation in progress");
            return;
        }
        
        // Generate content hash for better deduplication
        const contentHash = `${metadata?.type || 'unknown'}-${
            capturedContent.substring(0, 100).replace(/\s+/g, ' ')
        }`;
        
        // Log details for debugging
        console.log("Processing potential new content:", {
            contentLength: capturedContent.length,
            contentStart: capturedContent.substring(0, 30),
            type: metadata?.type,
            contentHash,
            lastProcessedHash: processedContentRef.current,
            timeSinceLastProcess: processedTimestampRef.current ? 
                (Date.now() - processedTimestampRef.current) + 'ms' : 'N/A',
            clearInProgress: clearingInProgressRef.current
        });
        
        // Improved deduplication - check content hash and timestamp together
        const isDuplicate = 
            contentHash === processedContentRef.current && 
            processedTimestampRef.current && 
            (Date.now() - processedTimestampRef.current < 1000); // 1 second window
        
        if (isDuplicate) {
            console.log("Skipping - duplicate content detected via hash match");
            return;
        }
        
        try {
            // Track this content hash and timestamp
            processedContentRef.current = contentHash;
            processedTimestampRef.current = Date.now();
            
            console.log("Adding new captured content to state:", {
                length: capturedContent.length,
                type: metadata?.type,
                timestamp: Date.now()
            });
            
            // Ensure we have a unique ID that isn't just timestamp-based
            // This helps prevent issues with items captured nearly simultaneously
            const uniqueId = Date.now() + Math.floor(Math.random() * 1000);
            
            const newItem: CapturedItem = {
                id: uniqueId,
                content: capturedContent,
                timestamp: metadata?.timestamp ? new Date(metadata.timestamp) : new Date(),
                source: metadata?.title || "Unknown Source",
                type: metadata?.type || "text",
                url: metadata?.url,
                title: metadata?.title,
                metadata: metadata
            };
            
            // Update state with the new item - use safe setter
            safeSetRecentItems(prev => {
                // Always remove the example item with ID 1
                const withoutExamples = prev.filter(item => item.id !== 1);
                
                // Check if we already have an item with matching content
                // This is a secondary deduplication check in case the first one fails
                const potentialDuplicate = withoutExamples.find(item => {
                    // Check for similar content and type
                    const sameType = item.type === newItem.type;
                    // Simple content comparison - first 50 chars should be enough for most cases
                    const similarContent = item.content.substring(0, 50) === newItem.content.substring(0, 50);
                    // Check if captured within 2 seconds
                    const closeTime = Math.abs(item.timestamp.getTime() - newItem.timestamp.getTime()) < 2000;
                    
                    return sameType && similarContent && closeTime;
                });
                
                if (potentialDuplicate) {
                    console.log("Found potential duplicate in existing items, not adding", {
                        existingId: potentialDuplicate.id,
                        newId: newItem.id
                    });
                    return withoutExamples; // Return without adding the new item
                }
                
                console.log("Adding new item to recentItems, current count:", withoutExamples.length);
                return [newItem, ...withoutExamples];
            });
        } catch (error) {
            console.error("Error processing captured content:", error);
        }
    }, [capturedContent, metadata, safeSetRecentItems]);
    
    // Current recentItems for debugging
    console.log("Current recentItems:", recentItems);
    
    // Get color based on content type
    const getTypeColor = (type: string): string => {
        switch (type) {
            case 'html':
                return 'bg-blue-500 hover:bg-blue-600';
            case 'markdown':
                return 'bg-purple-500 hover:bg-purple-600';
            case 'screenshot':
                return 'bg-amber-500 hover:bg-amber-600';
            case 'fullpage':
                return 'bg-emerald-500 hover:bg-emerald-600';
            case 'text':
            default:
                return 'bg-gray-500 hover:bg-gray-600';
        }
    };
    
    // Format metadata for display
    const formatMetadata = (item: CapturedItem): React.ReactNode => {
        if (!item.metadata) return null;
        
        // If this is a full page capture, show enhanced metadata
        if (item.type === 'fullpage') {
            return (
                <div className="mt-2 text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-2 mt-1">
                        {item.metadata.wordCount && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs">
                                            {item.metadata.wordCount} words
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Word count in document</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        
                        {item.metadata.contentSizeKB && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs">
                                            {item.metadata.contentSizeKB} KB
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Content size</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        
                        {item.metadata.captureTime && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs">
                                            {item.metadata.captureTime} ms
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Time to capture</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        
                        {item.metadata.imageCount && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs">
                                            {item.metadata.imageCount} images
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Number of images on page</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    
                    {item.metadata.excerpt && (
                        <div className="mt-2 text-xs italic text-muted-foreground line-clamp-3">
                            {item.metadata.excerpt}
                        </div>
                    )}
                </div>
            );
        }
        
        return null;
    };
    
    // Mock collections data - in a real implementation, this would come from storage
    const collections = [
        { id: 1, name: "Research Papers", itemCount: 15 },
        { id: 2, name: "News Articles", itemCount: 8 },
        { id: 3, name: "Code Snippets", itemCount: 23 }
    ];
    
    const [editingItem, setEditingItem] = useState<CapturedItem | null>(null);
    
    // Function to handle edit button click
    const handleEdit = (item: CapturedItem) => {
        setEditingItem(item);
    };
    
    // Function to handle save of edited content
    const handleSaveEdit = (updatedItem: CapturedItem) => {
        // Update the item in the array
        setRecentItems(prevItems => 
            prevItems.map(item => 
                item.id === updatedItem.id ? updatedItem : item
            )
        );
        // Clear editing state
        setEditingItem(null);
    };
    
    // Function to handle cancel of editing
    const handleCancelEdit = () => {
        setEditingItem(null);
    };
    
    // Function to handle deleting an individual item
    const handleDeleteItem = (itemId: number) => {
        try {
            // First update local state
            safeSetRecentItems(prevItems => prevItems.filter(item => item.id !== itemId));
            
            // Then update storage to ensure consistency
            browser.storage.local.get('recentCaptures')
                .then(data => {
                    if (data.recentCaptures && Array.isArray(data.recentCaptures)) {
                        const updatedStorage = data.recentCaptures.filter((item: any) => item.id !== itemId);
                        return browser.storage.local.set({ recentCaptures: updatedStorage });
                    }
                })
                .catch(err => console.error("Error updating storage after delete:", err));
            
            // Show success toast using the custom toast component
            showSuccessToast("Item Deleted", "The item has been removed from recent items.");
        } catch (error) {
            console.error("Error deleting item:", error);
            showErrorToast("Delete Failed", "There was a problem deleting the item.");
        }
    };
    
    // Function to clear all recent items
    const handleClearAllItems = async () => {
        console.log("CLEAR ALL: Starting with AGGRESSIVE approach");
        
        try {
            // 1. FIRST: Close dialog and show immediate visual feedback
            setShowClearDialog(false);
            
            // Use a toast ID to track and replace the clearing toast
            const clearToastId = `clear-${Date.now()}`;
            showSuccessToast("Clearing Items", "Removing all items...", {
                id: clearToastId,
                duration: 10000 // Long duration to ensure it stays visible
            });
            
            // 2. IMMEDIATELY set all state flags to prevent any loads or saves
            clearingInProgressRef.current = true;
            hasClearedRef.current = true;
            lastClearTimestampRef.current = Date.now();
            
            // 3. IMMEDIATELY clear UI by setting empty state
            setRecentItems([]);
            
            // 4. AGGRESSIVELY clear the storage using multiple approaches
            console.log("CLEAR ALL: Beginning aggressive storage clear");
            
            try {
                // Method 1: Use remove API
                await browser.storage.local.remove('recentCaptures');
                console.log("CLEAR ALL: Method 1 - browser.storage.local.remove completed");
                
                // Method 2: Set to null explicitly
                await browser.storage.local.set({ recentCaptures: null });
                console.log("CLEAR ALL: Method 2 - set to null completed");
                
                // Method 3: Set to empty array explicitly
                await browser.storage.local.set({ recentCaptures: [] });
                console.log("CLEAR ALL: Method 3 - set to empty array completed");
                
                // Method 4: Get all keys and remove 'recentCaptures' specifically
                const allData = await browser.storage.local.get(null);
                if (allData && allData.recentCaptures) {
                    delete allData.recentCaptures;
                    await browser.storage.local.set(allData);
                    console.log("CLEAR ALL: Method 4 - delete from all data completed");
                }
            } catch (storageError) {
                console.error("CLEAR ALL: Error during storage clearing", storageError);
                // Even if storage operations fail, continue with the rest of the process
            }
            
            // 5. VERIFY storage is truly cleared
            try {
                const verifyData = await browser.storage.local.get('recentCaptures');
                console.log("CLEAR ALL: Verification check result:", verifyData);
                
                if (verifyData.recentCaptures) {
                    console.warn("CLEAR ALL: Storage still has data after aggressive clear, final attempt");
                    await browser.storage.local.clear(); // Nuclear option - clear ALL storage
                    console.log("CLEAR ALL: Used nuclear option - cleared all storage");
                }
            } catch (verifyError) {
                console.error("CLEAR ALL: Error during verification", verifyError);
            }
            
            // 6. SET STATE AGAIN to ensure UI is clear
            setRecentItems([]);
            
            // 7. RESTART the component state
            setInitialized(true);
            setSearchQuery('');
            setExpandedItems([]);
            
            // 8. SUCCESS message - replace the clearing toast with success toast
            // Using a slight delay ensures the "clearing" toast has had time to appear
            setTimeout(() => {
                // Using the same ID will replace the "clearing" toast
                showSuccessToast("All Items Cleared", "All items have been successfully removed", {
                    id: clearToastId, // Same ID replaces the previous toast
                    duration: 5000
                });
                
                // 9. PREVENT reload of items by keeping flags on for a long time
                setTimeout(() => {
                    console.log("CLEAR ALL: First safety timer completed, resetting clearingInProgress flag");
                    clearingInProgressRef.current = false;
                    
                    // FORCE state empty again as a safety measure
                    setRecentItems([]);
                    
                    // Keep hasClearedRef true for even longer
                    setTimeout(() => {
                        console.log("CLEAR ALL: Second safety timer completed, resetting hasCleared flag");
                        hasClearedRef.current = false;
                    }, 10000); // 10 seconds
                }, 2000); // 2 seconds
            }, 500); // Small delay to ensure toast sequencing
        } catch (error) {
            // If ANY error happens during the process
            console.error("CLEAR ALL: Critical error during clear operation", error);
            
            // RESET component to a known good state
            clearingInProgressRef.current = false;
            hasClearedRef.current = false;
            
            // ENSURE UI is clear regardless
            setRecentItems([]);
            showErrorToast("Error During Clear", "Some items may not have been removed. Please try again.");
        }
    };
    
    // Function to handle collection card clicks
    const handleCollectionClick = (collectionId: number) => {
        setActiveCollection(collectionId === activeCollection ? null : collectionId);
        
        toast({
            title: "Collection Selected",
            description: `Viewing items in ${collections.find(c => c.id === collectionId)?.name}`,
            variant: "default"
        });
    };
    
    // Load recent items from storage on component mount
    useEffect(() => {
        console.log("Load effect running - should only run once on mount");
        
        const loadRecentItems = async () => {
            try {
                // NUCLEAR OPTION: First check if we're in active clearing state, skip everything
                if (clearingInProgressRef.current) {
                    console.log("⛔ LOADING BLOCKED: Clear operation in progress");
                    return;
                }
                
                // ENFORCE cleared state for longer safety period
                const lastClearTime = lastClearTimestampRef.current;
                if (lastClearTime) {
                    const timeSinceClear = Date.now() - lastClearTime;
                    // Extended protection window to 20 seconds
                    if (timeSinceClear < 20000) {
                        console.log(`⛔ LOADING BLOCKED: Too soon after clear (${timeSinceClear}ms)`);
                        return;
                    }
                }
                
                // ADDITIONAL SAFETY: If hasCleared flag is true, don't load
                if (hasClearedRef.current) {
                    console.log("⛔ LOADING BLOCKED: In cleared state");
                    return;
                }
                
                // CRITICAL CHECK: If we have empty state now, likely intentional, so don't reload
                if (initialized && recentItems.length === 0) {
                    console.log("⛔ LOADING BLOCKED: Empty state is likely intentional");
                    return;
                }

                console.log("✅ LOADING APPROVED: Proceeding with storage load", {
                    clearInProgress: clearingInProgressRef.current,
                    hasCleared: hasClearedRef.current,
                    itemCount: recentItems.length,
                    initialized: initialized,
                    timeSinceClear: lastClearTime ? `${Date.now() - lastClearTime}ms` : 'N/A'
                });
                
                const data = await browser.storage.local.get('recentCaptures');
                console.log("📦 STORAGE CONTENT:", data);
                
                // FINAL CHECKS before processing the data
                // 1. Don't process if clear started during fetch
                if (clearingInProgressRef.current || hasClearedRef.current) {
                    console.log("⛔ LOADING ABORTED: Clear state changed during fetch");
                    return;
                }
                
                // 2. If storage has empty data (null, undefined, or empty array), respect it
                if (!data.recentCaptures || 
                    (Array.isArray(data.recentCaptures) && data.recentCaptures.length === 0)) {
                    console.log("🧹 EMPTY STORAGE: Setting empty state");
                    setRecentItems([]);
                    if (!initialized) setInitialized(true);
                    return;
                }
                
                // 3. If data exists, verify it's an array before processing
                if (data.recentCaptures && Array.isArray(data.recentCaptures) && data.recentCaptures.length > 0) {
                    // Map items to ensure valid dates (timestamps can come back as strings from storage)
                    try {
                        const loadedItems = data.recentCaptures.map((item: any) => ({
                            ...item,
                            timestamp: item.timestamp instanceof Date ? 
                                item.timestamp : new Date(item.timestamp)
                        }));
                        
                        // Only apply if we have proper data and not duplicate of current state
                        if (loadedItems.length > 0) {
                            // Skip if we have same items (by ID comparison) to reduce re-renders
                            if (recentItems.length > 0 && 
                                JSON.stringify(recentItems.map(i => i.id).sort()) === 
                                JSON.stringify(loadedItems.map(i => i.id).sort())) {
                                console.log("⏩ SKIPPED LOAD: Already have same items");
                            } else if (!initialized || recentItems.length === 0) {
                                console.log(`✅ LOADED ${loadedItems.length} items from storage`);
                                setRecentItems(loadedItems);
                            }
                        }
                    } catch (parseError) {
                        console.error("❌ ERROR: Failed to parse items from storage:", parseError);
                    }
                }
                
                // Always mark as initialized when done
                if (!initialized) {
                    setInitialized(true);
                }
            } catch (error) {
                console.error("❌ CRITICAL ERROR during storage load:", error);
                // Handle initial state even on error
                if (!initialized) {
                    setInitialized(true);
                }
            }
        };
        
        // Run load operation
        loadRecentItems();
    }, [initialized]);
    
    // Save recent items to storage whenever they change
    useEffect(() => {
        // Skip in these conditions
        if (!initialized) return; 
        if (clearingInProgressRef.current) return;
        
        // Skip saving empty arrays after clearing
        if (recentItems.length === 0 && lastClearTimestampRef.current) {
            const timeSinceClear = Date.now() - lastClearTimestampRef.current;
            if (timeSinceClear < 3000) {
                console.log("Skip saving empty array - recent clear operation");
                return;
            }
        }
        
        console.log(`💾 SAVING: ${recentItems.length} items to storage`);
        
        const saveRecentItems = async () => {
            try {
                // One final safety check
                if (clearingInProgressRef.current) {
                    console.log("💾 SAVE ABORTED: Clear in progress");
                    return;
                }
                
                await browser.storage.local.set({ 
                    recentCaptures: recentItems 
                });
                console.log(`💾 SAVED: ${recentItems.length} items saved successfully`);
            } catch (error) {
                console.error("❌ SAVE ERROR:", error);
            }
        };
        
        saveRecentItems();
    }, [recentItems, initialized]);
    
    // Toggle content expansion for a specific item
    const toggleExpand = (itemId: number) => {
        setExpandedItems(prev => 
            prev.includes(itemId) 
                ? prev.filter(id => id !== itemId) 
                : [...prev, itemId]
        );
    };
    
    // Check if a specific item is expanded
    const isExpanded = (itemId: number) => expandedItems.includes(itemId);
    
    // Function to copy item content to clipboard
    const handleCopyContent = (item: CapturedItem) => {
        try {
            // Create a simple JSON representation
            const contentObj = {
                id: item.id,
                type: item.type,
                content: item.content,
                title: item.title || item.source,
                url: item.url,
                timestamp: item.timestamp
            };
            
            // Copy as JSON string
            navigator.clipboard.writeText(JSON.stringify(contentObj, null, 2));
            
            // Show success message
            toast({
                title: "Content Copied",
                description: "Item content has been copied to clipboard",
                variant: "default"
            });
        } catch (error) {
            console.error("Error copying content:", error);
            toast({
                title: "Copy Failed",
                description: "Failed to copy content to clipboard",
                variant: "destructive"
            });
        }
    };
    
    // Filter items based on search query
    const filteredItems = searchQuery.trim() === '' 
        ? recentItems 
        : recentItems.filter(item => {
            const searchLower = searchQuery.toLowerCase();
            return (
                (item.content && item.content.toLowerCase().includes(searchLower)) ||
                (item.title && item.title.toLowerCase().includes(searchLower)) ||
                (item.source && item.source.toLowerCase().includes(searchLower))
            );
        });
    
    // If in editing mode, show the editor with proper layout
    if (editingItem) {
        return (
            <ContentEditor 
                item={editingItem} 
                onSave={handleSaveEdit} 
                onCancel={handleCancelEdit} 
            />
        );
    }
    
    return (
        <div className="grid grid-rows-[auto_1fr] gap-4 md:gap-6 h-full">
            {/* Header and New Collection button */}
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Collections</h3>
                <Button size="sm" variant="outline">New Collection</Button>
            </div>
            
            {/* Collections and Recent Items - Remove explicit padding */}
            <div 
                className="grid gap-4 content-start overflow-y-auto"
                style={{ 
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#d1d5db transparent'
                }}
            >
                {/* Collections List */}
                <Card className="p-4 w-full">
                    <div className="space-y-2">
                        {collections.map(collection => (
                            <Card 
                                key={collection.id} 
                                className={`p-3 hover:bg-secondary/10 cursor-pointer ${activeCollection === collection.id ? 'border-primary' : ''}`}
                                onClick={() => handleCollectionClick(collection.id)}
                            >
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium">{collection.name}</h3>
                                    <span className="text-sm text-muted-foreground">{collection.itemCount} items</span>
                                </div>
                            </Card>
                        ))}
                        
                        <Card 
                            className="p-3 border-dashed flex justify-center items-center hover:bg-secondary/10 cursor-pointer"
                            onClick={() => toast({
                                title: "Create Collection",
                                description: "This would open a collection creation dialog",
                                variant: "default"
                            })}
                        >
                            <span className="text-muted-foreground">+ Add Collection</span>
                        </Card>
                    </div>
                </Card>
                
                {/* Recent Items with Search Bar */}
                <div className="mt-2 w-full">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-medium">Recent Items</h3>
                        
                        {recentItems.length > 0 && (
                            <>
                                {/* Replace Dialog with direct button for more reliability */}
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="flex items-center gap-1 text-xs"
                                    onClick={() => {
                                        // Show confirmation directly
                                        if (window.confirm("Are you sure you want to clear all items? This cannot be undone.")) {
                                            console.log("Clear All confirmed via direct confirmation");
                                            handleClearAllItems();
                                        }
                                    }}
                                >
                                    <TrashIcon size={14} />
                                    Clear All
                                </Button>
                            </>
                        )}
                    </div>
                    
                    {/* Search Bar */}
                    {recentItems.length > 0 && (
                        <div className="relative mb-4">
                            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search in recent items..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1 h-7 w-7 p-0"
                                    onClick={() => setSearchQuery('')}
                                >
                                    <XCircleIcon className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    )}
                    
                    {recentItems.length > 0 ? (
                        <div className="space-y-4 w-full">
                            {filteredItems.length > 0 ? filteredItems.map(item => (
                                <Card key={item.id} className="p-3 w-full box-border">
                                    <div className="flex flex-col">
                                        {/* Row 1: Buttons and Type Badge - Moved above title as requested */}
                                        <div className="flex justify-end items-center mb-2">
                                            <Badge className={`text-xs text-white ${getTypeColor(item.type)}`}>
                                                {item.type}
                                            </Badge>
                                            
                                            {/* Copy Button */}
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleCopyContent(item)}
                                                className="h-6 px-2 ml-1"
                                                title="Copy content"
                                            >
                                                <CopyIcon size={14} />
                                            </Button>
                                            
                                            {/* Edit or Preview Button based on content type */}
                                            {item.type === 'screenshot' ? (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => window.open(item.content, '_blank')}
                                                    className="h-6 px-2 ml-1"
                                                >
                                                    Preview
                                                </Button>
                                            ) : (
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    onClick={() => handleEdit(item)}
                                                    className="h-6 px-2 ml-1"
                                                >
                                                    Edit
                                                </Button>
                                            )}
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => handleDeleteItem(item.id)}
                                                className="h-6 px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <XCircleIcon size={14} />
                                            </Button>
                                        </div>
                                        
                                        {/* Row 2: Title - Moved below buttons */}
                                        <h4 className="text-base font-medium">{item.source}</h4>
                                        
                                        {/* Row 3: Date */}
                                        <div className="text-xs text-muted-foreground mb-2">
                                            {new Date(item.timestamp).toLocaleString()}
                                        </div>
                                        
                                        {/* Row 4: Content - with standard height and expand/collapse */}
                                        <div className="text-sm mt-1">
                                            {item.type === 'text' ? (
                                                <div className={`whitespace-pre-wrap break-words ${isExpanded(item.id) ? 'max-h-none' : 'max-h-[120px]'} overflow-hidden relative`}>
                                                    {item.content}
                                                    {!isExpanded(item.id) && item.content.length > 300 && (
                                                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent"></div>
                                                    )}
                                                </div>
                                            ) : item.type === 'fullpage' ? (
                                                <div>
                                                    <div className="font-medium mb-1">{item.title}</div>
                                                    <div className={`text-muted-foreground ${isExpanded(item.id) ? 'max-h-none' : 'max-h-[120px]'} overflow-hidden relative`}>
                                                        {isExpanded(item.id) ? item.content : (item.content.length > 300 ? `${item.content.substring(0, 300)}...` : item.content)}
                                                        {!isExpanded(item.id) && item.content.length > 300 && (
                                                            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent"></div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : item.type === 'html' ? (
                                                <div className={`${isExpanded(item.id) ? 'max-h-none' : 'max-h-[120px]'} overflow-hidden relative`}>
                                                    <div dangerouslySetInnerHTML={{ __html: item.content }} />
                                                    {!isExpanded(item.id) && (
                                                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent"></div>
                                                    )}
                                                </div>
                                            ) : item.type === 'markdown' ? (
                                                <div className={`${isExpanded(item.id) ? 'max-h-none' : 'max-h-[120px]'} overflow-hidden relative`}>
                                                    <div dangerouslySetInnerHTML={{ __html: formatMarkdown(item.content) }} />
                                                    {!isExpanded(item.id) && (
                                                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent"></div>
                                                    )}
                                                </div>
                                            ) : item.type === 'screenshot' ? (
                                                <div className="text-center">
                                                    <img 
                                                        src={item.content} 
                                                        alt="Captured Screenshot" 
                                                        className={`max-w-full ${isExpanded(item.id) ? 'max-h-none' : 'max-h-[120px]'} object-contain mx-auto`}
                                                    />
                                                </div>
                                            ) : (
                                                <div>{item.content}</div>
                                            )}
                                        </div>
                                        
                                        {/* Expand/Collapse Button - Only show if content is truncatable */}
                                        {((item.type === 'text' && item.content.length > 300) ||
                                            (item.type === 'fullpage' && item.content.length > 300) ||
                                            (item.type === 'html') ||
                                            (item.type === 'markdown') ||
                                            (item.type === 'screenshot')) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleExpand(item.id)}
                                                className="mt-1 h-6 px-2 self-center text-xs text-muted-foreground hover:text-primary"
                                                type="button"
                                            >
                                                {isExpanded(item.id) ? (
                                                    <span className="flex items-center">
                                                        <ChevronUpIcon className="mr-1" size={14} />
                                                        <span>Show Less</span>
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center">
                                                        <ChevronDownIcon className="mr-1" size={14} />
                                                        <span>Show More</span>
                                                    </span>
                                                )}
                                            </Button>
                                        )}
                                        
                                        {formatMetadata(item)}
                                    </div>
                                </Card>
                            )) : (
                                <Card className="p-4 text-center text-muted-foreground w-full">
                                    No items match your search
                                </Card>
                            )}
                        </div>
                    ) : (
                        <Card className="p-4 text-center text-muted-foreground w-full">
                            No recent items
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
} 