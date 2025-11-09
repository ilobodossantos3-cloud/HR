/* FileName: script.js - Sistema de Gestão de RH - Versão Modularizada */

// ==================== MÓDULO DE ARMAZENAMENTO ====================
const StorageManager = {
    get(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch (e) {
            console.error('Erro ao ler dados:', e);
            return [];
        }
    },
    
    set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Erro ao salvar dados:', e);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Erro ao remover dados:', e);
            return false;
        }
    },
    
    clear() {
        localStorage.clear();
    },

    // Novos helpers para Employees
    getEmployees() {
        return this.get('employees') || [];
    },

    setEmployees(list) {
        return this.set('employees', list || []);
    },

    getEmployeeById(id) {
        const emps = this.getEmployees();
        return emps.find(e => e.id === id || e.id === String(id)) || null;
    },

    saveEmployee(emp) {
        const emps = this.getEmployees();
        const idx = emps.findIndex(e => e.id === emp.id);
        if (idx >= 0) emps[idx] = emp;
        else emps.push(emp);
        this.setEmployees(emps);
        return emp;
    },

    ensureEmployeeSchema(emp) {
        emp.id = emp.id || ('emp_' + Date.now());
        emp.documents = emp.documents || [];
        emp.processes = emp.processes || [];
        emp.timeEntries = emp.timeEntries || [];
        return emp;
    }
};


// ==================== MÓDULO DE SEGURANÇA ====================
const SecurityManager = {
    // Hash simples de senha (em produção, usar bcrypt ou similar)
    hashPassword(password) {
        let hash = 0;
        if (password.length === 0) return hash.toString();
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(16);
    },
    
    // Verifica senha
    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    },
    
    // Inicializa usuários padrão se não existirem
    initializeUsers() {
        const users = StorageManager.get('users');
        if (users.length === 0) {
            const defaultUsers = [
                {
                    username: 'admin',
                    passwordHash: this.hashPassword('1234'),
                    role: 'admin',
                    createdAt: new Date().toISOString()
                },
                {
                    username: 'master',
                    passwordHash: this.hashPassword('master123'),
                    role: 'master',
                    createdAt: new Date().toISOString()
                }
            ];
            StorageManager.set('users', defaultUsers);
        }
    },
    
    // Autentica usuário
    authenticate(username, password) {
        const users = StorageManager.get('users');
        const user = users.find(u => u.username === username);
        
        if (!user) return null;
        
        if (this.verifyPassword(password, user.passwordHash)) {
            return {
                username: user.username,
                role: user.role
            };
        }
        
        return null;
    },
    
    // Cria novo usuário
    createUser(username, password, role = 'admin') {
        const users = StorageManager.get('users');
        
        if (users.find(u => u.username === username)) {
            return { success: false, message: 'Usuário já existe' };
        }
        
        users.push({
            username,
            passwordHash: this.hashPassword(password),
            role,
            createdAt: new Date().toISOString()
        });
        
        StorageManager.set('users', users);
        return { success: true, message: 'Usuário criado com sucesso' };
    }
};

// ==================== MÓDULO DE VALIDAÇÃO ====================
const ValidationManager = {
    validateCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        if (cpf.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cpf)) return false;
        
        let sum = 0;
        let remainder;
        
        for (let i = 1; i <= 9; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(9, 10))) return false;
        
        sum = 0;
        for (let i = 1; i <= 10; i++) {
            sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cpf.substring(10, 11))) return false;
        
        return true;
    },
    
    formatCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },
    
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    validatePhone(phone) {
        const cleanPhone = phone.replace(/[^\d]/g, '');
        return cleanPhone.length >= 10 && cleanPhone.length <= 11;
    },
    
    formatPhone(phone) {
        const cleanPhone = phone.replace(/[^\d]/g, '');
        if (cleanPhone.length === 10) {
            return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        } else if (cleanPhone.length === 11) {
            return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    },
    
    validateDate(dateString, allowFuture = false) {
        if (!dateString) return false;
        const date = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (isNaN(date.getTime())) return false;
        if (!allowFuture && date > today) return false;
        return true;
    },
    
    validateDateRange(startDate, endDate) {
        if (!startDate || !endDate) return true;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
        return end >= start;
    }
};

// ==================== MÓDULO DE UI ====================
const UIManager = {
    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'toast-message';
        messageDiv.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => toast.remove();
        
        toast.appendChild(messageDiv);
        toast.appendChild(closeBtn);
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },
    
    showLoading() {
        document.getElementById('loading-overlay').classList.add('show');
    },
    
    hideLoading() {
        document.getElementById('loading-overlay').classList.remove('show');
    },
    
    simulateLoading(callback, delay = 500) {
        this.showLoading();
        setTimeout(() => {
            callback();
            this.hideLoading();
        }, delay);
    },
    
    showSection(id) {
        document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
        const section = document.getElementById(id);
        if (section) {
            section.style.display = 'block';
            section.classList.add('fade-in');
            if (id === 'dashboard') updateDashboard();
            if (id === 'time-tracking') {
                populateEmployeeSelects();
                renderTimeEntries();
                renderLatenessChart();
            }
            if (id === 'disciplinary') {
                populateEmployeeSelects();
                renderDisciplinaryProcesses();
            }
            if (id === 'reports') {
                setTimeout(() => {
                    if (reportChart) reportChart.destroy();
                    generateReport();
                }, 100);
            }
        }
    },
    
    clearFormErrors(formId) {
        const form = document.getElementById(formId);
        if (form) {
            form.querySelectorAll('[id$="-error"]').forEach(el => {
                el.textContent = '';
                el.classList.remove('text-red-500');
            });
            form.querySelectorAll('input').forEach(input => {
                input.classList.remove('border-red-500', 'border-green-500');
            });
        }
    }
};

// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let isMasterMode = false;
let kpiChart = null;
let reportChart = null;
let currentEmployeeDocuments = [];
let currentCandidateDocuments = [];
let currentProcessDocuments = [];
let editingEmployee = null;
let editingCandidate = null;
let inactivityTimeout;
let warningTimeout;
let latenessChart = null;

// ==================== MÓDULO DE AUTENTICAÇÃO ====================
const AuthManager = {
    login(username, password, isMaster = false) {
        if (isMaster) {
            const result = SecurityManager.authenticate(username, password);
            if (result && result.role === 'master') {
                currentUser = result;
                return { success: true, message: 'Login master realizado com sucesso!' };
            }
            return { success: false, message: 'Credenciais master inválidas.' };
        } else {
            const result = SecurityManager.authenticate(username, password);
            if (result) {
                currentUser = result;
                return { success: true, message: 'Login realizado com sucesso!' };
            }
            return { success: false, message: 'Credenciais inválidas.' };
        }
    },
    
    logout() {
        currentUser = null;
        isMasterMode = false;
        document.getElementById('main-nav').style.display = 'none';
        document.getElementById('footer').style.display = 'none';
        document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
        document.getElementById('login').style.display = 'block';
        this.resetLoginForm();
        UIManager.showToast('Logout realizado com sucesso.', 'info');
    },
    
    resetLoginForm() {
        isMasterMode = false;
        document.getElementById('login-title').textContent = 'Login';
        document.getElementById('username-label').textContent = 'Usuário';
        document.getElementById('password-label').textContent = 'Senha';
        document.getElementById('login-username').placeholder = 'Digite o usuário';
        document.getElementById('login-button').textContent = 'Entrar';
    },
    
    enableMasterMode() {
        isMasterMode = true;
        document.getElementById('login-title').textContent = 'Login Master';
        document.getElementById('username-label').textContent = 'Usuário Master';
        document.getElementById('password-label').textContent = 'Senha Master';
        document.getElementById('login-username').placeholder = 'Digite o usuário master';
        document.getElementById('login-button').textContent = 'Entrar como Master';
    },
    
    startInactivityTimer() {
        clearTimeout(inactivityTimeout);
        clearTimeout(warningTimeout);
        warningTimeout = setTimeout(() => {
            UIManager.showToast('Atenção: Sessão expirará em 10 segundos por inatividade.', 'warning');
        }, 20000);
        inactivityTimeout = setTimeout(() => {
            UIManager.showToast('Sessão expirada por inatividade. Voltando para a página de login.', 'warning');
            this.logout();
        }, 30000);
    },
    
    resetInactivityTimer() {
        if (document.getElementById('main-nav').style.display === 'flex') {
            this.startInactivityTimer();
        }
    }
};

