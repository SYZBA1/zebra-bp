# RAG Knowledge System - Setup & Deployment Guide

## Quick Start

### Prerequisites
- ✅ Supabase project configured
- ✅ Vector extension enabled (pgvector)
- ✅ Voyage AI API key configured
- ✅ Admin access to Zebra platform

### 1. Apply Database Migration

**Option A: Supabase Dashboard**
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy and paste contents of `supabase/migrations/20260502000001_add_rag_knowledge_system.sql`
4. Click "Run"
5. Verify success in Logs

**Option B: Supabase CLI**
```bash
supabase db push
```

### 2. Create Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Create new bucket named: `documents`
3. Set bucket to **Private** (not public)
4. Click "Save"

### 3. Configure Storage Policies

Go to Supabase Dashboard → Storage → documents → Policies

Create these policies:

**Policy 1: Public Read**
```sql
SELECT on storage.objects
WHERE bucket_id = 'documents'
```
- Target roles: Any (anon, authenticated)
- CRUD: ☑️ SELECT

**Policy 2: Admin Upload**
```sql
INSERT on storage.objects
WHERE bucket_id = 'documents' AND has_role(auth.uid(), 'admin')
```
- Target roles: Authenticated users with admin role
- CRUD: ☑️ INSERT

**Policy 3: Admin Delete**
```sql
DELETE on storage.objects
WHERE bucket_id = 'documents' AND has_role(auth.uid(), 'admin')
```
- Target roles: Authenticated users with admin role
- CRUD: ☑️ DELETE

### 4. Environment Variables

Add to `.env.local` or your deployment environment:

```env
# Already configured:
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
VOYAGE_API_KEY=xxx-xxx-xxx

# Add frontend visibility (optional for test retrieval):
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_VOYAGE_API_KEY=xxx-xxx-xxx
```

### 5. Deploy Edge Functions

The following edge functions are already created:

1. **manage-knowledge-sectors** - CRUD operations for sectors
2. **upload-knowledge-document** - Document upload and management
3. **ingest-document** - Text extraction and embedding generation
4. **chat-assistant** - Updated to support sector filtering (already deployed)

Verify they're deployed in Supabase Dashboard → Edge Functions

## Testing Checklist

### Phase 1: Database Setup
- [ ] Migration applied successfully
- [ ] `knowledge_sectors` table created
- [ ] `knowledge_documents` table updated with new columns
- [ ] `knowledge_chunks` table exists with embeddings
- [ ] `match_knowledge_by_sector` function created
- [ ] HNSW index created on embeddings
- [ ] RLS policies applied

```sql
-- Verify in Supabase SQL Editor:
SELECT * FROM information_schema.tables 
WHERE table_name IN ('knowledge_sectors', 'knowledge_documents', 'knowledge_chunks')
ORDER BY table_name;

SELECT EXISTS(
  SELECT 1 FROM pg_proc 
  WHERE proname = 'match_knowledge_by_sector'
) AS function_exists;
```

### Phase 2: Admin Portal Access
- [ ] Navigate to admin dashboard: `/admin`
- [ ] Click "Knowledge Base" in sidebar
- [ ] See four tabs: Documents, Sectors, Upload, Test Retrieval
- [ ] Stats panel displays (0 documents initially)

### Phase 3: Sector Management
- [ ] Create sector "Finance"
  - [ ] Name: Finance
  - [ ] Description: Financial business documents
  - [ ] Color: Blue
- [ ] Create sector "Healthcare"
  - [ ] Name: Healthcare
  - [ ] Description: Medical business documents
  - [ ] Color: Green
- [ ] Edit "Finance" - change description
- [ ] View both sectors in list
- [ ] Delete "Finance" (confirm works)
- [ ] Create "Finance" again

**Expected:** Sectors appear/disappear in real-time

### Phase 4: Document Upload
- [ ] Create a test text file `sample.txt`:
  ```
  Healthcare Business Plan

  Healthcare Sector Overview:
  - Growing demand for digital health solutions
  - Regulatory environment: FDA approval required
  - Market size: $500B globally
  - Entry barriers: High compliance requirements

  Key Success Factors:
  1. Regulatory compliance
  2. Patient data security
  3. Integration with existing healthcare systems
  4. Reimbursement policies

  Financial Projections:
  - Initial investment: $2M
  - Break-even: 3 years
  - Projected ROI: 250% by year 5
  ```

