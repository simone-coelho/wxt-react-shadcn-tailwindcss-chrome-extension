"use client";

import React, { useRef } from "react";
import { toast as sonnerToast } from "sonner";

export interface CustomToastProps {
  title: string;
  description?: string;
  source?: string;
  timestamp?: Date;
  button?: {
    label: string;
    onClick: () => void;
  };
  variant?:
    | "default"
    | "success"
    | "error"
    | "warning"
    | "info"
    | "html"
    | "markdown"
    | "screenshot"
    | "fullpage"
    | "text";
  styling?: Record<string, string>;
}

function Toast(props: CustomToastProps & { id: string | number }) {
  const {
    title,
    description,
    source,
    timestamp,
    button,
    id,
    variant = "default",
    styling,
  } = props;
  const contentRef = useRef<HTMLDivElement>(null);

  const TOAST_PADDING = "12px";
  const TOAST_WIDTH = "400px";
  const TOAST_MIN_HEIGHT = "100px";
  const TOAST_MAX_HEIGHT = "220px";
  const SCREENSHOT_MAX_HEIGHT = "250px";
  const CONTENT_MAX_HEIGHT = "140px";
  const DEFAULT_FONT_SIZE = "10px";

  const getVariantStyles = (
    type: string
  ): { backgroundColor: string; hoverColor: string; label: string } => {
    switch (type) {
      case "html":
        return {
          backgroundColor: "#3b82f6",
          hoverColor: "#2563eb",
          label: "HTML",
        };
      case "markdown":
        return {
          backgroundColor: "#8b5cf6",
          hoverColor: "#7c3aed",
          label: "Markdown",
        };
      case "screenshot":
        return {
          backgroundColor: "#f59e0b",
          hoverColor: "#d97706",
          label: "Screenshot",
        };
      case "fullpage":
        return {
          backgroundColor: "#10b981",
          hoverColor: "#059669",
          label: "Full Page",
        };
      case "text":
        return {
          backgroundColor: "#6b7280",
          hoverColor: "#4b5563",
          label: "Text",
        };
      case "info":
        return {
          backgroundColor: "#0ea5e9",
          hoverColor: "#0284c7",
          label: "Info",
        };
      case "success":
        return {
          backgroundColor: "#22c55e",
          hoverColor: "#16a34a",
          label: "Success",
        };
      case "error":
        return {
          backgroundColor: "#ef4444",
          hoverColor: "#dc2626",
          label: "Error",
        };
      case "warning":
        return {
          backgroundColor: "#f97316",
          hoverColor: "#ea580c",
          label: "Warning",
        };
      default:
        return {
          backgroundColor: "#6b7280",
          hoverColor: "#4b5563",
          label: "Notification",
        };
    }
  };

  const variantStyles = getVariantStyles(variant);
  const showTypeBadge = [
    "html",
    "markdown",
    "text",
    "screenshot",
    "fullpage",
    "info",
    "success",
    "error",
    "warning",
  ].includes(variant);
  
  // Simplified title display logic - always show title for content captures unless it's exactly the same as variant name
  const shouldShowTitle = variant === "screenshot" || variant === "fullpage" 
    ? !title.toLowerCase().includes("taking") && !title.toLowerCase().includes("captured")
    : true;

  const sanitizeAndTruncateHTML = (
    htmlContent: string,
    maxLength = 400
  ): { content: string; wasTruncated: boolean; originalLength: number } => {
    try {
      const tempElement = document.createElement("div");
      tempElement.innerHTML = htmlContent;

      // Remove scripts and styles
      tempElement
        .querySelectorAll("script, style")
        .forEach((el) => el.remove());

      // Simplify or remove <p> tags and handle inline elements
      const allElements = tempElement.querySelectorAll("*");
      allElements.forEach((el) => {
        if (el.tagName === "P") {
          // Replace <p> with its text content
          const text = el.textContent || "";
          const textNode = document.createTextNode(text);
          el.replaceWith(textNode);
        } else if (el.tagName === "A" || el.tagName === "SUP") {
          // Replace inline elements with their text content
          const text = el.textContent || "";
          const textNode = document.createTextNode(text);
          el.replaceWith(textNode);
        } else {
          // Remove all attributes from other elements
          while (el.attributes.length > 0) {
            el.removeAttribute(el.attributes[0].name);
          }
        }
      });

      // Remove markdown-like syntax
      let textContent = tempElement.textContent || "";
      textContent = textContent.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // Remove [text](link)

      const needsTruncation = textContent.length > maxLength;

      if (needsTruncation) {
        const truncatedContent = textContent.substring(0, maxLength) + "...";
        return {
          content: truncatedContent,
          wasTruncated: true,
          originalLength: textContent.length,
        };
      }

      return {
        content: textContent,
        wasTruncated: false,
        originalLength: textContent.length,
      };
    } catch (error) {
      console.error("Error sanitizing HTML:", error);
      const truncatedContent =
        htmlContent.length > maxLength
          ? htmlContent.substring(0, maxLength) + "..."
          : htmlContent;
      return {
        content: truncatedContent,
        wasTruncated: htmlContent.length > maxLength,
        originalLength: htmlContent.length,
      };
    }
  };

  const extractMetadata = (htmlContent: string): string => {
    try {
      const tempElement = document.createElement("div");
      tempElement.innerHTML = htmlContent;

      const pageTitle =
        extractElementText(tempElement, "title") || "Untitled Page";
      const metaDescription =
        extractMetaContent(tempElement, "description") ||
        extractMetaContent(tempElement, "og:description") ||
        "";
      const metaKeywords = extractMetaContent(tempElement, "keywords") || "";
      const ogSiteName = extractMetaContent(tempElement, "og:site_name") || "";
      const ogType = extractMetaContent(tempElement, "og:type") || "";
      const author =
        extractMetaContent(tempElement, "author") ||
        extractMetaContent(tempElement, "article:author") ||
        "";
      const pubDate =
        extractMetaContent(tempElement, "article:published_time") ||
        extractMetaContent(tempElement, "pubdate") ||
        extractMetaContent(tempElement, "publishdate") ||
        "";

      let summary = `<div style="font-family: ${
        styling?.fontFamily || "system-ui, -apple-system, sans-serif"
      }; font-size: ${styling?.fontSize || "12px"}; line-height: 1.5;">`;
      summary += `<p style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">${pageTitle}</p>`;
      if (metaDescription)
        summary += `<p style="margin: 0 0 8px 0;"><strong>Description:</strong> ${metaDescription}</p>`;
      if (metaKeywords)
        summary += `<p style="margin: 0 0 8px 0;"><strong>Keywords:</strong> ${metaKeywords}</p>`;
      if (ogSiteName && ogSiteName !== pageTitle)
        summary += `<p style="margin: 0 0 8px 0;"><strong>Site:</strong> ${ogSiteName}</p>`;
      if (ogType)
        summary += `<p style="margin: 0 0 8px 0;"><strong>Type:</strong> ${ogType}</p>`;
      if (author)
        summary += `<p style="margin: 0 0 8px 0;"><strong>Author:</strong> ${author}</p>`;
      if (pubDate)
        summary += `<p style="margin: 0 0 8px 0;"><strong>Published:</strong> ${pubDate}</p>`;
      if (
        !metaDescription &&
        !metaKeywords &&
        !ogSiteName &&
        !ogType &&
        !author &&
        !pubDate
      ) {
        summary += `<p style="margin: 0 0 8px 0;">The complete page has been captured. Limited metadata was found.</p>`;
        const url = extractMetaContent(tempElement, "og:url") || "";
        if (url)
          summary += `<p style="margin: 0 0 8px 0;"><strong>URL:</strong> ${url}</p>`;
      }
      summary += `</div>`;
      return summary;
    } catch (error) {
      console.error("Error extracting metadata:", error);
      return "<p>Unable to extract page metadata</p>";
    }
  };

  const extractElementText = (
    container: HTMLElement,
    selector: string
  ): string => {
    const element = container.querySelector(selector);
    return element ? (element.textContent || "").trim() : "";
  };

  const extractMetaContent = (container: HTMLElement, name: string): string => {
    const metaByName = container.querySelector(`meta[name="${name}"]`);
    if (metaByName && metaByName.getAttribute("content"))
      return metaByName.getAttribute("content") || "";
    const metaByProperty =
      container.querySelector(`meta[property="og:${name}"]`) ||
      container.querySelector(`meta[property="${name}"]`);
    if (metaByProperty && metaByProperty.getAttribute("content"))
      return metaByProperty.getAttribute("content") || "";
    return "";
  };

  const processContent = (): { contentHtml: string, wasTruncated: boolean, truncationInfo: string | null } => {
    if (!description) {
      return { contentHtml: '', wasTruncated: false, truncationInfo: null };
    }
  
    const DEFAULT_FONT_SIZE = '12px';
    const MAX_LENGTH = 400;
  
    // Special handling for screenshot variant
    if (variant === 'screenshot') {
      if (description === 'Taking screenshot...') {
        return { contentHtml: `<div style="display: flex; justify-content: center; align-items: center; height: 140px;">Taking screenshot...</div>`, wasTruncated: false, truncationInfo: null };
      }
      let imageData = description;
      if (description.startsWith('data:image')) {
        imageData = description;
      } else if (!description.startsWith('<img')) {
        imageData = `data:image/png;base64,${description}`;
      }
      return {
        contentHtml: `
          <div style="display: flex; justify-content: center; align-items: center; height: 140px; padding: 8px 0;">
            <img 
              src="${imageData}" 
              alt="Captured Screenshot" 
              style="max-width: 100%; max-height: 140px; object-fit: contain; border-radius: 4px;"
              onerror="this.onerror=null; this.src=''; this.alt='Failed to load screenshot';"
            />
          </div>
        `,
        wasTruncated: false,
        truncationInfo: null
      };
    }

    // Special handling for fullpage variant
    if (variant === 'fullpage') {
      return { 
        contentHtml: extractMetadata(description), 
        wasTruncated: false, 
        truncationInfo: null 
      };
    }

    // Standardized handling for html, text, and markdown variants
    // Determine if content appears to be HTML (contains HTML tags)
    const isHTMLContent = /<[a-z][\s\S]*>/i.test(description);
    
    // For HTML content, sanitize and extract the text
    if (isHTMLContent && variant === 'html') {
      const sanitized = sanitizeAndTruncateHTML(description, MAX_LENGTH);
      const truncationInfo = sanitized.wasTruncated
        ? `Showing ${sanitized.content.length - 3} of ${sanitized.originalLength} characters (${Math.round(((sanitized.content.length - 3) / sanitized.originalLength) * 100)}%)`
        : null;

      return {
        contentHtml: `
          <div style="font-family: ${styling?.fontFamily || 'system-ui, -apple-system, sans-serif'}; 
                      font-size: ${styling?.fontSize || DEFAULT_FONT_SIZE}; 
                      line-height: 1.5; 
                      color: ${styling?.color || 'inherit'};
                      max-height: 140px;
                      overflow-y: auto;
                      position: relative;">
            ${sanitized.content}
          </div>
        `,
        wasTruncated: sanitized.wasTruncated,
        truncationInfo: truncationInfo
      };
    }
    
    // For text and markdown content, use direct truncation
    const isLong = description.length > MAX_LENGTH;
    let truncatedText = description;
    if (isLong) {
      // Truncate at the end of the last word
      const lastSpaceIndex = description.lastIndexOf(' ', MAX_LENGTH);
      truncatedText = lastSpaceIndex > 0 
        ? description.substring(0, lastSpaceIndex) + '...'
        : description.substring(0, MAX_LENGTH) + '...';
    }
    
    const truncationInfo = isLong
      ? `Showing ${truncatedText.length - 3} of ${description.length} characters (${Math.round(((truncatedText.length - 3) / description.length) * 100)}%)`
      : null;

    return {
      contentHtml: `
        <div style="font-family: ${styling?.fontFamily || 'system-ui, -apple-system, sans-serif'}; 
                    font-size: ${styling?.fontSize || DEFAULT_FONT_SIZE}; 
                    line-height: 1.5; 
                    color: ${styling?.color || 'inherit'}; 
                    white-space: pre-wrap; 
                    word-break: break-word;">
          ${truncatedText}
        </div>
      `,
      wasTruncated: isLong,
      truncationInfo: truncationInfo
    };
  };

  const { contentHtml, wasTruncated, truncationInfo } = processContent();

  return (
    <div
      style={{
        display: "flex",
        backgroundColor: "white",
        color: "#1f2937",
        borderRadius: "6px",
        border: "1px solid #e0e0e0",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        padding: TOAST_PADDING,
        width: TOAST_WIDTH,
        minWidth: "280px",
        maxWidth: TOAST_WIDTH,
        opacity: 1,
        height: "auto",
        maxHeight:
          variant === "screenshot" ? SCREENSHOT_MAX_HEIGHT : TOAST_MAX_HEIGHT,
        minHeight: TOAST_MIN_HEIGHT,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexGrow: 1,
              minWidth: 0,
            }}
          >
            {showTypeBadge && (
              <div
                style={{
                  display: "inline-block",
                  fontSize: "12px",
                  fontWeight: "500",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  backgroundColor: variantStyles.backgroundColor,
                  color: "white",
                  textTransform: "capitalize",
                  flexShrink: 0,
                }}
              >
                {`${variantStyles.label} captured`}
              </div>
            )}
            {shouldShowTitle && (
              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  margin: "0 0 0 8px",
                  color: "#374151",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flexGrow: 1,
                  minWidth: 0,
                }}
              >
                {title}
              </p>
            )}
          </div>
          <button
            style={{
              width: "20px",
              height: "20px",
              minWidth: "20px",
              color: "#ef4444",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginLeft: "8px",
            }}
            onClick={() => sonnerToast.dismiss(id)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="16"
              height="16"
            >
              <path
                fillRule="evenodd"
                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        {timestamp && (
          <p
            style={{
              fontSize: "12px",
              margin: "0 0 8px 0",
              color: "#6b7280",
              borderBottom: "1px solid #e0e0e0",
              paddingBottom: "4px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {timestamp.toLocaleString()}
          </p>
        )}
        {description && (
          <div
            ref={contentRef}
            style={{
              maxHeight: CONTENT_MAX_HEIGHT,
              overflowY: "hidden",
              position: "relative",
              marginBottom: "8px",
              boxSizing: "border-box",
            }}
          >
            <div
              dangerouslySetInnerHTML={{ __html: contentHtml }}
              style={{
                width: "100%",
                boxSizing: "border-box",
                paddingRight: "4px",
                paddingBottom: truncationInfo ? "25px" : "0",
              }}
            />
            {truncationInfo && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#6b7280",
                  position: "absolute",
                  bottom: "0",
                  right: "4px",
                  left: "0",
                  textAlign: "right",
                  backgroundColor: "white",
                  padding: "2px 4px",
                  borderTop: "1px solid #f3f4f6",
                  zIndex: 10,
                }}
              >
                {truncationInfo}
              </div>
            )}
            {wasTruncated && variant !== "screenshot" && (
              <div
                style={{
                  position: "absolute",
                  bottom: truncationInfo ? "20px" : "0",
                  left: 0,
                  right: 0,
                  height: "30px",
                  background:
                    "linear-gradient(to top, rgba(255,255,255,1), rgba(255,255,255,0))",
                  pointerEvents: "none",
                  zIndex: 5,
                }}
              />
            )}
          </div>
        )}
        {source && (
          <p
            style={{
              fontSize: "12px",
              margin: "0",
              color: "#6b7280",
              marginTop: "auto",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              paddingTop: "4px",
              borderTop: "1px solid #f3f4f6",
            }}
          >
            {source}
          </p>
        )}
      </div>
    </div>
  );
}