// ==================== MÓDULO DE DOCUMENTOS ====================
const DocumentManager = {
    addEmployeeDocument() {
        const type = document.getElementById('emp-doc-type').value;
        const name = document.getElementById('emp-doc-name').value;
        const fileInput = document.getElementById('emp-doc-file');
        
        if (!type || !name || !fileInput.files[0]) {
            UIManager.showToast('Por favor, preencha todos os campos do documento.', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const document = {
                id: Date.now(),
                type: type,
                name: name,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                data: e.target.result
            };
            
            currentEmployeeDocuments.push(document);
            DocumentManager.renderEmployeeDocuments();
            
            document.getElementById('emp-doc-type').value = '';
            document.getElementById('emp-doc-name').value = '';
            fileInput.value = '';
            
            UIManager.showToast('Documento adicionado com sucesso!', 'success');
        };
        
        reader.readAsDataURL(file);
    },
    
    removeEmployeeDocument(id) {
        currentEmployeeDocuments = currentEmployeeDocuments.filter(doc => doc.id !== id);
        this.renderEmployeeDocuments();
        UIManager.showToast('Documento removido.', 'info');
    },
    
    renderEmployeeDocuments() {
        const container = document.getElementById('employee-documents-list');
        container.innerHTML = '';
        
        if (currentEmployeeDocuments.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">Nenhum documento adicionado ainda.</p>';
            return;
        }
        
        currentEmployeeDocuments.forEach(doc => {
            const div = document.createElement('div');
            div.className = 'document-item';
            div.innerHTML = `
                <div class="document-info">
                    <div class="document-name">${doc.name}</div>
                    <div class="document-type">${doc.type} - ${(doc.fileSize / 1024).toFixed(2)} KB</div>
                </div>
                <div class="document-actions">
                    <button class="btn-document btn-view" onclick="DocumentManager.viewDocument('${doc.data}', '${doc.fileType}')">Visualizar</button>
                    <button class="btn-document btn-remove" onclick="DocumentManager.removeEmployeeDocument(${doc.id})">Remover</button>
                </div>
            `;
            container.appendChild(div);
        });
    },
    
    addCandidateDocument() {
        const type = document.getElementById('cand-doc-type').value;
        const name = document.getElementById('cand-doc-name').value;
        const fileInput = document.getElementById('cand-doc-file');
        
        if (!type || !name || !fileInput.files[0]) {
            UIManager.showToast('Por favor, preencha todos os campos do documento.', 'warning');
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const document = {
                id: Date.now(),
                type: type,
                name: name,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                data: e.target.result
            };
            
            currentCandidateDocuments.push(document);
            DocumentManager.renderCandidateDocuments();
            
            document.getElementById('cand-doc-type').value = '';
            document.getElementById('cand-doc-name').value = '';
            fileInput.value = '';
            
            UIManager.showToast('Documento adicionado com sucesso!', 'success');
        };
        
        reader.readAsDataURL(file);
    },
    
    removeCandidateDocument(id) {
        currentCandidateDocuments = currentCandidateDocuments.filter(doc => doc.id !== id);
        this.renderCandidateDocuments();
        UIManager.showToast('Documento removido.', 'info');
    },
    
    renderCandidateDocuments() {
        const container = document.getElementById('candidate-documents-list');
        container.innerHTML = '';
        
        if (currentCandidateDocuments.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-sm">Nenhum documento adicionado ainda.</p>';
            return;
        }
        
        currentCandidateDocuments.forEach(doc => {
            const div = document.createElement('div');
            div.className = 'document-item';
            div.innerHTML = `
                <div class="document-info">
                    <div class="document-name">${doc.name}</div>
                    <div class="document-type">${doc.type} - ${(doc.fileSize / 1024).toFixed(2)} KB</div>
                </div>
                <div class="document-actions">
                    <button class="btn-document btn-view" onclick="DocumentManager.viewDocument('${doc.data}', '${doc.fileType}')">Visualizar</button>
                    <button class="btn-document btn-remove" onclick="DocumentManager.removeCandidateDocument(${doc.id})">Remover</button>
                </div>
            `;
            container.appendChild(div);
        });
    },
    
    viewDocument(data, fileType) {
        const newWindow = window.open();
        if (fileType.startsWith('image/')) {
            newWindow.document.write(`<img src="${data}" style="max-width:100%;height:auto;">`);
        } else if (fileType === 'application/pdf') {
            newWindow.document.write(`<embed src="${data}" type="application/pdf" width="100%" height="100%">`);
        } else {
            newWindow.document.write(`<p>Visualização não disponível para este tipo de arquivo. <a href="${data}" download>Clique para baixar</a></p>`);
        }
    }
};

// ==================== FUNÇÕES GLOBAIS (para compatibilidade com HTML) ====================
function showSection(id) { UIManager.showSection(id); }
function forgotPassword() { AuthManager.enableMasterMode(); }
function logout() { AuthManager.logout(); }
function addEmployeeDocument() { DocumentManager.addEmployeeDocument(); }
function addCandidateDocument() { DocumentManager.addCandidateDocument(); }
function addProcessDocument() { ProcessManager.addProcessDocument(); }

// ==================== INICIALIZAÇÃO ====================
// Inicializar usuários padrão
SecurityManager.initializeUsers();

// Event Listeners para inatividade
document.addEventListener('mousemove', () => AuthManager.resetInactivityTimer());
document.addEventListener('keydown', () => AuthManager.resetInactivityTimer());
document.addEventListener('click', () => AuthManager.resetInactivityTimer());

// Event Listener para Login
document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    UIManager.simulateLoading(() => {
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;
        
        const result = AuthManager.login(user, pass, isMasterMode);
        
        if (result.success) {
            document.getElementById('login').style.display = 'none';
            document.getElementById('main-nav').style.display = 'flex';
            document.getElementById('footer').style.display = 'block';
            UIManager.showSection('dashboard');
            UIManager.showToast(result.message, 'success');
            AuthManager.startInactivityTimer();
        } else {
            UIManager.showToast(result.message, 'error');
        }
    }, 800);
});

// ==================== GESTÃO DE FUNCIONÁRIOS ====================
const employeeForm = document.getElementById('employee-form');
const employeeTable = document.getElementById('employee-table');

function renderEmployees() {
    employeeTable.innerHTML = '';
    const employees = StorageManager.get('employees');
    employees.forEach((emp, idx) => {
        const row = employeeTable.insertRow();
        row.insertCell().textContent = emp.name;
        const cpfCell = row.insertCell();
        const cpfValue = emp.cpf.replace(/[^\d]/g, '');
        cpfCell.textContent = cpfValue.length === 11 ? ValidationManager.formatCPF(cpfValue) : emp.cpf;
        row.insertCell().textContent = emp.email;
        row.insertCell().textContent = emp.position || 'N/A';
        
        const docCell = row.insertCell();
        const docCount = (emp.documents || []).length;
        docCell.innerHTML = docCount > 0 
            ? `<span class="text-blue-600 font-semibold">${docCount} documento(s)</span>` 
            : '<span class="text-gray-400">Nenhum</span>';
        
        const actions = row.insertCell();
        actions.innerHTML = `
            <button onclick="editEmployee(${idx})" class="btn-primary mr-2">Editar</button>
            <button onclick="deleteEmployee(${idx})" class="btn-logout">Excluir</button>
        `;
    });
}

// Validação em tempo real para CPF
document.getElementById('emp-cpf')?.addEventListener('input', function(e) {
    const cpf = e.target.value.replace(/[^\d]/g, '');
    const formatted = ValidationManager.formatCPF(cpf);
    e.target.value = formatted;
    
    const errorElement = document.getElementById('emp-cpf-error');
    if (cpf.length === 11) {
        if (ValidationManager.validateCPF(cpf)) {
            errorElement.textContent = '';
            e.target.classList.remove('border-red-500');
            e.target.classList.add('border-green-500');
        } else {
            errorElement.textContent = 'CPF inválido';
            errorElement.classList.add('text-red-500');
            errorElement.classList.remove('text-gray-500');
            e.target.classList.remove('border-green-500');
            e.target.classList.add('border-red-500');
        }
    } else if (cpf.length > 0) {
        errorElement.textContent = 'CPF deve ter 11 dígitos';
        errorElement.classList.add('text-red-500');
        errorElement.classList.remove('text-gray-500');
        e.target.classList.add('border-red-500');
    } else {
        errorElement.textContent = '';
        e.target.classList.remove('border-red-500', 'border-green-500');
    }
});

