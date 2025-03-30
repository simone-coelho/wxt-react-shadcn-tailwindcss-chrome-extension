import React, {useEffect, useRef, useState} from 'react';
import './App.module.css';
import '../../assets/main.css'
import {SidebarType} from "@/components/types/sidebar-types";
import {browser} from "wxt/browser";
import ExtMessage, {MessageFrom, MessageType} from "@/entrypoints/types.ts";
import {Button} from "@/components/ui/button.tsx";
import {Card} from "@/components/ui/card.tsx";
import {Home} from "@/entrypoints/sidepanel/home.tsx";
import {Collections} from "@/entrypoints/sidepanel/collections.tsx";
import {ComponentsDemo} from "@/entrypoints/sidepanel/components-demo.tsx";
import {SettingsPage} from "@/entrypoints/sidepanel/settings.tsx";
import {useTheme} from "@/components/theme-provider.tsx";
import {useTranslation} from 'react-i18next';
import Header from "@/entrypoints/sidepanel/header.tsx";
import { toast } from "@/components/ui/use-toast";
import { SonnerToaster } from "@/components/ui/sonner-toast";

export default () => {
    console.log('🔍 SidePanel App component - Initial Render', { time: new Date().toISOString() });
    
    // State management
    const [showButton, setShowButton] = useState(false);
    const [showCard, setShowCard] = useState(false);
    const [sidebarType, setSidebarType] = useState<SidebarType>(SidebarType.home);
    const [headTitle, setHeadTitle] = useState("Research Knowledge Organizer");
    const [buttonStyle, setButtonStyle] = useState<any>();
    const [cardStyle, setCardStyle] = useState<any>();
    const [capturedContent, setCapturedContent] = useState<string | null>(null);
    const [contentMetadata, setContentMetadata] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Refs for stability
    const cardRef = useRef<HTMLDivElement>(null);
    const messageBoundRef = useRef<boolean>(false);
    
    // Refs for message deduplication
    const contentHashRef = useRef<string>('');
    const contentTimeRef = useRef<number>(0);
    const messageHashRef = useRef<string>('');
    const messageTimeRef = useRef<number>(0);
    
    // Hooks
    const {theme, toggleTheme} = useTheme();
    const {t, i18n} = useTranslation();

    // Initialize i18n from local storage
    async function initI18n() {
        try {
            console.log('🔍 Side Panel - Initializing i18n');
            let data = await browser.storage.local.get('i18n');
            if (data.i18n) {
                await i18n.changeLanguage(data.i18n);
                console.log('🔍 Side Panel - Changed language to:', data.i18n);
            }
        } catch (err) {
            console.error('Failed to initialize i18n:', err);
        }
    }

    // Send a message to the background script
    const sendMessageToBackground = (message: ExtMessage) => {
        try {
            console.log('🔍 Side Panel - Sending message to background:', message);
            browser.runtime.sendMessage({
                ...message,
                from: MessageFrom.sidePanel
            }).catch(err => console.error('Error sending message to background:', err));
        } catch (err) {
            console.error('Error sending message to background:', err);
        }
    };

    // Get a type label from the capture type
    const getTypeLabel = (type?: string): string => {
        switch (type) {
            case 'html':
                return 'HTML';
            case 'markdown':
                return 'Markdown';
            case 'screenshot':
                return 'Screenshot';
            case 'fullpage':
                return 'Full Page';
            case 'text':
            default:
                return 'Text';
        }
    };

    // Handle receiving a captured selection
    const handleCapturedContent = (content: string, metadata?: any) => {
        console.log('Received captured content:', content ? `${content.substring(0, 50)}... (${content.length} chars)` : 'null', metadata);
        
        // Skip empty content
        if (!content || content.trim() === '') {
            console.log('Empty content received, ignoring');
            return;
        }
        
        // Create a simple content hash for deduplication
        const contentHash = `${metadata?.type || 'unknown'}-${content.substring(0, 50).replace(/\s+/g, '')}`;
        
        // Simple deduplication - ignore identical content received within 1 second
        const now = Date.now();
        if (contentHash === contentHashRef.current && now - contentTimeRef.current < 1000) {
            console.log('Duplicate content detected, ignoring', {
                timeSinceLastMsg: now - contentTimeRef.current + 'ms'
            });
            return;
        }
        
        // Update deduplication tracking
        contentHashRef.current = contentHash;
        contentTimeRef.current = now;
        
        setIsLoading(true);
        
        try {
            // Store the new content in state
            console.log('Setting captured content and metadata in state');
            setCapturedContent(content);
            setContentMetadata(metadata);
            
            // We no longer show a toast here - this avoids duplicate notifications
            // (the content script already shows a toast notification)
            
            // Automatically switch to Collections view to show the captured content
            console.log('Switching to Collections view');
            setSidebarType(SidebarType.collections);
            setHeadTitle('');
            
            setError(null);
        } catch (err) {
            console.error('Error handling captured content:', err);
            setError('Failed to process captured content');
            
            toast({
                title: 'Error',
                description: 'Failed to process captured content',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Debug info for initial render
    console.log('Initial state values:', {
        sidebarType,
        headTitle,
        theme,
        isLoading,
        hasContent: !!capturedContent
    });

    // Set up message listener once on component mount
    useEffect(() => {
        console.log('🔍 Side Panel - Main useEffect running - Initialization:', { 
            time: new Date().toISOString(),
            messageBoundStatus: messageBoundRef.current ? 'already bound' : 'not yet bound'
        });
        
        // Notify background script immediately that side panel is loaded
        sendMessageToBackground({
            messageType: MessageType.sidePanelLoaded
        });
        
        // Set up message listener if not already set
        if (!messageBoundRef.current) {
            console.log('🔍 Side Panel - Setting up message listener');
            
            const messageListener = (message: ExtMessage, sender: any) => {
                console.log('🔍 Side Panel - Received message:', message);
                
                if (message.messageType === MessageType.changeLocale) {
                    i18n.changeLanguage(message.content);
                } else if (message.messageType === MessageType.changeTheme) {
                    toggleTheme(message.content);
                } else if (message.messageType === MessageType.capturedSelection) {
                    // Create a hash of the message for deduplication
                    const contentSample = message.content?.substring(0, 50) || '';
                    const messageHash = `${message.metadata?.type || ''}-${contentSample}`;
                    const now = Date.now();
                    
                    // Increase deduplication window to 5 seconds to match the capture.ts setting
                    if (messageHash === messageHashRef.current && 
                        now - messageTimeRef.current < 5000) {
                        console.log('🔍 Side Panel - Duplicate message detected, ignoring', {
                            timeWindow: `${now - messageTimeRef.current}ms ago`
                        });
                        return true;
                    }
                    
                    // Update tracking state
                    messageHashRef.current = messageHash;
                    messageTimeRef.current = now;
                    
                    // Process the content
                    handleCapturedContent(message.content || '', message.metadata);
                    
                    // Show a toast notification in the side panel
                    const captureType = message.metadata?.type || 'content';
                    const displayType = getTypeLabel(captureType);
                    const contentLength = message.content?.length || 0;
                    const contentPreview = message.content 
                        ? `${message.content.substring(0, 30)}${message.content.length > 30 ? '...' : ''}`
                        : '';
                    
                    toast({
                        title: `Captured ${displayType}`,
                        description: contentLength > 0 
                            ? `${Math.round(contentLength / 1024 * 10) / 10}KB: "${contentPreview}"` 
                            : "Empty content received",
                        variant: "default"
                    });
                }
                
                // Always return true for async message handling
                return true;
            };
            
            // Register the message listener
            browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
                messageListener(message, sender);
                return true; // Explicitly return true for async behavior
            });
            
            messageBoundRef.current = true;
            console.log('🔍 Side Panel - Message listener registered successfully');
        }

        // Initialize
        initI18n();
        
        // Log state for debugging
        console.log('🔍 Side Panel - Initial state:', {
            sidebarType,
            theme,
            messageBound: messageBoundRef.current
        });
        
        // This is a no-op cleanup since we're not removing the listener
        // (it needs to persist for the lifetime of the sidepanel)
        return () => {
            console.log('🔍 Side Panel - useEffect cleanup - this should rarely run');
        };
    }, []);

    // If there's an error, display it
    if (error) {
        console.log('Rendering error state:', error);
        return (
            <div className={theme}>
                <div className="fixed top-0 right-0 h-screen bg-background z-[1000000000000] rounded-l-xl shadow-2xl w-full">
                    <h2 className="text-xl font-bold text-red-500">Error</h2>
                    <p>{error}</p>
                    <Button 
                        className="mt-4" 
                        onClick={() => setError(null)}
                    >
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    // If loading, show a loading state
    if (isLoading) {
        console.log('Rendering loading state');
        return (
            <div className={theme}>
                <div className="fixed top-0 right-0 h-screen bg-background z-[1000000000000] rounded-l-xl shadow-2xl w-full flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                        <p>Loading...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Main panel render
    console.log('Rendering main panel with sidebarType:', sidebarType);
    return (
        <div className={theme}>
            <div className="fixed top-0 right-0 h-screen bg-background z-[1000000000000] rounded-l-xl shadow-2xl w-full">
                <Header headTitle={headTitle}/>
                
                <div className="grid grid-cols-[1fr_56px] h-[calc(100vh-50px)] w-full">
                    {/* Main content area with proper margins */}
                    <main className="grid gap-4 p-4 md:gap-8 md:p-6 overflow-auto" style={{ 
                        maxHeight: 'calc(100vh - 50px)',
                        overflowX: 'hidden'
                    }}>
                        {sidebarType === SidebarType.home && <Home/>}
                        {sidebarType === SidebarType.collections && 
                            <Collections 
                                capturedContent={capturedContent} 
                                metadata={contentMetadata} 
                            />
                        }
                        {sidebarType === SidebarType.components && <ComponentsDemo/>}
                        {sidebarType === SidebarType.settings && <SettingsPage/>}
                    </main>
                    
                    {/* Sidebar navigation in its own grid column */}
                    <aside className="flex flex-col border-l border-border bg-background">
                        <nav className="flex h-full flex-col gap-4 p-2">
                            <div className="grid gap-1">
                                <a
                                    className={`hover:cursor-pointer flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors ${sidebarType == SidebarType.home ? "rounded-full bg-primary text-lg font-semibold text-primary-foreground" : ""}`}
                                    href="#" 
                                    onClick={() => {
                                        setSidebarType(SidebarType.home);
                                        setHeadTitle('home');
                                    }}
                                >
                                    <span className="sr-only">home</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                                        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                                    </svg>
                                </a>
                                
                                <a
                                    className={`hover:cursor-pointer flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors ${sidebarType == SidebarType.collections ? "rounded-full bg-primary text-lg font-semibold text-primary-foreground" : ""}`}
                                    href="#" 
                                    onClick={() => {
                                        setSidebarType(SidebarType.collections);
                                        setHeadTitle('collections');
                                    }}
                                >
                                    <span className="sr-only">collections</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                        <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
                                    </svg>
                                </a>
                                
                                <a
                                    className={`hover:cursor-pointer flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors ${sidebarType == SidebarType.components ? "rounded-full bg-primary text-lg font-semibold text-primary-foreground" : ""}`}
                                    href="#" 
                                    onClick={() => {
                                        setSidebarType(SidebarType.components);
                                        setHeadTitle('components');
                                    }}
                                >
                                    <span className="sr-only">components</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                                        <path fillRule="evenodd" d="M3 6a3 3 0 013-3h2.25a3 3 0 013 3v2.25a3 3 0 01-3 3H6a3 3 0 01-3-3V6zm9.75 0a3 3 0 013-3H18a3 3 0 013 3v2.25a3 3 0 01-3 3h-2.25a3 3 0 01-3-3V6zM3 15.75a3 3 0 013-3h2.25a3 3 0 013 3V18a3 3 0 01-3 3H6a3 3 0 01-3-3v-2.25zm9.75 0a3 3 0 013-3H18a3 3 0 013 3V18a3 3 0 01-3 3h-2.25a3 3 0 01-3-3v-2.25z" clipRule="evenodd" />
                                    </svg>
                                </a>
                                
                                <a
                                    className={`hover:cursor-pointer flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors ${sidebarType == SidebarType.settings ? "rounded-full bg-primary text-lg font-semibold text-primary-foreground" : ""} `}
                                    href="#" 
                                    onClick={() => {
                                        setSidebarType(SidebarType.settings);
                                        setHeadTitle('settings');
                                    }}
                                >
                                    <span className="sr-only">Settings</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                                        <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                                    </svg>
                                </a>
                            </div>
                        </nav>
                    </aside>
                </div>
                <SonnerToaster />
            </div>
            {showButton &&
                <Button className="absolute z-[100000]" style={buttonStyle}>send Message</Button>
            }
            {
                <Card ref={cardRef}
                      className={`absolute z-[100000] w-[300px] h-[200px] ${showCard ? 'block' : 'hidden'}`}
                      style={cardStyle}></Card>
            }
        </div>
    );
};