export function showCustomToast(
  props: CustomToastProps,
  options?: { id?: string; duration?: number }
) {
  return sonnerToast.custom((id) => <Toast id={id} {...props} />, {
    duration: options?.duration || 5000,
    dismissible: true,
    position: "top-right",
    id: options?.id,
  });
}

export function showSuccessToast(
  title: string,
  description?: string,
  options?: { id?: string; duration?: number }
) {
  return showCustomToast(
    {
      title,
      description,
      variant: "success",
      timestamp: new Date(),
    },
    options
  );
}

export function showErrorToast(
  title: string,
  description?: string,
  options?: { id?: string; duration?: number }
) {
  return showCustomToast(
    {
      title,
      description,
      variant: "error",
      timestamp: new Date(),
    },
    options
  );
}

export function showInfoToast(
  title: string,
  description?: string,
  options?: { id?: string; duration?: number }
) {
  return showCustomToast(
    {
      title,
      description,
      variant: "info",
      timestamp: new Date(),
    },
    options
  );
}

export function showCaptureToast(
  captureType: string,
  contentPreview: string,
  source?: string,
  options?: { id?: string; duration?: number; styling?: Record<string, string>; title?: string }
) {
  const validVariant = [
    "html",
    "markdown",
    "screenshot",
    "fullpage",
    "text",
  ].includes(captureType.toLowerCase())
    ? (captureType.toLowerCase() as CustomToastProps["variant"])
    : "default";

  console.log(
    "Showing capture toast for:",
    captureType,
    "content length:",
    contentPreview ? contentPreview.length : 0
  );

  let displayContent = contentPreview || "";
  let toastDuration = options?.duration || 5000;
  let toastId = options?.id || `capture-${Date.now()}`;
  
  // Use consistent title logic across all capture types
  let toastTitle = options?.title || `Content Captured`;

  if (validVariant === "screenshot") {
    if (displayContent === "Taking screenshot...") {
      toastTitle = "Taking Screenshot";
      if (!options?.duration) toastDuration = 2000;
      if (!options?.id) toastId = "screenshot-loading";
    } else {
      toastTitle = "Screenshot Captured";
      if (!options?.id) {
        sonnerToast.dismiss("screenshot-loading");
      }
    }
  } else if (validVariant === "fullpage") {
    toastTitle = "Full Page Captured";
  } else if (validVariant === "html") {
    toastTitle = "HTML Content Captured";
  } else if (validVariant === "markdown") {
    toastTitle = "Markdown Content Captured";
  } else if (validVariant === "text") {
    toastTitle = "Text Content Captured";
  }

  return sonnerToast.custom(
    (id) => (
      <Toast
        id={id}
        title={toastTitle}
        description={displayContent}
        source={source || document.title}
        timestamp={new Date()}
        variant={validVariant}
        styling={options?.styling}
      />
    ),
    {
      duration: toastDuration,
      dismissible: true,
      position: "top-right",
      id: toastId,
    }
  );
}
