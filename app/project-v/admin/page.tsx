"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ToastContainer";
import { apiClient } from "@/lib/api-client";
import Breadcrumb from "@/components/Breadcrumb";
import { CompactThemeToggle } from "@/components/ThemeToggle";

interface Submission {
  id: string;
  title: string;
  language: string;
  category: string;
  difficulty: string;
  description: string;
  githubRepo: string;
  commitHash: string;
  issueUrl: string;
  testPatchUrl: string;
  dockerfileUrl: string;
  solutionPatchUrl: string;
  status: string;
  reviewerFeedback?: string;
  testerFeedback?: string;
  hasChangesRequested: boolean;
  changesDone: boolean;
  accountPostedIn?: string;
  taskLink?: string;
  taskLinkSubmitted?: string;
  submittedAccount?: string;
  rejectionReason?: string;
  createdAt: string;
  contributor?: { id: string; name: string; email: string };
  tester?: { id: string; name: string; email: string };
  reviewer?: { id: string; name: string; email: string };
  processingLogs?: string;
  processingComplete?: boolean;
  cloneSuccess?: boolean;
  cloneError?: string;
  testPatchSuccess?: boolean;
  testPatchError?: string;
  dockerBuildSuccess?: boolean;
  dockerBuildError?: string;
  baseTestSuccess?: boolean;
  baseTestError?: string;
  newTestSuccess?: boolean;
  newTestError?: string;
  solutionPatchSuccess?: boolean;
  solutionPatchError?: string;
  finalBaseTestSuccess?: boolean;
  finalBaseTestError?: string;
  finalNewTestSuccess?: boolean;
  finalNewTestError?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isApproved: boolean;
  isGreenLight: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ProjectVAdmin() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [feedback, setFeedback] = useState<string>("");
  const [accountPosted, setAccountPosted] = useState<string>("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUsersSection, setShowUsersSection] = useState(false); 
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [usersLoaded, setUsersLoaded] = useState(false); 

  
  const [viewMode, setViewMode] = useState<"kanban" | "all">("all"); 
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSubmissions = useCallback(async () => {
    try {
      
      const data = await apiClient.getAllProjectVSubmissions({ limit: 500 });
      setSubmissions(data.submissions || []);
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
      showToast("Failed to fetch submissions", "error");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [showToast]);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await apiClient.getUsers();
      setUsers(data || []);
      setUsersLoaded(true);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      const errorMsg = error.response?.data?.error || error.message || "Failed to fetch users";
      showToast(`Failed to fetch users: ${errorMsg}`, "error");
      setUsers([]); 
      setUsersLoaded(false);
    } finally {
      setLoadingUsers(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/");
    } else if (user) {
      fetchSubmissions();
      
    }
  }, [user, loading, router, fetchSubmissions]);

  
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSubmissions();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSubmissions]);

  const handleRequestChanges = async () => {
    if (!selectedSubmission) return;
    if (!feedback.trim()) {
      showToast("Please provide feedback", "error");
      return;
    }

    setProcessing(true);
    try {
      await apiClient.markChangesRequested(selectedSubmission.id, feedback);
      showToast("✅ Changes requested successfully", "success");
      setShowFeedbackDialog(false);
      setFeedback("");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to request changes", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleFinalChecks = async (submissionId: string) => {
    setProcessing(true);
    try {
      await apiClient.markFinalChecks(submissionId);
      showToast("✅ Marked for final checks successfully", "success");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to mark for final checks", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (submissionId: string) => {
    if (!accountPosted.trim()) {
      showToast("Please enter the account where task was posted", "error");
      return;
    }

    setProcessing(true);
    try {
      await apiClient.updateProjectVStatus(submissionId, "APPROVED", accountPosted);
      showToast("✅ Submission approved successfully!", "success");
      setAccountPosted("");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to approve submission", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  
  const handleApproveUser = async (userId: string) => {
    setProcessing(true);
    try {
      await apiClient.approveTester(userId);
      showToast("✅ User approved successfully", "success");
      fetchUsers();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to approve user", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleGreenLight = async (userId: string) => {
    setProcessing(true);
    try {
      await apiClient.toggleGreenLight(userId);
      showToast("✅ Green light status updated", "success");
      fetchUsers();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to update green light status", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleSwitchRole = async (userId: string, newRole: string) => {
    setProcessing(true);
    try {
      await apiClient.switchUserRole(userId, newRole);
      showToast("✅ Role switched successfully", "success");
      fetchUsers();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to switch role", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    setProcessing(true);
    try {
      await apiClient.deleteUser(userId);
      showToast("✅ User deleted successfully", "success");
      fetchUsers();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to delete user", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteProjectVSubmission = async (submissionId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete submission "${title}"? This action cannot be undone and will delete all associated files.`)) {
      return;
    }
    setProcessing(true);
    try {
      await apiClient.deleteProjectVSubmission(submissionId);
      showToast("✅ Submission deleted successfully", "success");
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to delete submission", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleUsersSection = () => {
    const newState = !showUsersSection;
    setShowUsersSection(newState);

    
    if (newState && !usersLoaded) {
      fetchUsers();
    }
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      TASK_SUBMITTED: "bg-gradient-to-r from-gray-500 to-gray-600 text-white",
      IN_TESTING: "bg-gradient-to-r from-yellow-500 to-orange-500 text-white",
      TASK_SUBMITTED_TO_PLATFORM: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white glow",
      PENDING_REVIEW: "bg-gradient-to-r from-indigo-500 to-purple-500 text-white",
      CHANGES_REQUESTED: "bg-gradient-to-r from-orange-500 to-red-500 text-white",
      CHANGES_DONE: "bg-gradient-to-r from-teal-500 to-cyan-500 text-white",
      ELIGIBLE_FOR_MANUAL_REVIEW: "bg-gradient-to-r from-purple-500 to-pink-500 text-white glow-purple",
      FINAL_CHECKS: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white glow",
      APPROVED: "bg-gradient-to-r from-green-500 to-emerald-500 text-white glow-green",
      REJECTED: "bg-gradient-to-r from-red-600 to-pink-600 text-white",
      REWORK: "bg-gradient-to-r from-amber-500 to-orange-600 text-white",
      REWORK_DONE: "bg-gradient-to-r from-lime-500 to-green-500 text-white",
    };
    return statusMap[status] || "bg-gray-500 text-white";
  };

  
  const submittedTasks = submissions.filter(s => s.status === "TASK_SUBMITTED_TO_PLATFORM");
  const eligibleTasks = submissions.filter(s => s.status === "ELIGIBLE_FOR_MANUAL_REVIEW");
  const finalChecksTasks = submissions.filter(s => s.status === "FINAL_CHECKS");
  const approvedTasks = submissions.filter(s => s.status === "APPROVED");

  
  const filteredSubmissions = submissions.filter(s => {
    const query = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(query) ||
      s.status.toLowerCase().includes(query) ||
      s.contributor?.name.toLowerCase().includes(query) ||
      s.tester?.name.toLowerCase().includes(query) ||
      s.reviewer?.name.toLowerCase().includes(query)
    );
  });

  
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  
  const contributors = filteredUsers.filter(u => u.role === "CONTRIBUTOR");
  const reviewers = filteredUsers.filter(u => u.role === "REVIEWER");
  const testers = filteredUsers.filter(u => u.role === "TESTER");

  if (loading || loadingSubmissions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-orange-900 relative overflow-hidden">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full blur-3xl opacity-20 floating"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '2s' }}></div>
      </div>

      <nav className="backdrop-blur-xl bg-gray-800/40 border-b border-gray-700/50 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 animate-slide-in-left">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 via-orange-600 to-pink-600 flex items-center justify-center shadow-xl animate-pulse-glow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-red-400 via-orange-400 to-pink-400 bg-clip-text text-transparent">
                  Project V - Admin Dashboard
                </h1>
                <p className="text-xs md:text-sm font-medium text-gray-400 hidden sm:block">Manage All Tasks Across Workflow</p>
              </div>
            </div>

            <div className="hidden md:flex gap-3 animate-slide-in-right items-center">
              <CompactThemeToggle />
              <button onClick={() => router.push('/admin')}
                className="px-5 py-2.5 bg-purple-600/80 backdrop-blur-sm text-white rounded-xl hover:bg-purple-700/80 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl border border-purple-500/50 flex items-center gap-2"
                title="Manage users, view stats, and access admin tools">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Manage Users
              </button>
              <button onClick={() => router.push('/select-project')}
                className="px-5 py-2.5 bg-gray-700/50 backdrop-blur-sm text-gray-200 rounded-xl hover:bg-gray-600/60 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl border border-gray-600">
                Switch Project
              </button>
              <button onClick={() => router.push('/profile')}
                className="px-5 py-2.5 bg-gray-700/50 backdrop-blur-sm text-gray-200 rounded-xl hover:bg-gray-600/60 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl border border-gray-600">
                Profile
              </button>
              <button onClick={handleLogout}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl">
                Logout
              </button>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden mt-4 space-y-2 pb-4 animate-slide-up">
              <div className="flex justify-center mb-2">
                <CompactThemeToggle />
              </div>
              <button onClick={() => { router.push('/admin'); setMobileMenuOpen(false); }}
                className="w-full px-5 py-2.5 bg-purple-600/80 backdrop-blur-sm text-white rounded-xl hover:bg-purple-700/80 transition-all duration-300 font-semibold shadow-md border border-purple-500/50 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Manage Users
              </button>
              <button onClick={() => { router.push('/select-project'); setMobileMenuOpen(false); }}
                className="w-full px-5 py-2.5 bg-gray-700/50 backdrop-blur-sm text-gray-200 rounded-xl hover:bg-gray-600/60 transition-all duration-300 font-semibold shadow-md border border-gray-600">
                Switch Project
              </button>
              <button onClick={() => { router.push('/profile'); setMobileMenuOpen(false); }}
                className="w-full px-5 py-2.5 bg-gray-700/50 backdrop-blur-sm text-gray-200 rounded-xl hover:bg-gray-600/60 transition-all duration-300 font-semibold shadow-md border border-gray-600">
                Profile
              </button>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-300 font-semibold shadow-md">
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-8 relative z-10">

        <Breadcrumb />

        <div className="mb-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="text-3xl">👑</div>
            <div>
              <h3 className="text-lg font-bold text-red-300">Administrator GOD MODE Active</h3>
              <p className="text-sm text-gray-300">Complete visibility over all submissions and feedback across the platform</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2 bg-gray-800/40 backdrop-blur-sm rounded-xl shadow-xl p-1.5 border border-gray-700/50">
              <button
                onClick={() => setViewMode("all")}
                className={`px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                  viewMode === "all"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105"
                    : "text-gray-300 hover:bg-gray-700/50"
                }`}
              >
                📊 All Submissions ({submissions.length})
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`px-6 py-3 rounded-lg text-sm font-bold transition-all duration-300 ${
                  viewMode === "kanban"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105"
                    : "text-gray-300 hover:bg-gray-700/50"
                }`}
              >
                📋 Kanban View
              </button>
            </div>

            <button
              onClick={async () => {
                if (!confirm("Reassign all pending tasks to active testers?")) return;
                setProcessing(true);
                try {
                  const result = await apiClient.reassignPendingProjectVTasks();
                  showToast(`✅ Successfully assigned ${result.assignedCount} pending tasks`, "success");
                  fetchSubmissions();
                } catch (error: any) {
                  showToast(error.response?.data?.error || "Failed to reassign tasks", "error");
                } finally {
                  setProcessing(false);
                }
              }}
              disabled={processing}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🔄 Reassign Pending Tasks
            </button>
          </div>

          {viewMode === "all" && (
            <div className="relative w-full sm:w-96">
              <input
                type="text"
                placeholder="🔍 Search by title, status, contributor, tester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3 pl-12 border-2 border-gray-700/50 rounded-xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-800/40 backdrop-blur-sm shadow-xl transition-all duration-300 text-white placeholder-gray-400 font-medium"
              />
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            </div>
          )}
        </div>

        {viewMode === "kanban" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>

          <TaskColumn
            title="📥 Submitted Tasks"
            count={submittedTasks.length}
            color="blue"
            tasks={submittedTasks}
            onTaskClick={setSelectedSubmission}
            onDelete={handleDeleteProjectVSubmission}
          />

          <TaskColumn
            title="🔍 Eligible for Review"
            count={eligibleTasks.length}
            color="purple"
            tasks={eligibleTasks}
            onTaskClick={setSelectedSubmission}
            onDelete={handleDeleteProjectVSubmission}
          />

          <TaskColumn
            title="✅ Final Checks"
            count={finalChecksTasks.length}
            color="cyan"
            tasks={finalChecksTasks}
            onTaskClick={setSelectedSubmission}
            onDelete={handleDeleteProjectVSubmission}
          />

          <TaskColumn
            title="🎉 Approved"
            count={approvedTasks.length}
            color="green"
            tasks={approvedTasks}
            onTaskClick={setSelectedSubmission}
            onDelete={handleDeleteProjectVSubmission}
          />

        </div>
        )}

        {viewMode === "all" && (
          <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {filteredSubmissions.length === 0 ? (
              <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl shadow-xl p-12 text-center border-2 border-gray-700/50">
                <div className="text-gray-400 text-6xl mb-4">📭</div>
                <p className="text-gray-300 text-lg font-semibold">
                  {searchQuery ? 'No submissions match your search.' : 'No submissions found.'}
                </p>
              </div>
            ) : (
              filteredSubmissions.map((submission) => (
                <div key={submission.id} className="bg-gray-800/40 backdrop-blur-sm rounded-2xl shadow-xl p-6 border-2 border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedSubmission(submission)}>
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-3">{submission.title}</h3>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(submission.status)}`}>
                          {submission.status.replace(/_/g, " ")}
                        </span>
                        <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold border border-blue-500/30">
                          {submission.language}
                        </span>
                        <span className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-full text-sm font-semibold border border-purple-500/30">
                          {submission.difficulty}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <div className="bg-gray-700/30 rounded-lg p-3 border border-green-500/30">
                          <div className="text-green-400 font-semibold mb-1">📝 Contributor</div>
                          <div className="text-white">{submission.contributor?.name || "Unknown"}</div>
                          <div className="text-gray-400 text-xs">{submission.contributor?.email}</div>
                        </div>

                        <div className="bg-gray-700/30 rounded-lg p-3 border border-blue-500/30">
                          <div className="text-blue-400 font-semibold mb-1">🧪 Tester</div>
                          {submission.tester ? (
                            <>
                              <div className="text-white">{submission.tester.name}</div>
                              <div className="text-gray-400 text-xs">{submission.tester.email}</div>
                            </>
                          ) : (
                            <div className="text-gray-500">Not assigned</div>
                          )}
                        </div>

                        <div className="bg-gray-700/30 rounded-lg p-3 border border-orange-500/30">
                          <div className="text-orange-400 font-semibold mb-1">👁️ Reviewer</div>
                          {submission.reviewer ? (
                            <>
                              <div className="text-white">{submission.reviewer.name}</div>
                              <div className="text-gray-400 text-xs">{submission.reviewer.email}</div>
                            </>
                          ) : (
                            <div className="text-gray-500">Not assigned</div>
                          )}
                        </div>
                      </div>

                      {(submission.testerFeedback || submission.reviewerFeedback) && (
                        <div className="mt-4 space-y-2">
                          {submission.testerFeedback && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                              <div className="text-blue-300 font-semibold text-xs mb-1">💬 Tester Feedback</div>
                              <div className="text-gray-200 text-sm line-clamp-2">{submission.testerFeedback}</div>
                            </div>
                          )}
                          {submission.reviewerFeedback && (
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                              <div className="text-orange-300 font-semibold text-xs mb-1">📢 Reviewer Feedback</div>
                              <div className="text-gray-200 text-sm line-clamp-2">{submission.reviewerFeedback}</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-gray-400">
                        {new Date(submission.createdAt).toLocaleDateString()}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProjectVSubmission(submission.id, submission.title);
                        }}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all duration-300 border border-red-500/30 font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div className="mt-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>

          <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border-2 border-gray-700/50 overflow-hidden shadow-xl">
            <button
              onClick={handleToggleUsersSection}
              className="w-full p-6 flex justify-between items-center hover:bg-gray-700/30 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h2 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    User Management
                  </h2>
                  <p className="text-sm text-gray-400 font-medium">
                    {usersLoaded
                      ? `${users.length} total users • ${contributors.length} Contributors • ${reviewers.length} Reviewers • ${testers.length} Testers`
                      : "Click to load and manage users"
                    }
                  </p>
                </div>
              </div>
              <svg
                className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${showUsersSection ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUsersSection && (
              <div className="p-6 border-t-2 border-gray-700/50 space-y-6">

                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Search users by name, email, or role..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full px-5 py-3 pl-12 rounded-xl border-2 border-gray-700 bg-gray-900/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all duration-300"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <button
                    onClick={fetchUsers}
                    disabled={loadingUsers}
                    className="px-5 py-3 bg-purple-600/80 hover:bg-purple-700/80 text-white rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
                  >
                    <svg className={`w-5 h-5 ${loadingUsers ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>

                {loadingUsers ? (
                  <div className="flex justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-gray-400 font-medium">Loading users...</p>
                    </div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">👥</div>
                    <p className="text-gray-400 font-medium">No users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-700/50">
                          <th className="text-left py-4 px-4 text-sm font-bold text-gray-300">Name</th>
                          <th className="text-left py-4 px-4 text-sm font-bold text-gray-300">Email</th>
                          <th className="text-left py-4 px-4 text-sm font-bold text-gray-300">Role</th>
                          <th className="text-center py-4 px-4 text-sm font-bold text-gray-300">Status</th>
                          <th className="text-center py-4 px-4 text-sm font-bold text-gray-300">Green Light</th>
                          <th className="text-left py-4 px-4 text-sm font-bold text-gray-300">Joined</th>
                          <th className="text-center py-4 px-4 text-sm font-bold text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors duration-200">
                            <td className="py-4 px-4">
                              <div className="font-semibold text-white">{u.name}</div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-gray-300 text-sm">{u.email}</div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                                u.role === "CONTRIBUTOR" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                                u.role === "REVIEWER" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                                "bg-green-500/20 text-green-300 border border-green-500/30"
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              {u.role === "TESTER" && !u.isApproved ? (
                                <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                  Pending
                                </span>
                              ) : (
                                <span className="inline-flex px-3 py-1 text-xs font-bold rounded-full bg-green-500/20 text-green-300 border border-green-500/30">
                                  Active
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-center">
                              {(u.role === "REVIEWER" || u.role === "TESTER") && u.isApproved ? (
                                <button
                                  onClick={() => handleToggleGreenLight(u.id)}
                                  disabled={processing}
                                  className={`p-2 rounded-lg transition-all duration-300 ${
                                    u.isGreenLight
                                      ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                      : "bg-gray-600/20 text-gray-400 hover:bg-gray-600/30"
                                  }`}
                                  title={u.isGreenLight ? "Deactivate (turn off green light)" : "Activate (turn on green light)"}
                                >
                                  {u.isGreenLight ? "🟢" : "⚫"}
                                </button>
                              ) : (
                                <span className="text-gray-500 text-sm">-</span>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              <div className="text-gray-400 text-sm">
                                {new Date(u.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex gap-2 justify-center">
                                {u.role === "TESTER" && !u.isApproved && (
                                  <button
                                    onClick={() => handleApproveUser(u.id)}
                                    disabled={processing}
                                    className="px-3 py-1.5 bg-green-600/80 hover:bg-green-700/80 text-white text-xs font-semibold rounded-lg transition-all duration-300 disabled:opacity-50"
                                    title="Approve tester"
                                  >
                                    Approve
                                  </button>
                                )}
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleSwitchRole(u.id, e.target.value);
                                      e.target.value = "";
                                    }
                                  }}
                                  disabled={processing}
                                  className="px-3 py-1.5 bg-gray-700/80 hover:bg-gray-600/80 text-white text-xs font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 cursor-pointer"
                                  title="Switch user role"
                                >
                                  <option value="">Switch Role</option>
                                  {u.role !== "CONTRIBUTOR" && <option value="CONTRIBUTOR">→ Contributor</option>}
                                  {u.role !== "REVIEWER" && <option value="REVIEWER">→ Reviewer</option>}
                                  {u.role !== "TESTER" && <option value="TESTER">→ Tester</option>}
                                </select>
                                <button
                                  onClick={() => handleDeleteUser(u.id, u.name)}
                                  disabled={processing}
                                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-700/80 text-white text-xs font-semibold rounded-lg transition-all duration-300 disabled:opacity-50"
                                  title="Delete user"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedSubmission && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800/95 backdrop-blur-2xl border-2 border-gray-700/50 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl custom-scrollbar">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent mb-2">
                    {selectedSubmission.title}
                  </h3>
                  <p className="text-gray-300">Submitted by <span className="font-semibold text-white">{selectedSubmission.contributor?.name}</span></p>
                </div>
                <button onClick={() => { setSelectedSubmission(null); setShowFeedbackDialog(false); setFeedback(""); setAccountPosted(""); }}
                  className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-300 hover:scale-110">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50">
                    <div className="text-xs text-gray-400 font-semibold mb-2">Status</div>
                    <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-lg ${getStatusColor(selectedSubmission.status)}`}>
                      {selectedSubmission.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50">
                    <div className="text-xs text-gray-400 font-semibold mb-1">Language</div>
                    <div className="text-white font-bold">{selectedSubmission.language}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50">
                    <div className="text-xs text-gray-400 font-semibold mb-1">Category</div>
                    <div className="text-white font-bold">{selectedSubmission.category}</div>
                  </div>
                  <div className="bg-gray-700/50 rounded-xl p-4 border border-gray-600/50">
                    <div className="text-xs text-gray-400 font-semibold mb-1">Difficulty</div>
                    <div className="text-white font-bold">{selectedSubmission.difficulty}</div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-2 border-purple-500/30 rounded-xl p-5">
                  <h4 className="font-bold text-purple-300 mb-4 text-lg">👥 Team & People Involved</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-green-500/30">
                      <div className="text-xs text-green-400 font-semibold mb-2">📝 Contributor</div>
                      {selectedSubmission.contributor ? (
                        <>
                          <div className="text-white font-bold">{selectedSubmission.contributor.name}</div>
                          <div className="text-gray-400 text-sm">{selectedSubmission.contributor.email}</div>
                        </>
                      ) : (
                        <div className="text-gray-500 text-sm">Not assigned</div>
                      )}
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/30">
                      <div className="text-xs text-blue-400 font-semibold mb-2">🧪 Tester</div>
                      {selectedSubmission.tester ? (
                        <>
                          <div className="text-white font-bold">{selectedSubmission.tester.name}</div>
                          <div className="text-gray-400 text-sm">{selectedSubmission.tester.email}</div>
                        </>
                      ) : (
                        <div className="text-gray-500 text-sm">Not assigned</div>
                      )}
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 border border-orange-500/30">
                      <div className="text-xs text-orange-400 font-semibold mb-2">👁️ Reviewer</div>
                      {selectedSubmission.reviewer ? (
                        <>
                          <div className="text-white font-bold">{selectedSubmission.reviewer.name}</div>
                          <div className="text-gray-400 text-sm">{selectedSubmission.reviewer.email}</div>
                        </>
                      ) : (
                        <div className="text-gray-500 text-sm">Not assigned</div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedSubmission.taskLink && (
                  <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                    <h4 className="font-bold text-gray-200 mb-3">🔗 Task Link:</h4>
                    <a href={selectedSubmission.taskLink} target="_blank" rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 text-sm break-all hover:underline font-medium">
                      {selectedSubmission.taskLink}
                    </a>
                  </div>
                )}

                {selectedSubmission.accountPostedIn && (
                  <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                    <h4 className="font-bold text-gray-200 mb-2">📱 Account Posted In:</h4>
                    <p className="text-white font-medium">{selectedSubmission.accountPostedIn}</p>
                  </div>
                )}

                {selectedSubmission.reviewer && (
                  <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                    <h4 className="font-bold text-gray-200 mb-2">👤 Reviewer:</h4>
                    <p className="text-white font-medium">{selectedSubmission.reviewer.name}</p>
                  </div>
                )}

                <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                  <h4 className="font-bold text-gray-200 mb-2 text-lg">📝 Description:</h4>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedSubmission.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                    <h4 className="font-bold text-gray-200 mb-3">🔗 Repository:</h4>
                    <a href={selectedSubmission.githubRepo} target="_blank" rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 text-sm break-all hover:underline font-medium">
                      {selectedSubmission.githubRepo}
                    </a>
                  </div>
                  <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                    <h4 className="font-bold text-gray-200 mb-3">🎯 Issue:</h4>
                    <a href={selectedSubmission.issueUrl} target="_blank" rel="noopener noreferrer"
                      className="text-yellow-400 hover:text-yellow-300 text-sm break-all hover:underline font-medium">
                      View Issue →
                    </a>
                  </div>
                </div>

                {selectedSubmission.reviewerFeedback && (
                  <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-orange-300 mb-3 text-lg">📢 Reviewer Feedback:</h4>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedSubmission.reviewerFeedback}</p>
                  </div>
                )}

                {selectedSubmission.testerFeedback && (
                  <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-blue-300 mb-3 text-lg">💬 Tester Feedback:</h4>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedSubmission.testerFeedback}</p>
                  </div>
                )}

                {(selectedSubmission.submittedAccount || selectedSubmission.rejectionReason) && (
                  <div className="bg-gray-700/30 border border-gray-600 rounded-xl p-5">
                    <h4 className="font-bold text-gray-200 mb-3 text-lg">ℹ️ Additional Information</h4>
                    <div className="space-y-2 text-sm">
                      {selectedSubmission.submittedAccount && (
                        <div>
                          <span className="text-gray-400 font-semibold">Submitted Account:</span>
                          <span className="text-white ml-2">{selectedSubmission.submittedAccount}</span>
                        </div>
                      )}
                      {selectedSubmission.rejectionReason && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-2">
                          <span className="text-red-400 font-semibold">Rejection Reason:</span>
                          <p className="text-gray-200 mt-1 whitespace-pre-wrap">{selectedSubmission.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(selectedSubmission.status === "ELIGIBLE_FOR_MANUAL_REVIEW" || selectedSubmission.status === "FINAL_CHECKS") && (
                  <div className="border-t-2 border-gray-700 pt-6">
                    <h4 className="font-bold text-white mb-4 text-lg">👑 Admin Actions:</h4>

                    {!showFeedbackDialog ? (
                      <div className="space-y-3">
                        {selectedSubmission.status === "FINAL_CHECKS" && (
                          <div className="mb-4">
                            <label className="block text-sm font-bold mb-2.5 text-gray-200">Account Where Task Posted *</label>
                            <input type="text" value={accountPosted} onChange={(e) => setAccountPosted(e.target.value)}
                              placeholder="e.g., @username or account URL" disabled={processing}
                              className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium" />
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button onClick={() => setShowFeedbackDialog(true)} disabled={processing}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            Request Changes
                          </button>

                          {selectedSubmission.status === "FINAL_CHECKS" ? (
                            <button onClick={() => handleApprove(selectedSubmission.id)} disabled={processing || !accountPosted.trim()}
                              className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow">
                              {processing ? "Approving..." : "✓ Approve Submission"}
                            </button>
                          ) : (
                            <button onClick={() => handleFinalChecks(selectedSubmission.id)} disabled={processing}
                              className="flex-1 px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                              {processing ? "Processing..." : "→ Mark for Final Checks"}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2.5 text-gray-200">Feedback for Contributor: *</label>
                          <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={6}
                            placeholder="Provide detailed feedback on what needs to be changed..." disabled={processing}
                            className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 font-medium" />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleRequestChanges} disabled={processing || !feedback.trim()}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            {processing ? "Submitting..." : "Submit Feedback"}
                          </button>
                          <button onClick={() => { setShowFeedbackDialog(false); setFeedback(""); }} disabled={processing}
                            className="px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-105 disabled:opacity-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskColumn({
  title,
  count,
  color,
  tasks,
  onTaskClick,
  onDelete
}: {
  title: string;
  count: number;
  color: string;
  tasks: Submission[];
  onTaskClick: (task: Submission) => void;
  onDelete: (id: string, title: string) => void;
}) {
  const colorClasses = {
    blue: {
      gradient: "from-blue-600 to-cyan-600",
      border: "border-blue-500/30",
      bg: "bg-blue-500/10",
      text: "text-blue-300",
    },
    purple: {
      gradient: "from-purple-600 to-pink-600",
      border: "border-purple-500/30",
      bg: "bg-purple-500/10",
      text: "text-purple-300",
    },
    cyan: {
      gradient: "from-cyan-600 to-blue-600",
      border: "border-cyan-500/30",
      bg: "bg-cyan-500/10",
      text: "text-cyan-300",
    },
    green: {
      gradient: "from-green-600 to-emerald-600",
      border: "border-green-500/30",
      bg: "bg-green-500/10",
      text: "text-green-300",
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses];

  return (
    <div className="bg-gray-800/40 backdrop-blur-xl rounded-2xl border-2 border-gray-700/50 overflow-hidden shadow-xl">

      <div className={`bg-gradient-to-r ${colors.gradient} p-4 border-b-2 ${colors.border}`}>
        <h3 className="text-lg font-black text-white mb-1">{title}</h3>
        <p className="text-sm text-white/80 font-semibold">{count} task{count !== 1 ? 's' : ''}</p>
      </div>

      {}
      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-400 text-sm font-medium">No tasks</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id}
              onClick={() => onTaskClick(task)}
              className={`bg-gray-700/50 rounded-xl p-4 border-2 ${colors.border} hover:bg-gray-700/70 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-lg`}>

              {}
              {task.taskLink && (
                <div className="mb-2">
                  <a href={task.taskLink} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs ${colors.text} hover:underline font-semibold break-all`}>
                    🔗 {task.taskLink.length > 40 ? task.taskLink.substring(0, 40) + '...' : task.taskLink}
                  </a>
                </div>
              )}

              <h4 className="text-white font-bold mb-2 line-clamp-2">{task.title}</h4>

              <div className="text-xs text-gray-300 mb-1">
                <span className="font-semibold">Author:</span> {task.contributor?.name || "Unknown"}
              </div>

              {task.accountPostedIn && (
                <div className="text-xs text-gray-300 mb-2">
                  <span className="font-semibold">Account:</span> {task.accountPostedIn}
                </div>
              )}

              {task.reviewer && (
                <div className="text-xs text-gray-300 mb-2">
                  <span className="font-semibold">Reviewer:</span> {task.reviewer.name}
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                {task.hasChangesRequested && (
                  <span className="px-2 py-1 bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-lg text-xs font-bold">
                    ⚠️ Changes Requested
                  </span>
                )}
                {task.changesDone && (
                  <span className="px-2 py-1 bg-blue-500/20 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-bold">
                    ✓ Changes Done
                  </span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-600/30 flex justify-between items-center gap-2 text-xs">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-gray-600/40 text-gray-300 rounded font-semibold">{task.language}</span>
                  <span className="px-2 py-1 bg-gray-600/40 text-gray-300 rounded font-semibold">{task.difficulty}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id, task.title);
                  }}
                  className="px-3 py-1.5 bg-red-600/80 hover:bg-red-700/80 text-white rounded-lg transition-all duration-300 font-bold"
                  title="Delete submission"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
