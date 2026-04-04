/**
 * Hyundai AutoEver Careers - Main JavaScript
 */

(function () {
  'use strict';

  // ============================================
  // Data
  // ============================================
  let jobsData = [];

  async function loadJobs() {
    try {
      const res = await fetch('data/jobs.json');
      jobsData = await res.json();
    } catch {
      jobsData = JSON.parse(localStorage.getItem('haev_jobs') || '[]');
    }
    // Merge with any admin-added jobs
    const adminJobs = JSON.parse(localStorage.getItem('haev_jobs_admin') || '[]');
    if (adminJobs.length) {
      const existingIds = new Set(jobsData.map(j => j.id));
      adminJobs.forEach(j => {
        if (!existingIds.has(j.id)) {
          jobsData.push(j);
        } else {
          const idx = jobsData.findIndex(x => x.id === j.id);
          if (idx >= 0) jobsData[idx] = j;
        }
      });
    }
    renderJobs('all');
  }

  // ============================================
  // Header scroll
  // ============================================
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 50);
  });

  // ============================================
  // Mobile menu
  // ============================================
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileNav = document.getElementById('mobileNav');

  mobileMenuBtn.addEventListener('click', () => {
    mobileNav.classList.toggle('active');
  });

  // Close mobile nav on link click
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      mobileNav.classList.remove('active');
    });
  });

  // ============================================
  // Render Jobs
  // ============================================
  function renderJobs(filter) {
    const list = document.getElementById('jobsList');
    const filtered = filter === 'all'
      ? jobsData
      : jobsData.filter(j => j.category === filter);

    if (filtered.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#8C95A1;">해당 카테고리의 채용공고가 없습니다.</div>';
      return;
    }

    list.innerHTML = filtered.map(job => {
      const isNewGrad = job.type === '신입';
      const badgeClass = isNewGrad ? 'new-grad' : 'ongoing';
      const badgeText = isNewGrad ? '신입공채' : '진행중';
      const daysLeft = Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      const deadlineText = daysLeft > 0 ? `D-${daysLeft}` : '마감';

      return `
        <div class="job-card" data-id="${job.id}">
          <div class="job-info">
            <h3>${job.title}</h3>
            <div class="job-meta">
              <span>${job.department}</span>
              <span>${job.type}</span>
              <span>${job.location}</span>
              <span>${job.experience}</span>
              <span>${deadlineText}</span>
            </div>
          </div>
          <span class="job-badge ${badgeClass}">${badgeText}</span>
        </div>
      `;
    }).join('');

    // Add click handlers
    list.querySelectorAll('.job-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.id);
        openJobModal(id);
      });
    });
  }

  // ============================================
  // Filter buttons
  // ============================================
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderJobs(btn.dataset.filter);
    });
  });

  // ============================================
  // Job Detail Modal
  // ============================================
  const jobModal = document.getElementById('jobModal');
  const modalBody = document.getElementById('modalBody');
  const modalClose = document.getElementById('modalClose');

  function openJobModal(id) {
    const job = jobsData.find(j => j.id === id);
    if (!job) return;

    modalBody.innerHTML = `
      <h2 class="modal-title">${job.title}</h2>
      <p class="modal-subtitle">${job.department}</p>
      <div class="modal-meta">
        <div class="modal-meta-item">
          <span class="modal-meta-label">고용형태</span>
          <span class="modal-meta-value">${job.type}</span>
        </div>
        <div class="modal-meta-item">
          <span class="modal-meta-label">근무지</span>
          <span class="modal-meta-value">${job.location}</span>
        </div>
        <div class="modal-meta-item">
          <span class="modal-meta-label">경력</span>
          <span class="modal-meta-value">${job.experience}</span>
        </div>
        <div class="modal-meta-item">
          <span class="modal-meta-label">마감일</span>
          <span class="modal-meta-value">${job.deadline}</span>
        </div>
      </div>
      <div class="modal-section">
        <h4>직무 소개</h4>
        <p>${job.description}</p>
      </div>
      <div class="modal-section">
        <h4>자격 요건</h4>
        <ul>${(job.requirements || []).map(r => `<li>${r}</li>`).join('')}</ul>
      </div>
      <div class="modal-section">
        <h4>우대 사항</h4>
        <ul>${(job.preferred || []).map(p => `<li>${p}</li>`).join('')}</ul>
      </div>
      <div class="modal-actions">
        <button class="btn btn-primary btn-full" onclick="window.openApplyModal(${job.id})">지원하기</button>
      </div>
    `;

    jobModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  modalClose.addEventListener('click', () => {
    jobModal.classList.remove('active');
    document.body.style.overflow = '';
  });

  jobModal.addEventListener('click', (e) => {
    if (e.target === jobModal) {
      jobModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // ============================================
  // Apply Modal
  // ============================================
  const applyModal = document.getElementById('applyModal');
  const applyModalClose = document.getElementById('applyModalClose');
  const applyForm = document.getElementById('applyForm');

  window.openApplyModal = function (jobId) {
    const job = jobsData.find(j => j.id === jobId);
    if (!job) return;

    jobModal.classList.remove('active');
    document.getElementById('applyJobTitle').textContent = `${job.title} - ${job.department}`;
    document.getElementById('applyJobId').value = jobId;
    applyModal.classList.add('active');
  };

  applyModalClose.addEventListener('click', () => {
    applyModal.classList.remove('active');
    document.body.style.overflow = '';
  });

  applyModal.addEventListener('click', (e) => {
    if (e.target === applyModal) {
      applyModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  applyForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const application = {
      id: Date.now(),
      jobId: parseInt(document.getElementById('applyJobId').value),
      name: document.getElementById('applicantName').value,
      email: document.getElementById('applicantEmail').value,
      phone: document.getElementById('applicantPhone').value,
      experience: document.getElementById('applicantExperience').value,
      motivation: document.getElementById('applicantMotivation').value,
      appliedAt: new Date().toISOString(),
      status: '서류검토중'
    };

    // Save to localStorage
    const applications = JSON.parse(localStorage.getItem('haev_applications') || '[]');
    applications.push(application);
    localStorage.setItem('haev_applications', JSON.stringify(applications));

    applyModal.classList.remove('active');
    document.body.style.overflow = '';
    applyForm.reset();

    showToast('지원이 완료되었습니다. 결과는 이메일로 안내드리겠습니다.');
  });

  // ============================================
  // FAQ Accordion
  // ============================================
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const answer = item.querySelector('.faq-answer');
      const isOpen = item.classList.contains('active');

      // Close all
      document.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('active');
        i.querySelector('.faq-answer').style.maxHeight = null;
      });

      // Open clicked
      if (!isOpen) {
        item.classList.add('active');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });

  // ============================================
  // Toast
  // ============================================
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
  }

  // ============================================
  // Smooth scroll for anchor links
  // ============================================
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        const offset = 80;
        const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    });
  });

  // ============================================
  // Init
  // ============================================
  loadJobs();
})();