// Validação em tempo real para Email
document.getElementById('emp-email')?.addEventListener('blur', function(e) {
    const email = e.target.value;
    const errorElement = document.getElementById('emp-email-error');
    
    if (email && !ValidationManager.validateEmail(email)) {
        errorElement.textContent = 'E-mail inválido';
        errorElement.classList.add('text-red-500');
        errorElement.classList.remove('text-gray-500');
        e.target.classList.add('border-red-500');
    } else if (email && ValidationManager.validateEmail(email)) {
        errorElement.textContent = '';
        e.target.classList.remove('border-red-500');
        e.target.classList.add('border-green-500');
    } else {
        errorElement.textContent = '';
        e.target.classList.remove('border-red-500', 'border-green-500');
    }
});

// Validação e formatação em tempo real para Telefone
document.getElementById('emp-phone')?.addEventListener('input', function(e) {
    const phone = e.target.value;
    const formatted = ValidationManager.formatPhone(phone);
    e.target.value = formatted;
    
    const errorElement = document.getElementById('emp-phone-error');
    const cleanPhone = phone.replace(/[^\d]/g, '');
    
    if (cleanPhone.length > 0 && cleanPhone.length < 10) {
        errorElement.textContent = 'Telefone deve ter pelo menos 10 dígitos';
        errorElement.classList.add('text-red-500');
        errorElement.classList.remove('text-gray-500');
        e.target.classList.add('border-red-500');
    } else if (cleanPhone.length >= 10 && ValidationManager.validatePhone(phone)) {
        errorElement.textContent = '';
        e.target.classList.remove('border-red-500');
        e.target.classList.add('border-green-500');
    } else if (cleanPhone.length === 0) {
        errorElement.textContent = '';
        e.target.classList.remove('border-red-500', 'border-green-500');
    }
});

// Validação em tempo real para Data de Admissão
document.getElementById('emp-hire')?.addEventListener('change', function(e) {
    const date = e.target.value;
    const errorElement = document.getElementById('emp-hire-error');
    
    if (date && !ValidationManager.validateDate(date, false)) {
        errorElement.textContent = 'Data inválida ou não pode ser futura';
        errorElement.classList.add('text-red-500');
        errorElement.classList.remove('text-gray-500');
        e.target.classList.add('border-red-500');
    } else if (date) {
        errorElement.textContent = '';
        e.target.classList.remove('border-red-500');
        e.target.classList.add('border-green-500');
    } else {
        errorElement.textContent = '';
        e.target.classList.remove('border-red-500', 'border-green-500');
    }
});

employeeForm.addEventListener('submit', e => {
    e.preventDefault();
    
    const cpf = document.getElementById('emp-cpf').value.replace(/[^\d]/g, '');
    const email = document.getElementById('emp-email').value;
    const phone = document.getElementById('emp-phone').value;
    const hireDate = document.getElementById('emp-hire').value;
    
    if (!ValidationManager.validateCPF(cpf)) {
        UIManager.showToast('Por favor, insira um CPF válido.', 'error');
        document.getElementById('emp-cpf').focus();
        return;
    }
    
    if (!ValidationManager.validateEmail(email)) {
        UIManager.showToast('Por favor, insira um e-mail válido.', 'error');
        document.getElementById('emp-email').focus();
        return;
    }
    
    if (phone && !ValidationManager.validatePhone(phone)) {
        UIManager.showToast('Por favor, insira um telefone válido (10 ou 11 dígitos).', 'error');
        document.getElementById('emp-phone').focus();
        return;
    }
    
    if (hireDate && !ValidationManager.validateDate(hireDate, false)) {
        UIManager.showToast('Data de admissão inválida ou não pode ser futura.', 'error');
        document.getElementById('emp-hire').focus();
        return;
    }
    
    UIManager.simulateLoading(() => {
        const emp = {
            name: document.getElementById('emp-name').value,
            cpf: cpf,
            email: email,
            phone: phone,
            position: document.getElementById('emp-position').value,
            salary: document.getElementById('emp-salary').value,
            dept: document.getElementById('emp-dept').value,
            hire: hireDate,
            status: document.getElementById('emp-status').value,
            documents: [...currentEmployeeDocuments]
        };
        
        const employees = StorageManager.get('employees');
        if (editingEmployee !== null) {
            employees[editingEmployee] = emp;
            UIManager.showToast('Funcionário atualizado com sucesso!', 'success');
            cancelEmployeeEdit();
        } else {
            employees.push(emp);
            UIManager.showToast('Funcionário cadastrado com sucesso!', 'success');
        }
        
        StorageManager.set('employees', employees);
        renderEmployees();
        employeeForm.reset();
        currentEmployeeDocuments = [];
        DocumentManager.renderEmployeeDocuments();
        UIManager.clearFormErrors('employee-form');
        updateDashboard();
    }, 600);
});

