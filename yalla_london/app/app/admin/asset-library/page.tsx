"use client";

import { useState, useEffect, useCallback, type ComponentType } from "react";

const BoxIcon: ComponentType<{ size?: number | string; color?: string }> = ({ size = 24, color = "#78716C" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
);
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminKPICard,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  AdminTabs,
} from "@/components/admin/admin-ui";

interface FolderNode {
  id: string;
  name: string;
  path: string;
  type: "site" | "platform" | "designType" | "occasion";
  count: number;
  children?: FolderNode[];
}

interface AssetItem {
  id: string;
  filename: string;
  url: string;
  mime_type: string;
  file_size: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  folder: string | null;
  category: string | null;
  tags: string[];
  created_at: string;
}

const SITES = [
  { id: "yalla-london", name: "Yalla London" },
  { id: "zenitha-yachts-med", name: "Zenitha Yachts" },
  { id: "arabaldives", name: "Arabaldives" },
  { id: "french-riviera", name: "Yalla Riviera" },
  { id: "istanbul", name: "Yalla Istanbul" },
  { id: "thailand", name: "Yalla Thailand" },
];

interface DriveAccount {
  id: string;
  email: string;
  displayName: string;
  rootFolderId: string;
  siteId: string | null;
}

interface DriveFolder {
  id: string;
  name: string;
  path: string;
}

