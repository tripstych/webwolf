import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../db/connection.js';
import { generateToken, requireAuth } from '../middleware/auth.js';

const router = Router();

/**
 * Register a new customer
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if customer already exists
    const existing = await query('SELECT id FROM customers WHERE email = ?', [email]);
    if (existing[0]) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const result = await query(
      `INSERT INTO customers (email, password, first_name, last_name, verification_token)
       VALUES (?, ?, ?, ?, ?)`,
      [email, hashedPassword, firstName || '', lastName || '', verificationToken]
    );

    const customerId = result.insertId;

    // TODO: Send verification email with token

    res.status(201).json({
      id: customerId,
      email,
      firstName,
      lastName,
      message: 'Registration successful. Please check your email to verify your account.'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already registered' });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * Login customer
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const customers = await query(
      'SELECT id, email, password, first_name, last_name FROM customers WHERE email = ?',
      [email]
    );

    const customer = customers[0];

    if (!customer || !(await bcrypt.compare(password, customer.password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create token with customer data
    const token = generateToken({
      id: customer.id,
      email: customer.email,
      type: 'customer' // Distinguish from admin users
    });

    res.cookie('customer_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.first_name,
        lastName: customer.last_name
      },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * Logout customer
 */
router.post('/logout', (req, res) => {
  res.clearCookie('customer_token');
  res.json({ success: true });
});

/**
 * Get current customer
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const customers = await query(
      'SELECT id, email, first_name, last_name, phone, email_verified, created_at FROM customers WHERE id = ?',
      [req.user.id]
    );

    if (!customers[0]) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = customers[0];
    res.json({
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone,
      emailVerified: customer.email_verified,
      createdAt: customer.created_at
    });
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

/**
 * Update customer profile
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const customerId = req.user.id;

    await query(
      `UPDATE customers SET first_name = ?, last_name = ?, phone = ?, updated_at = NOW()
       WHERE id = ?`,
      [firstName || '', lastName || '', phone || '', customerId]
    );

    const customers = await query(
      'SELECT id, email, first_name, last_name, phone FROM customers WHERE id = ?',
      [customerId]
    );

    const customer = customers[0];
    res.json({
      id: customer.id,
      email: customer.email,
      firstName: customer.first_name,
      lastName: customer.last_name,
      phone: customer.phone
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * Change password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const customerId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const customers = await query('SELECT password FROM customers WHERE id = ?', [customerId]);
    const customer = customers[0];

    if (!(await bcrypt.compare(currentPassword, customer.password))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE customers SET password = ? WHERE id = ?', [hashedPassword, customerId]);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * Request password reset
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const customers = await query('SELECT id FROM customers WHERE email = ?', [email]);

    if (!customers[0]) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.'
      });
    }

    const customerId = customers[0].id;
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await query(
      `UPDATE customers SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?`,
      [resetTokenHash, expiresAt, customerId]
    );

    // TODO: Send reset email with token
    console.log(`Password reset token: ${resetToken}`); // For development

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

/**
 * Reset password with token
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find customer with valid reset token
    const customers = await query(
      `SELECT id FROM customers
       WHERE password_reset_token IS NOT NULL
       AND password_reset_expires > NOW()`,
      []
    );

    let customerId = null;
    for (const customer of customers) {
      try {
        const customers2 = await query('SELECT password_reset_token FROM customers WHERE id = ?', [customer.id]);
        if (await bcrypt.compare(token, customers2[0].password_reset_token)) {
          customerId = customer.id;
          break;
        }
      } catch (e) {
        // Continue checking other customers
      }
    }

    if (!customerId) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query(
      `UPDATE customers SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?`,
      [hashedPassword, customerId]
    );

    res.json({ success: true, message: 'Password reset successful. You can now login.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

export default router;
