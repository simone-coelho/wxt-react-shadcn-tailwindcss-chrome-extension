import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { browser } from "wxt/browser";
import { MessageFrom, MessageType } from "@/entrypoints/types";

export function ToastTestSettings() {
    const { t } = useTranslation();

    const handleTestToasts = async () => {
        console.log('Testing toast notifications');
        try {
            await browser.runtime.sendMessage({
                messageType: MessageType.testToasts,
                from: MessageFrom.sidePanel,
                content: "Testing toast notifications"
            });
            console.log('Test toast message sent to background');
        } catch (error) {
            console.error('Failed to send toast test message:', error);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Toast Notifications</CardTitle>
                <CardDescription>Test toast notification system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                        Click the button below to test the toast notification system.
                        This will display various types of toast notifications on the current page.
                    </p>
                </div>
            </CardContent>
            <CardFooter>
                <Button 
                    onClick={handleTestToasts}
                    className="w-full"
                >
                    Test Toast Notifications
                </Button>
            </CardFooter>
        </Card>
    );
} 