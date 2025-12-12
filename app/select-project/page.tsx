"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SelectProject() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleProjectSelect = (project: string) => {
    if (project === "V") {
      // Navigate to Project V
      if (user?.role === "CONTRIBUTOR") {
        router.push("/project-v/contributor");
      } else if (user?.role === "REVIEWER" || user?.role === "ADMIN") {
        router.push("/project-v/reviewer");
      }
    } else if (project === "X") {
      // Navigate to existing Project X (current implementation)
      if (user?.role === "CONTRIBUTOR") {
        router.push("/contributor");
      } else if (user?.role === "REVIEWER") {
        router.push("/reviewer");
      } else if (user?.role === "ADMIN") {
        router.push("/admin");
      }
    }
    // Project Z is paused, no navigation
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome, {user?.name}!
          </h1>
          <p className="text-lg text-gray-600">
            Select a project to continue
          </p>
        </div>

        {/* Project Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Project X */}
          <div className="relative group cursor-not-allowed transform transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl opacity-50 blur-xl"></div>
            <div className="relative bg-white rounded-2xl p-8 shadow-xl border-4 border-yellow-500 opacity-75">
              <div className="absolute top-4 right-4">
                <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  PAUSED
                </span>
              </div>
              <div className="mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  X
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Project X
              </h3>
              <p className="text-gray-600 mb-4">
                Task submission and review platform
              </p>
              <div className="flex items-center text-sm text-yellow-700 font-semibold">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Currently on hold
              </div>
            </div>
          </div>

          {/* Project V */}
          <div
            onClick={() => handleProjectSelect("V")}
            className="relative group cursor-pointer transform transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl opacity-75 blur-xl group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-white rounded-2xl p-8 shadow-xl border-2 border-yellow-200 hover:border-yellow-500 transition-colors">
              <div className="absolute top-4 right-4">
                <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  ACTIVE
                </span>
              </div>
              <div className="mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  V
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Project V
              </h3>
              <p className="text-gray-600 mb-4">
                Automated Docker testing platform
              </p>
              <div className="flex items-center text-sm text-green-700 font-semibold">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Click to start
              </div>
            </div>
          </div>

          {/* Project Z */}
          <div className="relative group cursor-not-allowed transform transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-500 rounded-2xl opacity-50 blur-xl"></div>
            <div className="relative bg-white rounded-2xl p-8 shadow-xl border-4 border-red-500 opacity-75">
              <div className="absolute top-4 right-4">
                <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  PAUSED
                </span>
              </div>
              <div className="mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                  Z
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Project Z
              </h3>
              <p className="text-gray-600 mb-4">
                Advanced analytics platform
              </p>
              <div className="flex items-center text-sm text-red-700 font-semibold">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Currently on hold
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="mt-12 text-center">
          <button
            onClick={() => {
              localStorage.removeItem("authToken");
              router.push("/");
            }}
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
