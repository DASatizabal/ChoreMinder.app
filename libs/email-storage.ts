// Simple in-memory email log storage
interface EmailLogEntry {
  id: string;
  timestamp: string;
  type: string;
  to: string;
  subject: string;
  details: any;
  success: boolean;
}

// Global email logs array
const emailLogs: EmailLogEntry[] = [];

// Add email log entry
export function addEmailLog(entry: Omit<EmailLogEntry, 'id' | 'timestamp'>) {
  const logEntry: EmailLogEntry = {
    id: Date.now().toString() + Math.random().toString(36).substring(2),
    timestamp: new Date().toISOString(),
    ...entry,
  };
  
  emailLogs.push(logEntry);
  
  // Keep only last 1000 logs to prevent memory issues
  if (emailLogs.length > 1000) {
    emailLogs.splice(0, emailLogs.length - 1000);
  }
  
  console.log(`📧 [EMAIL STORAGE] Log added:`, logEntry);
  return logEntry;
}

// Get all email logs
export function getEmailLogs(limit?: number, type?: string) {
  let filteredLogs = emailLogs;
  
  if (type) {
    filteredLogs = emailLogs.filter(log => log.type === type);
  }
  
  // Sort by timestamp (newest first)
  const sortedLogs = filteredLogs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
  if (limit) {
    return sortedLogs.slice(0, limit);
  }
  
  return sortedLogs;
}

// Get email stats
export function getEmailStats() {
  return {
    totalEmails: emailLogs.length,
    invitations: emailLogs.filter(log => log.type === "invitation").length,
    notifications: emailLogs.filter(log => log.type === "notification").length,
    successful: emailLogs.filter(log => log.success).length,
    failed: emailLogs.filter(log => !log.success).length,
  };
}

// Clear all logs
export function clearEmailLogs() {
  const clearedCount = emailLogs.length;
  emailLogs.length = 0;
  console.log(`📧 [EMAIL STORAGE] Cleared ${clearedCount} log entries`);
  return clearedCount;
}