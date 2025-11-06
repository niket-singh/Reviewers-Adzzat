export const DOMAINS = [
  'Bug Fixes',
  'Troubleshooting/Fixing broken codebases',
  'Fixing Broken Build Environments',
  'SRE-style work with k8s or Terraform changes',
  'Terminal-Heavy workloads Without Large Coding Emphasis',
  'DevOps/Security',
  'End-to-End Tasks Beyond code Implementation',
] as const

export const LANGUAGES = [
  'Python',
  'C',
  'C++',
  'Go',
  'Rust',
  'Java',
  'JavaScript',
  'TypeScript',
  'yaml',
  'Shell/Bash',
  'Other',
] as const

export type Domain = typeof DOMAINS[number]
export type Language = typeof LANGUAGES[number]
