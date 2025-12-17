"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

interface Stats {
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  projectXStats: {
    total: number;
    pending: number;
    claimed: number;
    approved: number;
  };
  projectVStats: {
    total: number;
    submitted: number;
    inReview: number;
    approved: number;
  };
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    } else if (user) {
      fetchStats();
    }
  }, [user, loading, router]);

  const fetchStats = async () => {
    try {
      
      const projectXData = await apiClient.getSubmissions();

      
      const projectVData = await apiClient.getProjectVSubmissions();

      
      const statsData: Stats = {
        totalSubmissions: projectXData.length + projectVData.length,
        pendingSubmissions: projectXData.filter((s: any) => s.status === "PENDING").length +
                           projectVData.filter((s: any) => s.status === "TASK_SUBMITTED").length,
        approvedSubmissions: projectXData.filter((s: any) => s.status === "APPROVED").length +
                            projectVData.filter((s: any) => s.status === "APPROVED").length,
        projectXStats: {
          total: projectXData.length,
          pending: projectXData.filter((s: any) => s.status === "PENDING").length,
          claimed: projectXData.filter((s: any) => s.status === "CLAIMED").length,
          approved: projectXData.filter((s: any) => s.status === "APPROVED").length,
        },
        projectVStats: {
          total: projectVData.length,
          submitted: projectVData.filter((s: any) => s.status === "TASK_SUBMITTED").length,
          inReview: projectVData.filter((s: any) => s.status === "ELIGIBLE_FOR_MANUAL_REVIEW" || s.status === "FINAL_CHECKS").length,
          approved: projectVData.filter((s: any) => s.status === "APPROVED").length,
        },
      };

      setStats(statsData);
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>
            <p className="text-gray-300 mt-1">Welcome back, {user?.name}!</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/profile")}
              className="px-4 py-2 text-gray-300 hover:text-white font-medium"
            >
              Profile
            </button>
            {user?.role === "ADMIN" && (
              <button
                onClick={() => router.push("/admin")}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Admin Panel
              </button>
            )}
            <button
              onClick={() => router.push("/select-project")}
              className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium rounded-lg transition-colors"
            >
              Go to Projects
            </button>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Submissions"
            value={stats?.totalSubmissions || 0}
            icon="📊"
            color="blue"
          />
          <StatCard
            title="Pending Review"
            value={stats?.pendingSubmissions || 0}
            icon="⏳"
            color="yellow"
          />
          <StatCard
            title="Approved"
            value={stats?.approvedSubmissions || 0}
            icon="✅"
            color="green"
          />
        </div>

        {/* Admin Message */}
        {user?.role === "ADMIN" && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="text-4xl">👑</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Admin Powers Active</h3>
                <p className="text-gray-700">
                  You have full administrative access. Only you can approve tasks across all projects.
                </p>
              </div>
              <button
                onClick={() => router.push("/admin")}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-lg transition-all transform hover:scale-105 whitespace-nowrap"
              >
                Admin Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Project-wise Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Project X Stats */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-6 opacity-60">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Project X</h2>
              <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
                PAUSED
              </span>
            </div>
            <div className="space-y-4">
              <ProjectStatRow
                label="Total Submissions"
                value={stats?.projectXStats.total || 0}
                color="gray"
              />
              <ProjectStatRow
                label="Pending"
                value={stats?.projectXStats.pending || 0}
                color="blue"
              />
              <ProjectStatRow
                label="Claimed"
                value={stats?.projectXStats.claimed || 0}
                color="purple"
              />
              <ProjectStatRow
                label="Approved"
                value={stats?.projectXStats.approved || 0}
                color="green"
              />
            </div>
            <button
              disabled
              className="mt-6 w-full bg-gray-100 text-gray-400 font-semibold py-2 rounded-lg cursor-not-allowed"
            >
              Project Paused
            </button>
          </div>

          {/* Project V Stats */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Project V</h2>
              <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                ACTIVE
              </span>
            </div>
            <div className="space-y-4">
              <ProjectStatRow
                label="Total Submissions"
                value={stats?.projectVStats.total || 0}
                color="gray"
              />
              <ProjectStatRow
                label="Task Submitted"
                value={stats?.projectVStats.submitted || 0}
                color="blue"
              />
              <ProjectStatRow
                label="In Review"
                value={stats?.projectVStats.inReview || 0}
                color="yellow"
              />
              <ProjectStatRow
                label="Approved"
                value={stats?.projectVStats.approved || 0}
                color="green"
              />
            </div>
            <button
              onClick={() => {
                if (user?.role === "CONTRIBUTOR") router.push("/project-v/contributor");
                else if (user?.role === "TESTER") router.push("/project-v/tester");
                else if (user?.role === "REVIEWER") router.push("/project-v/reviewer");
                else if (user?.role === "ADMIN") router.push("/project-v/admin");
              }}
              className="mt-6 w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-2 rounded-lg transition-colors"
            >
              View Project V
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Quick Links</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <QuickLink
              title="Profile"
              icon="👤"
              onClick={() => router.push("/profile")}
            />
            <QuickLink
              title="Projects"
              icon="📁"
              onClick={() => router.push("/select-project")}
            />
            {user?.role === "ADMIN" && (
              <QuickLink
                title="Admin Panel"
                icon="⚙️"
                onClick={() => router.push("/admin")}
              />
            )}
            <QuickLink
              title="Logout"
              icon="🚪"
              onClick={handleLogout}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    yellow: "from-yellow-400 to-yellow-500",
    orange: "from-orange-500 to-orange-600",
    green: "from-green-500 to-green-600",
  };

  return (
    <div
      className={`bg-gradient-to-br ${
        colorClasses[color as keyof typeof colorClasses]
      } rounded-xl shadow-lg p-6 text-white`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-4xl">{icon}</span>
        <span className="text-4xl font-bold">{value}</span>
      </div>
      <h3 className="text-lg font-semibold opacity-90">{title}</h3>
    </div>
  );
}

function ProjectStatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const colorClasses = {
    gray: "bg-gray-100 text-gray-800",
    blue: "bg-blue-100 text-blue-800",
    purple: "bg-purple-100 text-purple-800",
    yellow: "bg-yellow-100 text-yellow-800",
    green: "bg-green-100 text-green-800",
  };

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-gray-700">{label}</span>
      <span
        className={`${
          colorClasses[color as keyof typeof colorClasses]
        } font-bold px-3 py-1 rounded-full text-sm`}
      >
        {value}
      </span>
    </div>
  );
}

function QuickLink({
  title,
  icon,
  onClick,
}: {
  title: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
    >
      <span className="text-3xl mb-2">{icon}</span>
      <span className="text-sm font-medium text-gray-200">{title}</span>
    </button>
  );
}