function editEmployee(index) {
    const employees = StorageManager.get('employees');
    const emp = employees[index];
    document.getElementById('emp-name').value = emp.name;
    const cpfValue = emp.cpf.replace(/[^\d]/g, '');
    document.getElementById('emp-cpf').value = cpfValue.length === 11 ? ValidationManager.formatCPF(cpfValue) : emp.cpf;
    document.getElementById('emp-email').value = emp.email;
    const phoneValue = emp.phone || '';
    document.getElementById('emp-phone').value = phoneValue ? ValidationManager.formatPhone(phoneValue) : '';
    document.getElementById('emp-position').value = emp.position || '';
    document.getElementById('emp-salary').value = emp.salary || '';
    document.getElementById('emp-dept').value = emp.dept || '';
    document.getElementById('emp-hire').value = emp.hire || '';
    document.getElementById('emp-status').value = emp.status || 'Ativo';
    
    currentEmployeeDocuments = (emp.documents || []).map(doc => ({...doc}));
    DocumentManager.renderEmployeeDocuments();
    
    editingEmployee = index;
    document.getElementById('employee-edit-indicator').classList.remove('hidden');
    document.getElementById('employee-submit-btn').textContent = 'Atualizar Funcionário';
    document.getElementById('employee-cancel-btn').classList.remove('hidden');
    
    document.getElementById('employee-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    UIManager.showToast('Modo de edição ativado. Você pode editar os campos e documentos.', 'info');
}

function cancelEmployeeEdit() {
    editingEmployee = null;
    document.getElementById('employee-edit-indicator').classList.add('hidden');
    document.getElementById('employee-submit-btn').textContent = 'Cadastrar Funcionário';
    document.getElementById('employee-cancel-btn').classList.add('hidden');
    employeeForm.reset();
    currentEmployeeDocuments = [];
    DocumentManager.renderEmployeeDocuments();
    UIManager.showToast('Edição cancelada.', 'info');
}

function deleteEmployee(index) {
    const employees = StorageManager.get('employees');
    const emp = employees[index];
    
    if (!confirm(`Tem certeza que deseja excluir o funcionário "${emp.name}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    const password = prompt('Digite a senha para confirmar a exclusão:');
    const users = StorageManager.get('users');
    const user = users.find(u => u.username === 'admin' || u.username === 'master');
    
    if (password && user && SecurityManager.verifyPassword(password, user.passwordHash)) {
        UIManager.simulateLoading(() => {
            employees.splice(index, 1);
            StorageManager.set('employees', employees);
            renderEmployees();
            updateDashboard();
            UIManager.showToast('Funcionário excluído com sucesso!', 'success');
        }, 500);
    } else {
        UIManager.showToast('Senha incorreta. Exclusão cancelada.', 'error');
    }
}

renderEmployees();

// ==================== RECRUTAMENTO ====================
const vacancyForm = document.getElementById('vacancy-form');
const candidateForm = document.getElementById('candidate-form');
const candidateTable = document.getElementById('candidate-table');

vacancyForm.addEventListener('submit', e => {
    e.preventDefault();
    UIManager.simulateLoading(() => {
        const vac = {
            title: document.getElementById('vac-title').value,
            desc: document.getElementById('vac-desc').value,
            req: document.getElementById('vac-req').value,
            closing: document.getElementById('vac-closing').value
        };
        const vacancies = StorageManager.get('vacancies');
        vacancies.push(vac);
        StorageManager.set('vacancies', vacancies);
        vacancyForm.reset();
        UIManager.showToast('Vaga cadastrada com sucesso!', 'success');
    }, 500);
});

// Validação em tempo real para Email do Candidato
document.getElementById('cand-email')?.addEventListener('blur', function(e) {
    const email = e.target.value;
    const errorElement = document.getElementById('cand-email-error');
    
    if (email && !ValidationManager.validateEmail(email)) {
        errorElement.textContent = 'E-mail inválido';
        e.target.classList.add('border-red-500');
    } else if (email && ValidationManager.validateEmail(email)) {
        errorElement.textContent = '';
        e.target.classList.remove('border-red-500');
        e.target.classList.add('border-green-500');
    } else {
        errorElement.textContent = '';
        e.target.classList.remove('border-red-500', 'border-green-500');
    }
});

candidateForm.addEventListener('submit', e => {
    e.preventDefault();
    
    const email = document.getElementById('cand-email').value;
    
    if (!ValidationManager.validateEmail(email)) {
        UIManager.showToast('Por favor, insira um e-mail válido.', 'error');
        document.getElementById('cand-email').focus();
        return;
    }
    
    UIManager.simulateLoading(() => {
        const cand = {
            name: document.getElementById('cand-name').value,
            email: email,
            resume: document.getElementById('cand-resume').value,
            status: document.getElementById('cand-status').value,
            documents: [...currentCandidateDocuments]
        };
        const candidates = StorageManager.get('candidates');
        if (editingCandidate !== null) {
            candidates[editingCandidate] = cand;
            UIManager.showToast('Candidato atualizado com sucesso!', 'success');
            cancelCandidateEdit();
        } else {
            candidates.push(cand);
            UIManager.showToast('Candidato cadastrado com sucesso!', 'success');
        }
        StorageManager.set('candidates', candidates);
        renderCandidates();
        candidateForm.reset();
        currentCandidateDocuments = [];
        DocumentManager.renderCandidateDocuments();
        UIManager.clearFormErrors('candidate-form');
    }, 600);
});

function renderCandidates() {
    candidateTable.innerHTML = '';
    const candidates = StorageManager.get('candidates');
    candidates.forEach((cand, idx) => {
        const row = candidateTable.insertRow();
        row.insertCell().textContent = cand.name;
        row.insertCell().textContent = cand.email;
        row.insertCell().textContent = cand.status;
        
        const docCell = row.insertCell();
        const docCount = (cand.documents || []).length;
        docCell.innerHTML = docCount > 0 
            ? `<span class="text-blue-600 font-semibold">${docCount} documento(s)</span>` 
            : '<span class="text-gray-400">Nenhum</span>';
        
        const actions = row.insertCell();
        actions.innerHTML = `
            <button onclick="editCandidate(${idx})" class="btn-primary mr-2">Editar</button>
            <button onclick="deleteCandidate(${idx})" class="btn-logout">Excluir</button>
        `;
    });
}

function editCandidate(index) {
    const candidates = StorageManager.get('candidates');
    const cand = candidates[index];
    document.getElementById('cand-name').value = cand.name;
    document.getElementById('cand-email').value = cand.email;
    document.getElementById('cand-resume').value = cand.resume || '';
    document.getElementById('cand-status').value = cand.status || 'Inscrito';
    
    currentCandidateDocuments = (cand.documents || []).map(doc => ({...doc}));
    DocumentManager.renderCandidateDocuments();
    
    editingCandidate = index;
    document.getElementById('candidate-edit-indicator').classList.remove('hidden');
    document.getElementById('candidate-submit-btn').textContent = 'Atualizar Candidato';
    document.getElementById('candidate-cancel-btn').classList.remove('hidden');
    
    document.getElementById('candidate-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    UIManager.showToast('Modo de edição ativado. Você pode editar os campos e documentos.', 'info');
}

function cancelCandidateEdit() {
    editingCandidate = null;
    document.getElementById('candidate-edit-indicator').classList.add('hidden');
    document.getElementById('candidate-submit-btn').textContent = 'Cadastrar Candidato';
    document.getElementById('candidate-cancel-btn').classList.add('hidden');
    candidateForm.reset();
    currentCandidateDocuments = [];
    DocumentManager.renderCandidateDocuments();
    UIManager.showToast('Edição cancelada.', 'info');
}

function deleteCandidate(index) {
    const candidates = StorageManager.get('candidates');
    const cand = candidates[index];
    
    if (!confirm(`Tem certeza que deseja excluir o candidato "${cand.name}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    UIManager.simulateLoading(() => {
        candidates.splice(index, 1);
        StorageManager.set('candidates', candidates);
        renderCandidates();
        UIManager.showToast('Candidato excluído com sucesso!', 'success');
    }, 500);
}

renderCandidates();

// ==================== CONTROLE DE PONTO ====================
const timeForm = document.getElementById('time-form');
const timeTable = document.getElementById('time-table');

timeForm.addEventListener('submit', e => {
    e.preventDefault();
    UIManager.simulateLoading(() => {
        const employees = StorageManager.get('employees');
        const empId = document.getElementById('time-emp-select').value;
        const emp = employees.find(e => (e.id || e.cpf) === empId);
        if (!emp) {
            UIManager.showToast('Selecione um funcionário válido.', 'error');
            return;
        }
        StorageManager.ensureEmployeeSchema(emp);
        const inVal = document.getElementById('time-in').value;
        const outVal = document.getElementById('time-out').value;
        const timeEntry = {
            employeeId: emp.id,
            employeeName: emp.name,
            date: document.getElementById('time-date').value,
            in: inVal,
            out: outVal,
            hours: calculateHours(inVal, outVal),
            notes: document.getElementById('time-notes').value
        };
        const timeEntries = StorageManager.get('timeTracking');
        timeEntries.push(timeEntry);
        StorageManager.set('timeTracking', timeEntries);
        emp.timeEntries = emp.timeEntries || [];
        emp.timeEntries.push(timeEntry);
        StorageManager.saveEmployee(emp);
        renderTimeEntries();
        renderLatenessChart();
        timeForm.reset();
        UIManager.showToast('Ponto registrado com sucesso!', 'success');
    }, 500);
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
    const timeEntries = StorageManager.get('timeTracking');
    timeEntries.forEach(entry => {
        const row = timeTable.insertRow();
        row.insertCell().textContent = entry.date;
        row.insertCell().textContent = entry.in;
        row.insertCell().textContent = entry.out;
        row.insertCell().textContent = entry.hours + 'h';
        row.insertCell().textContent = entry.notes || '-';
    });
}

renderTimeEntries();

function populateEmployeeSelects() {
    const employees = StorageManager.get('employees');
    const timeEmpSelect = document.getElementById('time-emp-select');
    if (timeEmpSelect) {
        const prev = timeEmpSelect.value;
        timeEmpSelect.innerHTML = '<option value="">Selecione o funcionário</option>';
        employees.forEach(emp => {
            StorageManager.ensureEmployeeSchema(emp);
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = emp.name;
            timeEmpSelect.appendChild(opt);
        });
        if (prev) timeEmpSelect.value = prev;
    }
    const procEmpSelect = document.getElementById('proc-emp-select');
    if (procEmpSelect) {
        const prev2 = procEmpSelect.value;
        procEmpSelect.innerHTML = '<option value="">Selecione o funcionário</option>';
        employees.forEach(emp => {
            StorageManager.ensureEmployeeSchema(emp);
            const opt = document.createElement('option');
            opt.value = emp.id;
            opt.textContent = emp.name;
            procEmpSelect.appendChild(opt);
        });
        if (prev2) procEmpSelect.value = prev2;
    }
}

function getWeekRange(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0,0,0,0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23,59,59,999);
    return { start: monday, end: sunday };
}

function computeLatenessByEmployeeThisWeek() {
    const { start, end } = getWeekRange();
    const entries = StorageManager.get('timeTracking');
    const expectedIn = '09:00';
    const expectedMinutes = timeToMinutes(expectedIn);
    const map = new Map();
    entries.forEach(e => {
        const d = new Date(e.date);
        if (isNaN(d) || d < start || d > end) return;
        if (!e.employeeId || !e.in) return;
        const late = Math.max(0, timeToMinutes(e.in) - expectedMinutes);
        if (!map.has(e.employeeId)) map.set(e.employeeId, { name: e.employeeName || 'Funcionário', minutes: 0 });
        map.get(e.employeeId).minutes += late;
    });
    return Array.from(map.values()).map(v => ({ name: v.name, hours: +(v.minutes / 60).toFixed(2) }));
}

function renderLatenessChart() {
    const canvas = document.getElementById('lateness-chart');
    if (!canvas) return;
    const data = computeLatenessByEmployeeThisWeek();
    const ctx = canvas.getContext('2d');
    if (latenessChart) latenessChart.destroy();
    latenessChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                label: 'Horas de Atraso (Semana Atual)',
                data: data.map(d => d.hours),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: false } }
        }
    });
}

