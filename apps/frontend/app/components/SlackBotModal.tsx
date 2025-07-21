"use client";

import { useState, useEffect } from "react";
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChatBubbleLeftIcon,
  HashtagIcon,
} from "@heroicons/react/24/outline";

interface SlackBotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (apiKey: string, channelName: string) => Promise<boolean>;
  isConnected: boolean;
}

export default function SlackBotModal({ isOpen, onClose, onConnect, isConnected }: SlackBotModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [channelName, setChannelName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationState, setValidationState] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setApiKey("");
      setChannelName("");
      setValidationState("idle");
      setErrorMessage("");
      setShowHelp(false);
    }
  }, [isOpen]);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      setValidationState("error");
      setErrorMessage("Please enter your Slack Bot API key");
      return;
    }

    if (!channelName.trim()) {
      setValidationState("error");
      setErrorMessage("Please enter the channel name");
      return;
    }

    // Basic validation for channel name format
    const cleanChannelName = channelName.startsWith('#') ? channelName.slice(1) : channelName;
    if (!/^[a-z0-9\-_]+$/.test(cleanChannelName)) {
      setValidationState("error");
      setErrorMessage("Channel name can only contain lowercase letters, numbers, hyphens, and underscores");
      return;
    }

    setIsLoading(true);
    setValidationState("idle");
    setErrorMessage("");

    try {
      const success = await onConnect(apiKey, cleanChannelName);
      if (success) {
        setValidationState("success");
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setValidationState("error");
        setErrorMessage("Invalid API key or channel - please verify and try again");
      }
    } catch (error) {
      setValidationState("error");
      setErrorMessage("Connection failed - please check your API key and channel, then try again");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading) {
      handleConnect();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop with subtle overlay */}
      <div 
        className="fixed inset-0 transition-all duration-300"
        onClick={onClose}
        style={{ 
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 relative z-10">
        <div 
          className="relative w-full max-w-md transform overflow-hidden rounded-2xl shadow-2xl transition-all"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div 
            className="px-6 py-4 border-b border-gray-100"
            style={{
              background: 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white bg-opacity-60 rounded-lg">
                  <ChatBubbleLeftIcon className="h-6 w-6 text-gray-700" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Connect to Slack Bot
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-white hover:bg-white/10 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* API Key Input */}
            <div className="space-y-2">
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                Slack Bot API Token
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="xoxb-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
                    validationState === "success"
                      ? "border-green-500 focus:ring-green-500 bg-green-50"
                      : validationState === "error"
                      ? "border-red-500 focus:ring-red-500 bg-red-50"
                      : "border-gray-300 focus:ring-brand-primary focus:border-brand-primary"
                  }`}
                  disabled={isLoading}
                />
                
                {/* Validation Icons */}
                {validationState === "success" && (
                  <CheckCircleIcon className="absolute right-3 top-3 h-5 w-5 text-green-500" />
                )}
                {validationState === "error" && (
                  <ExclamationCircleIcon className="absolute right-3 top-3 h-5 w-5 text-red-500" />
                )}
              </div>
            </div>

            {/* Channel Name Input */}
            <div className="space-y-2">
              <label htmlFor="channelName" className="block text-sm font-medium text-gray-700">
                Channel Name
              </label>
              <div className="relative">
                <HashtagIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <input
                  id="channelName"
                  type="text"
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="general"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all ${
                    validationState === "success"
                      ? "border-green-500 focus:ring-green-500 bg-green-50"
                      : validationState === "error"
                      ? "border-red-500 focus:ring-red-500 bg-red-50"
                      : "border-gray-300 focus:ring-brand-primary focus:border-brand-primary"
                  }`}
                  disabled={isLoading}
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter the channel name where the bot will respond to messages (without #)
              </p>
            </div>
              
            {/* Feedback Messages */}
            {validationState === "success" && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600 flex items-center space-x-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Connected successfully!</span>
                </p>
              </div>
            )}
            {validationState === "error" && errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <ExclamationCircleIcon className="h-4 w-4" />
                  <span>{errorMessage}</span>
                </p>
              </div>
            )}

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={isLoading || validationState === "success"}
              className={`w-full py-3 px-4 rounded-xl text-white font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                isLoading || validationState === "success"
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transform hover:scale-105"
              }`}
              style={{
                background: validationState === "success" 
                  ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                  : 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)'
              }}
            >
              {isLoading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  <span>Validating connection...</span>
                </>
              ) : validationState === "success" ? (
                <>
                  <CheckCircleIcon className="h-4 w-4" />
                  <span>Connected!</span>
                </>
              ) : (
                <span>Connect</span>
              )}
            </button>

            {/* Help Section */}
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-brand-primary transition-colors"
              >
                <span>How to get your Slack Bot API token</span>
                {showHelp ? (
                  <ChevronUpIcon className="h-4 w-4" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4" />
                )}
              </button>
              
              {showHelp && (
                <div className="mt-4 space-y-4 text-sm text-gray-600 leading-relaxed">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <h4 className="font-medium text-blue-900 mb-2">Step-by-step guide:</h4>
                    <ol className="space-y-2 list-decimal list-inside">
                      <li>
                        Go to{" "}
                        <a 
                          href="https://api.slack.com/apps" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand-primary hover:underline font-medium"
                        >
                          Slack API Dashboard
                        </a>
                      </li>
                      <li>Click <strong>"Create New App"</strong> and choose <strong>"From scratch"</strong></li>
                      <li>Enter app name and select your workspace</li>
                      <li>Go to <strong>"OAuth & Permissions"</strong> in the sidebar</li>
                      <li>Add these Bot Token Scopes: <code>chat:write</code>, <code>channels:read</code>, <code>app_mentions:read</code></li>
                      <li>Click <strong>"Install to Workspace"</strong></li>
                      <li>Copy the <strong>"Bot User OAuth Token"</strong> (starts with xoxb-)</li>
                      <li>Invite the bot to your channel: <code>/invite @your-bot-name</code></li>
                    </ol>
                  </div>
                  
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                    <h4 className="font-medium text-amber-900 mb-2">Important:</h4>
                    <p>
                      Make sure to invite the bot to the channel where you want it to respond. 
                      The bot needs to be a member of the channel to send messages.
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-2">Security note:</h4>
                    <p>
                      Your API token is stored securely and only used to send messages to your specified channel. 
                      We never store or share your workspace data.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}