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
  hasChangesRequested: boolean;
  changesDone: boolean;
  accountPostedIn?: string;
  taskLink?: string;
  taskLinkSubmitted?: string;
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

  const fetchSubmissions = useCallback(async () => {
    try {
      const data = await apiClient.getProjectVSubmissions();
      setSubmissions(data || []);
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
      showToast("Failed to fetch submissions", "error");
    } finally {
      setLoadingSubmissions(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      router.push("/");
    } else if (user) {
      fetchSubmissions();
    }
  }, [user, loading, router, fetchSubmissions]);

  // Auto-refresh every 30 seconds
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

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      TASK_SUBMITTED_TO_PLATFORM: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white glow",
      ELIGIBLE_FOR_MANUAL_REVIEW: "bg-gradient-to-r from-purple-500 to-pink-500 text-white glow-purple",
      FINAL_CHECKS: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white glow",
      APPROVED: "bg-gradient-to-r from-green-500 to-emerald-500 text-white glow-green",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  // Filter submissions by status for each column
  const submittedTasks = submissions.filter(s => s.status === "TASK_SUBMITTED_TO_PLATFORM");
  const eligibleTasks = submissions.filter(s => s.status === "ELIGIBLE_FOR_MANUAL_REVIEW");
  const finalChecksTasks = submissions.filter(s => s.status === "FINAL_CHECKS");
  const approvedTasks = submissions.filter(s => s.status === "APPROVED");

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
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full blur-3xl opacity-20 floating"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
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

            {/* Desktop Navigation */}
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

            {/* Mobile Menu Button */}
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

          {/* Mobile Menu */}
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
        {/* Breadcrumb */}
        <Breadcrumb />

        {/* Admin Notice */}
        <div className="mb-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-2 border-red-500/30 rounded-2xl p-5 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="text-3xl">👑</div>
            <div>
              <h3 className="text-lg font-bold text-red-300">Administrator Mode Active</h3>
              <p className="text-sm text-gray-300">4-Column Dashboard View - Full Task Workflow Management</p>
            </div>
          </div>
        </div>

        {/* 4-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>

          {/* Column 1: Submitted Tasks */}
          <TaskColumn
            title="📥 Submitted Tasks"
            count={submittedTasks.length}
            color="blue"
            tasks={submittedTasks}
            onTaskClick={setSelectedSubmission}
          />

          {/* Column 2: Eligible for Manual Review */}
          <TaskColumn
            title="🔍 Eligible for Review"
            count={eligibleTasks.length}
            color="purple"
            tasks={eligibleTasks}
            onTaskClick={setSelectedSubmission}
          />

          {/* Column 3: Final Checks */}
          <TaskColumn
            title="✅ Final Checks"
            count={finalChecksTasks.length}
            color="cyan"
            tasks={finalChecksTasks}
            onTaskClick={setSelectedSubmission}
          />

          {/* Column 4: Approved */}
          <TaskColumn
            title="🎉 Approved"
            count={approvedTasks.length}
            color="green"
            tasks={approvedTasks}
            onTaskClick={setSelectedSubmission}
          />

        </div>

        {/* Submission Details Modal */}
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
                {/* Status & Metadata */}
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

                {/* Task Information */}
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

                {/* Description */}
                <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                  <h4 className="font-bold text-gray-200 mb-2 text-lg">📝 Description:</h4>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedSubmission.description}</p>
                </div>

                {/* Repository Info */}
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

                {/* Previous Feedback */}
                {selectedSubmission.reviewerFeedback && (
                  <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-orange-300 mb-3 text-lg">📢 Previous Feedback:</h4>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedSubmission.reviewerFeedback}</p>
                  </div>
                )}

                {/* Admin Actions */}
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

// Task Column Component
function TaskColumn({
  title,
  count,
  color,
  tasks,
  onTaskClick
}: {
  title: string;
  count: number;
  color: string;
  tasks: Submission[];
  onTaskClick: (task: Submission) => void;
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
      {/* Column Header */}
      <div className={`bg-gradient-to-r ${colors.gradient} p-4 border-b-2 ${colors.border}`}>
        <h3 className="text-lg font-black text-white mb-1">{title}</h3>
        <p className="text-sm text-white/80 font-semibold">{count} task{count !== 1 ? 's' : ''}</p>
      </div>

      {/* Column Content */}
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

              {/* Task Link */}
              {task.taskLink && (
                <div className="mb-2">
                  <a href={task.taskLink} target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={`text-xs ${colors.text} hover:underline font-semibold break-all`}>
                    🔗 {task.taskLink.length > 40 ? task.taskLink.substring(0, 40) + '...' : task.taskLink}
                  </a>
                </div>
              )}

              {/* Title */}
              <h4 className="text-white font-bold mb-2 line-clamp-2">{task.title}</h4>

              {/* Author */}
              <div className="text-xs text-gray-300 mb-1">
                <span className="font-semibold">Author:</span> {task.contributor?.name || "Unknown"}
              </div>

              {/* Account */}
              {task.accountPostedIn && (
                <div className="text-xs text-gray-300 mb-2">
                  <span className="font-semibold">Account:</span> {task.accountPostedIn}
                </div>
              )}

              {/* Reviewer */}
              {task.reviewer && (
                <div className="text-xs text-gray-300 mb-2">
                  <span className="font-semibold">Reviewer:</span> {task.reviewer.name}
                </div>
              )}

              {/* Tags */}
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

              {/* Metadata */}
              <div className="mt-3 pt-3 border-t border-gray-600/30 flex gap-2 text-xs">
                <span className="px-2 py-1 bg-gray-600/40 text-gray-300 rounded font-semibold">{task.language}</span>
                <span className="px-2 py-1 bg-gray-600/40 text-gray-300 rounded font-semibold">{task.difficulty}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
