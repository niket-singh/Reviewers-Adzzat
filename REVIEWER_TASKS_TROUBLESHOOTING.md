# Reviewer Not Seeing Tasks - Diagnostic Guide

## 🔍 Problem
Reviewer account created and set to "active" but tasks are not showing in their panel.

---

## ✅ Requirements for Auto-Assignment

For a task to be automatically assigned to a reviewer, **ALL** of these conditions must be met:

### **Reviewer Requirements:**
1. ✅ Role = `REVIEWER` (or `ADMIN`)
2. ✅ `isApproved` = `true` (Reviewer is approved)
3. ✅ `isGreenLight` = `true` (Green light is ON/Active)

### **Submission Requirements:**
1. ✅ Status = `PENDING` (not yet assigned)
2. ✅ Uploaded after reviewer was activated

---

## 🧪 Step-by-Step Diagnosis

### **Step 1: Check Reviewer Status in Admin Panel**

As Admin, go to **User Management** and verify:

| Field | Required Value | What to Check |
|-------|---------------|---------------|
| **Role** | REVIEWER | Should show "Reviewer" badge |
| **Status** | Approved | Green checkmark or "Approved" text |
| **Green Light** | ON | Should be 🟢 green (not 🔴 red) |

**If any of these is wrong:**
- Role not REVIEWER → Click "Switch Role" → Select REVIEWER
- Status not Approved → Click "Approve Reviewer"
- Green Light OFF → Click toggle to turn ON

---

### **Step 2: Check When Reviewer Was Activated**

**Important:** Only tasks uploaded **AFTER** the reviewer was activated will be auto-assigned.

**Timeline that works:** ✅
```
1. Upload task (status: PENDING)
2. Approve reviewer
3. Turn green light ON → Task auto-assigns
```

**Timeline that DOESN'T work:** ❌
```
1. Approve reviewer
2. Turn green light ON
3. Upload task → SHOULD auto-assign (check if this happened)
```

**To fix old pending tasks:**
1. Go to admin panel
2. Toggle reviewer's green light OFF then ON
3. This triggers `AssignQueuedTasks()` which assigns all PENDING tasks

---

### **Step 3: Check Database/Logs**

#### **Check Backend Logs (Railway):**

Look for these messages:
```
✅ "Task "..." auto-assigned to [Reviewer Name]"
✅ "Queued task "..." assigned to [Reviewer Name]"
```

If you see these, assignment worked!

If you DON'T see these:
```
❌ No active reviewers available
```
This means reviewer wasn't approved or green light was OFF

#### **Check Database Directly (if possible):**

```sql
-- Check reviewer status
SELECT id, name, role, is_approved, is_green_light
FROM users
WHERE role = 'REVIEWER';

-- Check if tasks are assigned to reviewer
SELECT id, title, status, claimed_by_id, assigned_at
FROM submissions
WHERE claimed_by_id = 'reviewer-uuid-here';

-- Check pending tasks (should be auto-assigned)
SELECT id, title, status, created_at
FROM submissions
WHERE status = 'PENDING';
```

---

### **Step 4: Manual Assignment Test**

If auto-assignment still doesn't work, test manually:

1. **Create a new submission** (as contributor)
2. **Immediately check backend logs** for auto-assign message
3. **Check reviewer's dashboard** - should see the task

**If task appears:** ✅ Auto-assignment works!
**If task doesn't appear:** ❌ Issue with assignment or frontend

---

### **Step 5: Check Frontend API Call**

As the reviewer, open browser DevTools:

1. Go to **Network** tab
2. Filter: **Fetch/XHR**
3. Refresh reviewer dashboard
4. Look for request to: `GET /api/submissions`

**Check Response:**
```json
{
  "submissions": [
    {
      "id": "...",
      "title": "...",
      "status": "CLAIMED",
      "claimedById": "reviewer-uuid",
      ...
    }
  ]
}
```

**If response is empty `[]`:**
- No tasks assigned to this reviewer
- Verify reviewer UUID matches claimed_by_id in database

**If you see tasks but they don't display:**
- Frontend rendering issue
- Check browser console for errors

---

## 🔧 Common Fixes

### **Fix 1: Reviewer Not Approved**

**Problem:** Forgot to approve reviewer before activating

**Solution:**
1. Admin panel → User Management
2. Find reviewer (shows "Pending" status)
3. Click "Approve Reviewer"
4. Toggle green light OFF then ON

---

### **Fix 2: Green Light OFF**

**Problem:** Green light was turned OFF accidentally

**Solution:**
1. Admin panel → User Management
2. Find reviewer (shows 🔴 red icon)
3. Click toggle to turn ON (should turn 🟢 green)

---

### **Fix 3: No Pending Tasks**

**Problem:** All tasks were uploaded before reviewer was activated

