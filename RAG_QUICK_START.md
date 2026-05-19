# RAG Knowledge System - 5 Minute Quick Start

## What This Gives You

✅ Document upload and management per sector  
✅ Automatic text extraction and embedding  
✅ Sector-aware AI knowledge retrieval  
✅ Admin dashboard for full control  
✅ Test tool to validate retrieval quality  

## 🚀 Deploy Now (5 Steps)

### Step 1: Run Database Migration
Copy and paste into Supabase SQL Editor:
```sql
-- From: supabase/migrations/20260502000001_add_rag_knowledge_system.sql
-- Run the entire migration file
```

### Step 2: Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create new bucket: `documents` (set to Private)
3. Add these policies:
   - Public SELECT on `bucket_id = 'documents'`
   - Admin INSERT on `bucket_id = 'documents'`  
   - Admin DELETE on `bucket_id = 'documents'`

### Step 3: Verify Environment Variables
In your `.env.local`:
```env
VITE_SUPABASE_URL=https://xxx.supabase.co  # Should exist
VITE_VOYAGE_API_KEY=xxx-xxx-xxx            # Should exist
```

### Step 4: Deploy Functions
```bash
supabase functions deploy manage-knowledge-sectors
supabase functions deploy upload-knowledge-document
supabase functions deploy ingest-document
```

### Step 5: Access Admin Panel
1. Log in as admin
2. Navigate to `/admin/knowledge-base`
3. You're done! 🎉

## 📖 Using the System

### Create a Sector
1. Go to "Sectors" tab
2. Click "Create Sector"
3. Enter: Name, Description, Color
4. Click "Create"

### Upload Documents
1. Go to "Upload" tab
2. Select sector
3. Upload PDF/DOCX/TXT/CSV (max 50MB)
4. Enter title & description
5. Click "Upload Document"
6. Wait for "Processed" status ✓

### View Documents
1. Go to "Documents" tab
2. See all documents with status
3. Filter by sector (optional)
4. Delete with trash icon

### Test Retrieval
1. Go to "Test Retrieval" tab
2. Enter test question
3. (Optional) filter by sector
4. Click "Test"
5. See top-5 matching chunks with similarity %

### Chat Integration
1. Open chat widget
2. Ask questions
3. AI automatically retrieves relevant sector knowledge
4. Gets answers grounded in your documents

## 📊 Monitoring

Check document processing in Documents tab:
- 🟢 Green "Processed" = Ready for retrieval
- 🔵 Blue "Processing" = Wait, it's working...
- ⚪ Gray "Pending" = Queue waiting
- 🔴 Red "Failed" = Check error message, try again

## ✅ Quick Test

1. **Create sector:** "Test"
2. **Create text file `test.txt`:**
   ```
   Zebra Platform Benefits
   - Feasibility studies in 24 hours
   - AI-powered business planning
   - Expert marketplace connection
   - Financial modeling tools
   ```
3. **Upload** it to "Test" sector
4. **Test retrieval** with query: "What does Zebra offer?"
5. **See results** with your document text

## 🔧 Troubleshooting

| Problem | Fix |
|---------|-----|
| Upload button disabled | Select sector first |
| Document stuck "Processing" | Check Voyage API key in env vars |
| No retrieval results | Upload at least one document |
| Can't access `/admin/knowledge-base` | Verify admin role on user |
| Auth errors | Check SUPABASE_URL env var |

## 📚 Full Documentation

- **Architecture:** `RAG_KNOWLEDGE_SYSTEM.md`
- **Setup Details:** `RAG_SETUP_GUIDE.md`
- **Testing Checklist:** In `RAG_SETUP_GUIDE.md`
- **API Reference:** Function JSDoc comments

## 🎯 Next Steps

1. ✅ Upload domain-specific documents for each sector
2. ✅ Test with sample queries in Test Retrieval
3. ✅ Ask users for feedback on response quality
4. ✅ Add/refine documents based on gaps found
5. ✅ Optional: Add SectorSelector to chat widget for user filtering

## 🚨 Important Notes

- **Voyage API:** Has rate limits (3 calls/min, free tier)
- **First document:** May take 1-2 min for full processing
- **Sector required:** Admin must create sector before uploading
- **File cleanup:** Automatic when documents deleted
- **Backward compatible:** Chat works with or without sectors

## 💡 Pro Tips

1. **Use descriptive titles** → Better for admin organization
2. **Add descriptions** → Helps understand document purpose
3. **Test before sharing** → Use Test Retrieval tab
4. **Group documents** → One sector per business area
5. **Monitor status** → Check Documents tab for health

## 🆘 Need Help?

1. **Check SQL logs** → Supabase → SQL Editor
2. **View function logs** → Supabase → Edge Functions
3. **Check storage** → Supabase → Storage → documents
4. **Run verification queries** → From `SETUP_RAG_SYSTEM.sql`
5. **Read full guide** → See documentation files

---

**Ready?** Navigate to `/admin/knowledge-base` and start! 🚀

**Questions?** See full docs in RAG_*.md files in project root.
