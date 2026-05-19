# RAG Knowledge System - Implementation Guide

## Overview

The RAG (Retrieval Augmented Generation) Knowledge System allows admins to upload and manage domain-specific documents per sector, which the AI uses to provide more accurate, context-aware responses to user queries.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Admin Portal                                 │
│  Knowledge Base Module (Dashboard + UI Components)              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Backend APIs                                 │
│  - manage-knowledge-sectors (CRUD sectors)                      │
│  - upload-knowledge-document (upload & store files)             │
│  - ingest-document (text extraction & embedding)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Data Storage                                   │
│  PostgreSQL:                                                    │
│    - knowledge_sectors                                          │
│    - knowledge_documents                                        │
│    - knowledge_chunks (with embeddings)                         │
│  Storage:                                                       │
│    - Supabase Storage (original files)                          │
│  Vector DB:                                                     │
│    - pgvector (embeddings in PostgreSQL)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              RAG Retrieval Engine                               │
│  - Embedding generation (Voyage AI)                             │
│  - Semantic search (pgvector HNSW index)                        │
│  - Sector-aware filtering                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                 Chat Assistant                                  │
│  - Retrieves relevant knowledge                                 │
│  - Injects context into LLM prompt                              │
│  - Provides grounded, sector-specific responses                 │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Database Schema

**knowledge_sectors table:**
- `id` (UUID, PK)
- `name` (TEXT, UNIQUE)
- `description` (TEXT)
- `color` (TEXT) - For UI representation
- `created_at`, `updated_at` (TIMESTAMPTZ)

**knowledge_documents table (enhanced):**
- `id` (UUID, PK)
- `title` (TEXT)
- `source` (TEXT) - Original filename
- `sector_id` (UUID, FK) - NEW
- `file_path` (TEXT) - NEW: Storage path
- `file_type` (TEXT) - NEW: MIME type
- `file_size_bytes` (INTEGER) - NEW
- `status` (TEXT) - NEW: pending/processing/processed/failed
- `language` (TEXT)
- `total_chunks` (INTEGER)
- `error_message` (TEXT) - NEW: For failed processing
- `processed_at` (TIMESTAMPTZ) - NEW
- `created_at`, `updated_at` (TIMESTAMPTZ)

**knowledge_chunks table:**
- `id` (UUID, PK)
- `document_id` (UUID, FK)
- `chunk_index` (INTEGER)
- `content` (TEXT)
- `embedding` (vector(1024)) - Voyage-3 embeddings
- `metadata` (JSONB) - Sector, source, title, etc.
- `created_at` (TIMESTAMPTZ)

### 2. Backend APIs

#### Sector Management
```typescript
// GET /manage-knowledge-sectors/sectors
// List all sectors

// POST /manage-knowledge-sectors/sectors
body: {
  name: string;
  description?: string;
  color?: string;
}

// PUT /manage-knowledge-sectors/sectors/:id
body: {
  name?: string;
  description?: string;
  color?: string;
}

// DELETE /manage-knowledge-sectors/sectors/:id
```

#### Document Upload & Management
```typescript
// GET /upload-knowledge-document/documents?sector_id=<UUID>
// List documents (optionally filtered by sector)

// POST /upload-knowledge-document/documents
// Form data:
// - file: File (PDF, DOCX, TXT, CSV max 50MB)
// - sector_id: UUID (required)
// - title: string (required)
// - description?: string

// DELETE /upload-knowledge-document/documents/:id
```

#### Document Ingestion
```typescript
// POST /ingest-document
body: {
  documentId: UUID;
}

// Response includes:
// - success: boolean
// - document: updated document record
// - chunksCount: number of chunks created
```

### 3. Frontend Components

**Admin Knowledge Base Page:**
- Located at: `/admin/knowledge-base`
- Tabs:
  1. **Documents** - View, filter, and delete documents
  2. **Sectors** - Create, edit, delete sectors
  3. **Upload** - Upload new documents
  4. **Test Retrieval** - Test the RAG system with sample queries

**Components:**
- `KnowledgeBasePage.tsx` - Main container
- `SectorManagement.tsx` - Sector CRUD UI
- `DocumentUpload.tsx` - File upload form
- `DocumentList.tsx` - Document listing with filtering
- `TestRetrieval.tsx` - RAG query testing interface

## Workflow

### 1. Admin Creates Sector
1. Navigate to `/admin/knowledge-base` → Sectors tab
2. Click "Create Sector"
3. Enter name, description, and choose color
4. Submit

### 2. Admin Uploads Document
1. Navigate to Sectors or Documents tab
2. Click "Upload" tab
3. Select sector
4. Upload file (PDF, DOCX, TXT, CSV)
5. Enter title and description
6. Submit
7. System automatically:
   - Stores file in S3/Storage
   - Creates document record (status: pending)
   - Extracts text from file
   - Chunks text into 1000-char segments (200-char overlap)
   - Generates embeddings using Voyage API
   - Stores chunks with embeddings in pgvector
   - Updates document status to "processed"

### 3. User Queries Assistant with Sector Context
1. User opens chat or makes query
2. (Optional) User or system selects sector
3. Query → embedding generation
4. System calls `match_knowledge_by_sector(query_embedding, sector_id, ...)`
5. Retrieves top-5 relevant chunks
6. Injects chunks into system prompt as KNOWLEDGE_CONTEXT
7. LLM generates response grounded in retrieved documents
8. Response sent to user with source attribution

