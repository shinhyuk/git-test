/**
 * Hyundai AutoEver Careers - Admin Dashboard JavaScript
 */

(function () {
  'use strict';

  // ============================================
  // Auth
  // ============================================
  const loginScreen = document.getElementById('loginScreen');
  const adminLayout = document.getElementById('adminLayout');
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');

  function checkAuth() {
    if (sessionStorage.getItem('haev_admin_auth')) {
      loginScreen.style.display = 'none';
      adminLayout.style.display = 'flex';
      initDashboard();
    }
  }

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('loginId').value;
    const pw = document.getElementById('loginPw').value;
    if (id === 'admin' && pw === 'admin') {
      sessionStorage.setItem('haev_admin_auth', 'true');
      loginScreen.style.display = 'none';
      adminLayout.style.display = 'flex';
      initDashboard();
    } else {
      showToast('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('haev_admin_auth');
    loginScreen.style.display = 'flex';
    adminLayout.style.display = 'none';
  });

  // ============================================
  // Data Management
  // ============================================
  let jobs = [];
  let applications = [];

  async function loadData() {
    // Load jobs from JSON, then merge admin changes
    try {
      const res = await fetch('data/jobs.json');
      jobs = await res.json();
    } catch {
      jobs = [];
    }

    const adminJobs = JSON.parse(localStorage.getItem('haev_jobs_admin') || '[]');
    if (adminJobs.length) {
      const existingIds = new Set(jobs.map(j => j.id));
      adminJobs.forEach(j => {
        if (!existingIds.has(j.id)) {
          jobs.push(j);
        } else {
          const idx = jobs.findIndex(x => x.id === j.id);
          if (idx >= 0) jobs[idx] = j;
        }
      });
    }

    // Check for deleted jobs
    const deletedIds = JSON.parse(localStorage.getItem('haev_jobs_deleted') || '[]');
    jobs = jobs.filter(j => !deletedIds.includes(j.id));

    applications = JSON.parse(localStorage.getItem('haev_applications') || '[]');
  }

  function saveJobs() {
    localStorage.setItem('haev_jobs_admin', JSON.stringify(jobs));
  }

  // ============================================
  // Navigation
  // ============================================
  const sidebarLinks = document.querySelectorAll('.sidebar-link[data-page]');
  const pageTitle = document.getElementById('pageTitle');
  const adminContent = document.getElementById('adminContent');

  const pageTitles = {
    dashboard: '대시보드',
    jobs: '채용공고 관리',
    applicants: '지원자 관리',
    stats: '통계'
  };

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      sidebarLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      pageTitle.textContent = pageTitles[page];
      renderPage(page);
    });
  });

  function renderPage(page) {
    switch (page) {
      case 'dashboard': renderDashboard(); break;
      case 'jobs': renderJobs(); break;
      case 'applicants': renderApplicants(); break;
      case 'stats': renderStats(); break;
    }
  }

  // ============================================
  // Dashboard
  // ============================================
  function renderDashboard() {
    const activeJobs = jobs.filter(j => j.status === '진행중').length;
    const totalApps = applications.length;
    const reviewingApps = applications.filter(a => a.status === '서류검토중').length;

    adminContent.innerHTML = `
      <div class="dashboard-stats">
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon blue">📋</div>
          </div>
          <div class="stat-card-value">${jobs.length}</div>
          <div class="stat-card-label">전체 채용공고</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon green">✅</div>
          </div>
          <div class="stat-card-value">${activeJobs}</div>
          <div class="stat-card-label">진행중 공고</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon orange">👤</div>
          </div>
          <div class="stat-card-value">${totalApps}</div>
          <div class="stat-card-label">총 지원자</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-header">
            <div class="stat-card-icon purple">📝</div>
          </div>
          <div class="stat-card-value">${reviewingApps}</div>
          <div class="stat-card-label">검토 대기</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div class="card">
          <div class="card-header">
            <h3>최근 채용공고</h3>
          </div>
          <div class="card-body">
            <table class="data-table">
              <thead>
                <tr>
                  <th>공고명</th>
                  <th>마감일</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                ${jobs.slice(0, 5).map(j => `
                  <tr>
                    <td>${j.title}</td>
                    <td>${j.deadline}</td>
                    <td><span class="badge ${j.status === '진행중' ? 'badge-green' : 'badge-gray'}">${j.status}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>최근 지원자</h3>
          </div>
          <div class="card-body">
            ${applications.length === 0
              ? '<div class="empty-state"><p>아직 지원자가 없습니다.</p></div>'
              : `<table class="data-table">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>지원일</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${applications.slice(-5).reverse().map(a => `
                      <tr>
                        <td>${a.name}</td>
                        <td>${new Date(a.appliedAt).toLocaleDateString('ko-KR')}</td>
                        <td><span class="badge badge-blue">${a.status}</span></td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>`
            }
          </div>
        </div>
      </div>
    `;
  }

  // ============================================
  // Jobs Management
  // ============================================
  function renderJobs() {
    adminContent.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>채용공고 목록 (${jobs.length}건)</h3>
          <button class="btn btn-primary btn-sm" id="addJobBtn">+ 공고 등록</button>
        </div>
        <div class="card-body">
          ${jobs.length === 0
            ? '<div class="empty-state"><p>등록된 채용공고가 없습니다.</p></div>'
            : `<table class="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>공고명</th>
                    <th>부서</th>
                    <th>유형</th>
                    <th>마감일</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  ${jobs.map(j => `
                    <tr>
                      <td>${j.id}</td>
                      <td><strong>${j.title}</strong></td>
                      <td>${j.department}</td>
                      <td><span class="badge ${j.type === '신입' ? 'badge-green' : 'badge-blue'}">${j.type}</span></td>
                      <td>${j.deadline}</td>
                      <td><span class="badge ${j.status === '진행중' ? 'badge-green' : 'badge-gray'}">${j.status}</span></td>
                      <td>
                        <div class="actions-cell">
                          <button class="btn-icon edit-job-btn" data-id="${j.id}" title="수정">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="2"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="2"/></svg>
                          </button>
                          <button class="btn-icon delete-job-btn" data-id="${j.id}" title="삭제">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" stroke-width="2"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>`
          }
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('addJobBtn')?.addEventListener('click', () => openJobForm());

    document.querySelectorAll('.edit-job-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        openJobForm(id);
      });
    });

    document.querySelectorAll('.delete-job-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        if (confirm('이 채용공고를 삭제하시겠습니까?')) {
          jobs = jobs.filter(j => j.id !== id);
          const deletedIds = JSON.parse(localStorage.getItem('haev_jobs_deleted') || '[]');
          deletedIds.push(id);
          localStorage.setItem('haev_jobs_deleted', JSON.stringify(deletedIds));
          saveJobs();
          renderJobs();
          showToast('채용공고가 삭제되었습니다.');
        }
      });
    });
  }

  // ============================================
  // Job Form Modal
  // ============================================
  const jobFormModal = document.getElementById('jobFormModal');
  const jobForm = document.getElementById('jobForm');
  const jobFormClose = document.getElementById('jobFormClose');

  jobFormClose.addEventListener('click', () => {
    jobFormModal.classList.remove('active');
  });

  function openJobForm(editId) {
    const isEdit = editId !== undefined;
    document.getElementById('jobFormTitle').textContent = isEdit ? '채용공고 수정' : '채용공고 등록';

    if (isEdit) {
      const job = jobs.find(j => j.id === editId);
      if (!job) return;
      document.getElementById('editJobId').value = job.id;
      document.getElementById('jobTitle').value = job.title;
      document.getElementById('jobDept').value = job.department;
      document.getElementById('jobType').value = job.type;
      document.getElementById('jobCategory').value = job.category;
      document.getElementById('jobLocation').value = job.location;
      document.getElementById('jobExperience').value = job.experience || '';
      document.getElementById('jobDeadline').value = job.deadline;
      document.getElementById('jobStatus').value = job.status;
      document.getElementById('jobDesc').value = job.description;
      document.getElementById('jobReqs').value = (job.requirements || []).join('\n');
      document.getElementById('jobPreferred').value = (job.preferred || []).join('\n');
    } else {
      jobForm.reset();
      document.getElementById('editJobId').value = '';
    }

    jobFormModal.classList.add('active');
  }

  jobForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const editId = document.getElementById('editJobId').value;
    const jobData = {
      id: editId ? parseInt(editId) : Date.now(),
      title: document.getElementById('jobTitle').value,
      department: document.getElementById('jobDept').value,
      type: document.getElementById('jobType').value,
      category: document.getElementById('jobCategory').value,
      location: document.getElementById('jobLocation').value,
      experience: document.getElementById('jobExperience').value,
      deadline: document.getElementById('jobDeadline').value,
      status: document.getElementById('jobStatus').value,
      description: document.getElementById('jobDesc').value,
      requirements: document.getElementById('jobReqs').value.split('\n').filter(s => s.trim()),
      preferred: document.getElementById('jobPreferred').value.split('\n').filter(s => s.trim())
    };

    if (editId) {
      const idx = jobs.findIndex(j => j.id === parseInt(editId));
      if (idx >= 0) jobs[idx] = jobData;
    } else {
      jobs.push(jobData);
    }

    saveJobs();
    jobFormModal.classList.remove('active');
    renderJobs();
    showToast(editId ? '채용공고가 수정되었습니다.' : '채용공고가 등록되었습니다.');
  });

  // ============================================
  // Applicants Management
  // ============================================
  function renderApplicants() {
    const statusOptions = ['서류검토중', '서류합격', '코딩테스트', '면접진행', '최종합격', '불합격'];

    adminContent.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3>지원자 목록 (${applications.length}명)</h3>
        </div>
        <div class="card-body">
          ${applications.length === 0
            ? '<div class="empty-state"><p>아직 지원자가 없습니다.<br>채용 사이트에서 지원서를 제출하면 여기에 표시됩니다.</p></div>'
            : `<table class="data-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    <th>이메일</th>
                    <th>지원 공고</th>
                    <th>지원일</th>
                    <th>상태</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  ${applications.map(a => {
                    const job = jobs.find(j => j.id === a.jobId);
                    return `
                      <tr>
                        <td><strong>${a.name}</strong></td>
                        <td>${a.email}</td>
                        <td>${job ? job.title : '(삭제된 공고)'}</td>
                        <td>${new Date(a.appliedAt).toLocaleDateString('ko-KR')}</td>
                        <td>
                          <select class="status-select" data-app-id="${a.id}">
                            ${statusOptions.map(s => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                          </select>
                        </td>
                        <td>
                          <div class="actions-cell">
                            <button class="btn-icon view-applicant-btn" data-app-id="${a.id}" title="상세보기">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/></svg>
                            </button>
                            <button class="btn-icon delete-applicant-btn" data-app-id="${a.id}" title="삭제">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="currentColor" stroke-width="2"/></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>`
          }
        </div>
      </div>
    `;

    // Status change
    document.querySelectorAll('.status-select').forEach(select => {
      select.addEventListener('change', () => {
        const appId = parseInt(select.dataset.appId);
        const app = applications.find(a => a.id === appId);
        if (app) {
          app.status = select.value;
          localStorage.setItem('haev_applications', JSON.stringify(applications));
          showToast('상태가 변경되었습니다.');
        }
      });
    });

    // View detail
    document.querySelectorAll('.view-applicant-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const appId = parseInt(btn.dataset.appId);
        openApplicantDetail(appId);
      });
    });

    // Delete
    document.querySelectorAll('.delete-applicant-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const appId = parseInt(btn.dataset.appId);
        if (confirm('이 지원자를 삭제하시겠습니까?')) {
          applications = applications.filter(a => a.id !== appId);
          localStorage.setItem('haev_applications', JSON.stringify(applications));
          renderApplicants();
          showToast('지원자가 삭제되었습니다.');
        }
      });
    });
  }

  // ============================================
  // Applicant Detail Modal
  // ============================================
  const applicantModal = document.getElementById('applicantModal');
  const applicantModalClose = document.getElementById('applicantModalClose');
  const applicantDetail = document.getElementById('applicantDetail');

  applicantModalClose.addEventListener('click', () => {
    applicantModal.classList.remove('active');
  });

  applicantModal.addEventListener('click', (e) => {
    if (e.target === applicantModal) applicantModal.classList.remove('active');
  });

  function openApplicantDetail(appId) {
    const app = applications.find(a => a.id === appId);
    if (!app) return;
    const job = jobs.find(j => j.id === app.jobId);

    applicantDetail.innerHTML = `
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">이름</span>
          <span class="detail-value">${app.name}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">이메일</span>
          <span class="detail-value">${app.email}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">연락처</span>
          <span class="detail-value">${app.phone}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">지원 공고</span>
          <span class="detail-value">${job ? job.title : '(삭제된 공고)'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">지원일</span>
          <span class="detail-value">${new Date(app.appliedAt).toLocaleString('ko-KR')}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">현재 상태</span>
          <span class="detail-value">${app.status}</span>
        </div>
      </div>
      ${app.experience ? `
        <div class="detail-section">
          <h4>경력사항</h4>
          <p>${app.experience}</p>
        </div>
      ` : ''}
      <div class="detail-section">
        <h4>지원동기</h4>
        <p>${app.motivation}</p>
      </div>
    `;

    applicantModal.classList.add('active');
  }

  // ============================================
  // Stats
  // ============================================
  function renderStats() {
    const categoryCounts = {};
    jobs.forEach(j => {
      categoryCounts[j.category] = (categoryCounts[j.category] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(categoryCounts), 1);

    const appsByJob = {};
    applications.forEach(a => {
      appsByJob[a.jobId] = (appsByJob[a.jobId] || 0) + 1;
    });

    const statusCounts = {};
    applications.forEach(a => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });

    adminContent.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div class="card">
          <div class="card-header">
            <h3>카테고리별 공고 수</h3>
          </div>
          <div class="chart-container">
            <div class="chart-bar-group">
              ${Object.entries(categoryCounts).map(([cat, count]) => `
                <div class="chart-bar-item">
                  <span class="chart-bar-label">${cat}</span>
                  <div class="chart-bar-track">
                    <div class="chart-bar-fill" style="width:${(count / maxCount) * 100}%">${count}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>지원자 상태 분포</h3>
          </div>
          <div class="chart-container">
            ${Object.keys(statusCounts).length === 0
              ? '<div class="empty-state"><p>아직 지원자 데이터가 없습니다.</p></div>'
              : `<div class="chart-bar-group">
                  ${Object.entries(statusCounts).map(([status, count]) => `
                    <div class="chart-bar-item">
                      <span class="chart-bar-label">${status}</span>
                      <div class="chart-bar-track">
                        <div class="chart-bar-fill" style="width:${(count / Math.max(...Object.values(statusCounts))) * 100}%">${count}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>`
            }
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:24px;">
        <div class="card-header">
          <h3>공고별 지원 현황</h3>
        </div>
        <div class="card-body">
          <table class="data-table">
            <thead>
              <tr>
                <th>공고명</th>
                <th>부서</th>
                <th>카테고리</th>
                <th>지원자 수</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              ${jobs.map(j => `
                <tr>
                  <td><strong>${j.title}</strong></td>
                  <td>${j.department}</td>
                  <td>${j.category}</td>
                  <td>${appsByJob[j.id] || 0}명</td>
                  <td><span class="badge ${j.status === '진행중' ? 'badge-green' : 'badge-gray'}">${j.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

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
  // Init
  // ============================================
  async function initDashboard() {
    await loadData();
    renderDashboard();
  }

  checkAuth();
})();