export default function AssetLibraryPage() {
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [stats, setStats] = useState<{ totalAssets: number; recentUploads: number; byCategory: { category: string; count: number }[] } | null>(null);
  const [activeSiteId, setActiveSiteId] = useState(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|;\s*)siteId=([^;]*)/)
      if (match?.[1]) return match[1]
    }
    return "yalla-london"
  });
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("browse");
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Import from Drive state
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [driveAccounts, setDriveAccounts] = useState<DriveAccount[]>([]);
  const [selectedDriveAccount, setSelectedDriveAccount] = useState<string>("");
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [driveFolderStack, setDriveFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [driveFolderLoading, setDriveFolderLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: { file: string; error: string }[]; total: number } | null>(null);

  // Drive import functions
  const fetchDriveAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/google-drive");
      if (!res.ok) return;
      const data = await res.json();
      setDriveAccounts(data.accounts || []);
      if (data.accounts?.length > 0 && !selectedDriveAccount) {
        setSelectedDriveAccount(data.accounts[0].id);
      }
    } catch (err) {
      console.warn("[asset-library] drive accounts fetch failed:", err);
    }
  }, [selectedDriveAccount]);

  const browseDriveFolders = useCallback(async (accountId: string, parentId?: string) => {
    setDriveFolderLoading(true);
    try {
      const res = await fetch("/api/admin/google-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_folders", accountId, parentId }),
      });
      if (!res.ok) { setDriveFolders([]); return; }
      const data = await res.json();
      setDriveFolders(data.folders || []);
    } catch {
      setDriveFolders([]);
    } finally {
      setDriveFolderLoading(false);
    }
  }, []);

  const navigateDriveInto = useCallback((folder: DriveFolder) => {
    setDriveFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
    browseDriveFolders(selectedDriveAccount, folder.id);
  }, [selectedDriveAccount, browseDriveFolders]);

  const navigateDriveBack = useCallback(() => {
    setDriveFolderStack((prev) => {
      const next = [...prev];
      next.pop();
      const parentId = next.length > 0 ? next[next.length - 1].id : undefined;
      browseDriveFolders(selectedDriveAccount, parentId);
      return next;
    });
  }, [selectedDriveAccount, browseDriveFolders]);

  const startImport = async (accountId: string, folderId: string) => {
    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch("/api/admin/asset-library/import-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, folderId, siteId: activeSiteId }),
      });
      if (!res.ok) {
        setActionResult("Import failed — server error");
        return;
      }
      const data = await res.json();
      if (data.success) {
        setImportResult({ imported: data.imported, skipped: data.skipped, errors: data.errors || [], total: data.total });
        fetchTree();
        fetchAssets();
        fetchStats();
      } else {
        setActionResult(`Import error: ${data.error}`);
      }
    } catch {
      setActionResult("Import failed — network error");
    } finally {
      setImporting(false);
    }
  };

  const openDriveModal = () => {
    setShowDriveModal(true);
    setImportResult(null);
    fetchDriveAccounts();
  };

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/asset-library?view=tree&siteId=${activeSiteId}`);
      if (!res.ok) return;
      const data = await res.json();
      setTree(data.tree || []);
    } catch (err) {
      console.warn("[asset-library] tree fetch failed:", err);
    }
  }, [activeSiteId]);

  const fetchAssets = useCallback(async () => {
    const params = new URLSearchParams({ view: "assets", siteId: activeSiteId, page: String(page) });
    if (selectedFolder) {
      const parts = selectedFolder.split("/");
      if (parts[1]) params.set("platform", parts[1]);
      if (parts[2]) params.set("designType", parts[2]);
      if (parts[3]) params.set("occasion", parts[3]);
    }
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/admin/asset-library?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setAssets(data.assets || []);
      setTotalAssets(data.total || 0);
      setTotalPages(data.pages || 1);
    } catch (err) {
      console.warn("[asset-library] assets fetch failed:", err);
    }
  }, [activeSiteId, selectedFolder, search, page]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/asset-library?view=stats&siteId=${activeSiteId}`);
      if (!res.ok) return;
      setStats(await res.json());
    } catch (err) {
      console.warn("[asset-library] stats fetch failed:", err);
    }
  }, [activeSiteId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTree(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchTree, fetchStats]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const doAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setActionResult(null);
    try {
      const res = await fetch("/api/admin/asset-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, siteId: activeSiteId, ...extra }),
      });
      const data = await res.json();
      setActionResult(data.success ? `Done — ${JSON.stringify(data).slice(0, 100)}` : `Error: ${data.error}`);
      if (data.success) {
        fetchTree();
        fetchAssets();
        fetchStats();
        setSelectedAssets(new Set());
      }
    } catch {
      setActionResult("Action failed");
    }
  };

  const toggleAsset = (id: string) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <AdminLoadingState label="Loading Asset Library..." />;

  const tabs = [
    { id: "browse", label: "Browse" },
    { id: "stats", label: "Stats" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader
        title="Design Asset Library"
        subtitle="Organized by site / platform / design type / occasion"
        action={
          <div className="flex gap-2 items-center">
            <select
              value={activeSiteId}
              onChange={(e) => { setActiveSiteId(e.target.value); setSelectedFolder(null); setPage(1); }}
              className="p-2 border rounded-lg text-sm"
            >
              {SITES.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <AdminButton size="sm" onClick={() => doAction("organize")}>
              Auto-Organize
            </AdminButton>
            <AdminButton size="sm" onClick={openDriveModal}>
              Import from Drive
            </AdminButton>
          </div>
        }
      />

      {actionResult && (
        <AdminAlertBanner
          severity={actionResult.startsWith("Done") ? "info" : "critical"}
          message={actionResult}
          onDismiss={() => setActionResult(null)}
        />
      )}

      <AdminTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "stats" && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <AdminKPICard label="Total Assets" value={String(stats.totalAssets)} />
          <AdminKPICard label="This Week" value={String(stats.recentUploads)} />
          {stats.byCategory.map((c) => (
            <AdminKPICard key={c.category} label={c.category || "Uncategorized"} value={String(c.count)} />
          ))}
        </div>
      )}

      {activeTab === "browse" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Folder Tree Sidebar */}
          <div className="md:col-span-1">
            <AdminCard title="Folders">
              <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                <button
                  onClick={() => { setSelectedFolder(null); setPage(1); }}
                  className={`w-full text-left text-sm px-3 py-2 rounded-lg transition ${!selectedFolder ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50"}`}
                >
                  All Assets ({totalAssets})
                </button>
                {tree.map((site) => (
                  <FolderTreeNode
                    key={site.id}
                    node={site}
                    depth={0}
                    selectedPath={selectedFolder}
                    onSelect={(path) => { setSelectedFolder(path); setPage(1); }}
                  />
                ))}
              </div>
            </AdminCard>
          </div>

          {/* Asset Grid */}
          <div className="md:col-span-3 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="flex-1 p-2 border rounded-lg text-sm"
              />
              {selectedAssets.size > 0 && (
                <AdminButton size="sm" variant="danger" onClick={() => doAction("delete", { assetIds: [...selectedAssets] })}>
                  Delete ({selectedAssets.size})
                </AdminButton>
              )}
            </div>

            {assets.length === 0 ? (
              <AdminEmptyState icon={BoxIcon} title="No Assets" description={selectedFolder ? `No assets in this folder.` : "Upload assets or sync from Google Drive."} />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => toggleAsset(asset.id)}
                      className={`relative rounded-lg border overflow-hidden cursor-pointer transition ${selectedAssets.has(asset.id) ? "ring-2 ring-blue-500 border-blue-300" : "hover:shadow-md"}`}
                    >
                      {asset.mime_type?.startsWith("image/") ? (
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={asset.url} alt={asset.alt_text || asset.filename} className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          <span className="text-3xl">{getFileEmoji(asset.mime_type)}</span>
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{asset.filename}</p>
                        <p className="text-xs text-gray-500">
                          {asset.folder?.split("/").slice(1).join(" / ") || "Unfoldered"}
                        </p>
                        {asset.file_size && (
                          <p className="text-xs text-gray-400">{formatBytes(asset.file_size)}</p>
                        )}
                      </div>
                      {selectedAssets.has(asset.id) && (
                        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 pt-4">
                    <AdminButton size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </AdminButton>
                    <span className="text-sm text-gray-500 self-center">
                      Page {page} of {totalPages}
                    </span>
                    <AdminButton size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      Next
                    </AdminButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Drive Import Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-medium">Import from Google Drive</h3>
                <p className="text-xs text-gray-500">Select a folder to import files into the Asset Library</p>
              </div>
              <button
                onClick={() => { setShowDriveModal(false); setDriveFolderStack([]); setDriveFolders([]); setImportResult(null); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Account Selector */}
              {driveAccounts.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No Google Drive accounts connected. Go to Google Drive settings to connect one.</p>
              ) : (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Drive Account</label>
                    <select
                      value={selectedDriveAccount}
                      onChange={(e) => {
                        setSelectedDriveAccount(e.target.value);
                        setDriveFolderStack([]);
                        setDriveFolders([]);
                        browseDriveFolders(e.target.value);
                      }}
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      {driveAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.displayName || acc.email}</option>
                      ))}
                    </select>
                  </div>

                  {/* Folder Browser */}
                  {selectedDriveAccount && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-500">
                          {driveFolderStack.length > 0
                            ? driveFolderStack.map((f) => f.name).join(" / ")
                            : "Root"}
                        </p>
                        {driveFolders.length === 0 && !driveFolderLoading && driveFolderStack.length === 0 && (
                          <AdminButton size="sm" variant="secondary" onClick={() => browseDriveFolders(selectedDriveAccount)}>
                            Browse
                          </AdminButton>
                        )}
                      </div>

                      {driveFolderStack.length > 0 && (
                        <button
                          onClick={navigateDriveBack}
                          className="w-full text-left p-2 hover:bg-gray-50 rounded-lg text-sm flex items-center gap-2 mb-1"
                        >
                          <span>⬆️</span> <span>Back</span>
                        </button>
                      )}

                      {driveFolderLoading ? (
                        <p className="text-sm text-gray-500 text-center py-6">Loading folders...</p>
                      ) : driveFolders.length === 0 && (driveFolderStack.length > 0 || driveFolders.length === 0) ? (
                        <p className="text-sm text-gray-400 text-center py-4">
                          {driveFolderStack.length > 0 ? "No subfolders" : "Click Browse to load folders"}
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-[30vh] overflow-y-auto">
                          {driveFolders.map((f) => (
                            <div key={f.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg">
                              <button onClick={() => navigateDriveInto(f)} className="text-sm flex items-center gap-2 flex-1 text-left">
                                <span>📁</span> {f.name}
                              </button>
                              <AdminButton
                                size="sm"
                                disabled={importing}
                                onClick={() => startImport(selectedDriveAccount, f.id)}
                              >
                                {importing ? "Importing..." : "Import"}
                              </AdminButton>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Import Current Folder Button */}
                  {driveFolderStack.length > 0 && (
                    <AdminButton
                      disabled={importing}
                      onClick={() => {
                        const current = driveFolderStack[driveFolderStack.length - 1];
                        startImport(selectedDriveAccount, current.id);
                      }}
                    >
                      {importing ? "Importing..." : `Import All from "${driveFolderStack[driveFolderStack.length - 1].name}"`}
                    </AdminButton>
                  )}

                  {/* Import Result */}
                  {importResult && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                      <p className="font-medium text-green-800">Import Complete</p>
                      <p className="text-green-700 mt-1">
                        {importResult.imported} imported, {importResult.skipped} skipped, {importResult.errors.length} errors
                        {importResult.total > 0 && ` (${importResult.total} total files)`}
                      </p>
                      {importResult.errors.length > 0 && (
                        <div className="mt-2 text-xs text-red-600 space-y-1">
                          {importResult.errors.slice(0, 5).map((e, i) => (
                            <p key={i}>{e.file}: {e.error}</p>
                          ))}
                          {importResult.errors.length > 5 && (
                            <p>... and {importResult.errors.length - 5} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FolderTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FolderNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.path);
          if (hasChildren) setExpanded(!expanded);
        }}
        className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${isSelected ? "bg-blue-50 text-blue-700 font-medium" : "hover:bg-gray-50"}`}
        style={{ paddingLeft: `${(depth + 1) * 12}px` }}
      >
        {hasChildren && (
          <span className="text-xs text-gray-400">{expanded ? "▼" : "▶"}</span>
        )}
        <span className="truncate flex-1">{node.name}</span>
        {node.count > 0 && (
          <span className="text-xs text-gray-400 ml-1">{node.count}</span>
        )}
      </button>
      {expanded && hasChildren && node.children!.map((child) => (
        <FolderTreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function getFileEmoji(mime: string): string {
  if (mime?.startsWith("video/")) return "🎬";
  if (mime?.startsWith("audio/")) return "🎵";
  if (mime?.includes("pdf")) return "📄";
  if (mime?.includes("svg")) return "🎨";
  return "📎";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
