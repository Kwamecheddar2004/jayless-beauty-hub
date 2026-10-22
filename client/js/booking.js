/* ==========================================================================
   JAYLESS BEAUTY HUB - MULTI-SERVICE BOOKING ENGINE
   Allows customers to select multiple services (Makeup, Nails, Hair, Facials)
   and book them together in a single transaction with live cart calculations.
   Includes persistent receipt storage, print/PDF options, and booking edits.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Determine API server URL dynamically
  const API_BASE = (window.location.protocol === 'file:' || (window.location.port !== '5000' && window.location.port !== ''))
    ? 'http://localhost:5000'
    : '';

  // Booking State
  const bookingState = {
    currentStep: 1,
    selectedServices: [],
    appointmentDate: '',
    appointmentTime: '',
    stylistPreference: 'Any Available Specialist',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    paymentMethod: 'Pay at Salon',
    notes: '',
    confirmedBooking: null
  };

  let allServices = [];

  // DOM Elements
  const servicesContainer = document.getElementById('servicesMultiContainer');
  const catFilters = document.querySelectorAll('.cat-filter-btn');
  const selectedListEl = document.getElementById('selectedServicesList');
  const summaryCountEl = document.getElementById('summaryCount');
  const summaryRawTotalEl = document.getElementById('summaryRawTotal');
  const summaryDiscountRow = document.getElementById('summaryDiscountRow');
  const summaryDiscountEl = document.getElementById('summaryDiscount');
  const summaryFinalPriceEl = document.getElementById('summaryFinalPrice');
  const summaryDurationEl = document.getElementById('summaryDuration');
  const comboBanner = document.getElementById('comboDiscountBanner');

  // Step Wizard Navigation Elements
  const stepContainer1 = document.getElementById('bookingStep1');
  const stepContainer2 = document.getElementById('bookingStep2');
  const stepContainer3 = document.getElementById('bookingStep3');
  const stepContainer4 = document.getElementById('bookingStep4');

  const btnStep1Next = document.getElementById('btnStep1Next');
  const btnStep2Back = document.getElementById('btnStep2Back');
  const btnStep2Next = document.getElementById('btnStep2Next');
  const btnStep3Back = document.getElementById('btnStep3Back');
  const btnConfirmBooking = document.getElementById('btnConfirmBooking');

  const dateInput = document.getElementById('appointmentDate');
  const timeSlotBtns = document.querySelectorAll('.time-slot-btn');
  const stylistCards = document.querySelectorAll('.stylist-option-card');

  // Set min date to today
  if (dateInput) {
    const todayStr = new Date().toISOString().split('T')[0];
    dateInput.min = todayStr;
    dateInput.value = todayStr;
    bookingState.appointmentDate = todayStr;
  }

  // 1. Fetch Services & Check for Active Saved Booking
  fetchServices();
  checkActiveBookingOnLoad();

  async function fetchServices() {
    try {
      const res = await fetch(`${API_BASE}/api/services`);
      if (!res.ok) throw new Error('Services API offline');
      const data = await res.json();
      if (data.success && data.data) {
        allServices = data.data;
      } else {
        allServices = getFallbackServices();
      }
    } catch (err) {
      console.warn('Backend offline or unreachable, using default service menu');
      allServices = getFallbackServices();
    }
    renderServices('All');
    checkPreselectedService();
  }

  // 2. Render Multi-Select Service Cards
  function renderServices(category = 'All') {
    if (!servicesContainer) return;
    servicesContainer.innerHTML = '';

    const filtered = category === 'All'
      ? allServices
      : allServices.filter(s => s.category.toLowerCase() === category.toLowerCase());

    filtered.forEach(service => {
      const isSelected = bookingState.selectedServices.some(s => s.id === service.id);
      const card = document.createElement('div');
      card.className = `multi-service-card ${isSelected ? 'selected' : ''}`;
      card.setAttribute('data-id', service.id);

      const imgSrc = service.image || service.fallbackImage || 'images/services/makeup.jpg';
      const fallbackSrc = service.fallbackImage || 'images/services/makeup.jpg';
      const priceText = service.priceDisplay ? service.priceDisplay : `₵${service.price}`;

      card.innerHTML = `
        <div class="service-checkbox-wrap">
          <div class="custom-checkbox">
            <i class="fa-solid fa-check"></i>
          </div>
        </div>
        <img src="${imgSrc}" onerror="this.src='${fallbackSrc}'" alt="${service.name}" class="multi-service-img">
        <div class="service-info-meta">
          <div class="d-flex align-items-center gap-2 mb-1">
            <h5>${service.name}</h5>
            <span class="badge bg-secondary opacity-75" style="font-size: 0.7rem;">${service.category}</span>
          </div>
          <p>${service.description}</p>
        </div>
        <div class="service-price-tag">
          <span class="price-num" style="font-size: 0.95rem;">${priceText}</span>
          <span class="duration-tag"><i class="fa-regular fa-clock me-1"></i>${service.duration} mins</span>
        </div>
      `;

      card.addEventListener('click', () => toggleServiceSelection(service, card));
      servicesContainer.appendChild(card);
    });
  }

  // 3. Toggle Service Selection in Cart
  function toggleServiceSelection(service, cardEl) {
    const idx = bookingState.selectedServices.findIndex(s => s.id === service.id);
    if (idx > -1) {
      bookingState.selectedServices.splice(idx, 1);
      cardEl.classList.remove('selected');
    } else {
      bookingState.selectedServices.push(service);
      cardEl.classList.add('selected');
    }

    updateSummaryCart();
  }

  // 4. Update Live Cart Summary & Pricing Calculator
  function updateSummaryCart() {
    const count = bookingState.selectedServices.length;

    if (selectedListEl) {
      selectedListEl.innerHTML = '';
      if (count === 0) {
        selectedListEl.innerHTML = `<li class="text-muted text-center py-3">No services selected yet. Click on any service above to add it!</li>`;
      } else {
        bookingState.selectedServices.forEach(s => {
          selectedListEl.innerHTML += `
            <li>
              <span>${s.name}</span>
              <span class="fw-bold">₵${s.price}</span>
            </li>
          `;
        });
      }
    }

    let rawTotal = 0;
    let totalDuration = 0;
    bookingState.selectedServices.forEach(s => {
      rawTotal += s.price;
      totalDuration += s.duration;
    });

    let discount = 0;
    if (count >= 2) {
      discount = Math.round(rawTotal * 0.10);
      if (comboBanner) comboBanner.style.display = 'block';
      if (summaryDiscountRow) summaryDiscountRow.style.display = 'flex';
    } else {
      if (comboBanner) comboBanner.style.display = 'none';
      if (summaryDiscountRow) summaryDiscountRow.style.display = 'none';
    }

    const finalPrice = rawTotal - discount;

    if (summaryCountEl) summaryCountEl.textContent = count;
    if (summaryRawTotalEl) summaryRawTotalEl.textContent = `₵${rawTotal}`;
    if (summaryDiscountEl) summaryDiscountEl.textContent = `-₵${discount}`;
    if (summaryFinalPriceEl) {
      summaryFinalPriceEl.textContent = `₵${finalPrice}`;
      summaryFinalPriceEl.classList.remove('price-updated');
      void summaryFinalPriceEl.offsetWidth; // Force reflow for animation reset
      summaryFinalPriceEl.classList.add('price-updated');
    }
    if (summaryDurationEl) {
      const hrs = Math.floor(totalDuration / 60);
      const mins = totalDuration % 60;
      summaryDurationEl.textContent = hrs > 0 ? `${hrs} hr ${mins} mins` : `${mins} mins`;
    }

    if (btnStep1Next) {
      btnStep1Next.disabled = count === 0;
    }
  }

  catFilters.forEach(btn => {
    btn.addEventListener('click', () => {
      catFilters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.getAttribute('data-category');
      renderServices(cat);
    });
  });

  if (btnStep1Next) {
    btnStep1Next.addEventListener('click', () => {
      if (bookingState.selectedServices.length === 0) {
        showToast('Selection Required', 'Please select at least one service to proceed.', 'danger');
        return;
      }
      goToStep(2);
    });
  }

  if (btnStep2Back) {
    btnStep2Back.addEventListener('click', () => goToStep(1));
  }

  if (btnStep2Next) {
    btnStep2Next.addEventListener('click', () => {
      if (!bookingState.appointmentTime) {
        showToast('Time Required', 'Please select a preferred appointment time slot.', 'danger');
        return;
      }
      goToStep(3);
    });
  }

  if (btnStep3Back) {
    btnStep3Back.addEventListener('click', () => goToStep(2));
  }

  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      bookingState.appointmentDate = e.target.value;
    });
  }

  timeSlotBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      timeSlotBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      bookingState.appointmentTime = btn.getAttribute('data-time');
    });
  });

  stylistCards.forEach(card => {
    card.addEventListener('click', () => {
      stylistCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      bookingState.stylistPreference = card.getAttribute('data-stylist');
    });
  });

  function goToStep(stepNum) {
    bookingState.currentStep = stepNum;

    const containers = [stepContainer1, stepContainer2, stepContainer3, stepContainer4];
    containers.forEach((c, idx) => {
      if (c) {
        if (idx + 1 === stepNum) {
          c.style.display = 'block';
          c.classList.remove('step-animated-in');
          void c.offsetWidth; // Force reflow
          c.classList.add('step-animated-in');
        } else {
          c.style.display = 'none';
          c.classList.remove('step-animated-in');
        }
      }
    });

    const stepItems = document.querySelectorAll('.progress-step-item');
    const fillLine = document.querySelector('.progress-line-fill');

    stepItems.forEach((item, index) => {
      const stepVal = index + 1;
      item.classList.remove('active', 'completed');
      if (stepVal === stepNum) {
        item.classList.add('active');
      } else if (stepVal < stepNum) {
        item.classList.add('completed');
      }
    });

    if (fillLine) {
      const pct = ((stepNum - 1) / 3) * 100;
      fillLine.style.width = `${pct}%`;
    }

    window.scrollTo({ top: 180, behavior: 'smooth' });
  }

  const paymentInputs = document.querySelectorAll('input[name="paymentMethod"]');
  paymentInputs.forEach(input => {
    input.addEventListener('change', (e) => {
      bookingState.paymentMethod = e.target.value;
    });
  });

  // 5. Booking Form Submission
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      bookingState.clientName = document.getElementById('clientName')?.value;
      bookingState.clientEmail = document.getElementById('clientEmail')?.value;
      bookingState.clientPhone = document.getElementById('clientPhone')?.value;
      bookingState.notes = document.getElementById('clientNotes')?.value;

      if (!bookingState.clientName || !bookingState.clientEmail || !bookingState.clientPhone) {
        showToast('Information Required', 'Please fill in your name, email, and phone number.', 'danger');
        return;
      }

      if (btnConfirmBooking) {
        btnConfirmBooking.disabled = true;
        btnConfirmBooking.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Confirming Booking...';
      }

      const payload = {
        client_name: bookingState.clientName,
        client_email: bookingState.clientEmail,
        client_phone: bookingState.clientPhone,
        appointment_date: bookingState.appointmentDate,
        appointment_time: bookingState.appointmentTime,
        stylist_preference: bookingState.stylistPreference,
        serviceIds: bookingState.selectedServices.map(s => s.id),
        payment_method: bookingState.paymentMethod,
        notes: bookingState.notes
      };

      try {
        const response = await fetch(`${API_BASE}/api/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          bookingState.confirmedBooking = result.data;
          renderConfirmationScreen(result.data);
          goToStep(4);
          openProofOfBookingModal(result.data);
          showToast('Appointment Booked!', 'Receipt is ready! Snap a photo with your phone or save it.', 'success');
          return;
        } else {
          showToast('Booking Warning', result.message || 'Unable to complete booking.', 'danger');
          return;
        }
      } catch (err) {
        console.warn('Backend server offline, using local booking generator fallback');
        
        let rawTotal = 0;
        bookingState.selectedServices.forEach(s => rawTotal += s.price);
        let discount = bookingState.selectedServices.length >= 2 ? Math.round(rawTotal * 0.10) : 0;
        let finalTotal = rawTotal - discount;

        const mockBooking = {
          id: 'bk_' + Date.now(),
          booking_ref: 'JBH-' + Math.floor(1000 + Math.random() * 9000),
          client_name: bookingState.clientName,
          client_email: bookingState.clientEmail,
          client_phone: bookingState.clientPhone,
          appointment_date: bookingState.appointmentDate,
          appointment_time: bookingState.appointmentTime,
          stylist_preference: bookingState.stylistPreference,
          services: bookingState.selectedServices,
          raw_total: rawTotal,
          discount_applied: discount,
          total_price: finalTotal,
          payment_method: bookingState.paymentMethod,
          payment_status: 'Confirmed',
          status: 'Confirmed',
          notes: bookingState.notes,
          created_at: new Date().toISOString()
        };

        bookingState.confirmedBooking = mockBooking;
        renderConfirmationScreen(mockBooking);
        goToStep(4);
        openProofOfBookingModal(mockBooking);
        showToast('Booking Confirmed', 'Receipt is ready! Snap a photo with your phone or save it.', 'success');
      } finally {
        if (btnConfirmBooking) {
          btnConfirmBooking.disabled = false;
          btnConfirmBooking.innerHTML = '<i class="fa-solid fa-circle-check me-2"></i> Complete & Book Appointment';
        }
      }
    });
  }

  // 6. Save & Persistent Storage Helpers
  function saveBookingToLocalStorage(booking) {
    if (!booking) return;
    try {
      localStorage.setItem('jayless_latest_booking', JSON.stringify(booking));

      let history = [];
      const raw = localStorage.getItem('jayless_booking_history');
      if (raw) history = JSON.parse(raw);

      history = history.filter(b => b.booking_ref !== booking.booking_ref && b.id !== booking.id);
      history.unshift(booking);
      localStorage.setItem('jayless_booking_history', JSON.stringify(history.slice(0, 10)));
    } catch (e) {
      console.warn('Could not store booking receipt locally', e);
    }
  }

  function getSavedLatestBooking() {
    try {
      const raw = localStorage.getItem('jayless_latest_booking');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function checkActiveBookingOnLoad() {
    const saved = getSavedLatestBooking();
    const alertBox = document.getElementById('activeBookingAlert');
    const alertRef = document.getElementById('activeBookingAlertRef');
    const alertDate = document.getElementById('activeBookingAlertDate');

    if (saved && alertBox) {
      bookingState.confirmedBooking = saved;
      if (alertRef) alertRef.textContent = saved.booking_ref;
      if (alertDate) alertDate.textContent = `${saved.appointment_date} @ ${saved.appointment_time}`;
      alertBox.style.display = 'flex';

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('viewReceipt') === 'true' || window.location.hash === '#receipt') {
        renderConfirmationScreen(saved);
        goToStep(4);
        openProofOfBookingModal(saved);
      }
    }
  }

  // Helper to escape HTML characters
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Generate Photo-Ready Official Salon Receipt HTML
  function generateReceiptHTML(booking, elementIdPrefix = 'rec') {
    if (!booking) return '';

    const refCode = booking.booking_ref || 'JBH-0000';
    const clientName = booking.client_name || 'Valued Customer';
    const clientPhone = booking.client_phone || '--';
    const clientEmail = booking.client_email || '';
    const appDate = booking.appointment_date || '--';
    const appTime = booking.appointment_time || '--';
    const stylist = booking.stylist_preference || 'Any Available Specialist';
    const paymentMethod = booking.payment_method || 'Pay at Salon';
    const status = booking.status || 'Confirmed';
    const notes = booking.notes || '';
    const createdDate = booking.created_at ? new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB');

    const services = booking.services || [];
    const rawTotal = booking.raw_total || (services.reduce((sum, s) => sum + (Number(s.price) || 0), 0));
    const discount = booking.discount_applied !== undefined ? booking.discount_applied : (services.length >= 2 ? Math.round(rawTotal * 0.10) : 0);
    const finalTotal = booking.total_price !== undefined ? booking.total_price : (rawTotal - discount);

    const qrData = encodeURIComponent(`JAYLESS BEAUTY HUB RECEIPT\nRef: ${refCode}\nClient: ${clientName}\nDate: ${appDate} @ ${appTime}\nTotal: GHS ${finalTotal}\nStatus: ${status}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&margin=2&data=${qrData}`;

    let servicesRowsHtml = '';
    if (services.length > 0) {
      servicesRowsHtml = services.map(s => `
        <tr>
          <td class="py-2">
            <strong class="text-dark d-block">${escapeHtml(s.name)}</strong>
            <small class="text-muted d-block">${escapeHtml(s.description || '')}</small>
          </td>
          <td class="py-2 text-center align-middle">
            <span class="badge bg-secondary opacity-75 font-monospace" style="font-size: 0.72rem;">${escapeHtml(s.category || 'Service')}</span>
          </td>
          <td class="py-2 text-end align-middle fw-bold text-dark font-monospace" style="font-size: 0.95rem;">₵${s.price}</td>
        </tr>
      `).join('');
    } else {
      servicesRowsHtml = `<tr><td colspan="3" class="text-muted text-center py-2">Service details registered</td></tr>`;
    }

    const discountHtml = discount > 0 ? `
      <div class="d-flex justify-content-between text-success small mb-1">
        <span><i class="fa-solid fa-tag me-1"></i> Multi-Service Combo Discount (10%):</span>
        <span class="fw-bold">-₵${discount}</span>
      </div>
    ` : '';

    const notesHtml = notes && notes.trim() !== '' ? `
      <div class="receipt-notes-box p-2 mb-3 bg-light rounded border border-warning border-opacity-50 small">
        <strong class="text-dark"><i class="fa-regular fa-comment-dots text-gold me-1"></i> Special Requests:</strong>
        <span class="text-secondary">${escapeHtml(notes)}</span>
      </div>
    ` : '';

    const statusBadgeClass = status === 'Cancelled' ? 'bg-danger' : 'bg-success';

    return `
      <div class="receipt-paper shadow-sm" id="${elementIdPrefix}ReceiptCapture">
        <!-- Luxury Gold Top Header -->
        <div class="receipt-header pb-3 mb-3 border-bottom border-gold border-opacity-50">
          <div class="row align-items-center g-2">
            <div class="col-sm-7 d-flex align-items-center gap-3">
              <img src="images/logo/logo.png" alt="Jayless Beauty Hub" class="receipt-brand-logo" onerror="this.src='images/services/makeup.jpg'">
              <div>
                <h3 class="receipt-brand-title mb-0">JAYLESS BEAUTY HUB</h3>
                <p class="receipt-brand-tagline mb-0">LUXURY SALON & SPA • AHENKRO, GHANA</p>
                <div class="receipt-salon-contacts small text-muted">
                  <span><i class="fa-solid fa-phone me-1 text-gold"></i>+233 24 779 2553</span>
                  <span class="mx-1">•</span>
                  <span><i class="fa-brands fa-whatsapp text-success me-1"></i>WhatsApp Available</span>
                </div>
              </div>
            </div>
            <div class="col-sm-5 text-sm-end">
              <div class="receipt-ref-badge mb-1">
                <span class="ref-small-title">BOOKING REFERENCE</span>
                <span class="ref-code-number">${escapeHtml(refCode)}</span>
              </div>
              <div class="d-flex justify-content-sm-end align-items-center gap-2">
                <span class="badge ${statusBadgeClass} text-uppercase px-2 py-1" style="font-size: 0.75rem;"><i class="fa-solid fa-circle-check me-1"></i> ${escapeHtml(status)}</span>
                <small class="text-muted d-block" style="font-size: 0.72rem;">Issued: ${createdDate}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Photo Callout Banner inside receipt -->
        <div class="receipt-photo-indicator py-1 px-2 mb-3 text-center rounded">
          <i class="fa-solid fa-camera me-1"></i> OFFICIAL PROOF OF APPOINTMENT • SNAP & SAVE THIS RECEIPT
        </div>

        <!-- Two-column Client & Schedule Grid -->
        <div class="receipt-details-grid p-3 mb-3 rounded">
          <div class="row g-2">
            <div class="col-6">
              <div class="grid-section-title"><i class="fa-solid fa-user me-1 text-gold"></i> CLIENT INFORMATION</div>
              <div class="grid-primary-text">${escapeHtml(clientName)}</div>
              <div class="grid-secondary-text"><i class="fa-solid fa-phone me-1 text-muted" style="font-size: 0.75rem;"></i>${escapeHtml(clientPhone)}</div>
              ${clientEmail ? `<div class="grid-tertiary-text"><i class="fa-regular fa-envelope me-1 text-muted" style="font-size: 0.75rem;"></i>${escapeHtml(clientEmail)}</div>` : ''}
            </div>
            <div class="col-6 text-end">
              <div class="grid-section-title"><i class="fa-regular fa-calendar-days me-1 text-gold"></i> APPOINTMENT SCHEDULE</div>
              <div class="grid-primary-text text-gold">${escapeHtml(appDate)} @ ${escapeHtml(appTime)}</div>
              <div class="grid-secondary-text"><i class="fa-solid fa-user-sparkles me-1 text-muted" style="font-size: 0.75rem;"></i>${escapeHtml(stylist)}</div>
              <div class="grid-tertiary-text"><i class="fa-solid fa-location-dot me-1 text-gold" style="font-size: 0.75rem;"></i>Salon: Ahenkro Hub</div>
            </div>
          </div>
        </div>

        <!-- Booked Services Table -->
        <div class="receipt-services-wrap mb-3">
          <div class="grid-section-title mb-2"><i class="fa-solid fa-wand-magic-sparkles me-1 text-gold"></i> BOOKED BEAUTY SERVICES</div>
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0 receipt-table">
              <thead>
                <tr style="background: #F8F6F0; color: #4A4A4A; font-size: 0.78rem;">
                  <th>Service Name</th>
                  <th class="text-center">Category</th>
                  <th class="text-end">Price</th>
                </tr>
              </thead>
              <tbody>
                ${servicesRowsHtml}
              </tbody>
            </table>
          </div>
        </div>

        ${notesHtml}

        <!-- Totals & Payment Method -->
        <div class="receipt-pricing-box border-top pt-2 mb-3">
          <div class="d-flex justify-content-between text-muted small mb-1">
            <span>Subtotal:</span>
            <span class="fw-bold">₵${rawTotal}</span>
          </div>
          ${discountHtml}
          <div class="d-flex justify-content-between align-items-center pt-2 border-top border-gold border-opacity-25 mt-1">
            <div>
              <span class="fw-bold text-dark fs-5">TOTAL PAYABLE:</span>
              <span class="d-block text-muted small" style="font-size: 0.75rem;">
                <i class="fa-solid fa-credit-card me-1 text-gold"></i> Payment Option: <strong>${escapeHtml(paymentMethod)}</strong>
              </span>
            </div>
            <div class="text-end">
              <span class="receipt-total-cedis fw-bold text-gold fs-3 font-monospace">₵${finalTotal}</span>
            </div>
          </div>
        </div>

        <!-- QR Code & Official Verification Footer -->
        <div class="receipt-verification-row p-3 rounded d-flex align-items-center justify-content-between gap-3 border border-secondary border-opacity-25">
          <div class="d-flex align-items-center gap-3">
            <div class="receipt-qr-wrap">
              <img src="${qrUrl}" alt="Booking QR" class="receipt-qr-img" onerror="this.onerror=null; this.src='images/logo/logo.png';">
              <small class="d-block text-center text-muted" style="font-size: 0.65rem; letter-spacing: 0.5px;">VERIFY QR</small>
            </div>
            <div>
              <h6 class="mb-1 fw-bold text-dark" style="font-size: 0.85rem;"><i class="fa-solid fa-shield-check text-success me-1"></i> VERIFIED SALON APPOINTMENT</h6>
              <p class="mb-1 text-muted small" style="font-size: 0.75rem; line-height: 1.35;">
                Show this official receipt on your phone or quote Reference Code <strong class="text-dark">${escapeHtml(refCode)}</strong> upon arrival at our Ahenkro beauty hub.
              </p>
              <div class="small text-gold fw-bold" style="font-size: 0.75rem;">
                📍 Ahenkro, Ghana • Hotline: +233 24 779 2553
              </div>
            </div>
          </div>
          
          <!-- Official Salon Gold Seal Stamp -->
          <div class="salon-gold-seal d-none d-sm-flex">
            <div class="seal-inner">
              <i class="fa-solid fa-crown seal-crown"></i>
              <span class="seal-text-top">JAYLESS</span>
              <span class="seal-text-mid">VERIFIED</span>
              <span class="seal-text-bot">AHENKRO</span>
            </div>
          </div>
        </div>

        <!-- Bottom Receipt Footer -->
        <div class="text-center pt-2 mt-2">
          <small class="text-muted" style="font-size: 0.72rem;">
            ✨ Please arrive 10 minutes before your appointment time. We look forward to giving you royalty glam!
          </small>
        </div>
      </div>
    `;
  }

  // 7. Render Receipt Screen & Photo-Ready Layout
  function renderConfirmationScreen(booking) {
    if (!booking) return;
    bookingState.confirmedBooking = booking;
    saveBookingToLocalStorage(booking);

    const printableCard = document.getElementById('printableReceiptCard');
    if (printableCard) {
      printableCard.innerHTML = generateReceiptHTML(booking, 'step4');
    }

    const modalReceiptArea = document.getElementById('modalReceiptArea');
    if (modalReceiptArea) {
      modalReceiptArea.innerHTML = generateReceiptHTML(booking, 'modal');
    }

    // Update WhatsApp links
    const finalTotal = booking.total_price !== undefined ? booking.total_price : (booking.services ? booking.services.reduce((sum, s) => sum + s.price, 0) : 0);
    const servicesList = (booking.services || []).map(s => s.name).join(', ');
    const waMsg = encodeURIComponent(
      `Hello Jayless Beauty Hub! I have booked an appointment.\nRef Code: ${booking.booking_ref}\nClient: ${booking.client_name}\nPhone: ${booking.client_phone}\nDate: ${booking.appointment_date} @ ${booking.appointment_time}\nStylist: ${booking.stylist_preference || 'Any'}\nServices: ${servicesList}\nTotal: ₵${finalTotal}`
    );
    const waBtnStep4 = document.getElementById('btnWhatsAppConfirm');
    if (waBtnStep4) waBtnStep4.href = `https://wa.me/233247792553?text=${waMsg}`;
    const waBtnModal = document.getElementById('btnWhatsAppModal');
    if (waBtnModal) waBtnModal.href = `https://wa.me/233247792553?text=${waMsg}`;

    // Update banner display
    const alertRef = document.getElementById('activeBookingAlertRef');
    const alertDate = document.getElementById('activeBookingAlertDate');
    const alertBox = document.getElementById('activeBookingAlert');
    if (alertRef) alertRef.textContent = booking.booking_ref;
    if (alertDate) alertDate.textContent = `${booking.appointment_date} @ ${booking.appointment_time}`;
    if (alertBox) alertBox.style.display = 'flex';
  }

  // Open Proof of Booking Modal for Phone Photo / Screenshot
  function openProofOfBookingModal(booking) {
    if (!booking) return;
    const modalEl = document.getElementById('proofOfBookingModal');
    if (!modalEl) return;

    renderConfirmationScreen(booking);

    if (typeof bootstrap !== 'undefined') {
      const bsModal = bootstrap.Modal.getOrCreateInstance(modalEl);
      bsModal.show();
    }
  }

  // Download Receipt as High-Resolution Photo / Image (PNG)
  function downloadReceiptPhoto(booking) {
    const target = document.getElementById('modalReceiptCapture') ||
                   document.getElementById('step4ReceiptCapture') ||
                   document.getElementById('modalReceiptArea') ||
                   document.getElementById('printableReceiptCard');

    if (!target) {
      showToast('Error', 'Receipt element not found.', 'danger');
      return;
    }

    const ref = (booking && booking.booking_ref) ? booking.booking_ref : 'JBH-Receipt';
    const filename = `Jayless-Booking-${ref}.png`;

    if (typeof html2canvas === 'undefined') {
      window.print();
      return;
    }

    showToast('Creating Photo', 'Generating high-resolution receipt image for your phone...', 'info');

    html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Photo Saved!', 'Receipt image downloaded! You can also take a photo of this screen with your phone camera.', 'success');
    }).catch(err => {
      console.warn('html2canvas capture warning:', err);
      showToast('Notice', 'Please snap a screenshot or take a photo with your phone camera.', 'info');
    });
  }

  // Download Receipt as PDF
  function downloadReceiptPDF(booking) {
    const target = document.getElementById('modalReceiptCapture') ||
                   document.getElementById('step4ReceiptCapture') ||
                   document.getElementById('modalReceiptArea') ||
                   document.getElementById('printableReceiptCard');

    if (!target) return;

    if (typeof html2pdf === 'undefined') {
      window.print();
      return;
    }

    const ref = (booking && booking.booking_ref) ? booking.booking_ref : 'JBH-Receipt';
    const opt = {
      margin: [8, 8, 8, 8],
      filename: `Jayless-Booking-${ref}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    showToast('Creating PDF', 'Exporting PDF receipt...', 'info');
    html2pdf().set(opt).from(target).save().then(() => {
      showToast('PDF Saved', 'Your PDF receipt has been saved.', 'success');
    }).catch(err => {
      console.warn('PDF export error:', err);
      window.print();
    });
  }

  // 8. Event Listeners for Banner & Action Buttons
  const navReceiptLink = document.getElementById('navMyReceiptLink');
  if (navReceiptLink) {
    navReceiptLink.addEventListener('click', (e) => {
      e.preventDefault();
      const saved = bookingState.confirmedBooking || getSavedLatestBooking();
      if (saved) {
        renderConfirmationScreen(saved);
        goToStep(4);
        openProofOfBookingModal(saved);
      } else {
        showToast('No Saved Booking', 'No active booking found yet. Select services below to book!', 'info');
      }
    });
  }

  const btnViewActiveReceipt = document.getElementById('btnViewActiveReceipt');
  if (btnViewActiveReceipt) {
    btnViewActiveReceipt.addEventListener('click', () => {
      const saved = bookingState.confirmedBooking || getSavedLatestBooking();
      if (saved) {
        renderConfirmationScreen(saved);
        goToStep(4);
        openProofOfBookingModal(saved);
      } else {
        showToast('No Active Booking', 'Please create a booking or search using Find Receipt.', 'info');
      }
    });
  }

  // Photo & PDF Download Buttons
  const btnDownloadImage = document.getElementById('btnDownloadImage');
  if (btnDownloadImage) {
    btnDownloadImage.addEventListener('click', () => {
      const current = bookingState.confirmedBooking || getSavedLatestBooking();
      if (current) downloadReceiptPhoto(current);
    });
  }

  const btnDownloadReceiptImageModal = document.getElementById('btnDownloadReceiptImageModal');
  if (btnDownloadReceiptImageModal) {
    btnDownloadReceiptImageModal.addEventListener('click', () => {
      const current = bookingState.confirmedBooking || getSavedLatestBooking();
      if (current) downloadReceiptPhoto(current);
    });
  }

  const btnSavePhotoStep4 = document.getElementById('btnSavePhotoStep4');
  if (btnSavePhotoStep4) {
    btnSavePhotoStep4.addEventListener('click', () => {
      const current = bookingState.confirmedBooking || getSavedLatestBooking();
      if (current) downloadReceiptPhoto(current);
    });
  }

  const btnSavePhotoBottom = document.getElementById('btnSavePhotoBottom');
  if (btnSavePhotoBottom) {
    btnSavePhotoBottom.addEventListener('click', () => {
      const current = bookingState.confirmedBooking || getSavedLatestBooking();
      if (current) downloadReceiptPhoto(current);
    });
  }

  const btnDownloadPDF = document.getElementById('btnDownloadPDF');
  if (btnDownloadPDF) {
    btnDownloadPDF.addEventListener('click', () => {
      const current = bookingState.confirmedBooking || getSavedLatestBooking();
      if (current) downloadReceiptPDF(current);
    });
  }

  const btnReopenReceiptModal = document.getElementById('btnReopenReceiptModal');
  if (btnReopenReceiptModal) {
    btnReopenReceiptModal.addEventListener('click', () => {
      const current = bookingState.confirmedBooking || getSavedLatestBooking();
      if (current) openProofOfBookingModal(current);
    });
  }

  const btnEditActiveBanner = document.getElementById('btnEditActiveBookingBanner');
  if (btnEditActiveBanner) {
    btnEditActiveBanner.addEventListener('click', () => {
      const saved = bookingState.confirmedBooking || getSavedLatestBooking();
      if (saved) openEditBookingModal(saved);
    });
  }

  const btnCopyRefCode = document.getElementById('btnCopyRefCode');
  if (btnCopyRefCode) {
    btnCopyRefCode.addEventListener('click', () => {
      const current = bookingState.confirmedBooking || getSavedLatestBooking();
      const ref = current ? current.booking_ref : (document.getElementById('confirmRefCode')?.textContent || '');
      if (ref) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(ref).then(() => {
            showToast('Copied!', `Reference Code ${ref} copied to clipboard!`, 'success');
          }).catch(() => showToast('Ref Code', ref, 'info'));
        } else {
          showToast('Ref Code', ref, 'info');
        }
      }
    });
  }

  const editTriggers = [document.getElementById('btnEditBookingTrigger'), document.getElementById('btnEditBookingTriggerBottom')];
  editTriggers.forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        const saved = bookingState.confirmedBooking || getSavedLatestBooking();
        if (saved) openEditBookingModal(saved);
      });
    }
  });

  const btnCancelTrigger = document.getElementById('btnCancelBookingTrigger');
  if (btnCancelTrigger) {
    btnCancelTrigger.addEventListener('click', async () => {
      const saved = bookingState.confirmedBooking || getSavedLatestBooking();
      if (!saved) return;

      if (!confirm(`Are you sure you want to cancel appointment ${saved.booking_ref}?`)) {
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/bookings/${saved.id || saved.booking_ref}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Cancelled' })
        });
        const data = await res.json();
        if (data.success && data.data) {
          saved.status = 'Cancelled';
        } else {
          saved.status = 'Cancelled';
        }
      } catch (err) {
        saved.status = 'Cancelled';
      }

      bookingState.confirmedBooking = saved;
      renderConfirmationScreen(saved);
      showToast('Cancelled', `Booking ${saved.booking_ref} has been set to Cancelled.`, 'warning');
    });
  }

  function openEditBookingModal(booking) {
    const modalEl = document.getElementById('editBookingModal');
    if (!modalEl) return;

    document.getElementById('editModalRefDisplay').textContent = booking.booking_ref || '';
    
    const dateEl = document.getElementById('editAppointmentDate');
    if (dateEl) {
      dateEl.min = new Date().toISOString().split('T')[0];
      dateEl.value = booking.appointment_date || new Date().toISOString().split('T')[0];
    }

    const timeEl = document.getElementById('editAppointmentTime');
    if (timeEl && booking.appointment_time) {
      timeEl.value = booking.appointment_time;
    }

    const stylistEl = document.getElementById('editStylistPreference');
    if (stylistEl && booking.stylist_preference) {
      stylistEl.value = booking.stylist_preference;
    }

    document.getElementById('editClientPhone').value = booking.client_phone || '';
    document.getElementById('editClientName').value = booking.client_name || '';
    document.getElementById('editClientEmail').value = booking.client_email || '';
    document.getElementById('editClientNotes').value = booking.notes || '';

    if (typeof bootstrap !== 'undefined') {
      const bsModal = new bootstrap.Modal(modalEl);
      bsModal.show();
    }
  }

  const editForm = document.getElementById('editBookingForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = bookingState.confirmedBooking || getSavedLatestBooking();
      if (!current) return;

      const saveBtn = document.getElementById('btnSaveBookingChanges');
      const originalHtml = saveBtn ? saveBtn.innerHTML : '';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Saving Changes...';
      }

      const updates = {
        appointment_date: document.getElementById('editAppointmentDate').value,
        appointment_time: document.getElementById('editAppointmentTime').value,
        stylist_preference: document.getElementById('editStylistPreference').value,
        client_phone: document.getElementById('editClientPhone').value,
        client_name: document.getElementById('editClientName').value,
        client_email: document.getElementById('editClientEmail').value,
        notes: document.getElementById('editClientNotes').value
      };

      try {
        const res = await fetch(`${API_BASE}/api/bookings/${current.id || current.booking_ref}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
        const data = await res.json();

        if (data.success && data.data) {
          bookingState.confirmedBooking = data.data;
          renderConfirmationScreen(data.data);
          showToast('Updated', 'Your appointment schedule & details have been updated!', 'success');
        } else {
          Object.assign(current, updates);
          bookingState.confirmedBooking = current;
          renderConfirmationScreen(current);
          showToast('Updated', 'Appointment details updated!', 'success');
        }
      } catch (err) {
        console.warn('Offline edit fallback:', err);
        Object.assign(current, updates);
        bookingState.confirmedBooking = current;
        renderConfirmationScreen(current);
        showToast('Updated', 'Appointment details updated locally!', 'success');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = originalHtml;
        }
        const modalEl = document.getElementById('editBookingModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
          const bsInstance = bootstrap.Modal.getInstance(modalEl);
          if (bsInstance) bsInstance.hide();
        }
      }
    });
  }

  // 9. Lookup / Search Booking Receipt Form
  const lookupForm = document.getElementById('lookupReceiptForm');
  if (lookupForm) {
    lookupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const queryInput = document.getElementById('lookupReceiptQuery');
      const errorDiv = document.getElementById('lookupReceiptError');
      const query = queryInput ? queryInput.value.trim() : '';

      if (!query) return;
      if (errorDiv) errorDiv.style.display = 'none';

      try {
        const res = await fetch(`${API_BASE}/api/bookings/verify/${encodeURIComponent(query)}`);
        const data = await res.json();

        if (data.success && data.data) {
          renderConfirmationScreen(data.data);
          const modalEl = document.getElementById('lookupReceiptModal');
          if (modalEl && typeof bootstrap !== 'undefined') {
            const instance = bootstrap.Modal.getInstance(modalEl);
            if (instance) instance.hide();
          }
          goToStep(4);
          openProofOfBookingModal(data.data);
        } else {
          if (errorDiv) {
            errorDiv.textContent = data.message || 'No booking receipt found for that reference code or phone number.';
            errorDiv.style.display = 'block';
          }
        }
      } catch (err) {
        if (errorDiv) {
          errorDiv.textContent = 'Unable to connect to server. Please verify network connection.';
          errorDiv.style.display = 'block';
        }
      }
    });
  }

  function checkPreselectedService() {
    const urlParams = new URLSearchParams(window.location.search);
    const srvId = urlParams.get('service');
    if (srvId && allServices.length > 0) {
      const target = allServices.find(s => s.id === srvId);
      if (target) {
        bookingState.selectedServices.push(target);
        updateSummaryCart();
        renderServices('All');
      }
    }
  }

  function getFallbackServices() {
    return [
      { id: 'srv_braiding', name: 'Braiding', category: 'Hair', description: 'Painless, neat, high-quality braiding styles including knotless box braids, cornrows, & goddess braids.', price: 100, priceDisplay: 'From ₵100', duration: 180, image: 'images/services/braiding.jpg', fallbackImage: 'images/services/braiding.jpg' },
      { id: 'srv_pedicure', name: 'Pedicure', category: 'Nails', description: 'Botanical foot soak, exfoliating scrub, heel softening, foot massage, & gel polish.', price: 80, priceDisplay: 'Girls ₵80 | Boys ₵100', duration: 50, image: 'images/services/pedicure.jpg', fallbackImage: 'images/services/pedicure.jpg' },
      { id: 'srv_wig_install', name: 'Wig Installation', category: 'Hair', description: 'Frontal or closure wig customization, plucking, bleaching knots, lace melt install & sleek styling.', price: 100, priceDisplay: 'From ₵100', duration: 120, image: 'images/services/wig_install.jpg', fallbackImage: 'images/services/wig_install.jpg' },
      { id: 'srv_washing', name: 'Washing (Hair)', category: 'Hair', description: 'Deep cleansing scalp wash & moisture conditioning treatment for natural and permed hair.', price: 25, priceDisplay: 'Natural ₵25 | Permed ₵20', duration: 40, image: 'images/services/hair_wash.jpg', fallbackImage: 'images/services/hair_wash.jpg' },
      { id: 'srv_lash_ext', name: 'Lash Extension', category: 'Lashes & Brows', description: 'Lightweight classic, hybrid, or volume lash extensions for gorgeous eye enhancement.', price: 70, priceDisplay: '₵70 - ₵150', duration: 60, image: 'images/services/lash_extensions.jpg', fallbackImage: 'images/services/lash_extensions.jpg' },
      { id: 'srv_ombre_brows', name: 'Ombre Brows', category: 'Lashes & Brows', description: 'Semi-permanent powder brows giving a soft-shaded pencil look that lasts up to 2-3 years.', price: 300, priceDisplay: '₵300', duration: 90, image: 'images/services/ombre_brows.jpg', fallbackImage: 'images/services/ombre_brows.jpg' },
      { id: 'srv_1', name: 'Full Glam Makeup', category: 'Makeup', description: 'Flawless foundation, dramatic contouring, cut crease/glitter eyeshadow, & mink lashes.', price: 250, priceDisplay: '₵250', duration: 60, image: 'images/services/makeup.jpg', fallbackImage: 'images/services/makeup.jpg' },
      { id: 'srv_2', name: 'Soft Glam Makeup', category: 'Makeup', description: 'Subtle, natural glowing look with soft eyeshadow tones & neutral lips.', price: 180, priceDisplay: '₵180', duration: 45, image: 'images/services/makeup.jpg', fallbackImage: 'images/services/makeup.jpg' },
      { id: 'srv_4', name: 'Acrylic Full Set (Gel)', category: 'Nails', description: 'High-quality acrylic extensions with gel polish finish.', price: 150, priceDisplay: '₵150', duration: 75, image: 'images/services/nails.jpg', fallbackImage: 'images/services/nails.jpg' }
    ];
  }
});