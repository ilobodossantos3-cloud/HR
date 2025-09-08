/* FileName: script.js */
// Master credentials (hardcoded, not saved)
const MASTER_USER = 'master';
const MASTER_PASS = 'master123';

let isMasterMode = false;

function getData(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
function setData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
    document.getElementById(id).classList.add('fade-in');
    if (id === 'dashboard') updateDashboard();
}

function forgotPassword() {
    isMasterMode = true;
    document.getElementById('login-title').textContent = 'Login Master';
    document.getElementById('username-label').textContent = 'Usuário Master';
    document.getElementById('password-label').textContent = 'Senha Master';
    document.getElementById('login-username').placeholder = 'Digite o usuário master';
    document.getElementById('login-button').textContent = 'Entrar como Master';
}

function resetLoginForm() {
    isMasterMode = false;
    document.getElementById('login-title').textContent = 'Login';
    document.getElementById('username-label').textContent = 'Usuário';
    document.getElementById('password-label').textContent = 'Senha';
    document.getElementById('login-username').placeholder = 'Digite o usuário';
    document.getElementById('login-button').textContent = 'Entrar';
}

let inactivityTimeout;
let warningTimeout;

function startInactivityTimer() {
    clearTimeout(inactivityTimeout);
    clearTimeout(warningTimeout);
    warningTimeout = setTimeout(() => {
        alert('Atenção: Sessão expirará em 10 segundos por inatividade.');
    }, 20000); // Warning at 20 seconds
    inactivityTimeout = setTimeout(() => {
        alert('Sessão expirada por inatividade. Voltando para a página de login.');
        logout();
    }, 30000); // 30 seconds
}

function resetInactivityTimer() {
    if (document.getElementById('main-nav').style.display === 'flex') {
        startInactivityTimer();
    }
}

document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keydown', resetInactivityTimer);
document.addEventListener('click', resetInactivityTimer);

document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const user = document.getElementById('login-username').value;
    const pass = document.getElementById('login-password').value;

    if (isMasterMode) {
        if (user === MASTER_USER && pass === MASTER_PASS) {
            document.getElementById('login').style.display = 'none';
            document.getElementById('main-nav').style.display = 'flex';
            document.getElementById('footer').style.display = 'block';
            showSection('dashboard');
            alert('Logado como Master. Você tem acesso completo.');
            startInactivityTimer();
        } else {
            alert('Credenciais master inválidas.');
        }
    } else {
        if (user === 'admin' && pass === '1234') {
            document.getElementById('login').style.display = 'none';
            document.getElementById('main-nav').style.display = 'flex';
            document.getElementById('footer').style.display = 'block';
            showSection('dashboard');
            startInactivityTimer();
        } else {
            alert('Credenciais inválidas.');
        }
    }
});

function logout() {
    document.getElementById('main-nav').style.display = 'none';
    document.getElementById('footer').style.display = 'none';
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    document.getElementById('login').style.display = 'block';
    resetLoginForm();
}

// Employee Management
const employeeForm = document.getElementById('employee-form');
const employeeTable = document.getElementById('employee-table');
let editingEmployee = null;

function renderEmployees() {
    employeeTable.innerHTML = '';
    const employees = getData('employees');
    employees.forEach((emp, idx) => {
        const row = employeeTable.insertRow();
        row.insertCell().textContent = emp.name;
        row.insertCell().textContent = emp.cpf;
        row.insertCell().textContent = emp.email;
        row.insertCell().textContent = emp.position || 'N/A';
        const actions = row.insertCell();
        actions.innerHTML = `<button onclick="editEmployee(${idx})" class="btn-primary mr-2">Editar</button><button onclick="deleteEmployee(${idx})" class="btn-logout">Excluir</button>`;
    });
}

employeeForm.addEventListener('submit', e => {
    e.preventDefault();
    const emp = {
        name: document.getElementById('emp-name').value,
        cpf: document.getElementById('emp-cpf').value,
        email: document.getElementById('emp-email').value,
        phone: document.getElementById('emp-phone').value,
        position: document.getElementById('emp-position').value,
        salary: document.getElementById('emp-salary').value,
        dept: document.getElementById('emp-dept').value,
        hire: document.getElementById('emp-hire').value,
        status: document.getElementById('emp-status').value
    };
    const employees = getData('employees');
    if (editingEmployee !== null) {
        employees[editingEmployee] = emp;
        editingEmployee = null;
    } else {
        employees.push(emp);
    }
    setData('employees', employees);
    renderEmployees();
    employeeForm.reset();
    updateDashboard();
});

