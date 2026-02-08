import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load order');

      const data = await response.json();
      setOrder(data);
      setStatus(data.status);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    if (!order || status === order.status) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) throw new Error('Failed to update status');

      const updated = await response.json();
      setOrder(updated);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const addTracking = async () => {
    if (!trackingNumber.trim()) {
      setError('Tracking number is required');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/orders/${id}/tracking`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tracking_number: trackingNumber,
          shipped_at: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to add tracking');

      const updated = await response.json();
      setOrder(updated);
      setTrackingNumber('');
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Add tracking error:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="content-container">Loading order...</div>;
  }

  if (!order) {
    return <div className="content-container">Order not found</div>;
  }

  return (
    <div className="content-container">
      <div className="order-detail-header">
        <div>
          <h1>{order.order_number}</h1>
          <p className="order-date">{formatDate(order.created_at)}</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/orders')}
        >
          Back to Orders
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="order-layout">
        {/* Main Content */}
        <div className="order-main">
          {/* Order Status */}
          <section className="order-section">
            <h2>Order Status</h2>
            <div className="status-controls">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="select-input"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <button
                className="btn btn-primary"
                onClick={updateStatus}
                disabled={saving || status === order.status}
              >
                {saving ? 'Updating...' : 'Update Status'}
              </button>
            </div>
            <div className={`status-badge badge-${order.status}`}>
              {order.status}
            </div>
          </section>

          {/* Shipping & Tracking */}
          <section className="order-section">
            <h2>Shipping & Tracking</h2>
            <div className="shipping-info">
              {order.tracking_number ? (
                <div>
                  <strong>Tracking Number:</strong> {order.tracking_number}
                  {order.shipped_at && (
                    <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#666' }}>
                      Shipped on {formatDate(order.shipped_at)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="add-tracking">
                  <input
                    type="text"
                    placeholder="Enter tracking number"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="text-input"
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={addTracking}
                    disabled={saving}
                  >
                    Add Tracking
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Order Items */}
          <section className="order-section">
            <h2>Items</h2>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items?.map(item => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.product_title}</strong>
                      {item.variant_title && <div className="variant-info">{item.variant_title}</div>}
                    </td>
                    <td>
                      <code>{item.sku}</code>
                    </td>
                    <td>${parseFloat(item.price).toFixed(2)}</td>
                    <td>{item.quantity}</td>
                    <td>${parseFloat(item.subtotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="order-sidebar">
          {/* Customer Info */}
          <section className="order-card">
            <h3>Customer Information</h3>
            <div className="customer-info">
              <div>
                <strong>Email</strong>
                <p>{order.email}</p>
              </div>
            </div>
          </section>

          {/* Billing Address */}
          <section className="order-card">
            <h3>Billing Address</h3>
            <div className="address-info">
              {order.billing_address ? (
                <>
                  <p>{order.billing_address.first_name} {order.billing_address.last_name}</p>
                  {order.billing_address.company && <p>{order.billing_address.company}</p>}
                  <p>{order.billing_address.address1}</p>
                  {order.billing_address.address2 && <p>{order.billing_address.address2}</p>}
                  <p>
                    {order.billing_address.city}, {order.billing_address.province} {order.billing_address.postal_code}
                  </p>
                  <p>{order.billing_address.country}</p>
                </>
              ) : (
                <p>No billing address</p>
              )}
            </div>
          </section>

          {/* Shipping Address */}
          <section className="order-card">
            <h3>Shipping Address</h3>
            <div className="address-info">
              {order.shipping_address ? (
                <>
                  <p>{order.shipping_address.first_name} {order.shipping_address.last_name}</p>
                  {order.shipping_address.company && <p>{order.shipping_address.company}</p>}
                  <p>{order.shipping_address.address1}</p>
                  {order.shipping_address.address2 && <p>{order.shipping_address.address2}</p>}
                  <p>
                    {order.shipping_address.city}, {order.shipping_address.province} {order.shipping_address.postal_code}
                  </p>
                  <p>{order.shipping_address.country}</p>
                </>
              ) : (
                <p>No shipping address</p>
              )}
            </div>
          </section>

          {/* Order Summary */}
          <section className="order-card">
            <h3>Order Summary</h3>
            <div className="summary">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>${parseFloat(order.subtotal).toFixed(2)}</span>
              </div>
              {order.tax > 0 && (
                <div className="summary-row">
                  <span>Tax</span>
                  <span>${parseFloat(order.tax).toFixed(2)}</span>
                </div>
              )}
              {order.shipping > 0 && (
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>${parseFloat(order.shipping).toFixed(2)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="summary-row">
                  <span>Discount</span>
                  <span>-${parseFloat(order.discount).toFixed(2)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Total</span>
                <span>${parseFloat(order.total).toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* Payment Info */}
          <section className="order-card">
            <h3>Payment</h3>
            <div className="payment-info">
              <div>
                <strong>Method</strong>
                <p>{order.payment_method}</p>
              </div>
              <div>
                <strong>Status</strong>
                <p className={`status-${order.payment_status}`}>{order.payment_status}</p>
              </div>
              {order.payment_intent_id && (
                <div>
                  <strong>Intent ID</strong>
                  <code>{order.payment_intent_id}</code>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      <style>{`
        .order-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .order-date {
          color: #666;
          margin: 0.25rem 0 0 0;
          font-size: 0.875rem;
        }

        .order-layout {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
        }

        @media (max-width: 1024px) {
          .order-layout {
            grid-template-columns: 1fr;
          }
        }

        .order-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .order-section h2 {
          margin-top: 0;
          margin-bottom: 1.5rem;
          font-size: 1.125rem;
        }

        .status-controls {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .select-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .status-badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .shipping-info {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 4px;
        }

        .add-tracking {
          display: flex;
          gap: 0.75rem;
        }

        .text-input {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
        }

        .items-table th {
          text-align: left;
          padding: 0.75rem;
          border-bottom: 2px solid #e5e7eb;
          font-weight: 600;
        }

        .items-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .variant-info {
          font-size: 0.875rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .order-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .order-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .order-card h3 {
          margin-top: 0;
          margin-bottom: 1rem;
          font-size: 1rem;
        }

        .customer-info > div,
        .address-info,
        .payment-info > div {
          margin-bottom: 1rem;
        }

        .customer-info strong,
        .address-info p,
        .payment-info strong {
          display: block;
          font-size: 0.875rem;
          color: #666;
          margin-bottom: 0.25rem;
        }

        .address-info p {
          color: #333;
          margin: 0.25rem 0;
        }

        .summary {
          border-top: 1px solid #e5e7eb;
          padding-top: 1rem;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.875rem;
        }

        .summary-row.total {
          border-top: 1px solid #e5e7eb;
          padding-top: 0.75rem;
          font-weight: 600;
          font-size: 1rem;
        }

        .status-paid {
          color: #10b981;
          font-weight: 500;
        }

        .status-pending {
          color: #f59e0b;
          font-weight: 500;
        }

        .status-failed {
          color: #ef4444;
          font-weight: 500;
        }

        code {
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 3px;
          font-size: 0.85em;
          color: #666;
        }
      `}</style>
    </div>
  );
}