**Solution:**
1. **Option A:** Upload a new test submission
2. **Option B:** Change existing task back to PENDING:
   ```sql
   UPDATE submissions
   SET status = 'PENDING', claimed_by_id = NULL, assigned_at = NULL
   WHERE id = 'task-id';
   ```
3. Toggle reviewer's green light OFF→ON to trigger re-assignment

---

### **Fix 4: Wrong Role**

**Problem:** User has CONTRIBUTOR role instead of REVIEWER

**Solution:**
1. Admin panel → User Management
2. Find user
3. Click "Switch Role"
4. Select "REVIEWER"
5. User will need re-approval
6. Approve reviewer
7. Turn green light ON

---

## 🚀 Force Re-Assignment (Admin Action)

If tasks are stuck as PENDING and not auto-assigning:

### **Method 1: Toggle Green Light (Recommended)**
1. Admin panel → User Management
2. Find active reviewer
3. Toggle green light OFF
4. Toggle green light ON
5. This calls `AssignQueuedTasks()` which assigns all PENDING tasks

### **Method 2: Backend API Call**
```bash
# Toggle green light via API
curl -X PUT https://your-backend/api/users/{reviewer-id}/greenlight \
  -H "Authorization: Bearer {admin-token}"
```

---

## 📊 Verify Assignment Worked

### **As Reviewer:**
1. Sign in as reviewer
2. Go to reviewer dashboard
3. Should see tasks with:
   - Status: CLAIMED
   - Assigned date/time
   - "Assigned to you" indicator

### **As Admin:**
1. Go to admin dashboard → Statistics
2. Check "Tasks Assigned" count
3. Go to Activity Logs
4. Look for "AUTO_ASSIGN" actions

---

## 🎯 Expected Behavior

### **When Reviewer is Activated (Green Light ON):**
```
1. Admin approves reviewer
2. Admin turns green light ON
3. System finds all PENDING tasks
4. System assigns tasks to this reviewer (or distributes if multiple reviewers)
5. Task status changes from PENDING → CLAIMED
6. Reviewer sees tasks in their dashboard
```

### **When New Task is Uploaded:**
```
1. Contributor uploads task
2. Task created with status PENDING
3. System finds active reviewers (approved + green light ON)
4. System assigns to reviewer with least tasks
5. Task status changes to CLAIMED
6. Both reviewer and contributor see updated status
```

---

## 🐛 Still Not Working?

If you've tried everything and it still doesn't work:

### **Check These:**

1. **Backend redeployed?**
   - Changes require backend redeploy on Railway
   - Check deployment status

2. **Database connected?**
   - Check Railway logs for "Database connected"
   - Verify DATABASE_URL is set

3. **Multiple reviewers?**
   - Task might be assigned to different reviewer
   - Check who has the lowest task count

4. **Frontend cache?**
   - Hard refresh: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
   - Clear browser cache

5. **API URL correct?**
   - Verify NEXT_PUBLIC_API_URL in Vercel
   - Check browser network tab for API calls

---

## 📝 Debug Checklist

Use this checklist to diagnose:

- [ ] Reviewer role = REVIEWER ✅
- [ ] Reviewer is_approved = true ✅
- [ ] Reviewer is_green_light = true ✅
- [ ] At least one task with status = PENDING exists
- [ ] Backend deployed successfully
- [ ] Backend logs show "auto-assigned" message
- [ ] Database shows claimed_by_id = reviewer's UUID
- [ ] Frontend API call returns submissions
- [ ] Reviewer dashboard shows tasks

---

## 🔍 Quick Test

To quickly verify auto-assignment is working:

1. **As Admin:**
   - Create reviewer account
   - Approve reviewer
   - Turn green light ON

2. **As Contributor:**
   - Upload a new test submission

3. **Check Backend Logs:**
   - Should see: "Task '...' auto-assigned to [Reviewer]"

4. **As Reviewer:**
   - Refresh dashboard
   - Task should appear with status "CLAIMED"

**If this works:** ✅ Auto-assignment is functional!
**If this doesn't work:** ❌ Check backend deployment and environment variables

---

## 💡 Pro Tips

1. **Always approve BEFORE activating** (green light)
2. **Toggle green light OFF→ON** to trigger re-assignment of queued tasks
3. **Check backend logs** for auto-assign messages
4. **Use Network tab** to verify API responses
5. **Test with fresh submission** to isolate issue

---

## 🆕 New Feature: Admins Can Review Too!

After the latest update, **admins can also be assigned review tasks**:

- Admins with green light ON will receive task assignments
- Admins see all tasks by default (admin view)
- Admins can filter to "My Tasks" using `?view=mine` parameter
- Fair distribution works across both reviewers and admins

**To enable admin as reviewer:**
1. Admin account is auto-approved
2. Turn green light ON for admin
3. Admin will start receiving task assignments
4. Admin can review tasks just like reviewers
