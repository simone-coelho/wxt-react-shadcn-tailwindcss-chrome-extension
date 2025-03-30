export enum MessageType {
    clickExtIcon = "clickExtIcon",
    changeTheme = "changeTheme",
    changeLocale = "changeLocale",
    contentScriptLoaded = "contentScriptLoaded",
    sidePanelLoaded = "sidePanelLoaded",
    capturedSelection = "capturedSelection",
    requestTextSelection = "requestTextSelection",
    requestCapture = "requestCapture",
    captureScreenshot = "captureScreenshot",
    requestScreenshotPermission = "requestScreenshotPermission",
    testToasts = "testToasts"
}

export enum MessageFrom {
    contentScript = "contentScript",
    background = "background",
    popUp = "popUp",
    sidePanel = "sidePanel",
}

class ExtMessage {
    content?: string;
    from?: MessageFrom;
    metadata?: Record<string, any>;

    constructor(messageType: MessageType) {
        this.messageType = messageType;
    }

    messageType: MessageType;
}

export default ExtMessage;
