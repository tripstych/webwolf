import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OrderList() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const limit = 20;
  const offset = (page - 1) * limit;

  useEffect(() => {
    fetchOrders();
  }, [status, paymentStatus, search, page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (paymentStatus) params.append('payment_status', paymentStatus);
      if (search) params.append('search', search);
      params.append('limit', limit);
      params.append('offset', offset);

      const response = await fetch(`/api/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.data);
      setTotal(data.pagination.total);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="content-container">
      <div className="page-header">
        <h1>Orders</h1>
        <span className="order-count">{total} total</span>
      </div>

      <div className="filters">
        <input
          type="text"
          placeholder="Search by order number or email..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="search-input"
        />

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="select-input"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
          className="select-input"
        >
          <option value="">All Payment Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {loading ? (
        <div className="loading">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p>No orders found. {search || status ? 'Try adjusting your filters.' : 'No orders yet.'}</p>
        </div>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.order_number}</strong>
                  </td>
                  <td>
                    <div>{order.email}</div>
                  </td>
                  <td>
                    {formatDate(order.created_at)}
                  </td>
                  <td>
                    ${parseFloat(order.total).toFixed(2)}
                  </td>
                  <td>
                    <span className={`badge badge-${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-payment-${order.payment_status}`}>
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="actions">
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-small"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`btn btn-small ${page === pageNum ? 'active' : ''}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                className="btn btn-small"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .order-count {
          font-size: 0.875rem;
          color: #666;
          font-weight: normal;
        }

        .filters {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }

        .search-input,
        .select-input {
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 1rem;
        }

        .search-input {
          flex: 1;
          min-width: 250px;
        }

        .badge-pending { background: #fef3c7; color: #92400e; }
        .badge-processing { background: #dbeafe; color: #1e40af; }
        .badge-shipped { background: #d1fae5; color: #065f46; }
        .badge-completed { background: #d1fae5; color: #065f46; }
        .badge-cancelled { background: #fee2e2; color: #7f1d1d; }

        .badge-payment-pending { background: #fef3c7; color: #92400e; }
        .badge-payment-paid { background: #d1fae5; color: #065f46; }
        .badge-payment-failed { background: #fee2e2; color: #7f1d1d; }
        .badge-payment-refunded { background: #f3e8ff; color: #6b21a8; }

        .actions {
          display: flex;
          gap: 0.5rem;
        }

        .pagination {
          display: flex;
          gap: 0.5rem;
          margin-top: 2rem;
          justify-content: center;
        }

        .pagination .btn.active {
          background: #3b82f6;
          color: white;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #666;
        }

        .loading {
          text-align: center;
          padding: 2rem;
          color: #666;
        }
      `}</style>
    </div>
  );
}
