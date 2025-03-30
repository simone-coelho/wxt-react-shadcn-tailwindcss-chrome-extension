import {browser} from "wxt/browser";
import ExtMessage, {MessageFrom, MessageType} from "@/entrypoints/types.ts";

export default defineBackground(() => {
    console.log('RKO Background Script Initializing...', {id: browser.runtime.id});

    // Configure side panel behavior to allow automatic opening
    // @ts-ignore
    browser.sidePanel.setPanelBehavior({openPanelOnActionClick: true})
        .then(() => console.log('Side panel behavior set to open automatically'))
        .catch((error: any) => console.error('Error setting side panel behavior:', error));

    // Track loaded tabs with content scripts
    const loadedTabs = new Set<number>();
    
    // Keep track of panel state
    let isSidePanelOpen = false;
    
    // Track processed message IDs to prevent double-processing
    const processedMessages = new Map<string, number>();
    const MESSAGE_EXPIRY_TIME = 10000; // 10 seconds
    
    // Log actions for debugging
    function logAction(action: string, details?: any) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] RKO: ${action}`, details || '');
    }

    // Message deduplication system
    const messageDeduplication = {
        // Store message hashes with timestamps for deduplication
        recentMessages: new Map<string, number>(),
        // Time window for deduplication (ms)
        deduplicationWindow: 5000,
        
        // Create a hash for a message based on content and type
        getMessageHash(message: ExtMessage): string {
            const contentSample = message.content ? 
                message.content.substring(0, 100).replace(/\s+/g, '') : '';
            return `${message.metadata?.type || ''}-${contentSample}`;
        },
        
        // Check if this is a duplicate message
        isDuplicate(message: ExtMessage): boolean {
            const hash = this.getMessageHash(message);
            const now = Date.now();
            
            // Clean up old entries first
            this.cleanup(now);
            
            // Check if we've seen this message recently
            if (this.recentMessages.has(hash)) {
                const timestamp = this.recentMessages.get(hash) || 0;
                return (now - timestamp) < this.deduplicationWindow;
            }
            
            // Not a duplicate, store it
            this.recentMessages.set(hash, now);
            return false;
        },
        
        // Clean up old message records
        cleanup(now: number) {
            for (const [hash, timestamp] of this.recentMessages.entries()) {
                if (now - timestamp > this.deduplicationWindow) {
                    this.recentMessages.delete(hash);
                }
            }
        }
    };

    // Create context menus with proper structure
    function createContextMenus() {
        try {
            // Remove existing menus to avoid duplicates
            browser.contextMenus.removeAll().then(() => {
                logAction("Creating context menus");
                
                // Create parent menu
                browser.contextMenus.create({
                    id: "rko-main-menu",
                    title: "Research Knowledge Organizer",
                    contexts: ["all"],
                }, () => {
                    if (browser.runtime.lastError) {
                        console.error('Error creating main context menu:', browser.runtime.lastError);
                        return;
                    }
                    
                    // Create selection-based capture options as children
                    browser.contextMenus.create({
                        id: "rko-capture-text",
                        title: "Capture as Text (Ctrl+Shift+S)",
                        contexts: ["selection"],
                        parentId: "rko-main-menu"
                    });
                    
                    browser.contextMenus.create({
                        id: "rko-capture-html",
                        title: "Capture as HTML (Ctrl+Shift+H)",
                        contexts: ["selection"],
                        parentId: "rko-main-menu"
                    });
                    
                    browser.contextMenus.create({
                        id: "rko-capture-markdown",
                        title: "Capture as Markdown (Ctrl+Shift+M)",
                        contexts: ["selection"],
                        parentId: "rko-main-menu"
                    });
                    
                    // Full page capture
                    browser.contextMenus.create({
                        id: "rko-capture-fullpage",
                        title: "Capture Full Page (Ctrl+Shift+F)",
                        contexts: ["page", "frame", "selection", "link", "image"],
                        parentId: "rko-main-menu"
                    });
                    
                    // Screenshot capture
                    browser.contextMenus.create({
                        id: "rko-capture-screenshot",
                        title: "Capture Screenshot",
                        contexts: ["page", "frame", "selection", "link", "image"],
                        parentId: "rko-main-menu"
                    });
                    
                    logAction("Context menus created successfully");
                });
            }).catch(err => {
                console.error('Error removing existing context menus:', err);
            });
        } catch (error) {
            console.error('Error during context menu creation:', error);
        }
    }

    // Create initial context menus
    createContextMenus();
    
    // When the extension is installed or updated
    browser.runtime.onInstalled.addListener((details) => {
        logAction(`Extension ${details.reason}`, details);
        createContextMenus();
    });

    // Handle icon click - this should be simple
    browser.action.onClicked.addListener((tab) => {
        logAction("Extension icon clicked", { tabId: tab.id });
        
        // The panel will open automatically due to openPanelOnActionClick: true
        // We just need to set the flag and notify the content script
        isSidePanelOpen = true;
        
        // Notify the content script
        if (tab.id) {
            browser.tabs.sendMessage(tab.id, {
                messageType: MessageType.clickExtIcon,
                from: MessageFrom.background
            }).catch(err => console.error('Error sending clickExtIcon message:', err));
        }
    });

    // Handle context menu click
    browser.contextMenus.onClicked.addListener((info, tab) => {
        if (!tab?.id) {
            logAction("Context menu clicked but no tab id available", { info });
            return;
        }
        
        // Determine which capture type was requested
        let captureType: string | null = null;
        
        try {
            if (info.menuItemId === "rko-capture-text") {
                if (!info.selectionText) {
                    logAction("Text capture clicked but no selection available", { info });
                    return;
                }
                captureType = "text";
            } else if (info.menuItemId === "rko-capture-html") {
                if (!info.selectionText) {
                    logAction("HTML capture clicked but no selection available", { info });
                    return;
                }
                captureType = "html";
            } else if (info.menuItemId === "rko-capture-markdown") {
                if (!info.selectionText) {
                    logAction("Markdown capture clicked but no selection available", { info });
                    return;
                }
                captureType = "markdown";
            } else if (info.menuItemId === "rko-capture-fullpage") {
                captureType = "fullpage";
            } else if (info.menuItemId === "rko-capture-screenshot") {
                captureType = "screenshot";
            } else {
                // If parent menu items were clicked or unrecognized item, just return
                logAction("Parent menu or unrecognized menu item clicked", { menuItemId: info.menuItemId });
                return;
            }
            
            // At this point captureType is guaranteed to be a string
            const finalCaptureType = captureType; // Use a const to ensure type safety
            const tabId = tab.id; // Get tabId to avoid undefined checks later
            
            logAction(`Capture ${finalCaptureType} menu clicked`, { tabId, url: tab.url });

            // Send a message to the content script to perform the capture
            browser.tabs.sendMessage(tabId, {
                messageType: MessageType.requestCapture,
                from: MessageFrom.background,
                content: finalCaptureType
            }).then(response => {
                logAction(`Sent capture request to content script for ${finalCaptureType}`, { response });
            }).catch(err => {
                console.error(`Error sending ${finalCaptureType} capture request to content script:`, err);
                
                // If content script is not loaded yet or failed, try injecting it first
                // This makes the context menu more reliable
                browser.scripting.executeScript({
                    target: { tabId },
                    files: ["content/index.js"]
                }).then(() => {
                    // Try sending the message again after script injection
                    setTimeout(() => {
                        browser.tabs.sendMessage(tabId, {
                            messageType: MessageType.requestCapture,
                            from: MessageFrom.background,
                            content: finalCaptureType
                        }).catch(injectErr => {
                            console.error(`Failed to send capture request after script injection:`, injectErr);
                        });
                    }, 500); // Wait a bit for the script to initialize
                }).catch(injectErr => {
                    console.error('Failed to inject content script:', injectErr);
                });
            });
        } catch (error) {
            console.error('Unexpected error handling context menu click:', error);
        }
    });
    
    // Make sure panel is open and send the message
    function ensurePanelOpenAndSendMessage(message: ExtMessage) {
        // We're no longer trying to open the panel - just store the content
        // and send it to the panel if it happens to be open
        
        // Store the message - this ensures it's available when/if the panel is opened
        storeCapture(message);
        
        // If the panel is open, send it there
        if (isSidePanelOpen) {
            sendToSidePanel(message);
        } else {
            logAction("Side panel not open - content stored for later viewing");
        }
    }
    
    // Function to request capture from content script
    function requestCapture(tabId: number, captureType: string) {
        logAction(`Requesting ${captureType} capture`, { tabId });
        
        try {
            browser.tabs.sendMessage(tabId, {
                messageType: MessageType.requestCapture,
                from: MessageFrom.background,
                content: captureType
            }).catch(err => {
                console.error(`Error requesting ${captureType} capture from content script:`, err);
                
                // If failed, try to inject the content script
                logAction("Attempting to inject content script before capture", { tabId });
                browser.scripting.executeScript({
                    target: { tabId },
                    files: ["content-scripts/content.js"]
                }).then(() => {
                    // After injection, wait a bit and try again
                    setTimeout(() => {
                        browser.tabs.sendMessage(tabId, {
                            messageType: MessageType.requestCapture,
                            from: MessageFrom.background,
                            content: captureType
                        }).catch(err => {
                            console.error(`Error requesting ${captureType} capture after injection:`, err);
                        });
                    }, 500);
                }).catch(err => {
                    console.error("Failed to inject content script:", err);
                });
            });
        } catch (error) {
            console.error('Error requesting capture:', error);
        }
    }
    
    // Array to store recent captures
    const recentCaptures: ExtMessage[] = [];
    const MAX_RECENT_CAPTURES = 100; // Maximum number of captures to store

    // Store a capture in the recentCaptures array
    function storeCapture(message: ExtMessage) {
        logAction("Storing captured content", { 
            type: message.metadata?.type, 
            contentLength: message.content?.length 
        });
        
        // Load existing captures first to ensure we don't lose the first item
        browser.storage.local.get('recentCaptures').then(data => {
            const existingCaptures = Array.isArray(data.recentCaptures) ? data.recentCaptures : [];
            
            // Add the new capture at the beginning
            const updatedCaptures = [message, ...existingCaptures];
            
            // Trim the array to the maximum size
            const trimmedCaptures = updatedCaptures.slice(0, MAX_RECENT_CAPTURES);
            
            // Save back to storage to ensure persistence
            browser.storage.local.set({ recentCaptures: trimmedCaptures })
            .then(() => {
                logAction("Saved capture to storage", {
                    newTotal: trimmedCaptures.length,
                    wasFirst: existingCaptures.length === 0
                });
            })
            .catch(err => {
                console.error("Error saving captures to storage:", err);
            });
        }).catch(err => {
            console.error("Error loading existing captures:", err);
            // Fallback: Just store in memory
            recentCaptures.unshift(message);
            if (recentCaptures.length > MAX_RECENT_CAPTURES) {
                recentCaptures.pop();
            }
        });
    }

    // Send all stored captures to the side panel
    function sendAllCapturesToSidePanel() {
        if (recentCaptures.length > 0) {
            logAction(`Sending ${recentCaptures.length} recent captures to side panel`);
            
            // Send each capture with a slight delay to prevent overwhelming the panel
            recentCaptures.forEach((capture, index) => {
                setTimeout(() => {
                    sendToSidePanel(capture);
                }, index * 100); // 100ms between each message
            });
        } else {
            logAction("No recent captures to send to side panel");
        }
    }

    // Send a message to the side panel
    function sendToSidePanel(message: ExtMessage) {
        logAction("Sending message to side panel", {
            type: message.metadata?.type
        });
        
        browser.runtime.sendMessage({
            messageType: message.messageType,
            from: MessageFrom.background,
            content: message.content,
            metadata: message.metadata
        }).then(() => {
            logAction("Message sent to side panel successfully");
        }).catch(err => {
            console.error("Error sending message to side panel:", err);
            
            // If we had a connection error, the panel might not be open
            if (err.message.includes('Could not establish connection')) {
                isSidePanelOpen = false;
                logAction("Connection error sending to side panel - trying to open panel");
                
                // Try to open the panel
                try {
                    // @ts-ignore
                    browser.sidePanel.open()
                        .then(() => {
                            isSidePanelOpen = true;
                            logAction("Panel re-opened after connection error");
                            
                            // Try sending again after a brief pause
                            setTimeout(() => {
                                sendToSidePanel(message);
                            }, 500);
                        })
                        .catch((openErr: Error) => {
                            console.error("Failed to re-open panel after connection error:", openErr);
                        });
                } catch (openErr: unknown) {
                    console.error("Exception trying to re-open panel:", openErr);
                }
            }
        });
    }

    // Handle messages from content script/sidebar/popup
    browser.runtime.onMessage.addListener((message: ExtMessage, sender, sendResponse: (response?: any) => void) => {
        // Generate and log a message ID for debugging
        const messageId = generateMessageId(message);
        logAction(`Message received [${messageId}]`, { 
            type: message.messageType, 
            from: message.from,
            sender: sender.url
        });
        
        // Check for duplicate processing
        if (isMessageProcessed(message)) {
            logAction(`Skipping duplicate message [${messageId}]`, {
                type: message.messageType,
                from: message.from
            });
            return true;
        }
        
        // Mark this message as processed
        processedMessages.set(messageId, Date.now());
        
        // Cleanup old processed messages periodically
        if (Math.random() < 0.1) { // 10% chance on each message to cleanup
            cleanupProcessedMessages();
        }
        
        // Handle specific message types
        if (message.messageType === MessageType.contentScriptLoaded) {
            // When content script reports it's loaded, record the tab ID
            const tabId = sender.tab?.id;
            if (tabId) {
                loadedTabs.add(tabId);
                logAction("Content script loaded", { tabId });
            }
        } 
        else if (message.messageType === MessageType.sidePanelLoaded) {
            logAction("Side panel loaded", { url: sender.url });
            isSidePanelOpen = true;
            
            // Send all stored captures to the newly loaded side panel
            sendAllCapturesToSidePanel();
        }
        else if (message.messageType === MessageType.capturedSelection) {
            // Process a captured selection
            logAction("Captured selection received", { 
                type: message.metadata?.type, 
                contentLength: message.content?.length 
            });
            
            // Skip duplicate message content using enhanced deduplication
            if (message.metadata?.type && messageDeduplication.isDuplicate(message)) {
                logAction("Skipping duplicate content", { type: message.metadata?.type });
                return true;
            }
            
            // Store the captured content
            storeCapture(message);
            
            // Make sure the panel is open and send the message
            ensurePanelOpenAndSendMessage(message);
        }
        else if (message.messageType === MessageType.captureScreenshot) {
            // Handle screenshot capture request
            const tabId = sender.tab?.id;
            logAction("Screenshot capture request received", { tabId });
            
            if (tabId) {
                try {
                    browser.tabs.captureVisibleTab()
                        .then(dataUrl => {
                            logAction("Screenshot captured successfully", { size: dataUrl.length });
                            sendResponse({ success: true, dataUrl });
                        })
                        .catch(error => {
                            console.error("Screenshot capture failed:", error);
                            sendResponse({ success: false, error: error.message });
                        });
                    
                    return true; // Must return true to indicate asynchronous response
                } catch (error) {
                    console.error("Error in screenshot capture:", error);
                    sendResponse({ success: false, error: "Screenshot capture failed" });
                }
            } else {
                logAction("Screenshot capture failed - no tabId", { sender });
                sendResponse({ success: false, error: "No tab ID available" });
            }
        }
        else if (message.messageType === MessageType.testToasts) {
            // Send a test toast message to all content scripts
            logAction("Toast test requested", { from: message.from });
            
            // Find the active tab
            browser.tabs.query({active: true, currentWindow: true})
                .then(tabs => {
                    if (tabs.length > 0 && tabs[0].id) {
                        const activeTabId = tabs[0].id;
                        
                        // Send test toast message to the active tab
                        browser.tabs.sendMessage(activeTabId, {
                            messageType: MessageType.testToasts,
                            from: MessageFrom.background,
                            content: "Running toast tests"
                        }).then(() => {
                            logAction("Toast test message sent to tab", { tabId: activeTabId });
                        }).catch(err => {
                            console.error("Failed to send toast test message:", err);
                        });
                    } else {
                        console.error("No active tab found for toast test");
                    }
                })
                .catch(err => {
                    console.error("Error querying for active tab:", err);
                });
        }
        // Handle screenshot permission request
        else if (message.messageType === MessageType.requestScreenshotPermission) {
            logAction("Screenshot permission requested");
            
            // Request desktop capture permission
            browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
                const activeTab = tabs[0];
                if (!activeTab?.id) {
                    throw new Error('No active tab found');
                }
                
                // Request desktop capture permission
                return browser.tabs.sendMessage(activeTab.id, {
                    messageType: MessageType.captureScreenshot,
                    from: MessageFrom.background
                });
            }).then(() => {
                sendResponse({ success: true });
            }).catch(error => {
                console.error('Error requesting screenshot permission:', error);
                sendResponse({ success: false, error: error.message });
            });
            
            return true; // Keep the message channel open for async response
        }
    });

    // Create a unique ID for messages to prevent duplicate processing
    function generateMessageId(message: ExtMessage): string {
        // Create an ID from the timestamp, content hash, and message type
        const contentSample = message.content?.substring(0, 100) || '';
        const contentHash = contentSample.replace(/\s+/g, '').substring(0, 40);
        return `${message.messageType}-${message.metadata?.type || ''}-${contentHash}`;
    }
    
    // Function to clean up expired message IDs
    function cleanupProcessedMessages() {
        const now = Date.now();
        const expiredBefore = now - MESSAGE_EXPIRY_TIME;
        
        // Remove entries older than MESSAGE_EXPIRY_TIME
        processedMessages.forEach((timestamp, id) => {
            if (timestamp < expiredBefore) {
                processedMessages.delete(id);
            }
        });
    }
    
    // Check if a message has already been processed
    function isMessageProcessed(message: ExtMessage): boolean {
        const messageId = generateMessageId(message);
        
        // Check if this exact message has been processed recently
        if (processedMessages.has(messageId)) {
            logAction('Skipping duplicate message', {
                messageType: message.messageType,
                from: message.from
            });
            return true;
        }
        
        // Mark this message as processed
        processedMessages.set(messageId, Date.now());
        
        // Clean up old messages occasionally
        if (Math.random() < 0.1) { // 10% chance to avoid doing it too often
            cleanupProcessedMessages();
        }
        
        return false;
    }
});