// ==================== AVALIAÇÃO DE DESEMPENHO ====================
const performanceForm = document.getElementById('performance-form');
const performanceTable = document.getElementById('performance-table');

performanceForm.addEventListener('submit', e => {
    e.preventDefault();
    UIManager.simulateLoading(() => {
        const perf = {
            emp: document.getElementById('perf-emp').value,
            evaluator: document.getElementById('perf-eval').value,
            period: document.getElementById('perf-period').value,
            score: document.getElementById('perf-skills').value,
            comments: document.getElementById('perf-comments').value
        };
        const performances = StorageManager.get('performances');
        performances.push(perf);
        StorageManager.set('performances', performances);
        renderPerformances();
        performanceForm.reset();
        UIManager.showToast('Avaliação adicionada com sucesso!', 'success');
    }, 500);
});

function renderPerformances() {
    performanceTable.innerHTML = '';
    const performances = StorageManager.get('performances');
    performances.forEach(perf => {
        const row = performanceTable.insertRow();
        row.insertCell().textContent = perf.emp;
        row.insertCell().textContent = perf.evaluator;
        row.insertCell().textContent = perf.period;
        row.insertCell().textContent = perf.score;
    });
}

renderPerformances();

// ==================== TREINAMENTOS ====================
const trainingForm = document.getElementById('training-form');
const enrollForm = document.getElementById('enroll-form');
const trainingTable = document.getElementById('training-table');

