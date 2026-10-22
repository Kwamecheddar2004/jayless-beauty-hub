const express = require('express');
const router = express.Router();
const db = require('../database/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'jayless_beauty_hub_secret_key_2026';

// Middleware to authenticate JWT
const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Unauthorized: Token expired or invalid' });
  }
};

/* ==========================================
   SERVICES ENDPOINTS
========================================== */

// GET /api/services - Get all salon services
router.get('/services', (req, res) => {
  try {
    const category = req.query.category;
    const services = db.getServices(category);
    res.json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/services/:id - Get service by ID
router.get('/services/:id', (req, res) => {
  try {
    const service = db.getServiceById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }
    res.json({ success: true, data: service });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ==========================================
   BOOKINGS ENDPOINTS (MULTI-SERVICE SUPPORT)
========================================== */

// POST /api/bookings - Create a multi-service booking
router.post('/bookings', (req, res) => {
  try {
    const {
      client_name,
      client_email,
      client_phone,
      appointment_date,
      appointment_time,
      serviceIds,
      stylist_preference,
      payment_method,
      notes
    } = req.body;

    if (!client_name || !client_email || !client_phone || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required client details, appointment date, and time.'
      });
    }

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one beauty service to book.'
      });
    }

    const booking = db.createBooking({
      client_name,
      client_email,
      client_phone,
      appointment_date,
      appointment_time,
      serviceIds,
      stylist_preference,
      payment_method,
      notes
    });

    res.status(201).json({
      success: true,
      message: 'Appointment successfully booked!',
      data: booking
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/bookings - Fetch bookings
router.get('/bookings', (req, res) => {
  try {
    const { date, status } = req.query;
    const bookings = db.getBookings(date, status);
    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/bookings/verify/:ref - Lookup booking by reference code
router.get('/bookings/verify/:ref', (req, res) => {
  try {
    const booking = db.getBookingByRef(req.params.ref);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: `No booking found for reference code ${req.params.ref}`
      });
    }
    res.json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/bookings/:id/status - Update booking status
router.patch('/bookings/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status field is required' });
    }

    const updated = db.updateBookingStatus(req.params.id, status);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/bookings/:id - Reschedule or update booking details
router.put('/bookings/:id', (req, res) => {
  try {
    const updated = db.updateBookingDetails(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({
      success: true,
      message: 'Booking details updated successfully!',
      data: updated
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


/* ==========================================
   AUTHENTICATION ENDPOINTS
========================================== */

// POST /api/auth/register
router.post('/auth/register', (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const newUser = db.createUser({ name, email, password, role });
    const token = jwt.sign({ id: newUser.id, role: newUser.role, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: newUser
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isValidPassword = bcrypt.compareSync(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/admin-verify - Verify unique admin portal password
router.post('/auth/admin-verify', (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: 'Admin password is required' });
    }

    const adminUser = db.getUserByEmail('admin@jaylessbeautyhub.com');
    let isValid = false;

    if (adminUser) {
      isValid = bcrypt.compareSync(password, adminUser.password);
    }
    
    // Fallback env match
    const envPass = process.env.ADMIN_PASSWORD || 'JaylessAdmin2026!';
    if (password === envPass) {
      isValid = true;
    }

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Incorrect Admin Password. Access Denied.' });
    }

    const token = jwt.sign({ id: 'usr_admin', role: 'admin', email: 'admin@jaylessbeautyhub.com' }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'Admin Access Granted',
      token
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/change-admin-password - Update unique admin password
router.post('/auth/change-admin-password', (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    const adminUser = db.getUserByEmail('admin@jaylessbeautyhub.com');
    const isValid = adminUser ? bcrypt.compareSync(currentPassword, adminUser.password) : (currentPassword === (process.env.ADMIN_PASSWORD || 'JaylessAdmin2026!'));

    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Current Admin Password is incorrect.' });
    }

    db.updateAdminPassword(newPassword);

    res.json({
      success: true,
      message: 'Admin Password successfully updated!'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ==========================================
   CONTACT INQUIRIES
========================================== */

router.post('/contact', (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
    }

    const inquiry = db.addInquiry({ name, email, phone, subject, message });
    res.json({
      success: true,
      message: 'Thank you! Your message has been received. Our salon manager will get back to you shortly.',
      data: inquiry
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ==========================================
   ADMIN STATS & MANAGEMENT
========================================== */

router.get('/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
