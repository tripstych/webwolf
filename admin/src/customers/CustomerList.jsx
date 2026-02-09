import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Eye, Mail, Calendar } from 'lucide-react';
import api from '../lib/api';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [siteUrl, setSiteUrl] = useState('http://localhost:3000');

  useEffect(() => {
    loadCustomers();
    loadSiteUrl();
  }, []);

  const loadSiteUrl = async () => {
    try {
      const response = await fetch('/api/settings/public');
      if (response.ok) {
        const data = await response.json();
        if (data.site_url) {
          setSiteUrl(data.site_url);
        }
      }
    } catch (err) {
      console.error('Failed to load site URL:', err);
      // Use default fallback
    }
  };

  const loadCustomers = async () => {
    try {
      setLoading(true);
      // Query customers who have placed orders
      const response = await fetch('/api/customers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data.data || []);
      } else if (response.status === 404) {
        // Endpoint doesn't exist yet, show empty state
        setCustomers([]);
      }
      setError('');
    } catch (err) {
      console.error('Failed to load customers:', err);
      // Endpoint not yet implemented, use empty list
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.email.toLowerCase().includes(search.toLowerCase()) ||
    (customer.first_name && customer.first_name.toLowerCase().includes(search.toLowerCase())) ||
    (customer.last_name && customer.last_name.toLowerCase().includes(search.toLowerCase()))
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        </div>
        <div className="text-sm text-gray-600">
          {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="card p-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full"
        />
      </div>
      <div className="flex justify-end">
        <a href={`${siteUrl}/customer/login`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
          Customer Login
        </a>
      </div>

      <div className="card">
        {filteredCustomers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No customers found</p>
            <p className="text-sm mt-2">Customers appear here when they place orders</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Registered
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {customer.first_name} {customer.last_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-primary-600 hover:underline">
                        <Mail className="w-4 h-4" />
                        {customer.email}
                      </a>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {customer.phone || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {formatDate(customer.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <Link
                        to={`/customers/${customer.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1 text-primary-600 hover:bg-primary-50 rounded"
                      >
                        <Eye className="w-4 h-4" />
                        View Orders
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
