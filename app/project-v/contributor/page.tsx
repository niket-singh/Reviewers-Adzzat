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

export default function ProjectVContributor() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    language: "",
    category: "",
    difficulty: "Easy",
    description: "",
    githubRepo: "",
    commitHash: "",
    issueUrl: "",
  });

  const [files, setFiles] = useState({
    testPatch: null as File | null,
    dockerfile: null as File | null,
    solutionPatch: null as File | null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showResubmitModal, setShowResubmitModal] = useState(false);
  const [resubmitData, setResubmitData] = useState({
    title: "",
    language: "",
    category: "",
    difficulty: "",
    description: "",
    githubRepo: "",
    commitHash: "",
    issueUrl: "",
  });
  const [resubmitFiles, setResubmitFiles] = useState({
    testPatch: null as File | null,
    dockerfile: null as File | null,
    solutionPatch: null as File | null,
  });

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
    if (!loading && (!user || user.role !== "CONTRIBUTOR")) {
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

  const validateDescription = (text: string): boolean => {
    for (let i = 0; i < text.length; i++) {
      if (text.charCodeAt(i) > 127) return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateDescription(formData.description)) {
      showToast("Description must contain only ASCII characters", "error");
      return;
    }

    if (
      !formData.title || !formData.language || !formData.category ||
      !formData.difficulty || !formData.description || !formData.githubRepo ||
      !formData.commitHash || !files.testPatch ||
      !files.dockerfile || !files.solutionPatch
    ) {
      showToast("All required fields must be filled", "error");
      return;
    }

    setSubmitting(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("language", formData.language);
      formDataToSend.append("category", formData.category);
      formDataToSend.append("difficulty", formData.difficulty);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("githubRepo", formData.githubRepo);
      formDataToSend.append("commitHash", formData.commitHash);
      formDataToSend.append("issueUrl", formData.issueUrl);
      formDataToSend.append("testPatch", files.testPatch);
      formDataToSend.append("dockerfile", files.dockerfile);
      formDataToSend.append("solutionPatch", files.solutionPatch);

      await apiClient.createProjectVSubmission(formDataToSend);
      showToast("✨ Submission created successfully!", "success");

      setFormData({
        title: "", language: "", category: "", difficulty: "Easy",
        description: "", githubRepo: "", commitHash: "", issueUrl: "",
      });
      setFiles({ testPatch: null, dockerfile: null, solutionPatch: null });
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to create submission", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkChangesDone = async (submissionId: string) => {
    setProcessing(true);
    try {
      await apiClient.markChangesDone(submissionId);
      showToast("✅ Marked as changes done successfully", "success");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to mark changes as done", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenResubmitModal = (submission: Submission) => {
    setResubmitData({
      title: submission.title,
      language: submission.language,
      category: submission.category,
      difficulty: submission.difficulty,
      description: submission.description,
      githubRepo: submission.githubRepo,
      commitHash: submission.commitHash,
      issueUrl: submission.issueUrl,
    });
    setResubmitFiles({
      testPatch: null,
      dockerfile: null,
      solutionPatch: null,
    });
    setShowResubmitModal(true);
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSubmission) return;

    if (!validateDescription(resubmitData.description)) {
      showToast("Description must contain only ASCII characters", "error");
      return;
    }

    setProcessing(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", resubmitData.title);
      formDataToSend.append("language", resubmitData.language);
      formDataToSend.append("category", resubmitData.category);
      formDataToSend.append("difficulty", resubmitData.difficulty);
      formDataToSend.append("description", resubmitData.description);
      formDataToSend.append("githubRepo", resubmitData.githubRepo);
      formDataToSend.append("commitHash", resubmitData.commitHash);
      formDataToSend.append("issueUrl", resubmitData.issueUrl);

      if (resubmitFiles.testPatch) {
        formDataToSend.append("testPatch", resubmitFiles.testPatch);
      }
      if (resubmitFiles.dockerfile) {
        formDataToSend.append("dockerfile", resubmitFiles.dockerfile);
      }
      if (resubmitFiles.solutionPatch) {
        formDataToSend.append("solutionPatch", resubmitFiles.solutionPatch);
      }

      await apiClient.resubmitProjectVSubmission(selectedSubmission.id, formDataToSend);
      showToast("✅ Task resubmitted successfully!", "success");
      setShowResubmitModal(false);
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to resubmit task", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;

    setProcessing(true);
    try {
      await apiClient.deleteProjectVSubmission(submissionId);
      showToast("Submission deleted successfully", "success");
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error: any) {
      showToast(error.response?.data?.error || "Failed to delete submission", "error");
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
      REWORK_DONE: "bg-gradient-to-r from-teal-500 to-cyan-500 text-white",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  const filteredSubmissions = submissions.filter(s =>
    searchQuery ? (
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.language.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true
  );

  if (loading || loadingSubmissions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg font-semibold text-gray-300">Loading amazing content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-20 floating"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-72 h-72 bg-pink-500 rounded-full blur-3xl opacity-20 floating" style={{ animationDelay: '2s' }}></div>
      </div>

      <nav className="backdrop-blur-xl bg-gray-800/40 border-b border-gray-700/50 shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4 animate-slide-in-left">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 flex items-center justify-center shadow-xl animate-pulse-glow">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
                  Project V - Contributor Hub
                </h1>
                <p className="text-xs md:text-sm font-medium text-gray-400 hidden sm:block">Advanced Task Submission</p>
              </div>
            </div>

            <div className="hidden md:flex gap-3 animate-slide-in-right">
              <button
                onClick={() => router.push('/select-project')}
                className="px-5 py-2.5 bg-gray-700/50 backdrop-blur-sm text-gray-200 rounded-xl hover:bg-gray-600/60 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl border border-gray-600"
              >
                Switch Project
              </button>
              <button
                onClick={() => router.push('/profile')}
                className="px-5 py-2.5 bg-gray-700/50 backdrop-blur-sm text-gray-200 rounded-xl hover:bg-gray-600/60 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl border border-gray-600"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 hover:scale-105 transition-all duration-300 font-semibold shadow-md hover:shadow-xl"
              >
                Logout
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-300 hover:text-white transition-colors"
            >
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

        <Breadcrumb />

        <div className="mb-8 animate-slide-up">
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Search submissions by title, language, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-14 border-2 border-gray-700/50 rounded-2xl focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 bg-gray-800/40 backdrop-blur-sm shadow-xl transition-all duration-300 focus:scale-[1.02] text-white placeholder-gray-400 font-medium"
            />
            <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-2 border-gray-700/50 animate-scale-in hover-lift">
            <h2 className="text-2xl font-black mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              ✨ New Submission
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2.5 text-gray-200">Task Title *</label>
                <input type="text" required value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 font-medium"
                  placeholder="e.g., Fix authentication bug in login" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">Language *</label>
                  <select required value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 font-medium">
                    <option value="">Select Language</option>
                    <option value="Python">Python</option>
                    <option value="TypeScript">TypeScript</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">Category *</label>
                  <select required value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 font-medium">
                    <option value="">Select Category</option>
                    <option value="Bug Fixing">Bug Fixing</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="Enhancement">Enhancement</option>
                    <option value="Refactor">Refactor</option>
                    <option value="Optimization">Optimization</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2.5 text-gray-200">Difficulty *</label>
                <select value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 font-medium">
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2.5 text-gray-200">Description (ASCII only) *</label>
                <textarea required value={formData.description} rows={4}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 font-medium"
                  placeholder="Describe the task and your solution..." />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2.5 text-gray-200">GitHub Repository URL *</label>
                <input type="url" required value={formData.githubRepo}
                  onChange={(e) => setFormData({ ...formData, githubRepo: e.target.value })}
                  className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 font-medium font-mono text-sm"
                  placeholder="https://github.com/username/repo" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">Commit Hash *</label>
                  <input type="text" required value={formData.commitHash}
                    onChange={(e) => setFormData({ ...formData, commitHash: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 font-mono text-sm"
                    placeholder="abc123def456..." />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">GitHub Issue URL (optional)</label>
                  <input type="url" value={formData.issueUrl}
                    onChange={(e) => setFormData({ ...formData, issueUrl: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 font-medium text-sm"
                    placeholder="https://github.com/.../issues/123" />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <FileInput label="Test Patch" file={files.testPatch}
                  onChange={(file) => setFiles({ ...files, testPatch: file })} />
                <FileInput label="Dockerfile" file={files.dockerfile}
                  onChange={(file) => setFiles({ ...files, dockerfile: file })} />
                <FileInput label="Solution Patch" file={files.solutionPatch}
                  onChange={(file) => setFiles({ ...files, solutionPatch: file })} />
              </div>

              <button type="submit" disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black text-lg rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed animate-pulse-glow">
                {submitting ? "Submitting..." : "Submit Task"}
              </button>
            </form>
          </div>

          <div className="bg-gray-800/40 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border-2 border-gray-700/50 animate-scale-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-2xl font-black mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              📋 My Submissions ({filteredSubmissions.length})
            </h2>
            <div className="space-y-3 max-h-[calc(100vh-12rem)] overflow-y-auto custom-scrollbar">
              {filteredSubmissions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-gray-400 font-medium">No submissions yet</p>
                  <p className="text-gray-500 text-sm mt-2">Create your first submission to get started!</p>
                </div>
              ) : (
                filteredSubmissions.map((submission) => (
                  <div key={submission.id}
                    onClick={() => setSelectedSubmission(submission)}
                    className="bg-gray-700/50 backdrop-blur-sm border-2 border-gray-600/50 rounded-2xl p-5 hover:bg-gray-700/70 hover:border-purple-500/50 transition-all duration-300 cursor-pointer hover:scale-[1.02] hover-lift">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-white text-lg">{submission.title}</h3>
                      <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full shadow-lg ${getStatusColor(submission.status)}`}>
                        {submission.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm mb-2">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg font-semibold border border-blue-500/30">
                        {submission.language}
                      </span>
                      <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg font-semibold border border-purple-500/30">
                        {submission.category}
                      </span>
                      <span className="px-3 py-1 bg-pink-500/20 text-pink-300 rounded-lg font-semibold border border-pink-500/30">
                        {submission.difficulty}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 font-medium mt-3">
                      📅 {new Date(submission.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {submission.status === "REWORK" && (
                      <div className="mt-3 px-3 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg text-xs text-yellow-300 font-bold">
                        🔄 Rework required - Tester feedback received
                      </div>
                    )}
                    {submission.status === "CHANGES_REQUESTED" && (
                      <div className="mt-3 px-3 py-2 bg-orange-500/20 border border-orange-500/40 rounded-lg text-xs text-orange-300 font-bold">
                        ⚠️ Changes requested by reviewer
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {selectedSubmission && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800/95 backdrop-blur-2xl border-2 border-gray-700/50 rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl custom-scrollbar">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Submission Details
                </h3>
                <button onClick={() => setSelectedSubmission(null)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-300 hover:scale-110">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">

                <div>
                  <h4 className="text-lg font-bold text-white mb-3">{selectedSubmission.title}</h4>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className={`inline-flex px-4 py-2 text-sm font-bold rounded-full shadow-lg ${getStatusColor(selectedSubmission.status)}`}>
                      {selectedSubmission.status.replace(/_/g, " ")}
                    </span>
                    {(selectedSubmission.status === "REWORK" || selectedSubmission.status === "CHANGES_REQUESTED") && (
                      <span className="px-3 py-1 bg-green-500/20 border border-green-500/40 rounded-lg text-xs text-green-300 font-bold">
                        ✅ Can Resubmit
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                  <h4 className="font-bold text-gray-200 mb-2">Description:</h4>
                  <p className="text-gray-300 leading-relaxed">{selectedSubmission.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                    <h4 className="font-bold text-gray-200 mb-2">Repository:</h4>
                    <a href={selectedSubmission.githubRepo} target="_blank" rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm break-all hover:underline font-medium">
                      {selectedSubmission.githubRepo}
                    </a>
                  </div>
                  <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                    <h4 className="font-bold text-gray-200 mb-2">Issue:</h4>
                    <a href={selectedSubmission.issueUrl} target="_blank" rel="noopener noreferrer"
                      className="text-yellow-400 hover:text-yellow-300 text-sm break-all hover:underline font-medium">
                      View Issue →
                    </a>
                  </div>
                </div>

                <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                  <h4 className="font-bold text-gray-200 mb-2">Commit Hash:</h4>
                  <code className="text-sm bg-gray-900/70 text-green-400 px-3 py-2 rounded-lg border border-gray-600 font-mono inline-block">
                    {selectedSubmission.commitHash}
                  </code>
                </div>

                <div className="bg-gray-700/50 rounded-xl p-5 border border-gray-600/50">
                  <h4 className="font-bold text-white mb-4 text-lg">🔄 Processing Pipeline:</h4>
                  <div className="space-y-2">
                    <ProcessStep label="1. Clone Repository" success={selectedSubmission.cloneSuccess} error={selectedSubmission.cloneError} />
                    <ProcessStep label="2. Apply Test Patch" success={selectedSubmission.testPatchSuccess} error={selectedSubmission.testPatchError} />
                    <ProcessStep label="3. Build Docker" success={selectedSubmission.dockerBuildSuccess} error={selectedSubmission.dockerBuildError} />
                    <ProcessStep label="4. Run Base Tests" success={selectedSubmission.baseTestSuccess} error={selectedSubmission.baseTestError} />
                    <ProcessStep label="5. Run New Tests" success={selectedSubmission.newTestSuccess} error={selectedSubmission.newTestError} />
                    <ProcessStep label="6. Apply Solution Patch" success={selectedSubmission.solutionPatchSuccess} error={selectedSubmission.solutionPatchError} />
                    <ProcessStep label="7. Final Base Tests" success={selectedSubmission.finalBaseTestSuccess} error={selectedSubmission.finalBaseTestError} />
                    <ProcessStep label="8. Final New Tests" success={selectedSubmission.finalNewTestSuccess} error={selectedSubmission.finalNewTestError} />
                  </div>
                </div>

                {selectedSubmission.processingLogs && (
                  <div className="bg-gray-900/70 rounded-xl p-5 border border-gray-600/50">
                    <h4 className="font-bold text-white mb-3 text-lg">📜 Processing Logs:</h4>
                    <pre className="text-green-400 text-xs overflow-x-auto max-h-64 overflow-y-auto font-mono leading-relaxed custom-scrollbar">
                      {selectedSubmission.processingLogs}
                    </pre>
                  </div>
                )}

                {selectedSubmission.testerFeedback && (
                  <div className="bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-yellow-300 mb-3 text-lg">🔄 Tester Feedback (Rework Required):</h4>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedSubmission.testerFeedback}</p>
                  </div>
                )}

                {selectedSubmission.reviewerFeedback && (
                  <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-orange-300 mb-3 text-lg">📢 Reviewer Feedback (Changes Requested):</h4>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedSubmission.reviewerFeedback}</p>
                  </div>
                )}

                {selectedSubmission.rejectionReason && (
                  <div className="bg-red-500/10 border-2 border-red-500/30 rounded-xl p-5">
                    <h4 className="font-bold text-red-300 mb-3 text-lg">❌ Rejection Reason:</h4>
                    <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">{selectedSubmission.rejectionReason}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-700">
                  {(selectedSubmission.status === "REWORK" || selectedSubmission.status === "CHANGES_REQUESTED") && (
                    <button onClick={() => handleOpenResubmitModal(selectedSubmission)} disabled={processing}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                      🔄 Resubmit Task
                    </button>
                  )}
                  {(selectedSubmission.status === "TASK_SUBMITTED" || selectedSubmission.status === "CHANGES_REQUESTED" || selectedSubmission.status === "REWORK") && (
                    <button onClick={() => handleDeleteSubmission(selectedSubmission.id)} disabled={processing}
                      className="px-6 py-4 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showResubmitModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800/95 backdrop-blur-2xl border-2 border-gray-700/50 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 shadow-2xl custom-scrollbar">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-black bg-gradient-to-r from-green-400 to-teal-400 bg-clip-text text-transparent">
                  🔄 Resubmit Task
                </h3>
                <button onClick={() => setShowResubmitModal(false)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-xl transition-all duration-300 hover:scale-110">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleResubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">Task Title *</label>
                  <input type="text" required value={resubmitData.title}
                    onChange={(e) => setResubmitData({ ...resubmitData, title: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium"
                    placeholder="e.g., Fix authentication bug in login" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold mb-2.5 text-gray-200">Language *</label>
                    <select required value={resubmitData.language}
                      onChange={(e) => setResubmitData({ ...resubmitData, language: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium">
                      <option value="">Select Language</option>
                      <option value="Python">Python</option>
                      <option value="TypeScript">TypeScript</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2.5 text-gray-200">Category *</label>
                    <select required value={resubmitData.category}
                      onChange={(e) => setResubmitData({ ...resubmitData, category: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium">
                      <option value="">Select Category</option>
                      <option value="Bug Fixing">Bug Fixing</option>
                      <option value="Feature Request">Feature Request</option>
                      <option value="Enhancement">Enhancement</option>
                      <option value="Refactor">Refactor</option>
                      <option value="Optimization">Optimization</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">Difficulty *</label>
                  <select value={resubmitData.difficulty}
                    onChange={(e) => setResubmitData({ ...resubmitData, difficulty: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium">
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">Description (ASCII only) *</label>
                  <textarea required value={resubmitData.description} rows={4}
                    onChange={(e) => setResubmitData({ ...resubmitData, description: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium"
                    placeholder="Describe the task and your solution..." />
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2.5 text-gray-200">GitHub Repository URL *</label>
                  <input type="url" required value={resubmitData.githubRepo}
                    onChange={(e) => setResubmitData({ ...resubmitData, githubRepo: e.target.value })}
                    className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium font-mono text-sm"
                    placeholder="https://github.com/username/repo" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-bold mb-2.5 text-gray-200">Commit Hash *</label>
                    <input type="text" required value={resubmitData.commitHash}
                      onChange={(e) => setResubmitData({ ...resubmitData, commitHash: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-mono text-sm"
                      placeholder="abc123def456..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2.5 text-gray-200">GitHub Issue URL (optional)</label>
                    <input type="url" value={resubmitData.issueUrl}
                      onChange={(e) => setResubmitData({ ...resubmitData, issueUrl: e.target.value })}
                      className="w-full px-5 py-4 rounded-xl border-2 border-gray-700 transition-all duration-300 focus:scale-[1.02] bg-gray-900/50 text-white placeholder-gray-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 font-medium text-sm"
                      placeholder="https://github.com/.../issues/123" />
                  </div>
                </div>

                <div className="space-y-4 pt-2 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                  <p className="text-sm text-blue-300 font-semibold">📎 Upload new files (optional - only if you need to update them)</p>
                  <FileInput label="Test Patch (optional)" file={resubmitFiles.testPatch}
                    onChange={(file) => setResubmitFiles({ ...resubmitFiles, testPatch: file })} required={false} />
                  <FileInput label="Dockerfile (optional)" file={resubmitFiles.dockerfile}
                    onChange={(file) => setResubmitFiles({ ...resubmitFiles, dockerfile: file })} required={false} />
                  <FileInput label="Solution Patch (optional)" file={resubmitFiles.solutionPatch}
                    onChange={(file) => setResubmitFiles({ ...resubmitFiles, solutionPatch: file })} required={false} />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" disabled={processing}
                    className="flex-1 py-4 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-black text-lg rounded-xl transition-all duration-300 shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed">
                    {processing ? "Resubmitting..." : "🔄 Resubmit Task"}
                  </button>
                  <button type="button" onClick={() => setShowResubmitModal(false)}
                    className="px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-all duration-300">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FileInput({ label, file, onChange, required = true }: { label: string; file: File | null; onChange: (file: File | null) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2.5 text-gray-200">{label} {required && '*'}</label>
      <div className="relative">
        <input type="file" required={required} onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="w-full px-5 py-4 bg-gray-900/50 border-2 border-gray-700 text-white rounded-xl transition-all duration-300 focus:scale-[1.02] focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 file:mr-4 file:py-2.5 file:px-5 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-gradient-to-r file:from-purple-600 file:to-pink-600 file:text-white hover:file:from-purple-700 hover:file:to-pink-700 file:transition-all file:duration-300 file:cursor-pointer" />
      </div>
      {file && (
        <p className="mt-2 text-sm text-green-400 font-semibold flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {file.name}
        </p>
      )}
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
