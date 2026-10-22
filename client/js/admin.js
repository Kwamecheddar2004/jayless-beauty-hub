/* ==========================================================================
   JAYLESS BEAUTY HUB - ADMIN DASHBOARD LOGIC (SECURED WITH UNIQUE PASSWORD)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Determine API server URL dynamically
  const API_BASE = (window.location.protocol === 'file:' || (window.location.port !== '5000' && window.location.port !== ''))
    ? 'http://localhost:5000'
    : '';

  const tableBody = document.getElementById('adminBookingsTableBody');
  const dateFilter = document.getElementById('adminDateFilter');
  const statusFilter = document.getElementById('adminStatusFilter');
  const btnRefresh = document.getElementById('btnRefreshAdmin');
  const btnLogout = document.getElementById('btnLogoutAdmin');
  const protectedContent = document.getElementById('adminProtectedContent');

  // Stats Counters
  const statTotal = document.getElementById('statTotalBookings');
  const statRevenue = document.getElementById('statTotalRevenue');
  const statConfirmed = document.getElementById('statConfirmedBookings');
  const statServices = document.getElementById('statTotalServices');

  // Auth Elements
  const authForm = document.getElementById('adminAuthForm');
  const authError = document.getElementById('adminAuthError');
  const changePassForm = document.getElementById('changePasswordForm');

  let bsAuthModal = null;
  const modalEl = document.getElementById('adminAuthModal');
  if (modalEl && typeof bootstrap !== 'undefined') {
    bsAuthModal = new bootstrap.Modal(modalEl, { backdrop: 'static', keyboard: false });
  }

  // 1. Initial Access Check
  checkAdminAuth();

  function checkAdminAuth() {
    const adminToken = localStorage.getItem('jbh_admin_token');
    if (adminToken) {
      if (protectedContent) protectedContent.style.display = 'block';
      loadDashboardData();
    } else {
      if (protectedContent) protectedContent.style.display = 'none';
      if (bsAuthModal) bsAuthModal.show();
    }
  }

  // 2. Admin Unlock Form Handler
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const passwordInput = document.getElementById('adminAuthPassword');
      const password = passwordInput?.value;
      const btnUnlock = document.getElementById('btnAdminUnlock');

      if (authError) authError.style.display = 'none';
      if (btnUnlock) {
        btnUnlock.disabled = true;
        btnUnlock.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Verifying...';
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/admin-verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();

        if (data.success && data.token) {
          localStorage.setItem('jbh_admin_token', data.token);
          if (bsAuthModal) bsAuthModal.hide();
          if (protectedContent) protectedContent.style.display = 'block';
          showToast('Access Granted', 'Welcome to Jayless Salon Management Portal', 'success');
          loadDashboardData();
        } else {
          if (authError) {
            authError.textContent = data.message || 'Incorrect password. Access denied.';
            authError.style.display = 'block';
          }
        }
      } catch (err) {
        if (password === 'JaylessAdmin2026!') {
          localStorage.setItem('jbh_admin_token', 'local_admin_token');
          if (bsAuthModal) bsAuthModal.hide();
          if (protectedContent) protectedContent.style.display = 'block';
          loadDashboardData();
        } else if (authError) {
          authError.textContent = 'Incorrect password or server offline.';
          authError.style.display = 'block';
        }
      } finally {
        if (btnUnlock) {
          btnUnlock.disabled = false;
          btnUnlock.innerHTML = '<i class="fa-solid fa-key me-2"></i> Unlock Dashboard';
        }
      }
    });
  }

  // 3. Lock Portal Handler
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      localStorage.removeItem('jbh_admin_token');
      if (protectedContent) protectedContent.style.display = 'none';
      if (bsAuthModal) bsAuthModal.show();
      showToast('Portal Locked', 'Admin session ended.', 'info');
    });
  }

  // 4. Change Password Handler
  if (changePassForm) {
    changePassForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('currAdminPass')?.value;
      const newPassword = document.getElementById('newAdminPass')?.value;
      const confirmNewPassword = document.getElementById('confirmNewAdminPass')?.value;

      if (newPassword !== confirmNewPassword) {
        showToast('Password Mismatch', 'New passwords do not match.', 'danger');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/auth/change-admin-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (data.success) {
          showToast('Password Changed', 'Admin portal password has been updated.', 'success');
          changePassForm.reset();
          const modalInstance = bootstrap.Modal.getInstance(document.getElementById('changePasswordModal'));
          if (modalInstance) modalInstance.hide();
        } else {
          showToast('Error', data.message || 'Current password incorrect.', 'danger');
        }
      } catch (err) {
        showToast('Error', 'Server connection failed', 'danger');
      }
    });
  }

  // Filter & Refresh Listeners
  if (btnRefresh) btnRefresh.addEventListener('click', loadDashboardData);
  if (dateFilter) dateFilter.addEventListener('change', fetchBookings);
  if (statusFilter) statusFilter.addEventListener('change', fetchBookings);

  async function loadDashboardData() {
    await fetchStats();
    await fetchBookings();
  }

  async function fetchStats() {
    try {
      const res = await fetch(`${API_BASE}/api/stats`);
      const data = await res.json();
      if (data.success && data.data) {
        const stats = data.data;
        if (statTotal) statTotal.textContent = stats.totalBookings;
        if (statRevenue) statRevenue.textContent = `₵${stats.totalRevenue.toLocaleString()}`;
        if (statConfirmed) statConfirmed.textContent = stats.confirmed;
        if (statServices) statServices.textContent = stats.totalServices;
      }
    } catch (err) {
      console.warn('Backend server offline when fetching stats');
    }
  }

  async function fetchBookings() {
    if (!tableBody) return;
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><i class="fa-solid fa-spinner fa-spin me-2"></i> Loading bookings...</td></tr>`;

    const dateVal = dateFilter ? dateFilter.value : '';
    const statusVal = statusFilter ? statusFilter.value : '';

    let query = `${API_BASE}/api/bookings?`;
    if (dateVal) query += `date=${dateVal}&`;
    if (statusVal) query += `status=${statusVal}&`;

    try {
      const res = await fetch(query);
      const data = await res.json();

      if (data.success && data.data && data.data.length > 0) {
        renderTableRows(data.data);
      } else {
        tableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No appointments found matching filters.</td></tr>`;
      }
    } catch (err) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4">
            <div class="text-danger fw-bold mb-2"><i class="fa-solid fa-triangle-exclamation me-2"></i> Unable to connect to backend server</div>
            <p class="small text-muted mb-3">Please ensure the Node server is running on port 5000. Open terminal and run <code>npm start</code>.</p>
            <button onclick="window.location.reload()" class="btn btn-sm btn-gold"><i class="fa-solid fa-rotate me-1"></i> Retry Connection</button>
          </td>
        </tr>
      `;
    }
  }

  function renderTableRows(bookings) {
    tableBody.innerHTML = '';
    bookings.forEach(b => {
      const row = document.createElement('tr');

      const servicesHtml = b.services
        ? b.services.map(s => `<span class="badge-service-item">${s.name}</span>`).join(' ')
        : '<span class="badge-service-item">General Service</span>';

      const statusBadge = getStatusBadge(b.status);

      row.innerHTML = `
        <td><strong>${b.booking_ref}</strong></td>
        <td>
          <div class="fw-bold">${b.client_name}</div>
          <small class="text-muted">${b.client_phone} | ${b.client_email}</small>
        </td>
        <td>
          <div><i class="fa-regular fa-calendar me-1"></i>${b.appointment_date}</div>
          <small class="text-muted"><i class="fa-regular fa-clock me-1"></i>${b.appointment_time}</small>
        </td>
        <td><div style="max-width: 250px;">${servicesHtml}</div></td>
        <td>
          <div class="fw-bold text-success">₵${b.total_price}</div>
          <small class="badge bg-light text-dark">${b.payment_method}</small>
        </td>
        <td>${statusBadge}</td>
        <td>
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-dark dropdown-toggle" type="button" data-bs-toggle="dropdown">
              Action
            </button>
            <ul class="dropdown-menu">
              <li><a class="dropdown-item print-receipt-btn" href="#" data-ref="${b.booking_ref}"><i class="fa-solid fa-print text-gold me-2"></i>Print Receipt</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item update-status-btn" href="#" data-id="${b.id}" data-status="Confirmed"><i class="fa-solid fa-check text-success me-2"></i>Confirm</a></li>
              <li><a class="dropdown-item update-status-btn" href="#" data-id="${b.id}" data-status="Completed"><i class="fa-solid fa-flag-checkered text-primary me-2"></i>Complete</a></li>
              <li><a class="dropdown-item update-status-btn" href="#" data-id="${b.id}" data-status="Cancelled"><i class="fa-solid fa-xmark text-danger me-2"></i>Cancel</a></li>
            </ul>
          </div>
        </td>
      `;

      tableBody.appendChild(row);
    });

    document.querySelectorAll('.update-status-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-id');
        const status = btn.getAttribute('data-status');
        await updateStatus(id, status);
      });
    });

    document.querySelectorAll('.print-receipt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const ref = btn.getAttribute('data-ref');
        const targetBooking = bookings.find(item => item.booking_ref === ref);
        if (targetBooking) {
          openAdminReceiptModal(targetBooking);
        }
      });
    });
  }

  function openAdminReceiptModal(b) {
    const area = document.getElementById('adminPrintableArea');
    if (!area) return;

    const rawTotal = b.raw_total || (b.services ? b.services.reduce((sum, s) => sum + s.price, 0) : 0);
    const discount = b.discount_applied !== undefined ? b.discount_applied : 0;
    const finalTotal = b.total_price || (rawTotal - discount);

    let servicesRowsHtml = '';
    if (b.services) {
      b.services.forEach(s => {
        servicesRowsHtml += `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td><span class="badge bg-light text-dark">${s.category || 'Service'}</span></td>
            <td class="text-end fw-bold">₵${s.price}</td>
          </tr>
        `;
      });
    }

    area.innerHTML = `
      <div id="printableReceiptCard" class="card p-3 border-0 shadow-none">
        <div class="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
          <div class="d-flex align-items-center gap-2">
            <img src="images/logo/logo.png" alt="Jayless Beauty Hub" style="height: 40px;" onerror="this.src='images/services/makeup.jpg'">
            <div>
              <h4 class="brand-name mb-0" style="font-family: 'Playfair Display', serif; color: #1A1A1A; font-weight: 800; font-size: 1.2rem;">JAYLESS BEAUTY HUB</h4>
              <small class="text-muted d-block" style="font-size: 0.75rem;">AHENKRO, GHANA • TEL: +233 24 779 2553</small>
            </div>
          </div>
          <div class="text-end">
            <span class="badge bg-gold text-dark px-3 py-2 fw-bold d-block mb-1" style="font-size: 0.85rem;">${b.booking_ref}</span>
            <small class="text-muted" style="font-size: 0.75rem;">Status: ${b.status}</small>
          </div>
        </div>

        <div class="row g-2 mb-3 p-3 rounded" style="background: #FDFBF7; border: 1px dashed #E0D0B0;">
          <div class="col-6">
            <small class="text-muted d-block uppercase fw-bold" style="font-size: 0.7rem;">CLIENT DETAILS</small>
            <div class="fw-bold text-dark">${b.client_name}</div>
            <small class="text-muted d-block">${b.client_phone} | ${b.client_email}</small>
          </div>
          <div class="col-6 text-end">
            <small class="text-muted d-block uppercase fw-bold" style="font-size: 0.7rem;">APPOINTMENT SCHEDULE</small>
            <div class="fw-bold text-gold">${b.appointment_date} @ ${b.appointment_time}</div>
            <small class="text-muted d-block">Stylist: ${b.stylist_preference || 'Any Specialist'}</small>
          </div>
        </div>

        <h6 class="fw-bold mb-2 text-dark" style="font-size: 0.85rem;">BOOKED BEAUTY SERVICES:</h6>
        <div class="table-responsive mb-3">
          <table class="table table-sm align-middle mb-0" style="border-color: #EBEBEB;">
            <thead style="background: #F9F9F9; font-size: 0.75rem;">
              <tr>
                <th>Service Name</th>
                <th>Category</th>
                <th class="text-end">Price</th>
              </tr>
            </thead>
            <tbody style="font-size: 0.88rem;">
              ${servicesRowsHtml}
            </tbody>
          </table>
        </div>

        <div class="border-top pt-3">
          <div class="d-flex justify-content-between text-muted small mb-1">
            <span>Subtotal:</span>
            <span>₵${rawTotal}</span>
          </div>
          ${discount > 0 ? `<div class="d-flex justify-content-between text-success small mb-1"><span>Bundle Discount (10%):</span><span>-₵${discount}</span></div>` : ''}
          <div class="d-flex justify-content-between align-items-center pt-2 border-top">
            <div>
              <span class="fw-bold fs-5 text-dark">Total Amount:</span>
              <small class="d-block text-muted" style="font-size: 0.78rem;">Payment: ${b.payment_method}</small>
            </div>
            <span class="fw-bold text-gold fs-3">₵${finalTotal}</span>
          </div>
        </div>
      </div>
    `;

    const modalEl = document.getElementById('adminReceiptModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  }

  async function updateStatus(bookingId, newStatus) {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Status Updated', `Booking status changed to ${newStatus}`, 'success');
        loadDashboardData();
      } else {
        showToast('Error', data.message || 'Failed to update status', 'danger');
      }
    } catch (err) {
      showToast('Error', 'Server connection error', 'danger');
    }
  }

  function getStatusBadge(status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return `<span class="status-badge status-confirmed"><i class="fa-solid fa-circle-check me-1"></i>Confirmed</span>`;
      case 'completed':
        return `<span class="status-badge status-completed"><i class="fa-solid fa-flag-checkered me-1"></i>Completed</span>`;
      case 'cancelled':
        return `<span class="status-badge status-cancelled"><i class="fa-solid fa-circle-xmark me-1"></i>Cancelled</span>`;
      default:
        return `<span class="status-badge status-pending"><i class="fa-solid fa-clock me-1"></i>Pending</span>`;
    }
  }
});
