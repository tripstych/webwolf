import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { slugify } from '../lib/slugify';
import TitleSlugSection from '../components/TitleSlugSection';
import RichTextEditor from '../components/RichTextEditor';
import MediaPicker from '../components/MediaPicker';
import ContentGroupsWidget from '../components/ContentGroupsWidget';
import { Save, ArrowLeft, Image as ImageIcon, ExternalLink } from 'lucide-react';

export default function ProductEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = !id || id === 'new';

  const [product, setProduct] = useState({
    template_id: '',
    title: '',
    slug: '',
    content_type: 'products',
    content: {},
    meta_title: '',
    meta_description: '',
    og_image: '',
    canonical_url: '',
    sku: '',
    price: 0,
    compare_at_price: null,
    cost: null,
    inventory_quantity: 0,
    inventory_tracking: true,
    allow_backorder: false,
    weight: null,
    weight_unit: 'lb',
    requires_shipping: true,
    taxable: true,
    status: 'draft',
    variants: []
  });

  const [templates, setTemplates] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [mediaPickerTarget, setMediaPickerTarget] = useState(null);

  // Product module default fields
  const productDefaultFields = [
    { name: 'sku', label: 'SKU', type: 'text', required: true, section: 'inventory' },
    { name: 'price', label: 'Price', type: 'number', required: true, section: 'pricing' },
    { name: 'compare_at_price', label: 'Compare at Price', type: 'number', section: 'pricing' },
    { name: 'cost', label: 'Cost of Goods', type: 'number', section: 'pricing' },
    { name: 'inventory_quantity', label: 'Inventory Quantity', type: 'number', section: 'inventory' },
    { name: 'inventory_tracking', label: 'Track Inventory', type: 'checkbox', section: 'inventory' },
    { name: 'allow_backorder', label: 'Allow Backorder', type: 'checkbox', section: 'inventory' },
    { name: 'weight', label: 'Weight', type: 'number', section: 'shipping' },
    { name: 'weight_unit', label: 'Weight Unit', type: 'select', options: ['lb', 'kg', 'oz', 'g'], section: 'shipping' },
    { name: 'requires_shipping', label: 'Requires Shipping', type: 'checkbox', section: 'shipping' },
    { name: 'taxable', label: 'Taxable', type: 'checkbox', section: 'tax' },
    { name: 'status', label: 'Status', type: 'select', options: ['draft', 'active', 'archived'], section: 'basic' }
  ];

  useEffect(() => {
    console.log('[ProductEditor] Mounting, isNew:', isNew);
    loadTemplates();
    if (!isNew) {
      fetchProduct();
    }
  }, [id]);

  // Auto-sync slug from title
  useEffect(() => {
    setProduct(p => ({ ...p, slug: slugify(p.title, 'products') }));
  }, [product.title]);

  const loadTemplates = async () => {
    try {
      console.log('[ProductEditor] Loading templates...');
      const response = await fetch('/api/templates/content_type/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to load templates');
      const data = await response.json();
      console.log('[ProductEditor] Templates loaded:', data);
      setTemplates(data.data || []);
    } catch (err) {
      console.error('[ProductEditor] Failed to load templates:', err);
      setError('Failed to load templates');
    }
  };

  const getMergedFields = () => {
    // Get product field names for duplicate checking
    const productFieldNames = new Set(productDefaultFields.map(f => f.name.toLowerCase()));

    // Filter out template regions that duplicate product fields, then add all product fields
    const filteredRegions = regions.filter(r => !productFieldNames.has(r.name.toLowerCase()));

    return [...filteredRegions, ...productDefaultFields];
  };

  const handleTemplateChange = (templateId) => {
    const numId = parseInt(templateId);
    const template = templates.find(t => t.id === numId);
    setProduct(p => ({ ...p, template_id: numId }));
    setRegions(template?.regions || []);
  };

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to load product');

      const data = await response.json();
      setProduct(data);

      // Load template regions if product has a template
      if (data.template_id) {
        const template = templates.find(t => t.id === data.template_id);
        setRegions(template?.regions || []);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (fieldName, value) => {
    setProduct({
      ...product,
      content: { ...product.content, [fieldName]: value }
    });
  };

  const openMediaPicker = (target) => {
    setMediaPickerTarget(target);
    setMediaPickerOpen(true);
  };

  const handleMediaSelect = (media) => {
    if (mediaPickerTarget === 'og_image') {
      setProduct({ ...product, og_image: media.url });
    } else {
      // Extract field name from target (e.g., "content.image" -> "image")
      const fieldName = mediaPickerTarget.split('.')[1];
      handleContentChange(fieldName, media.url);
    }
    setMediaPickerOpen(false);
    setMediaPickerTarget(null);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (!product.sku?.trim()) {
        setError('SKU is required');
        setSaving(false);
        return;
      }

      if (product.price === undefined || product.price === '') {
        setError('Price is required');
        setSaving(false);
        return;
      }

      if (!product.template_id) {
        setError('Please select a product template');
        setSaving(false);
        return;
      }

      const method = isNew ? 'POST' : 'PUT';
      const url = isNew ? '/api/products' : `/api/products/${id}`;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(product)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save product');
      }

      const saved = await response.json();
      navigate(`/products/${saved.id}`);
    } catch (err) {
      setError(err.message);
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const renderField = (field) => {
    // Determine if this is a template region or product field
    // Template regions don't have a 'section' property
    const isTemplateRegion = field.section === undefined;
    const value = isTemplateRegion
      ? (product.content[field.name] || '')
      : product[field.name];

    const handleChange = (newValue) => {
      if (isTemplateRegion) {
        handleContentChange(field.name, newValue);
      } else {
        setProduct({ ...product, [field.name]: newValue });
      }
    };

    switch (field.type) {
      case 'richtext':
        return (
          <RichTextEditor
            value={value}
            onChange={handleChange}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              minHeight: '100px',
              fontFamily: 'inherit'
            }}
            placeholder={field.placeholder}
          />
        );

      case 'image':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {value && (
              <img src={value} alt="" style={{ maxWidth: '200px', borderRadius: '4px', border: '1px solid #ddd' }} />
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => openMediaPicker(`content.${field.name}`)}
                className="btn btn-secondary"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                {value ? 'Change Image' : 'Select Image'}
              </button>
              {value && (
                <button
                  type="button"
                  onClick={() => handleChange('')}
                  className="btn btn-ghost"
                  style={{ color: '#ef4444' }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={value || false}
            onChange={(e) => handleChange(e.target.checked)}
          />
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="">Select...</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'number':
        return (
          <input
            type="number"
            step="0.01"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value ? parseFloat(e.target.value) : null)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'inherit'
            }}
          />
        );

      case 'text':
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'inherit'
            }}
            placeholder={field.placeholder}
          />
        );
    }
  };

  if (loading) {
    console.log('[ProductEditor] Still loading...');
    return <div className="content-container">Loading product...</div>;
  }

  console.log('[ProductEditor] Rendering form. Templates:', templates.length, 'Regions:', regions.length, 'Product:', product);

  if (templates.length === 0 && isNew) {
    return (
      <div className="content-container">
        <div style={{ padding: '1rem', backgroundColor: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '4px', color: '#92400e', marginBottom: '1rem' }}>
          No product templates found. Please sync templates first.
        </div>
        <button onClick={loadTemplates} className="btn btn-secondary">
          Reload Templates
        </button>
      </div>
    );
  }

  return (
    <div className="content-container">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <h1>{isNew ? 'New Product' : 'Edit Product'}</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isNew && product.slug && (
            <a
              href={`/products/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ExternalLink className="w-4 h-4" />
              View on site
            </a>
          )}
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/products')}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </div>

      {error && <div style={{ padding: '1rem', backgroundColor: '#fee2e2', border: '1px solid #fecaca', borderRadius: '4px', color: '#991b1b', marginBottom: '1rem' }}>{error}</div>}

      {/* Title and Slug Section */}
      <TitleSlugSection
        title={product.title}
        slug={product.slug}
        onTitleChange={(title) => setProduct({ ...product, title })}
        onSlugChange={(slug) => setProduct({ ...product, slug })}
      />

      <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.125rem' }}>Template Selection</h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Product Template *</label>
          <select
            value={product.template_id || ''}
            onChange={(e) => handleTemplateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            <option value="">Select template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {product.template_id && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.125rem' }}>Product Details</h2>

          {getMergedFields().map((field) => (
            <div key={field.name} style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: field.type === 'checkbox' ? '0.5rem' : '0.5rem' }}>
                {field.type === 'checkbox' ? (
                  <>
                    {renderField(field)}
                    <label style={{ fontWeight: 500, margin: 0 }}>
                      {field.label}
                      {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                    </label>
                  </>
                ) : (
                  <label style={{ display: 'block', fontWeight: 500, color: '#333' }}>
                    {field.label}
                    {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                  </label>
                )}
              </div>
              {field.type !== 'checkbox' && renderField(field)}
            </div>
          ))}
        </div>
      )}

      {/* Groups Widget */}
      {product.content_id && (
        <div style={{ marginTop: '2rem' }}>
          <ContentGroupsWidget contentId={product.content_id} />
        </div>
      )}

      {mediaPickerOpen && (
        <MediaPicker
          onSelect={handleMediaSelect}
          onClose={() => setMediaPickerOpen(false)}
        />
      )}
    </div>
  );
}
