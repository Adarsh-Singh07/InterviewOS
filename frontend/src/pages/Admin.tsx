import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

type UserData = {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
};

export default function Admin() {
  const { token } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const updateUserRole = async (userId: number, role: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="space-x-4">
          <a href="/" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Go to Copilot &rarr;
          </a>
        </div>
      </header>
      <div className="bg-gray-800 rounded-xl overflow-hidden shadow-xl ring-1 ring-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900/50 text-gray-400">
            <tr>
              <th className="p-4 font-medium">Email</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-gray-700/20 transition-colors">
                <td className="p-4 text-gray-200">{user.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <span className="text-gray-300 capitalize">{user.role}</span>
                </td>
                <td className="p-4 space-x-2">
                  <select 
                    value={user.role}
                    onChange={(e) => updateUserRole(user.id, e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded p-1 text-gray-300 outline-none focus:border-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="trial">Trial</option>
                    <option value="approved">Approved</option>
                    <option value="blocked">Blocked</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
