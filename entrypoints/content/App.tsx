/**
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * IMPORTANT: CONTENT PANEL UI IS COMPLETELY DISABLED
 * !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
 * 
 * This content script is used ONLY for:
 * 1. Capture functionality (text, HTML, screenshots)
 * 2. Showing toast notifications
 * 3. Handling keyboard shortcuts
 * 
 * The actual UI panel is ONLY shown through the browser side panel.
 * This prevents duplicate panels from appearing.
 * 
 * DO NOT re-enable UI rendering here or you will get duplicate panels.
 */

import React, {useEffect, useRef, useState} from 'react';
import './App.module.css';
import '../../assets/main.css'
import {Home} from "@/entrypoints/content/home.tsx";
import {SettingsPage} from "@/entrypoints/content/settings.tsx";
import {SidebarType} from "@/components/types/sidebar-types";
import {browser} from "wxt/browser";
import ExtMessage, {MessageType} from "@/entrypoints/types.ts";
import Header from "@/entrypoints/content/header.tsx";
import {useTranslation} from "react-i18next";
import {useTheme} from "@/components/theme-provider.tsx";

// Creating a simple sidebar navigation component to replace the imported one
const SimpleSidebar = ({ 
    closeContent, 
    sideNav 
}: { 
    closeContent: () => void; 
    sideNav: (type: SidebarType) => void 
}) => {
    return (
        <aside className="absolute inset-y-0 right-0 z-10 flex w-14 flex-col border-r bg-background border-l-[1px]">
            <nav className="flex h-full flex-col gap-4 p-2">
                <div className="grid gap-1">
                    <a
                        className="hover:cursor-pointer flex h-9 w-9 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground"
                        href="#" 
                        onClick={() => sideNav(SidebarType.home)}
                    >
                        <span className="sr-only">home</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                            <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
                            <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
                        </svg>
                    </a>
                    <a
                        className="hover:cursor-pointer flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors"
                        href="#" 
                        onClick={() => sideNav(SidebarType.settings)}
                    >
                        <span className="sr-only">Settings</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                            <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clipRule="evenodd" />
                        </svg>
                    </a>
                </div>
            </nav>
        </aside>
    );
};

export default () => {
    const [showContent, setShowContent] = useState(false); // Force panel to be hidden
    const [sidebarType, setSidebarType] = useState<SidebarType>(SidebarType.home);
    const [headTitle, setHeadTitle] = useState("home");
    const {i18n} = useTranslation();
    const {theme, toggleTheme} = useTheme();

    async function initI18n() {
        let data = await browser.storage.local.get('i18n');
        if (data.i18n) {
            await i18n.changeLanguage(data.i18n)
        }
    }

    function domLoaded() {
        console.log("dom loaded");
    }

    useEffect(() => {
        console.log("Content script UI panel disabled - only using for captures");

        if (document.readyState === "complete") {
            console.log("dom complete");
            domLoaded();
        } else {
            window.addEventListener('load', () => {
                console.log("content load:", window.location.href);
                domLoaded();
            });
        }
        
        browser.runtime.onMessage.addListener((message: ExtMessage, sender, sendResponse) => {
            console.log('content script received message:', message);
            
            // Still handle translations and theme changes
            if (message.messageType === MessageType.changeLocale) {
                i18n.changeLanguage(message.content);
            } else if (message.messageType === MessageType.changeTheme) {
                toggleTheme(message.content);
            }
            // We no longer respond to clickExtIcon since we're not showing UI
        });

        initI18n();
    }, []);

    // Return empty div - no UI from content script
    return <div className="hidden"></div>;
};
