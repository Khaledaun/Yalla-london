"use client";

import { useState, useEffect, useCallback, type ComponentType } from "react";

const BoxIcon: ComponentType<{ size?: number | string; color?: string }> = ({ size = 24, color = "#78716C" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
);
import {
  AdminCard,
  AdminPageHeader,
  AdminButton,
  AdminStatusBadge,
  AdminLoadingState,
  AdminEmptyState,
  AdminAlertBanner,
  useConfirm,
} from "@/components/admin/admin-ui";

interface DriveAccount {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string | null;
  rootFolderId: string;
  siteId: string | null;
  label: string | null;
  folderMappings: Record<string, { folderId: string; folderName: string; updatedAt: string }>;
  lastSyncAt: string | null;
  syncEnabled: boolean;
  tokenExpired: boolean;
}

interface DriveFolder {
  id: string;
  name: string;
  path: string;
}

const SITES = [
  { id: "yalla-london", name: "Yalla London" },
  { id: "zenitha-yachts-med", name: "Zenitha Yachts" },
  { id: "arabaldives", name: "Arabaldives" },
  { id: "french-riviera", name: "Yalla Riviera" },
  { id: "istanbul", name: "Yalla Istanbul" },
  { id: "thailand", name: "Yalla Thailand" },
];

export default function GoogleDrivePage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [accounts, setAccounts] = useState<DriveAccount[]>([]);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Folder browser state
  const [browsingAccount, setBrowsingAccount] = useState<string | null>(null);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [folderLoading, setFolderLoading] = useState(false);

  // Site mapping state
  const [mappingAccount, setMappingAccount] = useState<string | null>(null);
  const [mappingSite, setMappingSite] = useState("");
  const [mappingFolderId, setMappingFolderId] = useState("");
  const [mappingFolderName, setMappingFolderName] = useState("Root");

  // Asset Library import state
  const [importingFolder, setImportingFolder] = useState<string | null>(null);

  // Connect form
  const [connectLabel, setConnectLabel] = useState("");
  const [connectSiteId, setConnectSiteId] = useState("yalla-london");

  // URL params for callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "connected") {
      setActionResult(`✓ Connected Google account: ${params.get("email") || "successfully"}`);
      window.history.replaceState({}, "", "/admin/google-drive");
    }
    if (params.get("error")) {
      setActionResult(`✗ Connection error: ${params.get("error")}`);
      window.history.replaceState({}, "", "/admin/google-drive");
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/google-drive");
      if (!res.ok) return;
      const data = await res.json();
      setConfigured(data.configured);
      setAccounts(data.accounts || []);
    } catch (err) {
      console.warn("[google-drive] fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const doAction = async (action: string, extra: Record<string, unknown> = {}) => {
    setActionResult(null);
    try {
      const res = await fetch("/api/admin/google-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) { setActionResult(`✗ ${action} failed (HTTP ${res.status})`); return; }
      const data = await res.json();

      if (action === "connect" && data.authUrl) {
        window.location.href = data.authUrl;
        return;
      }

      setActionResult(data.success ? `✓ ${action} succeeded` : `✗ ${data.error}`);
      if (data.success) fetchAccounts();
    } catch {
      setActionResult(`✗ ${action} failed`);
    }
  };

  const browseFolders = async (accountId: string, parentId?: string) => {
    setFolderLoading(true);
    setBrowsingAccount(accountId);
    try {
      const res = await fetch("/api/admin/google-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list_folders", accountId, parentId }),
      });
      if (!res.ok) { setFolders([]); return; }
      const data = await res.json();
      setFolders(data.folders || []);
    } catch {
      setFolders([]);
    } finally {
      setFolderLoading(false);
    }
  };

  const navigateInto = (folder: DriveFolder) => {
    if (!browsingAccount) return;
    setFolderStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
    browseFolders(browsingAccount, folder.id);
  };

  const navigateBack = () => {
    if (!browsingAccount) return;
    const newStack = [...folderStack];
    newStack.pop();
    setFolderStack(newStack);
    const parentId = newStack.length > 0 ? newStack[newStack.length - 1].id : undefined;
    browseFolders(browsingAccount, parentId);
  };

  const selectFolderForMapping = (folder: DriveFolder) => {
    setMappingFolderId(folder.id);
    setMappingFolderName(folder.name);
    setBrowsingAccount(null);
    setFolderStack([]);
  };

  const sendToAssetLibrary = async (folderId: string, folderName: string) => {
    if (!browsingAccount) return;
    setImportingFolder(folderId);
    try {
      const res = await fetch("/api/admin/asset-library/import-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: browsingAccount, folderId }),
      });
      if (!res.ok) { setActionResult(`✗ Import failed (HTTP ${res.status})`); return; }
      const data = await res.json();
      if (data.success) {
        setActionResult(`✓ Imported ${data.imported} files from "${folderName}" to Asset Library (${data.skipped} skipped)`);
      } else {
        setActionResult(`✗ Import failed: ${data.error}`);
      }
    } catch {
      setActionResult("✗ Import to Asset Library failed");
    } finally {
      setImportingFolder(null);
    }
  };

  if (loading) return <AdminLoadingState label="Loading Google Drive..." />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <AdminPageHeader
        title="Google Drive"
        subtitle="Connect multiple Drive accounts, map folders to sites"
      />

      {actionResult && (
        <AdminAlertBanner
          severity={actionResult.startsWith("✓") ? "info" : "critical"}
          message={actionResult}
          onDismiss={() => setActionResult(null)}
        />
      )}

      {!configured && (
        <AdminAlertBanner
          severity="warning"
          message="Google Drive not configured. Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in Vercel env vars."
        />
      )}

      {/* Connection Status Summary */}
      <AdminCard title="Connection Status">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* OAuth Status */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor:
                    accounts.length > 0 && !accounts.some((a) => a.tokenExpired)
                      ? "#2D5A3D"
                      : accounts.length > 0
                        ? "#C49A2A"
                        : "#9CA3AF",
                }}
              />
              <span className="text-sm font-medium">
                {accounts.length > 0 && !accounts.some((a) => a.tokenExpired)
                  ? "Connected"
                  : accounts.length > 0
                    ? "Token Issue"
                    : "Not Connected"}
              </span>
            </div>
            <p className="text-xs text-gray-500">OAuth Status</p>
          </div>
          {/* Accounts */}
          <div className="text-center">
            <p className="text-lg font-bold">{accounts.length}</p>
            <p className="text-xs text-gray-500">Accounts</p>
          </div>
          {/* Folder Mappings */}
          <div className="text-center">
            <p className="text-lg font-bold">
              {accounts.reduce((sum, a) => sum + Object.keys(a.folderMappings).length, 0)}
            </p>
            <p className="text-xs text-gray-500">Folder Mappings</p>
          </div>
          {/* Last Sync */}
          <div className="text-center">
            <p className="text-sm font-medium">
              {(() => {
                const syncs = accounts.map((a) => a.lastSyncAt).filter(Boolean) as string[];
                if (syncs.length === 0) return "Never";
                const latest = syncs.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
                return new Date(latest).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
              })()}
            </p>
            <p className="text-xs text-gray-500">Last Sync</p>
          </div>
        </div>
        {accounts.length > 0 && (
          <div className="mt-3 pt-3 border-t flex justify-end">
            <AdminButton
              size="sm"
              onClick={() => {
                accounts.forEach((acc) => {
                  doAction("sync_folder", { accountId: acc.id, driveFolderId: acc.rootFolderId });
                });
              }}
            >
              Sync All Now
            </AdminButton>
          </div>
        )}
      </AdminCard>

      {/* Connect New Account */}
      {configured && (
        <AdminCard title="Connect Google Drive Account">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">Site</label>
              <select
                value={connectSiteId}
                onChange={(e) => setConnectSiteId(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
              >
                {SITES.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">Label (optional)</label>
              <input
                type="text"
                value={connectLabel}
                onChange={(e) => setConnectLabel(e.target.value)}
                placeholder="e.g., Design Team Drive"
                className="w-full p-2 border rounded-lg text-sm"
              />
            </div>
            <AdminButton onClick={() => doAction("connect", { siteId: connectSiteId, label: connectLabel })}>
              Connect Account
            </AdminButton>
          </div>
        </AdminCard>
      )}

      {/* Connected Accounts */}
      {accounts.length === 0 ? (
        <AdminEmptyState
          icon={BoxIcon}
          title="No Google Drive Accounts"
          description={configured ? "Connect a Google account above to get started." : "Configure env vars first."}
        />
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => (
            <AdminCard key={acc.id} title={acc.displayName || acc.email}>
              <div className="space-y-4">
                {/* Account Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {acc.photoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={acc.photoUrl} alt="" className="w-10 h-10 rounded-full" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{acc.email}</p>
                      <p className="text-xs text-gray-500">
                        {acc.label && <span className="bg-gray-100 px-2 py-0.5 rounded mr-2">{acc.label}</span>}
                        Last sync: {acc.lastSyncAt ? new Date(acc.lastSyncAt).toLocaleString() : "Never"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <AdminStatusBadge
                      status={acc.tokenExpired ? "error" : "active"}
                      label={acc.tokenExpired ? "Token Expired" : "Active"}
                    />
                    {acc.tokenExpired && (
                      <AdminButton size="sm" onClick={() => doAction("refresh_token", { accountId: acc.id })}>
                        Refresh
                      </AdminButton>
                    )}
                  </div>
                </div>

                {/* Site-to-Folder Mappings */}
                <div className="border-t pt-3">
                  <h4 className="text-sm font-medium mb-2">Site → Folder Mappings</h4>
                  {Object.keys(acc.folderMappings).length === 0 ? (
                    <p className="text-xs text-gray-400">No folder mappings yet. Map a site below.</p>
                  ) : (
                    <div className="space-y-1">
                      {Object.entries(acc.folderMappings).map(([siteId, mapping]) => (
                        <div key={siteId} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                          <span className="font-medium">{SITES.find((s) => s.id === siteId)?.name || siteId}</span>
                          <span className="text-gray-500">📁 {mapping.folderName || mapping.folderId}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Map Site to Folder */}
                  <div className="mt-3 flex flex-wrap gap-2 items-end">
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs text-gray-500 mb-1">Site</label>
                      <select
                        value={mappingAccount === acc.id ? mappingSite : ""}
                        onChange={(e) => { setMappingAccount(acc.id); setMappingSite(e.target.value); }}
                        className="w-full p-2 border rounded-lg text-xs"
                      >
                        <option value="">Select site...</option>
                        {SITES.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1 min-w-[200px]">
                      <label className="block text-xs text-gray-500 mb-1">
                        Drive Folder: <strong>{mappingAccount === acc.id ? mappingFolderName : "Root"}</strong>
                      </label>
                      <AdminButton
                        size="sm"
                        variant="secondary"
                        onClick={() => { setMappingAccount(acc.id); browseFolders(acc.id); }}
                      >
                        Browse Folders
                      </AdminButton>
                    </div>
                    <AdminButton
                      size="sm"
                      disabled={mappingAccount !== acc.id || !mappingSite}
                      onClick={() => {
                        doAction("set_site_mapping", {
                          accountId: acc.id,
                          siteId: mappingSite,
                          driveFolderId: mappingFolderId || undefined,
                          driveFolderName: mappingFolderName,
                        });
                        setMappingAccount(null);
                        setMappingSite("");
                        setMappingFolderId("");
                        setMappingFolderName("Root");
                      }}
                    >
                      Save Mapping
                    </AdminButton>
                  </div>
                </div>

                {/* Actions */}
                <div className="border-t pt-3 flex flex-wrap gap-2">
                  <AdminButton size="sm" onClick={() => doAction("setup_structure", { accountId: acc.id, siteId: acc.siteId })}>
                    Create Folder Structure
                  </AdminButton>
                  <AdminButton size="sm" onClick={() => doAction("sync_folder", { accountId: acc.id, driveFolderId: acc.rootFolderId })}>
                    Sync Root Folder
                  </AdminButton>
                  <AdminButton size="sm" variant="danger" onClick={async () => {
                    const ok = await confirm({ title: 'Disconnect Account', message: `Disconnect ${acc.email}?`, variant: 'danger' });
                    if (ok) doAction("disconnect", { accountId: acc.id });
                  }}>
                    Disconnect
                  </AdminButton>
                </div>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {/* Folder Browser Modal */}
      {browsingAccount && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-medium">Browse Drive Folders</h3>
                <p className="text-xs text-gray-500">
                  {folderStack.length > 0
                    ? folderStack.map((f) => f.name).join(" / ")
                    : "Root"}
                </p>
              </div>
              <button onClick={() => { setBrowsingAccount(null); setFolderStack([]); }} className="text-gray-400 hover:text-gray-600 text-xl">
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {folderStack.length > 0 && (
                <button
                  onClick={navigateBack}
                  className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-sm flex items-center gap-2 mb-1"
                >
                  <span>⬆️</span> <span>Back</span>
                </button>
              )}
              {folderLoading ? (
                <p className="text-sm text-gray-500 text-center py-8">Loading folders...</p>
              ) : folders.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No subfolders</p>
              ) : (
                folders.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <button onClick={() => navigateInto(f)} className="text-sm flex items-center gap-2 flex-1 text-left">
                      <span>📁</span> {f.name}
                    </button>
                    <div className="flex gap-1">
                      <AdminButton
                        size="sm"
                        variant="secondary"
                        disabled={importingFolder === f.id}
                        onClick={() => sendToAssetLibrary(f.id, f.name)}
                      >
                        {importingFolder === f.id ? "Importing..." : "To Assets"}
                      </AdminButton>
                      <AdminButton size="sm" onClick={() => selectFolderForMapping(f)}>
                        Select
                      </AdminButton>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t">
              <AdminButton
                onClick={() => {
                  const current = folderStack.length > 0 ? folderStack[folderStack.length - 1] : { id: "root", name: "Root" };
                  selectFolderForMapping({ id: current.id, name: current.name, path: current.name });
                }}
              >
                Use Current Folder
              </AdminButton>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