trainingForm.addEventListener('submit', e => {
    e.preventDefault();
    UIManager.simulateLoading(() => {
        const train = {
            title: document.getElementById('train-title').value,
            desc: document.getElementById('train-desc').value,
            type: document.getElementById('train-type').value,
            end: document.getElementById('train-end').value,
            enrolled: []
        };
        const trainings = StorageManager.get('trainings');
        trainings.push(train);
        StorageManager.set('trainings', trainings);
        renderTrainings();
        updateDashboard();
        UIManager.showToast('Treinamento adicionado com sucesso!', 'success');
    }, 500);
});

enrollForm.addEventListener('submit', e => {
    e.preventDefault();
    const emp = document.getElementById('enroll-emp').value;
    const trainTitle = document.getElementById('enroll-train').value;
    const trainings = StorageManager.get('trainings');
    const training = trainings.find(t => t.title === trainTitle);
    if (training && !training.enrolled.includes(emp)) {
        training.enrolled.push(emp);
        StorageManager.set('trainings', trainings);
        renderTrainings();
        enrollForm.reset();
        UIManager.showToast('Funcionário inscrito no treinamento com sucesso!', 'success');
    } else {
        UIManager.showToast('Funcionário já inscrito ou treinamento não encontrado.', 'warning');
    }
});

function renderTrainings() {
    trainingTable.innerHTML = '';
    const trainings = StorageManager.get('trainings');
    trainings.forEach(train => {
        const row = trainingTable.insertRow();
        row.insertCell().textContent = train.title;
        row.insertCell().textContent = train.type;
        row.insertCell().textContent = train.enrolled.join(', ') || 'Nenhum';
    });
}

renderTrainings();

// ==================== PROCESSOS DISCIPLINARES ====================
const ProcessManager = {
    addProcessDocument() {
        const fileInput = document.getElementById('proc-doc-file');
        const name = document.getElementById('proc-doc-name').value;
        if (!fileInput?.files?.[0] || !name) {
            UIManager.showToast('Informe nome e selecione um arquivo.', 'warning');
            return;
        }
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            const doc = {
                id: Date.now(),
                name,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                data: e.target.result
            };
            currentProcessDocuments.push(doc);
            ProcessManager.renderProcessDocuments();
            document.getElementById('proc-doc-name').value = '';
            fileInput.value = '';
            UIManager.showToast('Documento do processo adicionado!', 'success');
        };
        reader.readAsDataURL(file);
    },
    removeProcessDocument(id) {
        currentProcessDocuments = currentProcessDocuments.filter(d => d.id !== id);
        this.renderProcessDocuments();
    },
    renderProcessDocuments() {
        const container = document.getElementById('proc-docs-list');
        if (!container) return;
        container.innerHTML = '';
        if (currentProcessDocuments.length === 0) {
            container.innerHTML = '<div class="proc-empty">Nenhum documento adicionado.</div>';
            return;
        }
        currentProcessDocuments.forEach(doc => {
            const div = document.createElement('div');
            div.className = 'proc-doc-item';
            const isImg = (doc.fileType || '').startsWith('image/');
            const thumbSrc = isImg ? doc.data : 'data:image/svg+xml;base64,PHN2ZyBmaWxsPSIjOTRhM2I4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHdpZHRoPSI1NiIgaGVpZ2h0PSI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgNkg0Yy0xLjEgMC0yIC45LTIgMnY4YzAgMS4xLjkgMiAyIDJoMTZjMS4xIDAgMi0uOSAyLTJWOEMyMiA2LjkgMjEuMSA2IDIwIDZ6bS0xIDEwSDV2LTNoMTR2M3pNNiA5aDhWOGgtOHYxem0xMCAwYzAgMS4xLS45IDItMiAyaC04Yy0xLjEgMC0yLS45LTItMlY4aDEyVjlaIi8+PC9zdmc+';
            div.innerHTML = `
                <img class="proc-doc-thumb" src="${thumbSrc}" alt="thumb" />
                <div class="proc-doc-info">
                    <div class="proc-doc-name">${doc.name}</div>
                    <div class="proc-doc-meta">${doc.fileName} • ${(doc.fileSize/1024).toFixed(1)} KB</div>
                </div>
                <div class="proc-doc-actions">
                    <button class="btn-doc btn-doc-open" onclick="DocumentManager.viewDocument('${doc.data}', '${doc.fileType}')">Abrir</button>
                    <button class="btn-doc btn-doc-remove" onclick="ProcessManager.removeProcessDocument(${doc.id})">Remover</button>
                </div>
            `;
            container.appendChild(div);
        });
    }
};

