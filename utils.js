// UTILS.JS - Shared utility functions for all modules
// Avoid code duplication and maintain clean modular architecture

// Firebase Configuration and Initialization
const FirebaseUtils = {
    config: {
        apiKey: "YOUR_API_KEY_HERE", // Use Netlify environment variables
        authDomain: "shopping-online-6ba36.firebaseapp.com", 
        projectId: "shopping-online-6ba36",
        storageBucket: "shopping-online-6ba36.appspot.com",
        messagingSenderId: "404079444441",
        appId: "1:404079444441:web:bca6b897877295f92519c8"
    },
    
    // Initialize Firebase only once
    init() {
        if (!firebase.apps.length) {
            firebase.initializeApp(this.config);
        }
        return {
            db: firebase.firestore(),
            storage: firebase.storage(),
            auth: firebase.auth()
        };
    },
    
    // Get initialized services
    getServices() {
        return this.init();
    }
};

// Email Notification Service
const EmailService = {
    config: {
        serviceID: 'service_r4f4udw',
        templateID: 'template_3w9d45m',
        userID: 'A0OtQsH6zdIb33M8-'
    },
    
    // Initialize EmailJS
    init() {
        if (typeof emailjs !== 'undefined') {
            emailjs.init(this.config.userID);
            return true;
        }
        console.error('EmailJS not loaded');
        return false;
    },
    
    // Send email notification
    async send(email, subject, message, templateData = {}) {
        try {
            if (!this.init()) return false;
            
            console.log('Sending email notification:', { email, subject, message });
            
            const templateParams = {
                to_email: email,
                to_name: templateData.username || 'User',
                subject: subject,
                message: message,
                account_type: templateData.accountType || 'free',
                support_email: 'josephgthuku@gmail.com',
                support_phone: '+254 707584594',
                approved_date: new Date().toLocaleDateString(),
                ...templateData
            };
            
            const response = await emailjs.send(
                this.config.serviceID, 
                this.config.templateID, 
                templateParams
            );
            
            console.log('Email sent successfully:', response);
            return true;
        } catch (error) {
            console.error('Email sending failed:', error);
            return false;
        }
    }
};

// DOM Utilities
const DOMUtils = {
    // Safe DOM element selection
    get(id) {
        return document.getElementById(id);
    },
    
    // Safe query selector
    select(selector) {
        return document.querySelector(selector);
    },
    
    // Safe query selector all
    selectAll(selector) {
        return document.querySelectorAll(selector);
    },
    
    // Show/hide element
    show(element) {
        if (element) element.style.display = 'block';
    },
    
    hide(element) {
        if (element) element.style.display = 'none';
    },
    
    // Toggle visibility
    toggle(element) {
        if (element) {
            element.style.display = element.style.display === 'none' ? 'block' : 'none';
        }
    }
};

// Form Utilities
const FormUtils = {
    // Get form data as object
    getFormData(form) {
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        return data;
    },
    
    // Validate required fields
    validateRequired(form) {
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('error');
                isValid = false;
            } else {
                field.classList.remove('error');
            }
        });
        
        return isValid;
    },
    
    // Clear form
    clear(form) {
        form.reset();
        const errorFields = form.querySelectorAll('.error');
        errorFields.forEach(field => field.classList.remove('error'));
    }
};

// UI Utilities
const UIUtils = {
    // Show loading state
    showLoading(element, text = 'Loading...') {
        if (element) {
            element.disabled = true;
            element.textContent = text;
            element.classList.add('loading');
        }
    },
    
    // Hide loading state
    hideLoading(element, originalText) {
        if (element) {
            element.disabled = false;
            element.textContent = originalText;
            element.classList.remove('loading');
        }
    },
    
    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    },
    
    // Show success message
    showSuccess(message) {
        this.showNotification(message, 'success');
    },
    
    // Show error message
    showError(message) {
        this.showNotification(message, 'error');
    }
};

// Storage Utilities
const StorageUtils = {
    // Set item in localStorage
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('Storage set error:', error);
        }
    },
    
    // Get item from localStorage
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Storage get error:', error);
            return defaultValue;
        }
    },
    
    // Remove item from localStorage
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Storage remove error:', error);
        }
    }
};

// Validation Utilities
const ValidationUtils = {
    // Validate email
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Validate phone number (Kenya)
    isValidPhone(phone) {
        const phoneRegex = /^(?:\+254|0)?[7]\d{8}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    },
    
    // Validate required field
    isRequired(value) {
        return value && value.trim().length > 0;
    },
    
    // Validate minimum length
    minLength(value, min) {
        return value && value.trim().length >= min;
    }
};

// Make utilities globally available
window.FirebaseUtils = FirebaseUtils;
window.EmailService = EmailService;
window.DOMUtils = DOMUtils;
window.FormUtils = FormUtils;
window.UIUtils = UIUtils;
window.StorageUtils = StorageUtils;
window.ValidationUtils = ValidationUtils;

// Export for module usage (if needed)
export {
    FirebaseUtils,
    EmailService,
    DOMUtils,
    FormUtils,
    UIUtils,
    StorageUtils,
    ValidationUtils
};
