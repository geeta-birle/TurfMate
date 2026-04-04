import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'];
const SPORTS = ['football','cricket','basketball','badminton','tennis','volleyball'];

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    city: user?.city || '',
    bio: user?.bio || '',
    skill_level: user?.skill_level || 'beginner',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError('');
    try {
      const { data } = await authService.updateProfile(form);
      updateUser(data.data);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await authService.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setSuccess('Password changed! Please login again.');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Password change failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Profile Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start
          gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-primary-100 flex
            items-center justify-center text-primary-700 font-extrabold
            text-3xl flex-shrink-0 shadow-inner">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-extrabold text-gray-900">
              {user?.name}
            </h1>
            <p className="text-gray-500">{user?.email}</p>
            <div className="flex flex-wrap justify-center sm:justify-start
              gap-2 mt-2">
              <span className="badge bg-primary-100 text-primary-700
                font-semibold capitalize">{user?.role}</span>
              <span className="badge bg-gray-100 text-gray-600
                capitalize">{user?.skill_level}</span>
              {user?.city && (
                <span className="badge bg-gray-100 text-gray-600">
                  📍 {user?.city}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setEditing(!editing)}
            className={editing ? 'btn-secondary' : 'btn-outline'}>
            {editing ? 'Cancel' : '✏️ Edit Profile'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700
          rounded-xl px-4 py-3 mb-5 text-sm">✅ {success}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700
          rounded-xl px-4 py-3 mb-5 text-sm">⚠️ {error}</div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {['profile', 'security'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold
              capitalize transition-all
              ${activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Full Name
              </label>
              {editing ? (
                <input type="text" name="name" value={form.name}
                  onChange={handleChange} className="input" />
              ) : (
                <p className="text-gray-900 font-medium py-2.5">{user?.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Phone
              </label>
              {editing ? (
                <input type="tel" name="phone" value={form.phone}
                  onChange={handleChange} className="input" />
              ) : (
                <p className="text-gray-900 font-medium py-2.5">
                  {user?.phone || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                City
              </label>
              {editing ? (
                <input type="text" name="city" value={form.city}
                  onChange={handleChange} className="input" />
              ) : (
                <p className="text-gray-900 font-medium py-2.5">
                  {user?.city || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Skill Level
              </label>
              {editing ? (
                <select name="skill_level" value={form.skill_level}
                  onChange={handleChange} className="input capitalize">
                  {SKILL_LEVELS.map(s => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-900 font-medium py-2.5 capitalize">
                  {user?.skill_level}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Bio
            </label>
            {editing ? (
              <textarea name="bio" value={form.bio}
                onChange={handleChange} rows={3}
                placeholder="Tell others about yourself..."
                className="input resize-none" />
            ) : (
              <p className="text-gray-900 py-2.5 leading-relaxed">
                {user?.bio || '—'}
              </p>
            )}
          </div>

          {editing && (
            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveProfile} disabled={saving}
                className="btn-primary flex-1 py-3">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button onClick={() => setEditing(false)}
                className="btn-secondary px-6">
                Cancel
              </button>
            </div>
          )}

          {/* Account Info */}
          {!editing && (
            <div className="pt-5 border-t border-gray-100 grid
              grid-cols-2 gap-4">
              {[
                { label: 'Email', value: user?.email },
                { label: 'Role', value: user?.role, cap: true },
                { label: 'Member Since', value: new Date(user?.created_at)
                  .toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) },
                { label: 'Verified', value: user?.is_verified ? '✅ Yes' : '❌ No' },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide
                    font-semibold">{item.label}</p>
                  <p className={`text-gray-900 font-medium mt-0.5
                    ${item.cap ? 'capitalize' : ''}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-5">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { name: 'currentPassword', label: 'Current Password' },
              { name: 'newPassword', label: 'New Password' },
              { name: 'confirmPassword', label: 'Confirm New Password' },
            ].map(field => (
              <div key={field.name}>
                <label className="block text-sm font-semibold text-gray-700
                  mb-1.5">{field.label}</label>
                <input type="password" name={field.name}
                  value={passwordForm[field.name]}
                  onChange={e => setPasswordForm(prev => ({
                    ...prev, [e.target.name]: e.target.value
                  }))}
                  placeholder="••••••••" className="input" />
              </div>
            ))}

            <button type="submit" disabled={saving}
              className="btn-primary w-full py-3 mt-2">
              {saving ? 'Changing...' : 'Change Password'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3">
              Account Security Tips
            </h3>
            <ul className="space-y-2 text-sm text-gray-500">
              {[
                'Use at least 8 characters with letters and numbers',
                'Never share your password with anyone',
                'Use a unique password for TurfMate',
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="text-primary-500 mt-0.5">•</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
export default Profile;