const disciplinaryForm = document.getElementById('disciplinary-form');
const disciplinaryTable = document.getElementById('disciplinary-table');
disciplinaryForm?.addEventListener('submit', e => {
    e.preventDefault();
    UIManager.simulateLoading(() => {
        const employees = StorageManager.get('employees');
        const empId = document.getElementById('proc-emp-select').value;
        const emp = employees.find(e => (e.id || e.cpf) === empId);
        if (!emp) {
            UIManager.showToast('Selecione um funcionário.', 'error');
            return;
        }
        StorageManager.ensureEmployeeSchema(emp);
        const process = {
            id: 'proc_' + Date.now(),
            employeeId: emp.id,
            employeeName: emp.name,
            date: document.getElementById('proc-date').value,
            title: document.getElementById('proc-title').value,
            severity: document.getElementById('proc-severity').value,
            desc: document.getElementById('proc-desc').value,
            documents: [...currentProcessDocuments]
        };
        emp.processes.push(process);
        StorageManager.saveEmployee(emp);
        const globalProcs = StorageManager.get('disciplinaryProcesses');
        globalProcs.push(process);
        StorageManager.set('disciplinaryProcesses', globalProcs);
        currentProcessDocuments = [];
        ProcessManager.renderProcessDocuments();
        disciplinaryForm.reset();
        renderDisciplinaryProcesses();
        UIManager.showToast('Processo disciplinar cadastrado!', 'success');
    }, 600);
});

function renderDisciplinaryProcesses() {
    if (!disciplinaryTable) return;
    disciplinaryTable.innerHTML = '';
    const procs = StorageManager.get('disciplinaryProcesses');
    procs.forEach(p => {
        const row = disciplinaryTable.insertRow();
        row.insertCell().textContent = p.employeeName || '-';
        row.insertCell().textContent = p.title || '-';
        row.insertCell().textContent = p.date || '-';
        const sevTd = row.insertCell();
        const sevClass = p.severity === 'Grave' ? 'severity-grave' : (p.severity === 'Média' ? 'severity-med' : 'severity-lev');
        sevTd.innerHTML = `<span class="severity-badge ${sevClass}">${p.severity}</span>`;
        const docsTd = row.insertCell();
        const count = (p.documents || []).length;
        docsTd.innerHTML = count > 0 ? `<span class="text-blue-600 font-semibold cursor-pointer" title="${count} documento(s)">${count} documento(s)</span>` : '<span class="text-gray-400">Nenhum</span>';
    });
}

// ==================== DASHBOARD ====================
function updateDashboard() {
    const employees = StorageManager.get('employees');
    const trainings = StorageManager.get('trainings');
    const activeEmployees = employees.filter(e => e.status === 'Ativo').length;
    
    document.getElementById('kpi-employees').textContent = employees.length;
    const turnoverRate = employees.length > 0 ? Math.floor(Math.random() * 10) : 0;
    document.getElementById('kpi-turnover').textContent = turnoverRate + '%';
    document.getElementById('kpi-trainings').textContent = trainings.length;
    
    const canvas = document.getElementById('kpi-chart');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        
        if (kpiChart) {
            kpiChart.destroy();
        }
        
        kpiChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Funcionários', 'Treinamentos', 'Funcionários Ativos'],
                datasets: [{
                    label: 'Métricas',
                    data: [employees.length, trainings.length, activeEmployees],
                    backgroundColor: [
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(236, 72, 153, 0.8)',
                        'rgba(34, 197, 94, 0.8)'
                    ],
                    borderColor: [
                        'rgba(99, 102, 241, 1)',
                        'rgba(236, 72, 153, 1)',
                        'rgba(34, 197, 94, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Visão Geral do Sistema'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
}

// ==================== RELATÓRIOS ====================
function generateReport() {
    UIManager.simulateLoading(() => {
        const employees = StorageManager.get('employees');
        const activeEmployees = employees.filter(e => e.status === 'Ativo').length;
        const inactiveEmployees = employees.filter(e => e.status === 'Inativo').length;
        const totalSalary = employees.reduce((sum, e) => sum + parseFloat(e.salary || 0), 0);
        const avgSalary = totalSalary / employees.length || 0;
        const trainings = StorageManager.get('trainings');

        document.getElementById('report-emp').textContent = employees.length;
        document.getElementById('report-active').textContent = activeEmployees;
        document.getElementById('report-inactive').textContent = inactiveEmployees;
        document.getElementById('report-turnover').textContent = '5% (Simulado)';
        document.getElementById('report-salary').textContent = avgSalary.toFixed(2);
        document.getElementById('report-trainings').textContent = trainings.length;

        const canvas = document.getElementById('report-chart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            
            if (reportChart) {
                reportChart.destroy();
            }
            
            reportChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Funcionários Ativos', 'Funcionários Inativos', 'Treinamentos'],
                    datasets: [{
                        data: [activeEmployees, inactiveEmployees, trainings.length],
                        backgroundColor: [
                            'rgba(34, 197, 94, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(168, 85, 247, 0.8)'
                        ],
                        borderColor: [
                            'rgba(34, 197, 94, 1)',
                            'rgba(239, 68, 68, 1)',
                            'rgba(168, 85, 247, 1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        title: {
                            display: true,
                            text: 'Distribuição de Recursos'
                        }
                    }
                }
            });
        }
        
        UIManager.showToast('Relatório gerado com sucesso!', 'success');
    }, 800);
}

// ==================== INICIALIZAÇÃO ====================
UIManager.showSection('login');
