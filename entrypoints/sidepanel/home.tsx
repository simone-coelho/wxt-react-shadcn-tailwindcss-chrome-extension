// HomePage.js
import React from "react";
import {Card} from "@/components/ui/card.tsx";
import {useTranslation} from "react-i18next";
import {Button} from "@/components/ui/button.tsx";
import { browser } from "wxt/browser";
import { MessageFrom, MessageType } from "@/entrypoints/types.ts";
import { CaptureType } from "@/lib/capture.ts";

export function Home() {
    const {t} = useTranslation();
    
    const features = [
        "Text selection capture",
        "Full page capture",
        "Screenshot capture",
        "Metadata extraction",
        "AI-powered summarization",
        "Collection management"
    ];
    
    // Function to request a capture operation from the active tab
    const requestCapture = (captureType: string) => {
        // Get the active tab first
        browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (!tabs || tabs.length === 0 || !tabs[0].id) {
                console.error('No active tab found');
                return;
            }
            
            const tabId = tabs[0].id;
            
            // Send a message to request the capture
            browser.tabs.sendMessage(tabId, {
                messageType: MessageType.requestCapture,
                from: MessageFrom.sidePanel,
                content: captureType
            }).catch(err => {
                console.error(`Error requesting ${captureType} capture:`, err);
            });
        }).catch(err => {
            console.error('Error querying tabs:', err);
        });
    };
    
    // Handle capture button clicks
    const handleCaptureText = () => requestCapture(CaptureType.TEXT);
    const handleCaptureFullPage = () => requestCapture(CaptureType.FULLPAGE);
    const handleCaptureScreenshot = () => requestCapture(CaptureType.SCREENSHOT);
    
    return (
        <div className="grid gap-4 md:gap-6">
            <Card className="text-left">
                <div className="flex flex-col space-y-1.5 p-6 pb-3">
                    <h3 className="font-semibold leading-none tracking-tight text-lg">Welcome to Research Knowledge Organizer</h3>
                    <p className="text-sm text-balance leading-relaxed">
                        Capture, transform, and organize research content from web pages. Use the context menu or toolbar button to capture content.
                    </p>
                </div>
            </Card>
            
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <Card className="text-left">
                    <div className="flex flex-col space-y-1.5 p-6 pb-3">
                        <h3 className="font-semibold leading-none tracking-tight text-base">Capture Content</h3>
                        <div className="flex flex-col gap-2 pt-2 overflow-hidden">
                            <Button 
                                variant="outline" 
                                className="justify-start text-sm whitespace-normal text-left h-auto py-2"
                                onClick={handleCaptureText}
                            >
                                Capture Selected Text
                            </Button>
                            <Button 
                                variant="outline" 
                                className="justify-start text-sm whitespace-normal text-left h-auto py-2"
                                onClick={handleCaptureFullPage}
                            >
                                Capture Full Page
                            </Button>
                            <Button 
                                variant="outline" 
                                className="justify-start text-sm whitespace-normal text-left h-auto py-2"
                                onClick={handleCaptureScreenshot}
                            >
                                Capture Screenshot
                            </Button>
                        </div>
                    </div>
                </Card>
                
                <Card className="text-left">
                    <div className="flex flex-col space-y-1.5 p-6 pb-3">
                        <h3 className="font-semibold leading-none tracking-tight text-base">Features</h3>
                        <div className="flex flex-col gap-2 pt-2">
                            <ul className="ml-4 list-disc text-sm">
                                {features.map((feature, index) => (
                                    <li key={index} className="py-1">{feature}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Card>
                
                <Card className="text-left">
                    <div className="flex flex-col space-y-1.5 p-6 pb-3">
                        <h3 className="font-semibold leading-none tracking-tight text-base">Getting Started</h3>
                        <div className="flex flex-col gap-2 pt-2">
                            <p className="text-sm">
                                1. Select text on a webpage<br/>
                                2. Right-click and choose "Capture Selected Text"<br/>
                                3. Edit metadata and tags<br/>
                                4. Save to your collection
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}