function editEmployee(index) {
    const employees = getData('employees');
    const emp = employees[index];
    document.getElementById('emp-name').value = emp.name;
    document.getElementById('emp-cpf').value = emp.cpf;
    document.getElementById('emp-email').value = emp.email;
    document.getElementById('emp-phone').value = emp.phone;
    document.getElementById('emp-position').value = emp.position;
    document.getElementById('emp-salary').value = emp.salary;
    document.getElementById('emp-dept').value = emp.dept;
    document.getElementById('emp-hire').value = emp.hire;
    document.getElementById('emp-status').value = emp.status;
    editingEmployee = index;
}

function deleteEmployee(index) {
    const password = prompt('Digite a senha para confirmar a exclusão:');
    if (password === '1234' || password === MASTER_PASS) {
        const employees = getData('employees');
        employees.splice(index, 1);
        setData('employees', employees);
        renderEmployees();
        updateDashboard();
    } else {
        alert('Senha incorreta. Exclusão cancelada.');
    }
}

renderEmployees();

// Recruitment
const vacancyForm = document.getElementById('vacancy-form');
const candidateForm = document.getElementById('candidate-form');
const candidateTable = document.getElementById('candidate-table');

vacancyForm.addEventListener('submit', e => {
    e.preventDefault();
    const vac = {
        title: document.getElementById('vac-title').value,
        desc: document.getElementById('vac-desc').value,
        req: document.getElementById('vac-req').value,
        closing: document.getElementById('vac-closing').value
    };
    const vacancies = getData('vacancies');
    vacancies.push(vac);
    setData('vacancies', vacancies);
    vacancyForm.reset();
});

candidateForm.addEventListener('submit', e => {
    e.preventDefault();
    const cand = {
        name: document.getElementById('cand-name').value,
        email: document.getElementById('cand-email').value,
        resume: document.getElementById('cand-resume').value,
        status: document.getElementById('cand-status').value
    };
    const candidates = getData('candidates');
    candidates.push(cand);
    setData('candidates', candidates);
    renderCandidates();
});

function renderCandidates() {
    candidateTable.innerHTML = '';
    const candidates = getData('candidates');
    candidates.forEach(cand => {
        const row = candidateTable.insertRow();
        row.insertCell().textContent = cand.name;
        row.insertCell().textContent = cand.email;
        row.insertCell().textContent = cand.status;
    });
}

renderCandidates();

// Time Tracking
const timeForm = document.getElementById('time-form');
const timeTable = document.getElementById('time-table');

timeForm.addEventListener('submit', e => {
    e.preventDefault();
    const timeEntry = {
        date: document.getElementById('time-date').value,
        in: document.getElementById('time-in').value,
        out: document.getElementById('time-out').value,
        hours: calculateHours(document.getElementById('time-in').value, document.getElementById('time-out').value),
        notes: document.getElementById('time-notes').value
    };
    const timeEntries = getData('timeTracking');
    timeEntries.push(timeEntry);
    setData('timeTracking', timeEntries);
    renderTimeEntries();
});

function calculateHours(inTime, outTime) {
    if (!inTime || !outTime) return 0;
    const inMinutes = timeToMinutes(inTime);
    const outMinutes = timeToMinutes(outTime);
    return ((outMinutes - inMinutes) / 60).toFixed(2);
}

function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function renderTimeEntries() {
    timeTable.innerHTML = '';
    const timeEntries = getData('timeTracking');
    timeEntries.forEach(entry => {
        const row = timeTable.insertRow();
        row.insertCell().textContent = entry.date;
        row.insertCell().textContent = entry.in;
        row.insertCell().textContent = entry.out;
        row.insertCell().textContent = entry.hours;
        row.insertCell().textContent = entry.notes;
    });
}

renderTimeEntries();

// Performance
const performanceForm = document.getElementById('performance-form');
const performanceTable = document.getElementById('performance-table');

