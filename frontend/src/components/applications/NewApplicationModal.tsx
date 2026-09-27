import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { useCreateApplication } from '../../hooks/useApplications';
import { useAgents, usePrograms, useSchools } from '../../hooks/useLookups';
import { APPLICATION_STAGES } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { ApplicationStage } from '../../types/domain';

export interface NewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM: {
  studentName: string;
  agentId: string;
  programId: string;
  stage: ApplicationStage;
  notes: string;
} = {
  studentName: '',
  agentId: '',
  programId: '',
  stage: 'Lead',
  notes: '',
};

export const NewApplicationModal: React.FC<NewApplicationModalProps> = ({ isOpen, onClose }) => {
  const { isAdmin } = useAuth();
  const { data: agents } = useAgents();
  const { data: schools } = useSchools();
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const { data: programs } = usePrograms(selectedSchoolId || undefined);

  const createMutation = useCreateApplication();
  const [form, setForm] = useState(INITIAL_FORM);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setSelectedSchoolId('');
  };

  // Reset form whenever modal closes or opens freshly
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      studentName: form.studentName,
      agentId: form.agentId || undefined,
      programId: form.programId,
      stage: form.stage,
      notes: form.notes || undefined,
    } as any);
    resetForm();
    onClose();
  };

  const isValid =
    form.studentName.trim().length > 0 &&
    Boolean(form.programId) &&
    (!isAdmin || Boolean(form.agentId));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Student Application"
      subtitle="Register a new admissions pipeline entry"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Student Name */}
        <div className="space-y-1.5">
          <label htmlFor="modal-student-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Student Full Name *
          </label>
          <Input
            id="modal-student-name"
            name="studentName"
            placeholder="e.g. Maria Chen"
            value={form.studentName}
            onChange={(e) => setForm({ ...form, studentName: e.target.value })}
            required
          />
        </div>

        {/* School Selector */}
        <div className="space-y-1.5">
          <label htmlFor="modal-school-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Partner School *
          </label>
          <Select
            id="modal-school-select"
            name="schoolId"
            value={selectedSchoolId}
            onChange={(e) => {
              setSelectedSchoolId(e.target.value);
              setForm({ ...form, programId: '' });
            }}
            required
          >
            <option value="">Select a school...</option>
            {schools?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.country}
              </option>
            ))}
          </Select>
        </div>

        {/* Program Selector */}
        <div className="space-y-1.5">
          <label htmlFor="modal-program-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Program *
          </label>
          <Select
            id="modal-program-select"
            name="programId"
            value={form.programId}
            onChange={(e) => setForm({ ...form, programId: e.target.value })}
            disabled={!selectedSchoolId}
            required
          >
            <option value="">
              {selectedSchoolId ? 'Select a program...' : 'Select a school first...'}
            </option>
            {programs?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Initial Stage */}
        <div className="space-y-1.5">
          <label htmlFor="modal-stage-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Initial Pipeline Stage
          </label>
          <Select
            id="modal-stage-select"
            name="stage"
            value={form.stage}
            onChange={(e) => setForm({ ...form, stage: e.target.value as ApplicationStage })}
          >
            {APPLICATION_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        {/* Agent Selection (Admin only) */}
        {isAdmin && (
          <div className="space-y-1.5">
            <label htmlFor="modal-agent-select" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Assigned Partner Agency *
            </label>
            <Select
              id="modal-agent-select"
              name="agentId"
              value={form.agentId}
              onChange={(e) => setForm({ ...form, agentId: e.target.value })}
              required
            >
              <option value="">Select a partner agency...</option>
              {agents?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.tier} Tier)
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Notes */}
        <div className="space-y-1.5">
          <label htmlFor="modal-notes" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Initial Admissions Notes (optional)
          </label>
          <textarea
            id="modal-notes"
            name="notes"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Initial counseling notes, document checklist, language test scores..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-y"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!isValid}
            isLoading={createMutation.isPending}
          >
            Create Application
          </Button>
        </div>
      </form>
    </Modal>
  );
};
