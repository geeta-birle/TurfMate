import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { Link } from 'react-router-dom';

const SKILLS = ['beginner','intermediate','advanced'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [tab, setTab]         = useState('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]     = useState('');

  const [form, setForm] = useState({
    name:        user?.name || '',
    phone:       user?.phone || '',
    city:        user?.city || '',
    bio:         user?.bio || '',
    skill_level: user?.skill_level || 'beginner',
  });

  const [pwdForm, setPwdForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '',
  });

  const handleChange = e =>
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const showMsg = (type, msg) => {
    if (type === 'success') setSuccess(msg);
    else setError(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await authService.updateProfile(form);
      updateUser(data.data);
      setEditing(false);
      showMsg('success', 'Profile updated successfully!');
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Update failed.');
    } finally { setSaving(false); }
  };

  const handlePassword = async e => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      showMsg('error', 'Passwords do not match.'); return;
    }
    setSaving(true);
    try {
      await authService.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      });
      setPwdForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
      showMsg('success', 'Password changed! Login again.');
    } catch (err) {
      showMsg('error', err.response?.data?.message || 'Change failed.');
    } finally { setSaving(false); }
  };

  const roleColors = {
    admin:  'badge-purple',
    owner:  'badge-blue',
    player: 'badge-green',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-container py-8 max-w-3xl">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-400
          mb-6">
          <Link to="/dashboard"
            className="hover:text-green-600 transition-colors">
            Dashboard
          </Link>
          <span>›</span>
          <span className="text-gray-700 font-medium">Profile</span>
        </nav>

        {/* Alerts */}
        {success && (
          <div className="alert-success mb-5 animate-fade-up">
            <span>✅</span> {success}
          </div>
        )}
        {error && (
          <div className="alert-error mb-5 animate-fade-up">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Profile Header Card */}
        <div className="card p-6 mb-6 animate-fade-up">
          <div className="flex flex-col sm:flex-row items-center
            sm:items-start gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 bg-green-600 rounded-2xl flex
                items-center justify-center text-white font-bold text-3xl
                shadow-md">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              {user?.is_verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6
                  bg-blue-500 rounded-full flex items-center justify-center
                  text-white text-xs shadow-md" title="Verified">
                  ✓
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="page-title">{user?.name}</h1>
              <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center
                sm:justify-start">
                <span className={roleColors[user?.role] || 'badge-gray'}>
                  {user?.role}
                </span>
                {user?.skill_level && (
                  <span className="badge-yellow capitalize">
                    {user.skill_level}
                  </span>
                )}
                {user?.city && (
                  <span className="badge bg-gray-100 text-gray-600">
                    📍 {user.city}
                  </span>
                )}
                {user?.is_verified ? (
                  <span className="badge bg-blue-100 text-blue-700">
                    ✓ Verified
                  </span>
                ) : (
                  <span className="badge bg-amber-100 text-amber-700">
                    ⚠️ Unverified
                  </span>
                )}
              </div>
              {user?.bio && (
                <p className="text-gray-500 text-sm mt-3 max-w-lg
                  leading-relaxed">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-bar mb-6">
          <button onClick={() => setTab('profile')}
            className={`tab-btn ${tab === 'profile' ? 'active' : ''}`}>
            👤 Profile
          </button>
          <button onClick={() => setTab('security')}
            className={`tab-btn ${tab === 'security' ? 'active' : ''}`}>
            🔒 Security
          </button>
        </div>

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="card p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-gray-900 text-lg">
                Personal Information
              </h2>
              {!editing ? (
                <button onClick={() => setEditing(true)}
                  className="btn-secondary text-sm">
                  ✏️ Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)}
                    className="btn-secondary text-sm">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="btn-primary text-sm">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label">Full Name</label>
                  {editing ? (
                    <input type="text" name="name" value={form.name}
                      onChange={handleChange} className="input"/>
                  ) : (
                    <p className="text-sm text-gray-900 font-medium py-2.5
                      px-4 bg-gray-50 rounded-xl border border-gray-100">
                      {user?.name || '—'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  {editing ? (
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2
                        -translate-y-1/2 text-gray-500 text-sm">+91</span>
                      <input type="tel" name="phone" value={form.phone}
                        onChange={handleChange} className="input pl-12"/>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900 font-medium py-2.5
                      px-4 bg-gray-50 rounded-xl border border-gray-100">
                      {user?.phone ? `+91 ${user.phone}` : '—'}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">City</label>
                  {editing ? (
                    <input type="text" name="city" value={form.city}
                      onChange={handleChange} className="input"
                      placeholder="Your city"/>
                  ) : (
                    <p className="text-sm text-gray-900 font-medium py-2.5
                      px-4 bg-gray-50 rounded-xl border border-gray-100">
                      {user?.city || '—'}
                    </p>
                  )}
                </div>
                {user?.role === 'player' && (
                  <div>
                    <label className="label">Skill Level</label>
                    {editing ? (
                      <select name="skill_level" value={form.skill_level}
                        onChange={handleChange}
                        className="input capitalize">
                        {SKILLS.map(s => (
                          <option key={s} value={s} className="capitalize">
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900 font-medium py-2.5
                        px-4 bg-gray-50 rounded-xl border border-gray-100
                        capitalize">
                        {user?.skill_level || '—'}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="label">Bio</label>
                {editing ? (
                  <textarea name="bio" value={form.bio}
                    onChange={handleChange} rows={3}
                    placeholder="Tell others about yourself..."
                    className="input resize-none"/>
                ) : (
                  <p className="text-sm text-gray-900 py-2.5 px-4
                    bg-gray-50 rounded-xl border border-gray-100
                    min-h-[80px] leading-relaxed">
                    {user?.bio || 'No bio added yet.'}
                  </p>
                )}
              </div>

              <div className="divider" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="label">Email Address</label>
                  <p className="text-sm text-gray-500 py-2.5 px-4
                    bg-gray-50 rounded-xl border border-gray-100">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Email cannot be changed
                  </p>
                </div>
                <div>
                  <label className="label">Account Role</label>
                  <p className="text-sm text-gray-500 py-2.5 px-4
                    bg-gray-50 rounded-xl border border-gray-100 capitalize">
                    {user?.role}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Role cannot be changed
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {tab === 'security' && (
          <div className="card p-6 animate-fade-up">
            <h2 className="font-bold text-gray-900 text-lg mb-6">
              Change Password
            </h2>
            <form onSubmit={handlePassword} className="space-y-5 max-w-md">
              {['currentPassword','newPassword','confirmPassword'].map(f => (
                <div key={f}>
                  <label className="label">
                    {f === 'currentPassword' ? 'Current Password'
                      : f === 'newPassword' ? 'New Password'
                      : 'Confirm New Password'}
                  </label>
                  <input type="password" value={pwdForm[f]}
                    onChange={e => setPwdForm(p => ({
                      ...p, [f]: e.target.value }))}
                    placeholder="••••••••"
                    className="input"/>
                </div>
              ))}
              <button type="submit" disabled={saving}
                className="btn-primary py-3 px-8">
                {saving ? 'Changing...' : '🔒 Change Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}