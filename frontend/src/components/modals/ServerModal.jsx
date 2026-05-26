import { useState } from 'react';
import { X, Eye, EyeOff, Trash2 } from 'lucide-react';
import { useServers } from '../../store/ServerContext';
import { useToast } from '../common/Toast';

const BLANK = {
  name: '', ip: '', ssh_port: 22, ssh_username: '',
  ssh_password: '', ssh_key_path: '', api_base_url: '', api_token: '',
};

export default function ServerModal({ server, onClose }) {
  const { addServer, updateServer, deleteServer } = useServers();
  const toast   = useToast();
  const isEdit  = !!server;
  const [form,      setForm]      = useState(isEdit ? { ...BLANK, ...server } : BLANK);
  const [showPass,  setShowPass]  = useState(false);
  const [showToken, setShowToken] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.ip.trim()) {
      toast('Name and IP are required.', 'error');
      return;
    }
    if (isEdit) {
      updateServer(server.id, form);
      toast(`"${form.name}" updated.`, 'success');
    } else {
      addServer(form);
      toast(`"${form.name}" added.`, 'success');
    }
    onClose();
  };

  const handleDelete = () => {
    if (!window.confirm(`Remove "${server.name}" from the server list?`)) return;
    deleteServer(server.id);
    toast(`"${server.name}" removed.`, 'info');
    onClose();
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md card shadow-xl animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {isEdit ? 'Edit Server' : 'Add Server'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1" aria-label="Close">
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <Row>
            <Field label="Server Name *" value={form.name}         onChange={set('name')}         placeholder="Production 1" />
            <Field label="IP Address *"  value={form.ip}           onChange={set('ip')}           placeholder="192.168.1.100" />
          </Row>
          <Row>
            <Field label="SSH Username"  value={form.ssh_username} onChange={set('ssh_username')} placeholder="admin" />
            <Field label="SSH Port"      value={form.ssh_port}     onChange={set('ssh_port')}     type="number" />
          </Row>
          <SecretField
            label="SSH Password"
            value={form.ssh_password}
            onChange={set('ssh_password')}
            show={showPass}
            onToggle={() => setShowPass((v) => !v)}
            placeholder="Leave blank to use key file"
          />
          <Field label="SSH Key Path" value={form.ssh_key_path} onChange={set('ssh_key_path')} placeholder="/root/.ssh/id_rsa" />
          <Field label="API Base URL"  value={form.api_base_url} onChange={set('api_base_url')} placeholder="http://192.168.1.100" />
          <SecretField
            label="API Token"
            value={form.api_token}
            onChange={set('api_token')}
            show={showToken}
            onToggle={() => setShowToken((v) => !v)}
            placeholder="Bearer / Token value"
          />

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            {isEdit && (
              <button type="button" onClick={handleDelete} className="btn-danger">
                <Trash2 size={12} />
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="btn-default">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isEdit ? 'Save' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Form helpers ─────────────────────────────────────────────────────────────

function Row({ children }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="input"
      />
    </div>
  );
}

function SecretField({ label, value, onChange, placeholder, show, onToggle }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="input pr-8"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          aria-label={show ? 'Hide' : 'Show'}
        >
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  );
}
