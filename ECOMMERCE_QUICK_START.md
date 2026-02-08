# Ecommerce Quick Start Guide

## Initial Setup (5 minutes)

### 1. Run Database Migration
```bash
cd /path/to/webwolf
node server/db/migrate.js
```

This creates all ecommerce tables and the extension system.

### 2. Install Dependencies (if needed)
```bash
npm install axios  # For PayPal/Stripe API calls (if not already installed)
```

### 3. Add Payment Settings (Admin Panel)

Navigate to **Admin → Settings** and add:

**Stripe (Test Keys)**
```
stripe_public_key = pk_test_51234...
stripe_secret_key = sk_test_51234...
```

**PayPal (Sandbox)**
```
paypal_client_id = <your-sandbox-client-id>
paypal_client_secret = <your-sandbox-secret>
paypal_mode = sandbox
```

**Ecommerce Settings**
```
tax_rate = 0.08              # 8% tax
shipping_flat_rate = 10.00   # $10 flat shipping
currency = USD
```

### 4. Add Cart to Header Template

In `templates/layouts/base.njk`, add to your header:

```html
<header>
  <nav>
    <!-- Your existing nav items -->

    <!-- Add Cart Button -->
    <button class="cart-toggle" aria-label="Shopping cart">
      🛒 <span class="cart-badge">0</span>
    </button>
  </nav>
</header>

<!-- Add Cart JavaScript (before closing body tag) -->
<script src="/js/cart.js"></script>
<script src="/js/cart-ui.js"></script>
```

### 5. Test Stripe (Optional but Recommended)

Update `templates/shop/checkout.njk` to expose Stripe key:

```html
<script>
  window.STRIPE_PUBLIC_KEY = 'pk_test_...';  // Your test key
  window.PAYPAL_CLIENT_ID = 'client_id...';  // Your sandbox ID
</script>
```

## Creating Your First Product (2 minutes)

1. Go to **Admin Panel**
2. Click **Products** in sidebar
3. Click **+ Add Product**
4. Fill in:
   - **Title**: "Cool T-Shirt"
   - **Description**: Product details
   - **Upload Image**: (optional)
   - **SKU**: "SHIRT-001-BLU"
   - **Price**: $29.99
   - **Inventory Quantity**: 100
5. (Optional) Add variants:
   - Click **Variants** tab
   - Click **+ Add Variant**
   - Add sizes/colors with different prices/inventory
6. Click **Save Product**

## Testing the Checkout Flow (5 minutes)

### 1. Add Product to Cart
- Go to `/products` to see your product listing
- Click product to view details
- Select quantity and any variants
- Click **Add to Cart**
- Verify cart badge updates

### 2. View Cart
- Click cart button (top right)
- Click **View Cart** in drawer
- Adjust quantities, view totals

### 3. Go to Checkout
- Click **Proceed to Checkout**
- **Step 1**: Enter email
- **Step 2**: Enter shipping address
- **Step 3**: Select payment method

### 4. Test Stripe Payment
- Select "Credit Card"
- Use test card: `4242 4242 4242 4242`
- Any future date, any CVC
- Click **Place Order**

### 5. Verify Order Created
- Check **Admin → Orders**
- View order details
- Update status, add tracking number

## Testing Stripe Payments

**Test Cards**:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 0003`

**Other Details**:
- Any future date (MM/YY)
- Any 3-digit CVC
- Any postal code

## Testing PayPal Payments

1. Create sandbox account at https://developer.paypal.com
2. Get sandbox credentials
3. Add to settings:
   ```
   paypal_client_id = sandbox_client_id
   paypal_client_secret = sandbox_secret
   paypal_mode = sandbox
   ```
4. Test checkout with PayPal button

## Admin Routes

Once created, products and orders accessible at:

**Products**
- List: `/admin/products`
- Create: `/admin/products/new`
- Edit: `/admin/products/:id`

**Orders**
- List: `/admin/orders`
- Detail: `/admin/orders/:id`

**Settings**
- Payment settings: `/admin/settings`

## Public Routes

**Products**
- Listing: `/products`
- Single: `/products/:slug`

**Shopping**
- Cart: `/cart`
- Checkout: `/checkout`
- Order Confirmation: `/order-confirmation/:orderNumber`

## Common Tasks

### Change Tax Rate
Admin → Settings → `tax_rate` = `0.10` (for 10%)

### Change Flat Shipping
Admin → Settings → `shipping_flat_rate` = `15.00`

### Add a Variant to Product
Admin → Products → Edit → Variants tab → + Add Variant

### Mark Order as Shipped
Admin → Orders → Detail → Shipping & Tracking → Add Tracking Number

### Check Inventory
Admin → Products → List (shows "X in stock")

### Disable Payment Method
Remove API keys from settings (Stripe/PayPal buttons won't appear)

## Troubleshooting

**Cart not showing items?**
- Check browser localStorage is enabled
- Refresh page
- Check `/api/cart` returns data

**Can't create product?**
- Check all required fields (title, SKU, price)
- Verify SKU is unique
- Check database migration ran

**Payment fails?**
- Verify API keys in settings
- Check browser console for SDK errors
- Use test cards/credentials
- Try sandbox mode for PayPal

**No order created?**
- Check admin logs
- Verify payment succeeded
- Check shipping address filled
- Verify inventory available

## Next Steps

1. **Customize Styling**
   - Modify `public/css/shop.css`
   - Update cart drawer colors in `cart-ui.js`
   - Customize template layouts

2. **Add More Features**
   - Product categories (create as content type)
   - Reviews (add to extensions)
   - Wishlist (client-side localStorage)
   - Discounts (modify order totals calculation)

3. **Go Live**
   - Get live Stripe keys
   - Get live PayPal credentials
   - Update to `paypal_mode = live`
   - Test with real cards
   - Set up email notifications
   - Configure shipping rates

4. **Monitor**
   - Regular order reviews
   - Inventory management
   - Payment reconciliation
   - Customer support

## File Reference

| Feature | Files |
|---------|-------|
| **Products** | `server/api/products.js` |
| **Orders** | `server/api/orders.js` |
| **Cart** | `server/api/cart.js` + `public/js/cart*.js` |
| **Payments** | `server/api/payments.js` + `public/js/*-payment.js` |
| **Admin UI** | `admin/src/pages/Product*.jsx`, `Order*.jsx` |
| **Public Templates** | `templates/products/`, `templates/shop/` |

## Support

For detailed documentation, see:
- `ECOMMERCE_IMPLEMENTATION.md` - Full implementation details
- Individual file comments in source code
- WebWolf documentation for CMS features

## Success Checklist ✅

- [ ] Database migration completed
- [ ] Payment settings configured
- [ ] Cart button added to header
- [ ] First product created
- [ ] Product visible on `/products`
- [ ] Item added to cart and persists
- [ ] Checkout form loads
- [ ] Test payment succeeds
- [ ] Order appears in admin
- [ ] Order confirmation page loads

Once all items are checked, your ecommerce system is ready! 🚀
