"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSources, connectSource, connectNotionWithKey, connectSlackBot, importGoogleDoc, disconnectSource, crawlSite } from "@/services/api";
import { useAuth } from "@/store/useAuth";
import PrivateRoute from "@/components/PrivateRoute";
import Layout from "@/components/Layout";
import NotionModal from "@/components/NotionModal";
import GoogleDocsModal from "@/components/GoogleDocsModal";
import SiteDocsModal from "@/components/SiteDocsModal";
import UploadModal from "@/components/UploadModal";
import SlackBotModal from "@/components/SlackBotModal";
import {
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  CloudIcon,
  DocumentTextIcon,
  FolderIcon,
  GlobeAltIcon,
  DocumentIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";

interface Source {
  provider: string;
  connected: boolean;
  lastSync?: string;
  connectionStatus?: "connected" | "failed" | "not_connected";
}

// Provider icons mapping
const providerIcons = {
  notion: DocumentTextIcon,
  gdocs: FolderIcon,
  'site-docs': GlobeAltIcon,
  uploads: CloudIcon,
  'slack-bot': ChatBubbleLeftIcon,
  default: LinkIcon,
};

// Provider descriptions
const providerDescriptions = {
  notion: "Connect your Notion workspace to sync pages and databases for enhanced AI knowledge",
  gdocs: "Import documents from Google Drive and Google Docs",
  'site-docs': "Crawl and index documentation from websites",
  uploads: "Upload and process your local documents",
  'slack-bot': "Enable chatting through Slack bot interface in your workspace",
  default: "Connect external data sources",
};

export default function ConnectionsPage() {
  const { user } = useAuth();
  const [userSources, setUserSources] = useState<Source[]>([]);
  const [isNotionModalOpen, setIsNotionModalOpen] = useState(false);
  const [isGoogleDocsModalOpen, setIsGoogleDocsModalOpen] = useState(false);
  const [isSiteDocsModalOpen, setIsSiteDocsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSlackBotModalOpen, setIsSlackBotModalOpen] = useState(false);
  const [uploadedFileCount, setUploadedFileCount] = useState(0);

  const { data: sources, isLoading, error, refetch } = useQuery({
    queryKey: ["sources"],
    queryFn: getSources,
    enabled: !!user, // Only fetch when user is authenticated
    refetchOnWindowFocus: true, // Refetch when window gains focus
    staleTime: 0, // Always consider data stale to ensure fresh data
  });

  const handleConnect = async (provider: string) => {
    if (provider === 'notion') {
      setIsNotionModalOpen(true);
      return;
    }

    if (provider === 'gdocs') {
      setIsGoogleDocsModalOpen(true);
      return;
    }

    if (provider === 'site-docs') {
      setIsSiteDocsModalOpen(true);
      return;
    }

    if (provider === 'uploads') {
      setIsUploadModalOpen(true);
      return;
    }

    if (provider === 'slack-bot') {
      setIsSlackBotModalOpen(true);
      return;
    }

    try {
      await connectSource(provider);
      
      // Update user-specific sources
      setUserSources(prev => 
        prev.map(source => 
          source.provider === provider 
            ? { ...source, connected: true, lastSync: new Date().toISOString(), connectionStatus: "connected" }
            : source
        )
      );
    } catch (error) {
      console.error("Connection failed:", error);
      // Update connection status to failed
      setUserSources(prev => 
        prev.map(source => 
          source.provider === provider 
            ? { ...source, connectionStatus: "failed" }
            : source
        )
      );
    }
  };

  const handleGoogleDocsConnect = async (link: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Call the actual backend API to import Google Docs
      const response = await importGoogleDoc(link);
      
      if (response.data.jobId) {
        // Update Google Docs source as connected
        setUserSources(prev => 
          prev.map(source => 
            source.provider === 'gdocs' 
              ? { 
                  ...source, 
                  connected: true, 
                  lastSync: new Date().toISOString(),
                  connectionStatus: "connected"
                }
              : source
          )
        );
        return { success: true };
      } else {
        // Update connection status to failed
        setUserSources(prev => 
          prev.map(source => 
            source.provider === 'gdocs' 
              ? { ...source, connectionStatus: "failed" }
              : source
          )
        );
        return { success: false, error: 'Failed to start document import job' };
      }
    } catch (error: any) {
      console.error("Google Docs import failed:", error);
      
      // Extract specific error message from backend response
      let errorMessage = 'Failed to import document. Please check the link and try again.';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
        console.error("Backend error:", errorMessage);
      }
      
      setUserSources(prev => 
        prev.map(source => 
          source.provider === 'gdocs' 
            ? { ...source, connectionStatus: "failed" }
            : source
        )
      );
      return { success: false, error: errorMessage };
    }
  };

  const handleSiteDocsConnect = async (url: string): Promise<boolean> => {
    try {
      // Call the backend API for site crawling
      const response = await crawlSite(url);
      
      if (response.data.jobId) {
        // Update the source status in backend with URL and jobId
        await connectSource('site-docs', { 
          url: url, 
          jobId: response.data.jobId 
        });
        
        // Refetch sources to get updated connection status
        await refetch();
        
        return true;
      } else {
        throw new Error('Failed to start site crawling job');
      }
    } catch (error) {
      console.error('Site docs connection error:', error);
      setUserSources(prev => 
        prev.map(source => 
          source.provider === 'site-docs' 
            ? { ...source, connectionStatus: "failed" }
            : source
        )
      );
      return false;
    }
  };

  const handleUploadComplete = async (newFileCount: number) => {
    try {
      setUploadedFileCount(prev => prev + newFileCount);
      
      // Update the uploads connection status in backend
      await connectSource('uploads');
      
      // Refetch sources to get updated connection status
      await refetch();
    } catch (error) {
      console.error('Error updating upload status:', error);
    }
  };

  const handleNotionConnect = async (apiKey: string): Promise<boolean> => {
    try {
      // Validate Notion API key format (should start with 'ntn_' or 'secret_')
      if (!apiKey.startsWith('ntn_') && !apiKey.startsWith('secret_')) {
        return false;
      }

      // Call the actual backend API
      const response = await connectNotionWithKey(apiKey);
      
      if (response.data.message === 'sync_started') {
        // Refetch sources to get updated connection status
        await refetch();
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.error("Notion connection failed:", error);
      return false;
    }
  };

  const handleSlackBotConnect = async (apiKey: string, channelName: string): Promise<boolean> => {
    try {
      // Validate Slack API key format (should start with 'xoxb-')
      if (!apiKey.startsWith('xoxb-')) {
        return false;
      }

      // Call the actual backend API
      const response = await connectSlackBot(apiKey, channelName);
      
      if (response.data.message === 'Slack bot connection successful') {
        // Refetch sources to get updated connection status
        await refetch();
        return true;
      } else {
        return false;
      }
    } catch (error: any) {
      console.error("Slack bot connection failed:", error);
      return false;
    }
  };

  const handleDisconnect = async (provider: string) => {
    try {
      await disconnectSource(provider);
      await refetch();
    } catch (error) {
      console.error(`Failed to disconnect ${provider}:`, error);
    }
  };

  // Initialize userSources from backend data
  useEffect(() => {
    if (sources && sources.data && sources.data.length > 0) {
      // Map backend format to frontend format
      const mappedSources = sources.data.map((source: any) => ({
        provider: source.provider,
        connected: source.status === 'connected',
        lastSync: source.lastSynced,
        connectionStatus: source.status === 'connected' ? 'connected' : 'not_connected'
      }));
      setUserSources(mappedSources);
    }
  }, [sources]);

  if (isLoading) {
    return (
      <PrivateRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <ArrowPathIcon className="h-12 w-12 animate-spin text-brand-primary mx-auto mb-4" />
              <p className="text-gray-600">Loading data sources...</p>
            </div>
          </div>
        </Layout>
      </PrivateRoute>
    );
  }

  if (error) {
    return (
      <PrivateRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600 font-medium">Error loading sources</p>
              <p className="text-gray-500 text-sm mt-2">Please try refreshing the page</p>
            </div>
          </div>
        </Layout>
      </PrivateRoute>
    );
  }

  return (
    <PrivateRoute>
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Data Connections</h1>
            <p className="mt-2 text-gray-600">
              Connect your data sources to enhance your AI assistant's knowledge base
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-blue-100">
                  <LinkIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Sources</p>
                  <p className="text-2xl font-bold text-gray-900">{userSources.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-green-100">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Connected</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userSources.filter(s => s.connected).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-center">
                <div className="p-3 rounded-xl bg-yellow-100">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {userSources.filter(s => !s.connected).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userSources.map((source) => {
              const IconComponent = providerIcons[source.provider as keyof typeof providerIcons] || providerIcons.default;
              const description = providerDescriptions[source.provider as keyof typeof providerDescriptions] || providerDescriptions.default;
              
              // Enhanced status logic
              const getStatusInfo = () => {
                if (source.connected) {
                  return {
                    text: "Connected",
                    color: "bg-green-100 text-green-800",
                    icon: CheckCircleIcon
                  };
                } else if (source.connectionStatus === "failed") {
                  return {
                    text: "Connection Failed",
                    color: "bg-red-100 text-red-800",
                    icon: XCircleIcon
                  };
                } else {
                  return {
                    text: "Not Connected",
                    color: "bg-gray-100 text-gray-800",
                    icon: XCircleIcon
                  };
                }
              };

              const statusInfo = getStatusInfo();
              const StatusIcon = statusInfo.icon;
              
              return (
                <div
                  key={source.provider}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="p-3 rounded-xl"
                        style={{ 
                          background: source.connected 
                            ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' 
                            : source.connectionStatus === "failed"
                            ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                            : source.provider === 'notion' || source.provider === 'gdocs' || source.provider === 'site-docs' || source.provider === 'uploads'
                            ? 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)'
                            : 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)'
                        }}
                      >
                        <IconComponent className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 capitalize flex items-center space-x-2">
                          <span>{source.provider.replace('-', ' ')}</span>
                          {source.provider === 'notion' && (
                            <span className="text-xs bg-brand-accent text-white px-2 py-1 rounded-full font-medium">
                              Enhanced
                            </span>
                          )}
                        </h3>
                      </div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      <span>{statusInfo.text}</span>
                    </div>
                  </div>
                  
                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                    {description}
                  </p>
                  
                  {/* File Counter for Uploads */}
                  {source.provider === 'uploads' && (
                    <div className="flex items-center text-sm text-gray-600 mb-4 bg-blue-50 rounded-lg p-2">
                      <DocumentIcon className="h-4 w-4 mr-2 text-blue-600" />
                      Files: {uploadedFileCount}
                    </div>
                  )}
                  
                  {/* Last Sync */}
                  {source.lastSync && (
                    <div className="flex items-center text-xs text-gray-500 mb-4 bg-gray-50 rounded-lg p-2">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      Last sync: {new Date(source.lastSync).toLocaleString()}
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleConnect(source.provider)}
                      disabled={source.connected && (source.provider === 'notion' || source.provider === 'slack-bot')}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200 ${
                        source.connected && (source.provider === 'notion' || source.provider === 'slack-bot')
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "text-white hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105"
                      }`}
                      style={{
                        background: (source.connected && (source.provider === 'notion' || source.provider === 'slack-bot')) 
                          ? undefined 
                          : source.provider === 'notion'
                          ? 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)'
                          : source.provider === 'gdocs'
                          ? 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)'
                          : source.provider === 'site-docs'
                              ? 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)'
                              : source.provider === 'uploads'
                              ? 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)'
                              : source.provider === 'slack-bot'
                              ? 'linear-gradient(135deg, #0f4c81 0%, #ffb703 100%)'
                              : 'linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)'
                      }}
                    >
                      {source.connected && (source.provider === 'notion' || source.provider === 'slack-bot') ? (
                        <span className="flex items-center justify-center">
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                          Connected
                        </span>
                      ) : (
                        <span className="flex items-center justify-center">
                           <LinkIcon className="h-4 w-4 mr-2" />
                           {source.provider === 'notion' 
                             ? 'Connect with API Key' 
                             : source.provider === 'gdocs'
                             ? (source.connected ? 'Import Another Document' : 'Import Document')
                             : source.provider === 'site-docs'
                             ? (source.connected ? 'Connect Another Website' : 'Connect Website')
                             : source.provider === 'uploads'
                             ? (source.connected ? 'Upload More Files' : 'Upload Files')
                             : source.provider === 'slack-bot'
                             ? 'Connect Now'
                             : 'Connect Now'}
                         </span>
                      )}
                    </button>
                    
                    {source.connected && (source.provider === 'notion' || source.provider === 'slack-bot') && (
                      <button
                        onClick={() => handleDisconnect(source.provider)}
                        className="w-full py-2 px-4 rounded-xl text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        <span className="flex items-center justify-center">
                          <XCircleIcon className="h-4 w-4 mr-2" />
                          Disconnect
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty State */}
          {userSources.length === 0 && (
            <div className="text-center py-12">
              <CloudIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No data sources available</h3>
              <p className="text-gray-500">Data sources will appear here when they become available.</p>
            </div>
          )}

          {/* Notion Modal */}
          <NotionModal
            isOpen={isNotionModalOpen}
            onClose={() => setIsNotionModalOpen(false)}
            onConnect={handleNotionConnect}
            isConnected={userSources.find(s => s.provider === 'notion')?.connected || false}
          />

          {/* Google Docs Modal */}
          <GoogleDocsModal
            isOpen={isGoogleDocsModalOpen}
            onClose={() => setIsGoogleDocsModalOpen(false)}
            onConnect={handleGoogleDocsConnect}
            isConnected={userSources.find(s => s.provider === 'gdocs')?.connected || false}
          />

          {/* Site Docs Modal */}
          <SiteDocsModal
            isOpen={isSiteDocsModalOpen}
            onClose={() => setIsSiteDocsModalOpen(false)}
            onConnect={handleSiteDocsConnect}
            isConnected={userSources.find(s => s.provider === 'site-docs')?.connected || false}
          />

          {/* Upload Modal */}
          <UploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onUploadComplete={handleUploadComplete}
            currentFileCount={uploadedFileCount}
          />

          {/* Slack Bot Modal */}
          <SlackBotModal
            isOpen={isSlackBotModalOpen}
            onClose={() => setIsSlackBotModalOpen(false)}
            onConnect={handleSlackBotConnect}
            isConnected={userSources.find(s => s.provider === 'slack-bot')?.connected || false}
          />
        </div>
      </Layout>
    </PrivateRoute>
  );
}
