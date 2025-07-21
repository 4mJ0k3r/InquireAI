"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import PrivateRoute from "@/components/PrivateRoute";
import Layout from "@/components/Layout";
import { useAuth } from "@/store/useAuth";
import {
  DocumentIcon,
  LinkIcon,
  ChatBubbleLeftRightIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  PlusIcon,
  PlayIcon,
  EyeIcon,
  SparklesIcon,
  BoltIcon,
  CloudArrowUpIcon,
} from "@heroicons/react/24/outline";

// Enhanced StatCard component with gradients and animations
function EnhancedStatCard({ 
  title, 
  value, 
  icon, 
  change, 
  changeType, 
  gradient 
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: 'increase' | 'decrease';
  gradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Gradient Background */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{ background: gradient }}
      />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div 
            className="p-3 rounded-xl"
            style={{ background: gradient }}
          >
            <div className="text-white">
              {icon}
            </div>
          </div>
          {change && (
            <div className={`flex items-center text-sm font-medium ${
              changeType === 'increase' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'increase' ? (
                <ArrowUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 mr-1" />
              )}
              {change}
            </div>
          )}
        </div>
        
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// Quick Action Card component
function QuickActionCard({
  title,
  description,
  icon,
  href,
  gradient,
  comingSoon = false
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  gradient: string;
  comingSoon?: boolean;
}) {
  const content = (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
      {/* Gradient Background */}
      <div 
        className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300"
        style={{ background: gradient }}
      />
      
      <div className="relative z-10">
        <div 
          className="inline-flex p-3 rounded-xl mb-4"
          style={{ background: gradient }}
        >
          <div className="text-white">
            {icon}
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        
        <div className="flex items-center justify-between">
          <span 
            className="inline-flex items-center text-sm font-medium"
            style={{ color: '#0f4c81' }}
          >
            {comingSoon ? 'Coming Soon' : 'Get Started'}
            {!comingSoon && <ArrowUpIcon className="h-4 w-4 ml-1 transform rotate-45" />}
          </span>
          {comingSoon && (
            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
              Soon
            </span>
          )}
        </div>
      </div>
    </div>
  );

  if (comingSoon) {
    return <div className="cursor-not-allowed opacity-75">{content}</div>;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

// Activity Item component
function ActivityItem({ 
  icon, 
  title, 
  description, 
  time, 
  type 
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  time: string;
  type: 'success' | 'info' | 'warning';
}) {
  const typeColors = {
    success: 'bg-green-100 text-green-600',
    info: 'bg-blue-100 text-blue-600',
    warning: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="flex items-start space-x-3 p-4 hover:bg-gray-50 rounded-lg transition-colors">
      <div className={`p-2 rounded-lg ${typeColors[type]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-600">{description}</p>
        <p className="text-xs text-gray-500 mt-1 flex items-center">
          <ClockIcon className="h-3 w-3 mr-1" />
          {time}
        </p>
      </div>
    </div>
  );
}

const statsData = [
  {
    title: "Total Documents",
    value: "24",
    icon: <DocumentIcon className="h-6 w-6" />,
    change: "+12%",
    changeType: "increase" as const,
    gradient: "linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)"
  },
  {
    title: "Active Sources",
    value: "3",
    icon: <LinkIcon className="h-6 w-6" />,
    change: "+1",
    changeType: "increase" as const,
    gradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)"
  },
  {
    title: "Total Conversations",
    value: "156",
    icon: <ChatBubbleLeftRightIcon className="h-6 w-6" />,
    change: "+23%",
    changeType: "increase" as const,
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
  },
  {
    title: "Active Users",
    value: "8",
    icon: <UserGroupIcon className="h-6 w-6" />,
    change: "+2",
    changeType: "increase" as const,
    gradient: "linear-gradient(135deg, #ffb703 0%, #fb923c 100%)"
  }
];

const quickActions = [
  {
    title: "Upload Documents",
    description: "Add new documents to your knowledge base",
    icon: <CloudArrowUpIcon className="h-6 w-6" />,
    href: "/docs/upload",
    gradient: "linear-gradient(135deg, #0f4c81 0%, #1e40af 100%)"
  },
  {
    title: "Start Conversation",
    description: "Ask questions about your documents",
    icon: <PlayIcon className="h-6 w-6" />,
    href: "/chat",
    gradient: "linear-gradient(135deg, #059669 0%, #10b981 100%)"
  },
  {
    title: "Connect Sources",
    description: "Link external data sources",
    icon: <PlusIcon className="h-6 w-6" />,
    href: "/connections",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
  },
  {
    title: "View Analytics",
    description: "See insights about your usage",
    icon: <EyeIcon className="h-6 w-6" />,
    href: "/analytics",
    gradient: "linear-gradient(135deg, #ffb703 0%, #fb923c 100%)"
  }
];

const recentActivities = [
  {
    icon: <DocumentIcon className="h-4 w-4" />,
    title: "Document uploaded",
    description: "project-requirements.pdf was successfully processed",
    time: "2 minutes ago",
    type: "success" as const
  },
  {
    icon: <ChatBubbleLeftRightIcon className="h-4 w-4" />,
    title: "New conversation",
    description: "User asked about project timeline",
    time: "15 minutes ago",
    type: "info" as const
  },
  {
    icon: <LinkIcon className="h-4 w-4" />,
    title: "Source connected",
    description: "Google Docs integration activated",
    time: "1 hour ago",
    type: "success" as const
  },
  {
    icon: <ChartBarIcon className="h-4 w-4" />,
    title: "Weekly report",
    description: "Analytics report generated",
    time: "2 hours ago",
    type: "info" as const
  }
];

export default function Dashboard() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <PrivateRoute>
      <Layout>
        <div className="space-y-8">
          {/* Welcome Header */}
          <div className="relative overflow-hidden rounded-3xl p-8" style={{
            background: "linear-gradient(135deg, #0f4c81 0%, #ffb703 50%, #0f4c81 100%)"
          }}>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    {getGreeting()}, {user?.email?.split('@')[0] || 'there'}! 👋
                  </h1>
                  <p className="text-white/80 text-lg">
                    Welcome to your AI-powered knowledge hub. Ready to explore?
                  </p>
                </div>
                <div className="hidden md:flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-white/60 text-sm">Current Time</p>
                    <p className="text-white font-semibold">
                      {currentTime.toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="p-3 bg-white/10 rounded-xl">
                    <SparklesIcon className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute top-4 right-4 w-32 h-32 bg-white/5 rounded-full"></div>
            <div className="absolute bottom-4 left-4 w-24 h-24 bg-white/5 rounded-full"></div>
          </div>

          {/* Stats Grid */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
              <div className="flex items-center text-sm text-gray-600">
                <BoltIcon className="h-4 w-4 mr-1" />
                Live Data
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statsData.map((stat) => (
                <EnhancedStatCard key={stat.title} {...stat} />
              ))}
            </div>
          </section>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {quickActions.map((action) => (
                  <QuickActionCard key={action.title} {...action} />
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Latest Updates</h3>
                    <Link 
                      href="/analytics" 
                      className="text-sm font-medium hover:opacity-80 transition-opacity"
                      style={{ color: '#0f4c81' }}
                    >
                      View All
                    </Link>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {recentActivities.map((activity, index) => (
                    <ActivityItem key={index} {...activity} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <section className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Performance Insights</h2>
                <p className="text-gray-600">Your AI assistant's performance this week</p>
              </div>
              <Link 
                href="/analytics"
                className="inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors"
                style={{ 
                  backgroundColor: '#0f4c81',
                  color: 'white'
                }}
              >
                <ChartBarIcon className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                <div className="inline-flex p-3 bg-blue-100 rounded-xl mb-4">
                  <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Response Time</h3>
                <p className="text-3xl font-bold text-blue-600 mb-1">1.2s</p>
                <p className="text-sm text-gray-600">Average response time</p>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                <div className="inline-flex p-3 bg-green-100 rounded-xl mb-4">
                  <SparklesIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Accuracy</h3>
                <p className="text-3xl font-bold text-green-600 mb-1">94%</p>
                <p className="text-sm text-gray-600">Answer accuracy rate</p>
              </div>
              
              <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl">
                <div className="inline-flex p-3 bg-purple-100 rounded-xl mb-4">
                  <UserGroupIcon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Satisfaction</h3>
                <p className="text-3xl font-bold text-purple-600 mb-1">4.8</p>
                <p className="text-sm text-gray-600">User satisfaction score</p>
              </div>
            </div>
          </section>
        </div>
      </Layout>
    </PrivateRoute>
  );
}
