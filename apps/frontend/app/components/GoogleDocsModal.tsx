'use client';

import React, { useState } from 'react';
import { 
  XMarkIcon, 
  DocumentTextIcon, 
  LinkIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

interface GoogleDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (link: string) => Promise<{ success: boolean; error?: string }>;
  isConnected: boolean;
}

export default function GoogleDocsModal({ isOpen, onClose, onConnect, isConnected }: GoogleDocsModalProps) {
  const [link, setLink] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationState, setValidationState] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const validateGoogleDocsLink = (url: string): boolean => {
    const googleDocsPattern = /^https:\/\/docs\.google\.com\/document\/d\/[a-zA-Z0-9-_]+/;
    return googleDocsPattern.test(url);
  };

  const handleImport = async () => {
    if (!link.trim()) {
      setValidationState('error');
      setMessage('Please enter a Google Docs link');
      return;
    }

    if (!validateGoogleDocsLink(link)) {
      setValidationState('error');
      setMessage('Invalid Google Docs link format');
      return;
    }

    setIsLoading(true);
    setValidationState('idle');
    setMessage('');

    try {
      const result = await onConnect(link);
      if (result.success) {
        setValidationState('success');
        setMessage('Document imported successfully!');
        setTimeout(() => {
          onClose();
          setLink('');
          setValidationState('idle');
          setMessage('');
        }, 2000);
      } else {
        setValidationState('error');
        setMessage(result.error || 'Failed to import document. Please check the link and try again.');
      }
    } catch (error) {
      setValidationState('error');
      setMessage('An error occurred while importing the document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setLink('');
    setValidationState('idle');
    setMessage('');
    setShowHelp(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && !isLoading) {
      handleImport();
    }
  };

  if (!isOpen) return null;

  const getBorderColor = () => {
    switch (validationState) {
      case 'success': return 'border-green-500 focus:border-green-500 focus:ring-green-500';
      case 'error': return 'border-red-500 focus:border-red-500 focus:ring-red-500';
      default: return 'border-gray-300 focus:border-brand-primary focus:ring-brand-primary';
    }
  };

  const getMessageColor = () => {
    switch (validationState) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-brand-primary to-brand-accent rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/60 rounded-lg">
              <DocumentTextIcon className="w-5 h-5 text-gray-700" />
            </div>
            <h2 className="text-xl font-semibold text-white">Import from Google Docs</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors duration-200"
            disabled={isLoading}
          >
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Input Section */}
          <div className="space-y-3">
            <label htmlFor="google-docs-link" className="block text-sm font-medium text-gray-700">
              Google Docs Link
            </label>
            <div className="relative">
              <input
                id="google-docs-link"
                type="url"
                value={link}
                onChange={(e) => {
                  setLink(e.target.value);
                  if (validationState !== 'idle') {
                    setValidationState('idle');
                    setMessage('');
                  }
                }}
                placeholder="https://docs.google.com/document/d/..."
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${getBorderColor()}`}
                disabled={isLoading}
                autoFocus
              />
              {isLoading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <ArrowPathIcon className="w-5 h-5 text-brand-primary animate-spin" />
                </div>
              )}
            </div>
            
            {/* Validation Message */}
            {message && (
              <p className={`text-sm ${getMessageColor()} flex items-center space-x-1`}>
                <span>{message}</span>
              </p>
            )}
          </div>

          {/* Import Button */}
          <button
            onClick={handleImport}
            disabled={isLoading || !link.trim()}
            className="w-full bg-gradient-to-r from-brand-primary to-brand-accent text-white py-3 px-4 rounded-lg font-medium hover:from-brand-primary hover:to-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <DocumentTextIcon className="w-4 h-4" />
                <span>Import Document</span>
              </>
            )}
          </button>

          {/* Help Guide */}
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors duration-200"
              disabled={isLoading}
            >
              <span className="text-sm font-medium text-gray-700">How to get your Google Docs link</span>
              {showHelp ? (
                <ChevronUpIcon className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDownIcon className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {showHelp && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <ol className="text-sm text-gray-600 space-y-2 mt-3">
                  <li className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center text-xs font-medium mt-0.5">1</span>
                    <span>Open your Google Docs document</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center text-xs font-medium mt-0.5">2</span>
                    <span>Click the "Share" button in the top right corner</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center text-xs font-medium mt-0.5">3</span>
                    <span>Change access to "Anyone with the link"</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center text-xs font-medium mt-0.5">4</span>
                    <span>Copy the shareable link</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="flex-shrink-0 w-5 h-5 bg-brand-primary/20 text-brand-primary rounded-full flex items-center justify-center text-xs font-medium mt-0.5">5</span>
                    <span>Paste it in the input field above</span>
                  </li>
                </ol>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 flex items-center space-x-1">
                    <LinkIcon className="w-3 h-3" />
                    <span>Make sure the document is accessible to anyone with the link for successful import.</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}