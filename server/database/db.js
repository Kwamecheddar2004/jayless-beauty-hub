const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const DB_PATH = isServerless ? path.join('/tmp', 'data.json') : path.join(__dirname, 'data.json');

// Default initial dataset
const INITIAL_DATA = {
  services: [
    {
      id: 'srv_1',
      name: 'Full Glam Makeup',
      category: 'Makeup',
      description: 'Flawless foundation, dramatic contouring, cut crease/glitter eyeshadow, & luxury mink lashes.',
      price: 250,
      duration: 60,
      image: 'images/services/makeup.jpg',
      popular: true
    },
    {
      id: 'srv_2',
      name: 'Soft Glam Makeup',
      category: 'Makeup',
      description: 'Subtle, natural glowing look with soft eyeshadow tones, light highlight, & neutral lips.',
      price: 180,
      duration: 45,
      image: 'images/services/makeup.jpg',
      popular: false
    },
    {
      id: 'srv_3',
      name: 'Bridal Glam Package',
      category: 'Makeup',
      description: 'Exclusive consultation, trial session, long-lasting luxury bridal makeup with setting spray.',
      price: 600,
      duration: 90,
      image: 'images/services/makeup.jpg',
      popular: true
    },
    {
      id: 'srv_4',
      name: 'Acrylic Full Set (Gel)',
      category: 'Nails',
      description: 'High-quality acrylic extensions with gel polish finish, custom shape (coffin, almond, square).',
      price: 150,
      duration: 75,
      image: 'images/services/nails.jpg',
      popular: true
    },
    {
      id: 'srv_5',
      name: 'Luxury Spa Pedicure',
      category: 'Nails',
      description: 'Warm scented foot soak, exfoliating scrub, heel softening, massage, & gel polish application.',
      price: 120,
      duration: 50,
      image: 'images/services/pedicure.jpg',
      popular: true
    },
    {
      id: 'srv_6',
      name: 'Gel Manicure & Nail Art',
      category: 'Nails',
      description: 'Cuticle care, nail shaping, durable gel polish with custom hand-painted nail designs.',
      price: 100,
      duration: 45,
      image: 'images/services/nails.jpg',
      popular: false
    },
    {
      id: 'srv_7',
      name: 'Knotless Box Braids (Medium)',
      category: 'Hair',
      description: 'Lightweight, painless knotless braids using premium hair extensions. Tailored length.',
      price: 300,
      duration: 180,
      image: 'images/services/hair.jpg',
      popular: true
    },
    {
      id: 'srv_8',
      name: 'Silk Press & Treatment',
      category: 'Hair',
      description: 'Deep conditioning steam treatment, blowout, & silky straight flat iron press.',
      price: 200,
      duration: 90,
      image: 'images/services/hair.jpg',
      popular: false
    },
    {
      id: 'srv_9',
      name: 'Wig Installation & Styling',
      category: 'Hair',
      description: 'Frontal or closure wig customization, plucking, bleaching knots, melt install & styling.',
      price: 250,
      duration: 120,
      image: 'images/services/hair.jpg',
      popular: true
    },
    {
      id: 'srv_10',
      name: 'Hydrating Glow Facial',
      category: 'Facials',
      description: 'Deep pore cleansing, ultrasonic exfoliation, hydrating serum infusion, & relaxation mask.',
      price: 220,
      duration: 60,
      image: 'images/services/facial.jpg',
      popular: true
    },
    {
      id: 'srv_11',
      name: 'Anti-Aging & Collagen Spa',
      category: 'Facials',
      description: 'Microdermabrasion, collagen boost mask, LED light therapy, & neck massage.',
      price: 280,
      duration: 75,
      image: 'images/services/facial.jpg',
      popular: false
    }
  ],
  bookings: [
    {
      id: 'bk_1001',
      booking_ref: 'JBH-8921',
      client_name: 'Ama Mensah',
      client_email: 'ama.mensah@example.com',
      client_phone: '+233241234567',
      appointment_date: '2026-09-08',
      appointment_time: '10:00 AM',
      stylist_preference: 'Jessica (Master Makeup & Hair)',
      services: [
        { id: 'srv_1', name: 'Full Glam Makeup', price: 250, duration: 60 },
        { id: 'srv_4', name: 'Acrylic Full Set (Gel)', price: 150, duration: 75 }
      ],
      total_price: 360, // 10% combo discount applied
      discount_applied: 40,
      total_duration: 135,
      payment_method: 'MTN Mobile Money (MoMo)',
      payment_status: 'Paid',
      status: 'Confirmed',
      notes: 'Please ensure gel nails are nude blush color.',
      created_at: new Date('2026-09-04T10:00:00').toISOString()
    }
  ],
  users: [
    {
      id: 'usr_admin',
      name: 'Jayless Beauty Manager',
      email: 'admin@jaylessbeautyhub.com',
      password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'JaylessAdmin2026!', 10),
      role: 'admin'
    }
  ],
  inquiries: []
};

