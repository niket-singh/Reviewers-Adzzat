"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ToastContainer";
import { apiClient } from "@/lib/api-client";
import Breadcrumb from "@/components/Breadcrumb";

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
  testerFeedback?: string;
  reviewerFeedback?: string;
  hasChangesRequested: boolean;
  changesDone: boolean;
  submittedAccount?: string;
  taskLink?: string;
  rejectionReason?: string;
  accountPostedIn?: string;
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

export default function ProjectVTester() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [processing, setProcessing] = useState(false);
  const [actionType, setActionType] = useState<string | null>(null);
  const [submittedAccount, setSubmittedAccount] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [taskLinkSubmitted, setTaskLinkSubmitted] = useState("");
  const [testerFeedback, setTesterFeedback] = useState("");

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
    if (!loading && (!user || user.role !== "TESTER")) {
      router.push("/");
    } else if (user && user.isApproved) {
      fetchSubmissions();
    }
    // Don't fetch if user is not approved - show pending message instead
  }, [user, loading, router, fetchSubmissions]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchSubmissions();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchSubmissions]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
      TASK_SUBMITTED: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white glow",
      IN_TESTING: "bg-gradient-to-r from-yellow-400 to-orange-400 text-white",
      TASK_SUBMITTED_TO_PLATFORM: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white glow",
      PENDING_REVIEW: "bg-gradient-to-r from-purple-500 to-pink-500 text-white glow-purple",
      ELIGIBLE_FOR_MANUAL_REVIEW: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white glow-purple",
      CHANGES_REQUESTED: "bg-gradient-to-r from-orange-500 to-red-500 text-white",
      CHANGES_DONE: "bg-gradient-to-r from-indigo-500 to-purple-500 text-white",
      FINAL_CHECKS: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white glow",
      APPROVED: "bg-gradient-to-r from-green-500 to-emerald-500 text-white glow-green",
      REJECTED: "bg-gradient-to-r from-red-500 to-pink-600 text-white",
      REWORK: "bg-gradient-to-r from-yellow-500 to-orange-600 text-white",
      REWORK_DONE: "bg-gradient-to-r from-teal-500 to-cyan-500 text-white",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  const getFilteredSubmissions = () => {
    let filtered = submissions;

    // Testers can see all submissions to monitor testing pipeline
    if (filterStatus !== "ALL") {
      filtered = filtered.filter((s) => s.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.language.toLowerCase().includes(query) ||
          s.category.toLowerCase().includes(query) ||
          s.contributor?.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredSubmissions = getFilteredSubmissions();

  const getStatusCount = (status: string) => {
    if (status === "ALL") {
      return submissions.length;
    }
    return submissions.filter((s) => s.status === status).length;
  };

  const handleTaskSubmitted = async () => {
    if (!selectedSubmission) return;
    if (!submittedAccount.trim() || !taskLinkSubmitted.trim()) {
      showToast("Please enter both the account and task link", "error");
      return;
    }

    setProcessing(true);
    try {
      await apiClient.markTaskSubmitted(selectedSubmission.id, submittedAccount, taskLinkSubmitted);
      showToast("✅ Task marked as submitted successfully", "success");
      setActionType(null);
      setSubmittedAccount("");
      setTaskLinkSubmitted("");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to mark task as submitted", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleEligibleForReview = async () => {
    if (!selectedSubmission) return;
    if (!taskLink.trim()) {
      showToast("Please enter the task link", "error");
      return;
    }

    setProcessing(true);
    try {
      await apiClient.markEligibleForManualReview(selectedSubmission.id, taskLink);
      showToast("✅ Task marked as eligible for manual review successfully", "success");
      setActionType(null);
      setTaskLink("");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to mark task as eligible", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!selectedSubmission) return;
    if (!testerFeedback.trim()) {
      showToast("Please enter feedback", "error");
      return;
    }

    setProcessing(true);
    try {
      await apiClient.sendTesterFeedback(selectedSubmission.id, testerFeedback);
      showToast("✅ Feedback sent successfully", "success");
      setActionType(null);
      setTesterFeedback("");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to send feedback", "error");
    } finally {
      setProcessing(false);
    }
  };

  if (loading || (user?.isApproved && loadingSubmissions)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-300">Loading testing dashboard...</p>
        </div>
      </div>
    );
  }

  // Show pending approval message for unapproved testers
  if (user && !user.isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/60 backdrop-blur-xl border-2 border-orange-500/40 rounded-3xl p-8 shadow-2xl text-center animate-slide-up">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-3">
              Approval Pending
            </h2>
            <p className="text-gray-300 leading-relaxed mb-6">
              Your tester account is awaiting approval from an administrator. You will receive access to the Project V testing dashboard once your account has been approved.
            </p>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-400">
                <span className="font-semibold text-white">Account:</span> {user.email}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                <span className="font-semibold text-white">Role:</span> {user.role}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-105"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Animated Background Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 floating"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-blue-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <nav className="backdrop-blur-xl bg-gray-800/40 border-b border-gray-700/50 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 animate-slide-in-left">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-xl animate-pulse-glow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
                  Project V - Tester Hub
                </h1>
                <p className="text-xs md:text-sm font-medium text-gray-400 hidden sm:block">Monitor Testing Pipeline & Results</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex gap-3 animate-slide-in-right">
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

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 relative z-10">
        {/* Breadcrumb */}
        <Breadcrumb />

        {/* Search Bar */}
        <div className="mb-8 animate-slide-up">
          <div className="relative">
            <input type="text" placeholder="🔍 Search by title, language, category, or contributor..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-14 border-2 border-gray-700/50 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-800/40 backdrop-blur-sm shadow-xl transition-all duration-300 focus:scale-[1.02] text-white placeholder-gray-400 font-medium" />
            <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex gap-2 bg-gray-800/40 backdrop-blur-sm rounded-2xl p-1.5 shadow-xl border border-gray-700/50 overflow-x-auto">
            {[
              { label: "All", value: "ALL" },
              { label: "Task Submitted", value: "TASK_SUBMITTED" },
              { label: "In Testing", value: "IN_TESTING" },
              { label: "Pending Review", value: "PENDING_REVIEW" },
              { label: "Approved", value: "APPROVED" },
            ].map((tab) => (
              <button key={tab.value} onClick={() => setFilterStatus(tab.value)}
                className={`px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                  filterStatus === tab.value
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg scale-105 glow'
                    : 'text-gray-300 hover:bg-gray-700/50'
                }`}>
                {tab.label} ({getStatusCount(tab.value)})
              </button>
            ))}
          </div>
        </div>

        {/* Submissions Grid */}
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          {filteredSubmissions.length === 0 ? (
            <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-16 border-2 border-gray-700/50 text-center">
              <div className="text-6xl mb-4">🔬</div>
              <p className="text-gray-400 font-medium text-lg">No submissions found</p>
              <p className="text-gray-500 text-sm mt-2">Testing results will appear here as tasks are submitted</p>
            </div>
          ) : (
            filteredSubmissions.map((submission) => (
              <div key={submission.id}
                className="bg-gray-800/40 backdrop-blur-xl rounded-2xl shadow-xl p-6 border-2 border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.01] hover-lift cursor-pointer"
                onClick={() => setSelectedSubmission(submission)}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">{submission.title}</h3>
                        <p className="text-sm text-gray-400">by {submission.contributor?.name || "Unknown"}</p>
                      </div>
                      <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-lg ${getStatusColor(submission.status)}`}>
                        {submission.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg font-semibold border border-blue-500/30 text-sm">
                        {submission.language}
                      </span>
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg font-semibold border border-purple-500/30 text-sm">
                        {submission.category}
                      </span>
                      <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-lg font-semibold border border-pink-500/30 text-sm">
                        {submission.difficulty}
                      </span>
                    </div>

                    <div className="text-xs text-gray-400 font-medium">
                      📅 {new Date(submission.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <button onClick={(e) => { e.stopPropagation(); setSelectedSubmission(submission); }}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-105 whitespace-nowrap">
                    View Test Results →
                  </button>
                </div>

                {/* Testing Status Indicator */}
                {submission.status === "IN_TESTING" && (
                  <div className="mt-3 px-3 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-xs text-yellow-300 font-bold flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    Tests in progress...
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Submission Details Modal */}
        {selectedSubmission && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800/95 backdrop-blur-2xl border-2 border-gray-700/50 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl custom-scrollbar">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent mb-2">
                    {selectedSubmission.title}
                  </h3>
                  <p className="text-gray-300">Submitted by <span className="font-semibold text-white">{selectedSubmission.contributor?.name}</span></p>
                </div>
                <button onClick={() => { setSelectedSubmission(null); setActionType(null); setSubmittedAccount(""); setTaskLink(""); setTaskLinkSubmitted(""); setTesterFeedback(""); }}
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

                <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                  <h4 className="font-bold text-gray-200 mb-2">💻 Commit Hash:</h4>
                  <code className="text-sm bg-gray-900/70 text-green-400 px-3 py-2 rounded-lg border border-gray-600 font-mono inline-block">
                    {selectedSubmission.commitHash}
                  </code>
                </div>

                {/* Processing Pipeline - Tester's Main View */}
                <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                  <h4 className="font-bold text-white mb-4 text-lg">🔄 Testing Pipeline Results:</h4>
                  <div className="space-y-2">
                    <ProcessStep label="1. Clone Repository" success={selectedSubmission.cloneSuccess} error={selectedSubmission.cloneError} />
                    <ProcessStep label="2. Apply Test Patch" success={selectedSubmission.testPatchSuccess} error={selectedSubmission.testPatchError} />
                    <ProcessStep label="3. Build Docker Container" success={selectedSubmission.dockerBuildSuccess} error={selectedSubmission.dockerBuildError} />
                    <ProcessStep label="4. Run Base Tests" success={selectedSubmission.baseTestSuccess} error={selectedSubmission.baseTestError} />
                    <ProcessStep label="5. Run New Tests" success={selectedSubmission.newTestSuccess} error={selectedSubmission.newTestError} />
                    <ProcessStep label="6. Apply Solution Patch" success={selectedSubmission.solutionPatchSuccess} error={selectedSubmission.solutionPatchError} />
                    <ProcessStep label="7. Final Base Tests" success={selectedSubmission.finalBaseTestSuccess} error={selectedSubmission.finalBaseTestError} />
                    <ProcessStep label="8. Final New Tests" success={selectedSubmission.finalNewTestSuccess} error={selectedSubmission.finalNewTestError} />
                  </div>
                </div>

                {selectedSubmission.processingLogs && (
                  <div className="bg-gray-900/70 rounded-xl p-5 border border-gray-600/50">
                    <h4 className="font-bold text-white mb-3 text-lg">📜 Test Execution Logs:</h4>
                    <pre className="text-green-400 text-xs overflow-x-auto max-h-64 overflow-y-auto font-mono leading-relaxed custom-scrollbar">
                      {selectedSubmission.processingLogs}
                    </pre>
                  </div>
                )}

                {/* Files */}
                <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                  <h4 className="font-bold text-white mb-4 text-lg">📎 Submitted Files:</h4>
                  <div className="space-y-2">
                    {[
                      { label: "Test Patch", url: selectedSubmission.testPatchUrl },
                      { label: "Dockerfile", url: selectedSubmission.dockerfileUrl },
                      { label: "Solution Patch", url: selectedSubmission.solutionPatchUrl },
                    ].map((file) => (
                      <div key={file.label} className="flex justify-between items-center p-3 bg-gray-600/30 rounded-lg hover:bg-gray-600/50 transition-colors">
                        <span className="text-gray-200 font-medium">{file.label}</span>
                        <a href={file.url} target="_blank" rel="noopener noreferrer"
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg transition-all duration-300 hover:scale-105">
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Previous Feedback (if any) */}
                {selectedSubmission.reviewerFeedback && (
                  <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-orange-300 mb-3 text-lg">📢 Reviewer Feedback:</h4>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedSubmission.reviewerFeedback}</p>
                  </div>
                )}

                {/* Tester Actions */}
                {(selectedSubmission.status === "TASK_SUBMITTED" ||
                  selectedSubmission.status === "IN_TESTING" ||
                  selectedSubmission.status === "TASK_SUBMITTED_TO_PLATFORM" ||
                  selectedSubmission.status === "REWORK_DONE") && (
                  <div className="border-t-2 border-gray-700 pt-6">
                    <h4 className="font-bold text-white mb-4 text-lg">⚡ Tester Actions:</h4>

                    {selectedSubmission.status === "TASK_SUBMITTED_TO_PLATFORM" && (
                      <div className="mb-4 p-4 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl">
                        <p className="text-emerald-300 text-sm font-semibold">
                          ✅ Task has been submitted to the platform. Check post-checks results:
                        </p>
                        <ul className="mt-2 ml-4 text-sm text-gray-300 space-y-1">
                          <li>• If post-checks <strong>passed</strong>: Mark as <strong>Eligible for Manual Review</strong></li>
                          <li>• If post-checks <strong>failed</strong>: Send <strong>Feedback</strong> to contributor</li>
                        </ul>
                      </div>
                    )}

                    {selectedSubmission.status === "REWORK_DONE" && (
                      <div className="mb-4 p-4 bg-teal-500/10 border-2 border-teal-500/30 rounded-xl">
                        <p className="text-teal-300 text-sm font-semibold">
                          ✅ Contributor has resubmitted after addressing feedback. Review the changes and proceed:
                        </p>
                        <ul className="mt-2 ml-4 text-sm text-gray-300 space-y-1">
                          <li>• Test the updated task</li>
                          <li>• Submit to platform, mark as eligible, or provide additional feedback if needed</li>
                        </ul>
                      </div>
                    )}

                    {!actionType ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Only show Task Submitted button if not already submitted to platform */}
                        {selectedSubmission.status !== "TASK_SUBMITTED_TO_PLATFORM" && (
                          <button onClick={() => setActionType("submitted")} disabled={processing}
                            className="px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            ✓ Task Submitted
                          </button>
                        )}
                        <button onClick={() => setActionType("eligible")} disabled={processing}
                          className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                          → Eligible for Manual Review
                        </button>
                        <button onClick={() => setActionType("feedback")} disabled={processing}
                          className="px-6 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                          💬 Send Feedback
                        </button>
                      </div>
                    ) : actionType === "submitted" ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2.5 text-gray-200">Submitted Account: *</label>
                          <input type="text" value={submittedAccount} onChange={(e) => setSubmittedAccount(e.target.value)}
                            placeholder="e.g., @username or account URL" disabled={processing}
                            className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium" />
                          <p className="text-xs text-gray-400 mt-2">Note: This will only be visible to you and admins</p>
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-2.5 text-gray-200">Task Link: *</label>
                          <input type="url" value={taskLinkSubmitted} onChange={(e) => setTaskLinkSubmitted(e.target.value)}
                            placeholder="https://..." disabled={processing}
                            className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium" />
                          <p className="text-xs text-gray-400 mt-2">This will be visible to testers, reviewers, and admins</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleTaskSubmitted} disabled={processing || !submittedAccount.trim() || !taskLinkSubmitted.trim()}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            {processing ? "Submitting..." : "Submit"}
                          </button>
                          <button onClick={() => { setActionType(null); setSubmittedAccount(""); setTaskLinkSubmitted(""); }} disabled={processing}
                            className="px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-105 disabled:opacity-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : actionType === "eligible" ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2.5 text-gray-200">Task Link: *</label>
                          <input type="url" value={taskLink} onChange={(e) => setTaskLink(e.target.value)}
                            placeholder="https://..." disabled={processing}
                            className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 font-medium" />
                          <p className="text-xs text-gray-400 mt-2">This will be visible to testers, reviewers, and admins. Contributor will be notified that task is eligible for manual review.</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleEligibleForReview} disabled={processing || !taskLink.trim()}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            {processing ? "Submitting..." : "Mark as Eligible"}
                          </button>
                          <button onClick={() => { setActionType(null); setTaskLink(""); }} disabled={processing}
                            className="px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-105 disabled:opacity-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2.5 text-gray-200">Feedback for Contributor: *</label>
                          <textarea value={testerFeedback} onChange={(e) => setTesterFeedback(e.target.value)} rows={6}
                            placeholder="Provide detailed feedback on what needs to be reworked..." disabled={processing}
                            className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/20 font-medium" />
                          <p className="text-xs text-gray-400 mt-2">Task will be marked as &quot;Rework&quot; and feedback will be shown to contributor.</p>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleSendFeedback} disabled={processing || !testerFeedback.trim()}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            {processing ? "Sending..." : "Send Feedback"}
                          </button>
                          <button onClick={() => { setActionType(null); setTesterFeedback(""); }} disabled={processing}
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

function ProcessStep({ label, success, error }: { label: string; success?: boolean; error?: string }) {
  return (
    <div className={`flex items-start justify-between p-4 rounded-xl border-2 transition-all duration-300 ${
      success ? "bg-green-500/10 border-green-500/30" : error ? "bg-red-500/10 border-red-500/30" : "bg-gray-600/20 border-gray-600/30"
    }`}>
      <span className="text-sm text-gray-200 font-semibold">{label}</span>
      <div className="flex items-center gap-2">
        {success ? (
          <span className="text-green-400 font-bold text-xl">✓</span>
        ) : error ? (
          <div className="flex flex-col items-end gap-1">
            <span className="text-red-400 font-bold text-xl">✗</span>
            {error && <span className="text-xs text-red-300 max-w-xs text-right">{error}</span>}
          </div>
        ) : (
          <span className="text-gray-400 text-xl animate-pulse">⏳</span>
        )}
      </div>
    </div>
  );
}