- [ ] Upload document:
  - [ ] Select sector: "Healthcare"
  - [ ] Drag file or click to browse
  - [ ] Title: "Healthcare Business Plan"
  - [ ] Description: "Comprehensive guide for healthcare startups"
  - [ ] Click "Upload Document"
  - [ ] See loading state
  - [ ] Success message appears

**Expected:** Document appears in Documents tab with status "processed"

- [ ] Check document details:
  - [ ] Title: "Healthcare Business Plan"
  - [ ] Sector: "Healthcare"
  - [ ] File size: shows MB
  - [ ] Status: "Processed" (green badge)
  - [ ] Chunks: should show count (typically 3-5 for sample)
  - [ ] Date: today's date

### Phase 5: Test Retrieval
- [ ] Go to "Test Retrieval" tab
- [ ] Enter query: "What are healthcare regulatory requirements?"
- [ ] Click "Test"
- [ ] See results:
  - [ ] Result count: 1-5 chunks
  - [ ] Each chunk shows similarity percentage
  - [ ] Content preview shows actual text from document
  - [ ] Document title displayed

**Expected:** Retrieved chunks contain text about FDA, compliance, regulations

- [ ] Test query 2: "What's the projected ROI?"
  - [ ] Should retrieve chunks about financial projections

### Phase 6: Sector Filtering
- [ ] Upload another document to "Finance" sector
  - [ ] Create text file about finance
  - [ ] Upload with sector "Finance"

- [ ] In Documents tab, filter by sector:
  - [ ] Select "Finance" from filter dropdown
  - [ ] See only Finance documents
  - [ ] Select "Healthcare"
  - [ ] See only Healthcare documents
  - [ ] Select "All Sectors"
  - [ ] See all documents

### Phase 7: Document Deletion
- [ ] In Documents tab, click trash icon on a document
- [ ] Confirm deletion
- [ ] Document disappears from list
- [ ] Storage file is cleaned up
- [ ] Chunks are cascaded deleted

### Phase 8: Chat Integration
- [ ] Open chat widget
- [ ] Send message: "Tell me about healthcare regulations"
- [ ] System retrieves knowledge and responds with context
- [ ] Response mentions regulatory information
- [ ] Sources are grounded in documents

### Phase 9: Multiple Documents
- [ ] Upload 3-5 more documents across sectors
- [ ] Verify all show "Processed" status
- [ ] Stats panel updates:
  - [ ] Total Documents: 8-10
  - [ ] Processed: 8-10
  - [ ] Total Chunks: 30+ (varies by file size)

- [ ] Test mixed queries:
  - [ ] "Compare healthcare and finance regulations"
  - [ ] Should retrieve from both sectors
  - [ ] "What are the healthcare market trends?"
  - [ ] Should retrieve healthcare documents only

### Phase 10: Error Handling
- [ ] Try uploading invalid file type
  - [ ] Expected: Error message "File type not supported"

- [ ] Try uploading file > 50MB
  - [ ] Expected: Error message "File size exceeds limit"

- [ ] Try uploading without selecting sector
  - [ ] Expected: Error message "Please fill in all required fields"

- [ ] Delete document mid-processing (if possible)
  - [ ] Check error message in document status

### Phase 11: Performance
- [ ] Query with small documents: < 100ms response
- [ ] Query with multiple documents: < 500ms response
- [ ] Large file upload: completes without timeout
- [ ] Stats panel loads quickly

### Phase 12: Edge Cases
- [ ] Upload document with special characters: café_résumé_2024.txt
  - [ ] Should handle properly

- [ ] Upload document with very long content (10MB text)
  - [ ] Should process all chunks

- [ ] Create sector with no documents
  - [ ] Sector should still exist
  - [ ] Can be deleted
  - [ ] Can have documents added later

## Troubleshooting

### Issue: "Documents" tab shows nothing
**Solution:**
1. Verify migration was applied
2. Check browser console for errors
3. Verify admin role on user
4. Refresh page