// Database class helper
class Database {
  constructor() {
    this.init();
  }

  init() {
    if (isServerless && !fs.existsSync(DB_PATH)) {
      const originalPath = path.join(__dirname, 'data.json');
      if (fs.existsSync(originalPath)) {
        try {
          fs.copyFileSync(originalPath, DB_PATH);
        } catch (e) {
          this.saveData(INITIAL_DATA);
        }
      } else {
        this.saveData(INITIAL_DATA);
      }
    } else if (!fs.existsSync(DB_PATH)) {
      this.saveData(INITIAL_DATA);
    }
  }

  loadData() {
    if (this._memoryData) {
      return this._memoryData;
    }
    try {
      if (!fs.existsSync(DB_PATH)) {
        this.saveData(INITIAL_DATA);
        return INITIAL_DATA;
      }
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error reading database file, resetting to initial data:', err);
      this.saveData(INITIAL_DATA);
      return INITIAL_DATA;
    }
  }

  saveData(data) {
    this._memoryData = data;
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (err) {
      console.warn('Could not write to disk, using in-memory data:', err.message);
    }
  }

  // Services
  getServices(category = null) {
    const data = this.loadData();
    if (category && category !== 'All') {
      return data.services.filter(s => s.category.toLowerCase() === category.toLowerCase());
    }
    return data.services;
  }

  getServiceById(id) {
    const data = this.loadData();
    return data.services.find(s => s.id === id);
  }

  // Bookings
  createBooking(bookingPayload) {
    const data = this.loadData();
    const refCode = 'JBH-' + Math.floor(1000 + Math.random() * 9000);
    
    // Calculate total pricing and durations from actual services
    let rawTotal = 0;
    let totalDuration = 0;
    const selectedServiceDetails = [];

    bookingPayload.serviceIds.forEach(srvId => {
      const found = data.services.find(s => s.id === srvId);
      if (found) {
        rawTotal += found.price;
        totalDuration += found.duration;
        selectedServiceDetails.push({
          id: found.id,
          name: found.name,
          category: found.category,
          price: found.price,
          duration: found.duration
        });
      }
    });

    // Multi-service combo discount: 10% off if 2 or more services selected
    let discount = 0;
    if (selectedServiceDetails.length >= 2) {
      discount = Math.round(rawTotal * 0.10);
    }

    const finalPrice = rawTotal - discount;

    const newBooking = {
      id: 'bk_' + Date.now(),
      booking_ref: refCode,
      client_name: bookingPayload.client_name,
      client_email: bookingPayload.client_email,
      client_phone: bookingPayload.client_phone,
      appointment_date: bookingPayload.appointment_date,
      appointment_time: bookingPayload.appointment_time,
      stylist_preference: bookingPayload.stylist_preference || 'Any Available Specialist',
      services: selectedServiceDetails,
      raw_total: rawTotal,
      discount_applied: discount,
      total_price: finalPrice,
      total_duration: totalDuration,
      payment_method: bookingPayload.payment_method || 'Pay at Salon',
      payment_status: bookingPayload.payment_method === 'Pay at Salon' ? 'Pending Deposit' : 'Paid',
      status: 'Confirmed',
      notes: bookingPayload.notes || '',
      created_at: new Date().toISOString()
    };

    data.bookings.unshift(newBooking);
    this.saveData(data);
    return newBooking;
  }

  getBookings(date = null, status = null) {
    const data = this.loadData();
    let result = data.bookings;

    if (date) {
      result = result.filter(b => b.appointment_date === date);
    }
    if (status) {
      result = result.filter(b => b.status.toLowerCase() === status.toLowerCase());
    }

    return result;
  }

