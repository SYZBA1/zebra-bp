import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Sector {
  id: string;
  name: string;
}

interface Props {
  sectors: Sector[];
  onUploadSuccess: () => void;
}

export default function DocumentUpload({ sectors, onUploadSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sectorId, setSectorId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sectorId && sectors.length > 0) {
      setSectorId(sectors[0].id);
    }
  }, [sectors, sectorId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/csv",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Supported: PDF, DOCX, TXT, CSV");
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 50MB");
      return;
    }

    setSelectedFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !sectorId || !title.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Upload file
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("sector_id", sectorId);
      formData.append("title", title);
      formData.append("description", description);

      const uploadResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-knowledge-document/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.error || "Upload failed");
      }

      const { document } = await uploadResponse.json();

      // Trigger ingestion
      const ingestResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documentId: document.id }),
        }
      );

      if (!ingestResponse.ok) {
        const error = await ingestResponse.json();
        throw new Error(error.error || "Ingestion failed");
      }

      toast.success("Document uploaded and processing started!");
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      setSectorId("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploadSuccess();
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sector */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Sector *
        </label>
        {sectors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Please create a sector first.
          </p>
        ) : (
          <Select value={sectorId} onValueChange={setSectorId}>
            <SelectTrigger>
              <SelectValue placeholder="Select sector..." />
            </SelectTrigger>
            <SelectContent>
              {sectors.map((sector) => (
                <SelectItem key={sector.id} value={sector.id}>
                  {sector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* File Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Document *
        </label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.csv"
            onChange={handleFileChange}
            className="hidden"
          />
          {selectedFile ? (
            <div className="space-y-2">
              <FileText className="w-8 h-8 mx-auto text-green-600" />
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="font-medium">Click to upload or drag and drop</p>
              <p className="text-sm text-muted-foreground">
                PDF, DOCX, TXT, or CSV (max 50MB)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Title *
        </label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Description
        </label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of the document content..."
          rows={3}
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading || !selectedFile || !sectorId}
        className="w-full gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Upload Document
          </>
        )}
      </Button>
    </form>
  );
}