### 4. Admin Tests Retrieval
1. Navigate to Test Retrieval tab
2. Enter test query
3. Optionally filter by sector
4. System shows top-5 retrieved chunks with similarity scores
5. Admin validates retrieval quality

## Technical Details

### Embedding Generation
- **Provider:** Voyage AI (voyage-3 model)
- **Vector size:** 1024 dimensions
- **Rate limits:** 3 RPM, 10K TPM (free tier)
- **Batch handling:** Respects rate limits with 65-second delays

### Vector Search
- **Index:** HNSW (Hierarchical Navigable Small World)
- **Distance metric:** cosine similarity
- **Query operation:** `embedding <=> query_embedding`

### Text Chunking
- **Strategy:** Fixed-size chunks with overlap
- **Chunk size:** 1000 characters
- **Overlap:** 200 characters
- **Result:** Better context preservation at chunk boundaries

### File Processing
**Supported formats:**
- PDF: Text extraction from PDF content
- DOCX: Word document text extraction
- TXT: Plain text files
- CSV: Comma-separated values

**Limitations:**
- PDF/DOCX extraction is simplified (use pdf-parse or mammoth.js for production)
- Max file size: 50MB
- Processing is async with status tracking

## Integration with Chat

The chat-assistant function has been enhanced to support sector filtering:

```typescript
// Request with sector filtering
{
  conversationId: "...",
  message: "What is...",
  language: "en",
  sectorId: "sector-uuid-here"  // NEW: optional
}

// System automatically:
// 1. Generates query embedding
// 2. Calls match_knowledge_by_sector(embedding, sectorId, ...)
// 3. Injects matched chunks into system prompt
// 4. Gets LLM response grounded in sector knowledge
```

### Backward Compatibility
- If no sectorId is provided, uses `match_knowledge` (original behavior)
- All existing queries continue to work
- New sector filtering is opt-in

## Performance Considerations

### Database Indexes
- `knowledge_documents_sector_id_idx` - Fast sector filtering
- `knowledge_documents_status_idx` - Quick status queries
- `knowledge_chunks_embedding_idx` - HNSW index for semantic search

### Scalability
- **Horizontal:** Multiple sectors with independent document collections
- **Vertical:** HNSW index scales to millions of vectors
- **Processing:** Async ingestion pipeline with rate limit handling

### Rate Limiting
- Voyage API: 3 calls/minute, 10K tokens/minute
- Implementation: 65-second waits between batches
- Future: Consider Redis-backed rate limiter for production

## Error Handling

**Document Processing Errors:**
1. Invalid file type → 400 error
2. File too large → 400 error
3. Upload fails → Automatic cleanup of file
4. Processing fails → Document status set to "failed" with error message
5. Admin can delete and re-upload

**Retrieval Errors:**
1. Voyage API unavailable → Falls back to general knowledge
2. No matching chunks → Returns empty context
3. Graceful degradation → Chat still works without RAG

## Security

### Row-Level Security (RLS)
- **knowledge_sectors:** Public read, admin write/delete
- **knowledge_documents:** Public read, admin write/delete
- **knowledge_chunks:** Public read, admin delete
- **File storage:** Admin-only upload/delete

### Access Control
- All API endpoints require admin authentication
- User role verification before allowing operations

## Future Enhancements

1. **Advanced file processing:**
   - Use pdf-parse for better PDF extraction
   - Use mammoth.js for DOCX parsing
   - OCR support for scanned documents

2. **Sector-aware UI:**
   - Sector selector in chat widget
   - Per-sector knowledge statistics
   - Sector-specific AI system prompts

3. **Query Optimization:**
   - Use query embedding caching
   - Implement result caching
   - A/B test retrieval parameters

4. **Admin Features:**
   - Bulk document upload
   - Document editing
   - Re-embedding existing chunks
   - Knowledge quality analytics
   - User search analytics per sector

5. **Vector Database Options:**
   - Pinecone integration for higher scale
   - Weaviate for more complex queries
   - Milvus for self-hosted option

6. **Multi-language Support:**
   - Separate embeddings per language
   - Cross-language retrieval
   - Language-specific chunking

## Troubleshooting

### Documents stuck in "processing"
1. Check error_message field in knowledge_documents
2. Verify Voyage API key is configured
3. Check file size and format
4. Delete and re-upload document

### No chunks retrieved
1. Verify document has status = "processed"
2. Check total_chunks > 0
3. Test with exact phrase from document
4. Check sector_id filter is correct

### Low retrieval quality
1. Adjust chunk size (try 1500 or 2000 chars)
2. Increase match_count (try 7-10 instead of 5)
3. Verify document content is relevant
4. Add more documents to sector

### API authentication errors
1. Verify user has admin role
2. Check access token is valid
3. Verify Authorization header format
4. Check SUPABASE_URL env var is correct

## API Environment Variables

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
VOYAGE_API_KEY=xxx-xxx-xxx
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_VOYAGE_API_KEY=xxx-xxx-xxx  # For test retrieval UI
```

## Database Migration

Run the migration file to set up the schema:
```sql
-- File: supabase/migrations/20260502000001_add_rag_knowledge_system.sql
```

This creates:
- `knowledge_sectors` table
- Enhanced `knowledge_documents` with sector_id, file tracking, status
- Enhanced similarity search function `match_knowledge_by_sector`
- Necessary indexes and RLS policies

## Support

For issues or questions:
1. Check error logs in Supabase
2. Review function output in edge function dashboard
3. Verify environment variables
4. Test with simpler documents first
5. Contact support with function logs