  getBookingByRef(query) {
    const data = this.loadData();
    if (!query) return null;
    const clean = query.trim().toLowerCase();
    const cleanDigits = clean.replace(/\D/g, '');

    return data.bookings.find(b => {
      if (b.booking_ref && b.booking_ref.toLowerCase() === clean) return true;
      if (b.client_email && b.client_email.toLowerCase() === clean) return true;
      if (cleanDigits.length >= 7 && b.client_phone) {
        const phoneDigits = b.client_phone.replace(/\D/g, '');
        if (phoneDigits.includes(cleanDigits) || cleanDigits.includes(phoneDigits)) return true;
      }
      return false;
    });
  }

  updateBookingStatus(id, status) {
    const data = this.loadData();
    const booking = data.bookings.find(b => b.id === id || b.booking_ref === id);
    if (booking) {
      booking.status = status;
      this.saveData(data);
      return booking;
    }
    return null;
  }

  updateBookingDetails(id, updates) {
    const data = this.loadData();
    const booking = data.bookings.find(b => b.id === id || b.booking_ref === id);
    if (booking) {
      if (updates.appointment_date) booking.appointment_date = updates.appointment_date;
      if (updates.appointment_time) booking.appointment_time = updates.appointment_time;
      if (updates.stylist_preference) booking.stylist_preference = updates.stylist_preference;
      if (updates.client_name) booking.client_name = updates.client_name;
      if (updates.client_phone) booking.client_phone = updates.client_phone;
      if (updates.client_email) booking.client_email = updates.client_email;
      if (updates.notes !== undefined) booking.notes = updates.notes;
      if (updates.payment_method) booking.payment_method = updates.payment_method;
      if (updates.status) booking.status = updates.status;

      if (updates.serviceIds && Array.isArray(updates.serviceIds) && updates.serviceIds.length > 0) {
        let rawTotal = 0;
        let totalDuration = 0;
        const selectedServiceDetails = [];

        updates.serviceIds.forEach(srvId => {
          const found = data.services.find(s => s.id === srvId);
          if (found) {
            rawTotal += found.price;
            totalDuration += found.duration;
            selectedServiceDetails.push({
              id: found.id,
              name: found.name,
              category: found.category,
              price: found.price,
              duration: found.duration
            });
          }
        });

        let discount = selectedServiceDetails.length >= 2 ? Math.round(rawTotal * 0.10) : 0;
        booking.services = selectedServiceDetails;
        booking.raw_total = rawTotal;
        booking.discount_applied = discount;
        booking.total_price = rawTotal - discount;
        booking.total_duration = totalDuration;
      }

      this.saveData(data);
      return booking;
    }
    return null;
  }


  // Users & Auth
  getUserByEmail(email) {
    const data = this.loadData();
    return data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(userData) {
    const data = this.loadData();
    const existing = data.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existing) {
      throw new Error('User with this email already exists');
    }

    const newUser = {
      id: 'usr_' + Date.now(),
      name: userData.name,
      email: userData.email,
      password: bcrypt.hashSync(userData.password, 10),
      role: userData.role || 'client'
    };

    data.users.push(newUser);
    this.saveData(data);
    return { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role };
  }

  // Contact Inquiries
  addInquiry(inquiry) {
    const data = this.loadData();
    const newInquiry = {
      id: 'inq_' + Date.now(),
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      subject: inquiry.subject,
      message: inquiry.message,
      created_at: new Date().toISOString()
    };
    data.inquiries.unshift(newInquiry);
    this.saveData(data);
    return newInquiry;
  }

  // Admin Dashboard Stats
  getStats() {
    const data = this.loadData();
    const totalBookings = data.bookings.length;
    const confirmed = data.bookings.filter(b => b.status === 'Confirmed').length;
    const completed = data.bookings.filter(b => b.status === 'Completed').length;
    const totalRevenue = data.bookings.reduce((sum, b) => sum + (b.payment_status === 'Paid' ? b.total_price : 0), 0);
    const totalServices = data.services.length;

    return {
      totalBookings,
      confirmed,
      completed,
      totalRevenue,
      totalServices,
      recentBookings: data.bookings.slice(0, 5)
    };
  }

  // Update Admin Password
  updateAdminPassword(newPassword) {
    const data = this.loadData();
    const adminUser = data.users.find(u => u.role === 'admin' || u.email === 'admin@jaylessbeautyhub.com');
    if (adminUser) {
      adminUser.password = bcrypt.hashSync(newPassword, 10);
      this.saveData(data);
      return true;
    }
    return false;
  }
}

module.exports = new Database();
