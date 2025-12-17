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
}

export default function ProjectVReviewer() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<string>("");
  const [accountPosted, setAccountPosted] = useState<string>("");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
    if (!loading && (!user || (user.role !== "REVIEWER" && user.role !== "ADMIN"))) {
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

  const handleReject = async () => {
    if (!selectedSubmission) return;
    if (!rejectionReason.trim()) {
      showToast("Please provide a rejection reason", "error");
      return;
    }

    setProcessing(true);
    try {
      await apiClient.markRejected(selectedSubmission.id, rejectionReason);
      showToast("✅ Task rejected successfully", "success");
      setShowRejectionDialog(false);
      setRejectionReason("");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to reject task", "error");
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
      TASK_SUBMITTED: "bg-gradient-to-r from-blue-500 to-cyan-500 text-white glow",
      IN_TESTING: "bg-gradient-to-r from-yellow-400 to-orange-400 text-white",
      PENDING_REVIEW: "bg-gradient-to-r from-purple-500 to-pink-500 text-white glow-purple",
      ELIGIBLE_FOR_MANUAL_REVIEW: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white glow-purple",
      CHANGES_REQUESTED: "bg-gradient-to-r from-orange-500 to-red-500 text-white",
      CHANGES_DONE: "bg-gradient-to-r from-indigo-500 to-purple-500 text-white",
      FINAL_CHECKS: "bg-gradient-to-r from-cyan-400 to-blue-500 text-white glow",
      APPROVED: "bg-gradient-to-r from-green-500 to-emerald-500 text-white glow-green",
      REJECTED: "bg-gradient-to-r from-red-500 to-pink-600 text-white",
      REWORK: "bg-gradient-to-r from-yellow-500 to-orange-600 text-white",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  const getFilteredSubmissions = () => {
    let filtered = submissions;

    
    if (user?.role === "REVIEWER") {
      filtered = submissions.filter(
        (s) =>
          s.status === "PENDING_REVIEW" ||
          s.status === "ELIGIBLE_FOR_MANUAL_REVIEW" ||
          s.status === "CHANGES_DONE" ||
          s.status === "FINAL_CHECKS"
      );
    }

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
      return user?.role === "REVIEWER"
        ? submissions.filter(s => ["PENDING_REVIEW", "ELIGIBLE_FOR_MANUAL_REVIEW", "CHANGES_DONE", "FINAL_CHECKS"].includes(s.status)).length
        : submissions.length;
    }
    return submissions.filter((s) => s.status === status).length;
  };

  if (loading || loadingSubmissions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-300">Loading amazing content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 floating"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-cyan-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Header */}
      <nav className="backdrop-blur-xl bg-gray-800/40 border-b border-gray-700/50 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 animate-slide-in-left">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 via-blue-600 to-purple-600 flex items-center justify-center shadow-xl animate-pulse-glow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Project V - Reviewer Hub
                </h1>
                <p className="text-xs md:text-sm font-medium text-gray-400 hidden sm:block">Review & Approve Submissions</p>
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
              className="w-full px-6 py-4 pl-14 border-2 border-gray-700/50 rounded-2xl focus:ring-4 focus:ring-cyan-500/20 focus:border-cyan-500 bg-gray-800/40 backdrop-blur-sm shadow-xl transition-all duration-300 focus:scale-[1.02] text-white placeholder-gray-400 font-medium" />
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
              { label: "Pending Review", value: "PENDING_REVIEW" },
              { label: "Changes Done", value: "CHANGES_DONE" },
              { label: "Final Checks", value: "FINAL_CHECKS" },
              { label: "Approved", value: "APPROVED" },
            ].map((tab) => (
              <button key={tab.value} onClick={() => setFilterStatus(tab.value)}
                className={`px-4 md:px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all duration-300 whitespace-nowrap ${
                  filterStatus === tab.value
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg scale-105 glow'
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
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-400 font-medium text-lg">No submissions found for review</p>
              <p className="text-gray-500 text-sm mt-2">Submissions will appear here when they&apos;re ready for review</p>
            </div>
          ) : (
            filteredSubmissions.map((submission) => (
              <div key={submission.id}
                className="bg-gray-800/40 backdrop-blur-xl rounded-2xl shadow-xl p-6 border-2 border-gray-700/50 hover:border-cyan-500/50 transition-all duration-300 hover:scale-[1.01] hover-lift cursor-pointer"
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
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-105 whitespace-nowrap">
                    Review Details →
                  </button>
                </div>

                {submission.changesDone && (
                  <div className="mt-3 px-3 py-2 bg-blue-500/20 border border-blue-500/40 rounded-lg text-xs text-blue-300 font-bold">
                    ✓ Contributor marked changes as done
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
                  <h3 className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                    {selectedSubmission.title}
                  </h3>
                  <p className="text-gray-300">Submitted by <span className="font-semibold text-white">{selectedSubmission.contributor?.name}</span></p>
                </div>
                <button onClick={() => { setSelectedSubmission(null); setShowFeedbackDialog(false); setShowRejectionDialog(false); setFeedback(""); setAccountPosted(""); setRejectionReason(""); }}
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
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold rounded-lg transition-all duration-300 hover:scale-105">
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Previous Feedback */}
                {selectedSubmission.reviewerFeedback && (
                  <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-orange-300 mb-3 text-lg">📢 Previous Feedback:</h4>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedSubmission.reviewerFeedback}</p>
                  </div>
                )}

                {/* Reviewer Actions */}
                {(selectedSubmission.status === "PENDING_REVIEW" || selectedSubmission.status === "ELIGIBLE_FOR_MANUAL_REVIEW" || selectedSubmission.status === "CHANGES_DONE" || selectedSubmission.status === "FINAL_CHECKS") && (
                  <div className="border-t-2 border-gray-700 pt-6">
                    <h4 className="font-bold text-white mb-4 text-lg">⚡ Reviewer Actions:</h4>

                    {!showFeedbackDialog && !showRejectionDialog ? (
                      <div className="space-y-3">
                        {selectedSubmission.status === "FINAL_CHECKS" && (
                          <div className="mb-4">
                            <label className="block text-sm font-bold mb-2.5 text-gray-200">Account Where Task Posted *</label>
                            <input type="text" value={accountPosted} onChange={(e) => setAccountPosted(e.target.value)}
                              placeholder="e.g., @username or account URL" disabled={processing}
                              className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium" />
                          </div>
                        )}

                        {selectedSubmission.taskLink && (
                          <div className="mb-4 bg-purple-500/10 border-2 border-purple-500/30 rounded-xl p-5">
                            <h5 className="font-bold text-purple-300 mb-2">🔗 Task Link (from Tester):</h5>
                            <a href={selectedSubmission.taskLink} target="_blank" rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 break-all hover:underline font-medium">
                              {selectedSubmission.taskLink}
                            </a>
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
                              {processing ? "Processing..." : "→ Gone for Final Check"}
                            </button>
                          )}

                          <button onClick={() => setShowRejectionDialog(true)} disabled={processing}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            ✗ Reject
                          </button>
                        </div>
                      </div>
                    ) : showRejectionDialog ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-2.5 text-gray-200">Rejection Reason: *</label>
                          <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={6}
                            placeholder="Provide detailed reason for rejection..." disabled={processing}
                            className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/20 font-medium" />
                        </div>
                        <div className="flex gap-3">
                          <button onClick={handleReject} disabled={processing || !rejectionReason.trim()}
                            className="flex-1 px-6 py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                            {processing ? "Rejecting..." : "Confirm Rejection"}
                          </button>
                          <button onClick={() => { setShowRejectionDialog(false); setRejectionReason(""); }} disabled={processing}
                            className="px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-105 disabled:opacity-50">
                            Cancel
                          </button>
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
