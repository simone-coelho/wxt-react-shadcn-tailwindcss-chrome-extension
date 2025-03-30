'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function SonnerToaster({ position = 'top-right', ...props }: ToasterProps) {
  return (
    <Sonner
      position={position}
      theme="light"
      toastOptions={{
        style: {
          backgroundColor: 'white',
          color: '#1f2937', 
          border: '1px solid #e0e0e0',
          borderRadius: '6px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          fontFamily: 'inherit',
          width: 'auto',
          minWidth: '350px',
          maxWidth: '450px',
          opacity: 1,
          display: 'flex'
        },
        classNames: {
          toast: 'sonner-toast',
          title: 'sonner-toast-title',
          description: 'sonner-toast-description',
          actionButton: 'sonner-toast-button',
          cancelButton: 'sonner-toast-button',
          closeButton: 'sonner-toast-button'
        }
      }}
      style={{
        opacity: 1,
        zIndex: 100000, // High z-index to ensure visibility
        pointerEvents: 'all'
      }}
      expand={false}
      closeButton={true}
      richColors={false}
      {...props}
    />
  );
} 