import React, { useState, useEffect } from 'react';
import { Drawer } from '../ui/Drawer';
import { StageBadge, TierBadge } from '../ui/Badge';
import { StageTimeline } from './StageTimeline';
import {
  useApplication,
  useUpdateApplication,
  useUpdateNotes,
} from '../../hooks/useApplications';
import { ApplicationStage } from '../../types/domain';
import {
  formatDate,
  formatCurrency,
  calculateDwellDays,
  formatDwellBadge,
} from '../../lib/utils';
import {
  GraduationCap,
  Building2,
  FileText,
  Save,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export interface ApplicationDrawerProps {
  applicationId: string | null;
  onClose: () => void;
}

export const ApplicationDrawer: React.FC<ApplicationDrawerProps> = ({
  applicationId,
  onClose,
}) => {
  const { data: app, isLoading } = useApplication(applicationId || undefined);
  const updateAppMutation = useUpdateApplication();
  const updateNotesMutation = useUpdateNotes();

  const [notes, setNotes] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [pendingStage, setPendingStage] = useState<ApplicationStage | null>(null);

  useEffect(() => {
    if (app) {
      setNotes(app.notes || '');
      setIsDirty(false);
    }
  }, [app]);

  if (!applicationId) return null;

  const handleStageSelect = (newStage: ApplicationStage) => {
    if (!app || app.stage === newStage) return;
    setPendingStage(newStage);
  };

  const handleConfirmStageChange = async () => {
    if (!app || !pendingStage) return;
    try {
      await updateAppMutation.mutateAsync({
        id: app.id,
        data: { stage: pendingStage },
      });
    } finally {
      setPendingStage(null);
    }
  };

  const handleCancelStageChange = () => {
    setPendingStage(null);
  };

  const handleSaveNotes = async () => {
    if (!app) return;
    await updateNotesMutation.mutateAsync({
      id: app.id,
      data: { notes },
    });
    setIsDirty(false);
  };

  const dwellDays = calculateDwellDays(app?.stageEnteredDate);
  const dwellBadge = formatDwellBadge(dwellDays);

  return (
    <Drawer
      isOpen={!!applicationId}
      onClose={onClose}
      title={app ? app.studentName : 'Application Details'}
      subtitle={app ? `ID: ${app.id.substring(0, 8)}...` : 'Loading...'}
      width="xl"
    >
      {isLoading || !app ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
          <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-36 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Status & Dwell Alert */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <StageBadge stage={app.stage} />
              <span className="text-xs text-slate-500">
                Since {formatDate(app.stageEnteredDate)}
              </span>
            </div>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${dwellBadge.className}`}
            >
              {dwellBadge.isBottleneck ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Clock className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{dwellBadge.text}</span>
            </div>
          </div>

          {/* Academic & Agency Details Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Student & Program */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-600">
                <GraduationCap className="h-4 w-4" />
                <span>Program & Institution</span>
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {app.program?.name || 'Assigned Program'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {app.program?.school?.name || 'University'} (
                  {app.program?.school?.country || 'Global'})
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Annual Tuition:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatCurrency(app.program?.tuitionUsd)}
                </span>
              </div>
            </div>

            {/* Agent Counselor */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
                  <Building2 className="h-4 w-4" />
                  <span>Partner Agency</span>
                </div>
                <TierBadge tier={app.agent?.tier} />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {app.agent?.name || 'Direct / Unknown Agency'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Assigned Agent ID: {app.agentId.substring(0, 8)}...
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Created:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {formatDate(app.createdDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Lifecycle Stage Mover */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <StageTimeline
              currentStage={app.stage}
              dwellDays={dwellDays}
              onSelectStage={handleStageSelect}
              isUpdating={updateAppMutation.isPending}
            />
          </div>

          {/* Live Notes & Communication History */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="drawer-notes" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 cursor-pointer">
                <FileText className="h-4 w-4 text-blue-500" />
                <span>Admissions & Counseling Notes</span>
              </label>
              {isDirty && (
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Unsaved edits
                </span>
              )}
            </div>

            <textarea
              id="drawer-notes"
              name="notes"
              rows={4}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Record counseling updates, visa interview dates, prerequisite checks, or communication logs..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-y"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Auto-timestamped upon database commit.
              </span>
              <Button
                size="sm"
                variant="primary"
                disabled={!isDirty || updateNotesMutation.isPending}
                isLoading={updateNotesMutation.isPending}
                onClick={handleSaveNotes}
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save Notes</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Stage Progression Confirmation Dialog */}
      <Modal
        isOpen={!!pendingStage}
        onClose={handleCancelStageChange}
        title="Confirm Stage Update"
        subtitle="Application pipeline progression"
        maxWidth="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to update the application status for{' '}
            <strong className="text-slate-900 dark:text-slate-100">{app?.studentName}</strong>?
          </p>

          <div className="flex items-center justify-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <StageBadge stage={app?.stage || 'Lead'} />
            <span className="text-xs font-bold text-slate-400">➔</span>
            {pendingStage && <StageBadge stage={pendingStage} />}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            This will update the stage entry timestamp, recalculate dwell time, and reset any active bottleneck alerts.
          </p>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelStageChange}
              disabled={updateAppMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmStageChange}
              isLoading={updateAppMutation.isPending}
            >
              Confirm Update
            </Button>
          </div>
        </div>
      </Modal>
    </Drawer>
  );
};