### Issue: Upload button disabled
**Solution:**
1. Select sector first
2. Make sure file is selected
3. Verify file format is supported

### Issue: Document stuck on "Processing"
**Solution:**
1. Check edge function logs
2. Verify Voyage API key is configured
3. Check file format is valid
4. Delete document and retry

### Issue: No chunks retrieved in test
**Solution:**
1. Verify document has status "Processed"
2. Check total_chunks > 0
3. Try exact phrase from document
4. Add more documents
5. Check knowledge_chunks table directly

### Issue: Sector selector not appearing
**Solution:**
1. Verify sectors exist in database
2. Refresh page
3. Check admin role
4. Clear browser cache

## Database Verification Queries

Use these in Supabase SQL Editor to verify setup:

```sql
-- Count all sectors
SELECT COUNT(*) as total_sectors FROM knowledge_sectors;

-- Count all documents
SELECT COUNT(*) as total_documents FROM knowledge_documents;

-- Check documents by status
SELECT status, COUNT(*) as count FROM knowledge_documents GROUP BY status;

-- Count total chunks
SELECT COUNT(*) as total_chunks FROM knowledge_chunks;

-- Check if embeddings are stored
SELECT COUNT(*) as chunks_with_embeddings 
FROM knowledge_chunks 
WHERE embedding IS NOT NULL;

-- Show documents with chunks
SELECT 
  kd.id,
  kd.title,
  kd.status,
  COUNT(kc.id) as chunk_count
FROM knowledge_documents kd
LEFT JOIN knowledge_chunks kc ON kd.id = kc.document_id
GROUP BY kd.id, kd.title, kd.status;

-- Test similarity search
SELECT 
  id,
  document_id,
  content,
  similarity
FROM public.match_knowledge_by_sector(
  (SELECT embedding FROM knowledge_chunks LIMIT 1),
  NULL,
  5
)
LIMIT 5;
```

## Performance Optimization

### For Large Document Collections
1. **Increase Voyage batch size** (in ingest-document function)
   - Current: 10 chunks/batch
   - Increase to 20-30 if rate limits allow

2. **Implement document pagination**
   - Add pagination to document list UI
   - Load first 20, then lazy-load more

3. **Cache popular sectors**
   - Store frequently accessed sector data in browser
   - Reduce database queries

### For Production Deployment
1. **Monitor edge function costs**
   - Track API calls to Voyage AI
   - Set up cost alerts

2. **Set up error monitoring**
   - Use Sentry or similar
   - Track ingestion failures

3. **Implement retry logic**
   - Auto-retry failed document ingestions
   - Exponential backoff for rate limits

4. **Scale vector database**
   - Move to Pinecone for > 1M vectors
   - Use Weaviate for complex queries

## Next Steps

1. **Enable sector selector in chat**
   - Import SectorSelector component in ChatWidget
   - Allow users to filter chat by sector

2. **Add knowledge quality metrics**
   - Track which documents are most useful
   - Implement feedback system

3. **Implement document versioning**
   - Allow updating documents
   - Keep history of changes

4. **Add analytics**
   - Track which queries retrieve which documents
   - Identify gaps in knowledge base

5. **Extend to more sectors**
   - Create default sectors for common industries
   - Allow users to customize sectors

## Support & Debugging

**Enable debug logging:**
In edge functions, add:
```typescript
console.log("Debug info:", { documentId, chunkCount, embeddingCount });
```

**Monitor edge function logs:**
Supabase Dashboard → Edge Functions → [Function name] → Logs

**Check storage:**
Supabase Dashboard → Storage → documents

**Verify database:**
Supabase Dashboard → SQL Editor → Run verification queries above

## Deployment Checklist

Before going to production:

- [ ] All environment variables configured
- [ ] Migration applied successfully
- [ ] Storage bucket created with correct policies
- [ ] Edge functions deployed
- [ ] Admin users have correct roles
- [ ] Sector sample data created
- [ ] Document upload tested end-to-end
- [ ] Chat integration tested
- [ ] Error handling verified
- [ ] Performance acceptable
- [ ] Monitoring set up
- [ ] Backup plan in place

---

**Questions?** Refer to `RAG_KNOWLEDGE_SYSTEM.md` for detailed architecture documentation.
