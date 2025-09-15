'use client'

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Upload, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';

export interface PublishingWorkflowProps {
  isDraft: boolean;
  saving: boolean;
  publishing: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  lastSaved?: Date;
  hasUnsavedChanges?: boolean;
}

export function PublishingWorkflow({
  isDraft,
  saving,
  publishing,
  onSaveDraft,
  onPublish,
  lastSaved,
  hasUnsavedChanges = false
}: PublishingWorkflowProps) {
  const [showConfirmPublish, setShowConfirmPublish] = useState(false);

  const handlePublishClick = () => {
    if (hasUnsavedChanges) {
      setShowConfirmPublish(true);
    } else {
      onPublish();
    }
  };

  const handleConfirmPublish = () => {
    setShowConfirmPublish(false);
    onPublish();
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save Status */}
      {lastSaved && !hasUnsavedChanges && (
        <div className="flex items-center gap-1 text-sm text-gray-500">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          Saved
        </div>
      )}

      {hasUnsavedChanges && (
        <div className="flex items-center gap-1 text-sm text-orange-600">
          <Clock className="h-3 w-3" />
          Unsaved changes
        </div>
      )}

      {/* Save Draft Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onSaveDraft}
        disabled={saving || publishing}
        className="flex items-center gap-2"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saving ? 'Saving...' : 'Save Draft'}
      </Button>

      {/* Publish Button */}
      <Button
        onClick={handlePublishClick}
        disabled={saving || publishing}
        className="flex items-center gap-2"
        variant={isDraft ? 'default' : 'secondary'}
      >
        {publishing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {publishing 
          ? 'Publishing...' 
          : isDraft 
            ? 'Publish Live' 
            : 'Update Live'
        }
      </Button>

      {/* Publish Confirmation Modal */}
      {showConfirmPublish && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <h3 className="text-lg font-semibold">Publish with Unsaved Changes</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              You have unsaved changes that will be saved and published together. 
              This will make your homepage live for all visitors.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmPublish(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmPublish}
                className="flex-1"
              >
                Save & Publish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}