performanceForm.addEventListener('submit', e => {
    e.preventDefault();
    const perf = {
        emp: document.getElementById('perf-emp').value,
        evaluator: document.getElementById('perf-eval').value,
        period: document.getElementById('perf-period').value,
        score: document.getElementById('perf-skills').value,
        comments: document.getElementById('perf-comments').value
    };
    const performances = getData('performances');
    performances.push(perf);
    setData('performances', performances);
    renderPerformances();
});

function renderPerformances() {
    performanceTable.innerHTML = '';
    const performances = getData('performances');
    performances.forEach(perf => {
        const row = performanceTable.insertRow();
        row.insertCell().textContent = perf.emp;
        row.insertCell().textContent = perf.evaluator;
        row.insertCell().textContent = perf.period;
        row.insertCell().textContent = perf.score;
    });
}

renderPerformances();

// Training
const trainingForm = document.getElementById('training-form');
const enrollForm = document.getElementById('enroll-form');
const trainingTable = document.getElementById('training-table');

trainingForm.addEventListener('submit', e => {
    e.preventDefault();
    const train = {
        title: document.getElementById('train-title').value,
        desc: document.getElementById('train-desc').value,
        type: document.getElementById('train-type').value,
        end: document.getElementById('train-end').value,
        enrolled: []
    };
    const trainings = getData('trainings');
    trainings.push(train);
    setData('trainings', trainings);
    renderTrainings();
    updateDashboard();
});

enrollForm.addEventListener('submit', e => {
    e.preventDefault();
    const emp = document.getElementById('enroll-emp').value;
    const trainTitle = document.getElementById('enroll-train').value;
    const trainings = getData('trainings');
    const training = trainings.find(t => t.title === trainTitle);
    if (training && !training.enrolled.includes(emp)) {
        training.enrolled.push(emp);
        setData('trainings', trainings);
        renderTrainings();
    } else {
        alert('Funcionário já inscrito ou treinamento não encontrado.');
    }
});

function renderTrainings() {
    trainingTable.innerHTML = '';
    const trainings = getData('trainings');
    trainings.forEach(train => {
        const row = trainingTable.insertRow();
        row.insertCell().textContent = train.title;
        row.insertCell().textContent = train.type;
        row.insertCell().textContent = train.enrolled.join(', ');
    });
}

renderTrainings();

// Dashboard Update
function updateDashboard() {
    const employees = getData('employees');
    const trainings = getData('trainings');
    document.getElementById('kpi-employees').textContent = employees.length;
    document.getElementById('kpi-turnover').textContent = Math.floor(Math.random() * 10) + '%';
    document.getElementById('kpi-trainings').textContent = trainings.length;
    // Simple Chart
    const canvas = document.getElementById('kpi-chart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#646cff';
    ctx.fillRect(50, 100, 50, -employees.length * 10);
    ctx.fillText(`Funcionários: ${employees.length}`, 20, 150);
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(150, 100, 50, -trainings.length * 10);
    ctx.fillText(`Treinamentos: ${trainings.length}`, 120, 150);
}

// Reports
function generateReport() {
    const employees = getData('employees');
    const activeEmployees = employees.filter(e => e.status === 'Ativo').length;
    const inactiveEmployees = employees.filter(e => e.status === 'Inativo').length;
    const totalSalary = employees.reduce((sum, e) => sum + parseFloat(e.salary || 0), 0);
    const avgSalary = totalSalary / employees.length || 0;
    const trainings = getData('trainings');

    document.getElementById('report-emp').textContent = employees.length;
    document.getElementById('report-active').textContent = activeEmployees;
    document.getElementById('report-inactive').textContent = inactiveEmployees;
    document.getElementById('report-turnover').textContent = '5% (Simulado)';
    document.getElementById('report-salary').textContent = avgSalary.toFixed(2);
    document.getElementById('report-trainings').textContent = trainings.length;

    // Chart
    const canvas = document.getElementById('report-chart');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Simple bar for employees
    ctx.fillStyle = '#646cff';
    ctx.fillRect(20, 280 - (employees.length * 20), 40, employees.length * 20);
    ctx.fillText('Funcionários', 10, 300);
    // Simple bar for trainings
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(80, 280 - (trainings.length * 20), 40, trainings.length * 20);
    ctx.fillText('Treinamentos', 70, 300);
}

// Initial load
showSection('login');
