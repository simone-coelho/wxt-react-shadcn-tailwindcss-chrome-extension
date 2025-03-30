import {defineConfig} from 'wxt';
import react from '@vitejs/plugin-react';

// See https://wxt.dev/api/config.html
export default defineConfig({
    manifest: {
        permissions: [
            "activeTab", 
            "scripting", 
            "sidePanel", 
            "storage", 
            "tabs",
            "contextMenus",
            "tabCapture",    // Additional permission for capturing tabs
            "desktopCapture", // Additional permission for desktop screenshots
            "<all_urls>"     // Added to permissions array for more direct access
        ],
        host_permissions: ["<all_urls>"],
        action: {
            default_title: "Research Knowledge Organizer"
        },
        name: '__MSG_extName__',
        description: '__MSG_extDescription__',
        default_locale: "en",
        short_name: "RKO"
    },
    // Handle type conflicts by using a function and a type assertion
    vite: () => {
        return {
            plugins: [react()],
        } as any;
    }
});
