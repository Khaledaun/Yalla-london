"use client";

/**
 * Listing Editor — View and edit EtsyListingDrafts
 *
 * Features:
 * - Title with character counter (max 140)
 * - Tags chip editor (max 13 tags, 20 chars each)
 * - Description editor
 * - Price field
 * - Compliance checker
 * - Status workflow buttons
 * - Preview images and file management
 *
 * Accessed at: /admin/cockpit/commerce/listing?id=<draftId>
 */

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface ListingDraft {
  id: string;
  siteId: string;
  briefId: string;
  title: string;
  description: string | null;
  tags: string[];
  price: number;
  currency: string;
  quantity: number;
  section: string | null;
  materials: string[];
  fileUrl: string | null;
  previewImages: { url: string; fileName: string; position: number }[] | null;
  status: string;
  etsyUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  approvedAt: string | null;
  publishedAt: string | null;
}

interface ComplianceResult {
  valid: boolean;
  issues: { field: string; message: string }[];
}

const ETSY_MAX_TITLE = 140;
const ETSY_MAX_TAGS = 13;
const ETSY_MAX_TAG_CHARS = 20;

export default function ListingEditorPage() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get("id");

  const [draft, setDraft] = useState<ListingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [compliance, setCompliance] = useState<ComplianceResult | null>(null);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [price, setPrice] = useState(0);
  const [newTag, setNewTag] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // ─── Load Draft ─────────────────────────────────────────

  const loadDraft = useCallback(async () => {
    if (!draftId) return;
    try {
      const res = await fetch(`/api/admin/commerce/listings?limit=1`);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      const found = (data.data as ListingDraft[])?.find(
        (d) => d.id === draftId,
      );
      if (found) {
        setDraft(found);
        setTitle(found.title);
        setDescription(found.description ?? "");
        setTags(found.tags ?? []);
        setPrice(found.price);
      }
    } catch (err) {
      console.warn("[listing-editor] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // ─── Save Changes ──────────────────────────────────────

  const saveChanges = async () => {
    if (!draftId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/commerce/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          draftId,
          title,
          description,
          tags,
          price,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Changes saved");
        await loadDraft();
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ─── Check Compliance ──────────────────────────────────

  const checkCompliance = async () => {
    if (!draftId) return;
    try {
      const res = await fetch("/api/admin/commerce/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_compliance", draftId }),
      });
      const data = await res.json();
      if (data.success) {
        setCompliance(data.data);
      }
    } catch {
      showToast("Compliance check failed");
    }
  };

  // ─── Approve Draft ─────────────────────────────────────

  const approveDraft = async () => {
    if (!draftId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/commerce/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", draftId }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Draft approved");
        await loadDraft();
      } else {
        showToast(`Error: ${data.error}`);
      }
    } catch {
      showToast("Approve failed");
    } finally {
      setSaving(false);
    }
  };

  // ─── Tag Management ────────────────────────────────────

  const addTag = () => {
    const trimmed = newTag.trim().toLowerCase().slice(0, ETSY_MAX_TAG_CHARS);
    if (trimmed && tags.length < ETSY_MAX_TAGS && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  // ─── Render ─────────────────────────────────────────────

  if (!draftId) {
    return (
      <div className="p-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">
            No listing ID specified. Go to{" "}
            <Link
              href="/admin/cockpit/commerce?tab=briefs"
              className="underline"
            >
              Briefs
            </Link>{" "}
            to generate a listing.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">
            Listing draft not found. It may have been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-xs">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Listing Editor</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Status: <span className="font-medium">{draft.status}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveChanges}
            disabled={saving}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Title */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-900">
              Title
            </label>
            <span
              className={`text-xs ${
                title.length > ETSY_MAX_TITLE
                  ? "text-red-600 font-medium"
                  : "text-gray-400"
              }`}
            >
              {title.length}/{ETSY_MAX_TITLE}
            </span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={ETSY_MAX_TITLE}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder="Listing title (max 140 chars)"
          />
        </div>

        {/* Tags */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-2">
            <label className="text-sm font-medium text-gray-900">
              Tags
            </label>
            <span
              className={`text-xs ${
                tags.length >= ETSY_MAX_TAGS
                  ? "text-red-600 font-medium"
                  : "text-gray-400"
              }`}
            >
              {tags.length}/{ETSY_MAX_TAGS}
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full"
              >
                {tag}
                <button
                  onClick={() => removeTag(i)}
                  className="text-blue-400 hover:text-red-500 ml-0.5"
                >
                  x
                </button>
              </span>
            ))}
          </div>

          {tags.length < ETSY_MAX_TAGS && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                maxLength={ETSY_MAX_TAG_CHARS}
                className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
                placeholder={`Add tag (max ${ETSY_MAX_TAG_CHARS} chars)`}
              />
              <button
                onClick={addTag}
                className="px-3 py-1.5 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Add
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg border p-4">
          <label className="text-sm font-medium text-gray-900 block mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={10}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-y"
            placeholder="Product description..."
          />
          <p className="text-xs text-gray-400 mt-1">
            {description.length.toLocaleString()} characters
          </p>
        </div>

        {/* Price */}
        <div className="bg-white rounded-lg border p-4">
          <label className="text-sm font-medium text-gray-900 block mb-1">
            Price (cents)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              className="w-32 border rounded-lg px-3 py-2 text-sm"
              min={20}
            />
            <span className="text-sm text-gray-500">
              = ${(price / 100).toFixed(2)} {draft.currency}
            </span>
          </div>
        </div>

        {/* Materials & Section */}
        <div className="bg-white rounded-lg border p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                Section
              </p>
              <p className="text-sm text-gray-900">
                {draft.section ?? "Not set"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">
                Materials
              </p>
              <p className="text-sm text-gray-900">
                {draft.materials?.join(", ") || "Not set"}
              </p>
            </div>
          </div>
        </div>

        {/* File & Images */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Files</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Product File:</span>
              <span className="text-gray-900">
                {draft.fileUrl ? "Uploaded" : "Not uploaded"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Preview Images:</span>
              <span className="text-gray-900">
                {Array.isArray(draft.previewImages)
                  ? `${draft.previewImages.length}/10`
                  : "0/10"}
              </span>
            </div>
          </div>
        </div>

        {/* Compliance Check */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-900">
              Etsy Compliance
            </h3>
            <button
              onClick={checkCompliance}
              className="text-xs px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Check
            </button>
          </div>

          {compliance && (
            <div className="mt-2">
              {compliance.valid ? (
                <p className="text-sm text-green-600 font-medium">
                  All checks passed
                </p>
              ) : (
                <div className="space-y-1">
                  {compliance.issues.map((issue, i) => (
                    <p key={i} className="text-xs text-red-600">
                      <span className="font-medium">{issue.field}:</span>{" "}
                      {issue.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Workflow
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {draft.status === "draft" && (
              <button
                onClick={approveDraft}
                disabled={saving}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Approve for Publishing
              </button>
            )}
            {draft.status === "approved" && !draft.etsyUrl && (
              <div className="col-span-2 text-center">
                <p className="text-sm text-gray-500 mb-2">
                  Ready to publish. Copy the listing details and paste into
                  Etsy Seller Dashboard.
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Title: ${title}\n\nDescription: ${description}\n\nTags: ${tags.join(", ")}\n\nPrice: $${(price / 100).toFixed(2)}`,
                    );
                    showToast("Listing copy copied to clipboard");
                  }}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Etsy Link */}
        {draft.etsyUrl && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              Listed on Etsy:{" "}
              <a
                href={draft.etsyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-medium"
              >
                View Listing
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
