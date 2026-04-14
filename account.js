// ACCOUNT MANAGER - Modular version using shared utilities
class AccountManager {
    constructor() {
        this.formData = {};
        this.mpesaPaymentStatus = false;
        this.firebase = FirebaseUtils.getServices();
        this.init();
    }
    
    init() {
        console.log('Account Manager initialized');
        this.setupEventListeners();
        this.testFirebaseConnection();
    }
    
    async testFirebaseConnection() {
        try {
            const testDoc = await this.firebase.db.collection('users').limit(1).get();
            console.log('Firebase connection test passed!');
        } catch (error) {
            console.error('Firebase connection test failed:', error);
        }
    }
    
    setupEventListeners() {
        // Account type selection
        const accountTypeBtns = DOMUtils.selectAll('.account-type-btn');
        accountTypeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectAccountType(e.target.dataset.type);
            });
        });
        
        // Form submission
        const registrationForm = DOMUtils.get('registration-form');
        if (registrationForm) {
            registrationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegistration();
            });
        }
        
        // M-Pesa payment button
        const mpesaBtn = DOMUtils.get('mpesa-payment-btn');
        if (mpesaBtn) {
            mpesaBtn.addEventListener('click', () => {
                this.initiateMpesaPayment();
            });
        }
    }
    
    selectAccountType(type) {
        console.log('Account type selected:', type);
        this.formData.accountType = type;
        
        // Update UI
        const freeBtn = DOMUtils.select('[data-type="free"]');
        const premiumBtn = DOMUtils.select('[data-type="premium"]');
        
        if (type === 'free') {
            freeBtn.style.backgroundColor = '#007bff';
            freeBtn.style.color = '#ffffff';
            premiumBtn.style.backgroundColor = '#6c757d';
            premiumBtn.style.color = '#ffffff';
        } else {
            premiumBtn.style.backgroundColor = '#6610f2';
            premiumBtn.style.color = '#ffffff';
            freeBtn.style.backgroundColor = '#6c757d';
            freeBtn.style.color = '#ffffff';
        }
        
        // Show registration form
        const accountTypeSelection = DOMUtils.get('account-type-selection');
        const registrationForm = DOMUtils.get('registration-form');
        const accountTypeDisplay = DOMUtils.get('account-type-display');
        
        if (accountTypeSelection && registrationForm) {
            DOMUtils.hide(accountTypeSelection);
            DOMUtils.show(registrationForm);
            
            if (accountTypeDisplay) {
                accountTypeDisplay.textContent = type.charAt(0).toUpperCase() + type.slice(1);
            }
        }
    }
    
    async handleRegistration() {
        try {
            console.log('Registration started...');
            
            // Get form data using FormUtils
            const form = DOMUtils.get('registration-form');
            const formData = FormUtils.getFormData(form);
            this.formData = {
                username: formData.username,
                email: formData.email,
                phone: formData.phone,
                accountType: formData.accountType || this.formData.accountType || 'free'
            };
            
            console.log('Form data:', this.formData);
            
            // Validate form data using ValidationUtils
            if (!ValidationUtils.isRequired(this.formData.username) || 
                !ValidationUtils.isRequired(this.formData.email) || 
                !ValidationUtils.isRequired(this.formData.phone)) {
                UIUtils.showError('Please fill in all required fields');
                return;
            }
            
            if (!ValidationUtils.isValidEmail(this.formData.email)) {
                UIUtils.showError('Please enter a valid email address');
                return;
            }
            
            if (!ValidationUtils.isValidPhone(this.formData.phone)) {
                UIUtils.showError('Please enter a valid phone number');
                return;
            }
            
            if (this.formData.accountType === 'premium') {
                // Show M-Pesa payment section
                DOMUtils.show(DOMUtils.get('mpesa-payment-section'));
                DOMUtils.hide(DOMUtils.get('registration-form'));
                UIUtils.showNotification('Please complete M-Pesa payment to create premium account', 'info');
            } else {
                // Create free account directly
                await this.createAccount();
            }
            
        } catch (error) {
            console.error('Registration error:', error);
            alert('Registration failed: ' + error.message);
        }
    }
    
    async initiateMpesaPayment() {
        try {
            console.log('Initiating M-Pesa payment...');
            
            const phone = this.formData.phone;
            const mpesaBtn = DOMUtils.get('mpesa-payment-btn');
            const mpesaStatus = DOMUtils.get('mpesa-status');
            
            if (!phone || phone.length < 9) {
                UIUtils.showError('Please enter a valid phone number first');
                return;
            }
            
            // Show payment status
            DOMUtils.show(mpesaStatus);
            UIUtils.showLoading(mpesaBtn, 'Processing...');
            
            // Process M-Pesa payment with confirmation
            const paymentResult = await this.simulateMpesaPayment(phone, 200);
            
            if (paymentResult.success && paymentResult.paid) {
                // Payment completed successfully
                this.mpesaPaymentStatus = true;
                mpesaStatus.innerHTML = `
                    <p style="color: #00ff00;">Payment completed successfully!</p>
                    <p>Transaction ID: ${paymentResult.transactionId}</p>
                    <p>Your premium account will be created now</p>
                `;
                
                // Continue with account creation
                await this.createAccount();
                
            } else if (paymentResult.success && !paymentResult.paid) {
                // Payment initiated but not completed
                this.mpesaPaymentStatus = false;
                mpesaStatus.innerHTML = `
                    <p style="color: #ffa500;">Payment not completed!</p>
                    <p>Transaction ID: ${paymentResult.transactionId}</p>
                    <p>${paymentResult.message}</p>
                    <p style="color: #ff0000;">Account NOT created - payment required first</p>
                `;
                
                // Reset button for retry
                UIUtils.hideLoading(mpesaBtn, 'Try Payment Again');
                return; // Don't create account
                
            } else {
                // Payment failed
                this.mpesaPaymentStatus = false;
                mpesaStatus.innerHTML = `
                    <p style="color: #ff0000;">Payment failed!</p>
                    <p>${paymentResult.message}</p>
                    <p style="color: #ff0000;">Account NOT created - payment required first</p>
                `;
                
                // Reset button for retry
                UIUtils.hideLoading(mpesaBtn, 'Try Payment Again');
                return; // Don't create account
            }
            
        } catch (error) {
            console.error('M-Pesa payment error:', error);
            const mpesaStatus = DOMUtils.get('mpesa-status');
            if (mpesaStatus) {
                mpesaStatus.innerHTML = `
                    <p style="color: #ff0000;">Payment error!</p>
                    <p>${error.message}</p>
                `;
            }
        }
    }
    
    async createAccount() {
        try {
            console.log('Creating account...');
            
            // Save to Firebase
            const userId = await this.saveAccountToFirebase(this.formData);
            
            // Send email notification using EmailService
            await EmailService.send(
                this.formData.email, 
                'Account Created', 
                'Your account has been created successfully!',
                this.formData
            );
            
            // Show success message
            const successMessage = DOMUtils.get('success-message');
            if (successMessage) {
                successMessage.innerHTML = `
                    <h3>Account Created Successfully!</h3>
                    <p>Your ${this.formData.accountType} account has been created.</p>
                    <p>User ID: ${userId}</p>
                    ${this.formData.accountType === 'premium' ? '<p>You will receive a confirmation email shortly.</p>' : ''}
                `;
                DOMUtils.show(successMessage);
            }
            
            // Hide forms
            DOMUtils.hide(DOMUtils.get('registration-form'));
            DOMUtils.hide(DOMUtils.get('mpesa-payment-section'));
            
        } catch (error) {
            console.error('Account creation error:', error);
            UIUtils.showError('Account creation failed: ' + error.message);
        }
    }
    
    async saveAccountToFirebase(accountData) {
        try {
            // Use user's phone number as document ID
            const userId = accountData.phone.replace(/\D/g, '');
            const docRef = await this.firebase.db.collection('users').doc(userId).set(accountData);
            console.log('Account saved with ID:', userId);
            return userId;
        } catch (error) {
            console.error('Error saving account:', error);
            throw error;
        }
    }
    
    // M-Pesa payment simulation with confirmation
    async simulateMpesaPayment(phone, amount) {
        try {
            console.log('Simulating M-Pesa payment...');
            console.log('Phone:', phone);
            console.log('Amount:', amount);
            
            // For development: Simulate payment
            if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
                console.log('Development mode: Simulating successful payment');
                
                // Simulate payment processing delay
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                return {
                    success: true,
                    transactionId: 'DEV_' + Date.now(),
                    message: 'Payment simulated successfully (Development Mode)',
                    paid: true
                };
            }
            
            // Production: Use Safaricom sandbox API
            console.log('Attempting Safaricom sandbox API call...');
            
            // Generate OAuth token
            const accessToken = await this.getMpesaAccessToken();
            
            // Generate password for API call
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, -3);
            const password = btoa('174379' + 'bfb279c93339c6fb5d1a5f2470b1c263' + timestamp);
            
            const response = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    BusinessShortCode: '174379',
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: 'CustomerPayBillOnline',
                    Amount: amount,
                    PartyA: phone.replace(/\D/g, ''),
                    PartyB: '174379',
                    PhoneNumber: phone.replace(/\D/g, ''),
                    CallBackURL: 'https://your-domain.com/callback',
                    AccountReference: 'SHOPPING_PREMIUM',
                    TransactionDesc: 'Premium Account Payment'
                })
            });
            
            if (!response.ok) {
                throw new Error(`M-Pesa API error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('M-Pesa payment response:', result);
            
            // Check if STK push was successful
            if (result.ResponseCode === '0') {
                console.log('STK push sent successfully, waiting for user PIN entry...');
                
                // Start polling for payment confirmation
                const paymentConfirmed = await this.waitForPaymentConfirmation(result.CheckoutRequestID);
                
                if (paymentConfirmed) {
                    return {
                        success: true,
                        transactionId: result.CheckoutRequestID,
                        message: 'Payment completed successfully',
                        paid: true
                    };
                } else {
                    return {
                        success: false,
                        transactionId: result.CheckoutRequestID,
                        message: 'Payment not completed - user did not enter PIN or payment failed',
                        paid: false
                    };
                }
            } else {
                return {
                    success: false,
                    transactionId: result.CheckoutRequestID,
                    message: `STK push failed: ${result.ResponseDescription}`,
                    paid: false
                };
            }
            
        } catch (error) {
            console.error('M-Pesa API Error:', error);
            
            // Fallback for development
            if (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') {
                console.log('Fallback: Simulating successful payment');
                return {
                    success: true,
                    transactionId: 'FALLBACK_' + Date.now(),
                    message: 'Payment simulated (Fallback Mode)',
                    paid: true
                };
            }
            
            throw error;
        }
    }
    
    // Wait for payment confirmation from user
    async waitForPaymentConfirmation(checkoutRequestID) {
        try {
            console.log('Starting payment confirmation polling for:', checkoutRequestID);
            
            // Poll for payment status for up to 5 minutes
            const maxAttempts = 30; // 30 attempts * 10 seconds = 5 minutes
            let attempts = 0;
            
            while (attempts < maxAttempts) {
                attempts++;
                console.log(`Checking payment status - Attempt ${attempts}/${maxAttempts}`);
                
                // Check payment status
                const paymentStatus = await this.checkPaymentStatus(checkoutRequestID);
                
                if (paymentStatus.success) {
                    console.log('Payment confirmed! User entered PIN and transaction completed.');
                    return true;
                }
                
                if (paymentStatus.failed) {
                    console.log('Payment failed - user cancelled or insufficient funds.');
                    return false;
                }
                
                // Wait 10 seconds before next check
                await new Promise(resolve => setTimeout(resolve, 10000));
            }
            
            console.log('Payment confirmation timeout - user did not enter PIN within 5 minutes.');
            return false;
            
        } catch (error) {
            console.error('Error checking payment confirmation:', error);
            return false;
        }
    }
    
    // Check payment status using M-Pesa query API
    async checkPaymentStatus(checkoutRequestID) {
        try {
            const accessToken = await this.getMpesaAccessToken();
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, -3);
            const password = btoa('174379' + 'bfb279c93339c6fb5d1a5f2470b1c263' + timestamp);
            
            const response = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    BusinessShortCode: '174379',
                    Password: password,
                    Timestamp: timestamp,
                    CheckoutRequestID: checkoutRequestID
                })
            });
            
            if (!response.ok) {
                throw new Error(`Status check error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Payment status check result:', result);
            
            // Check payment status codes
            if (result.ResultCode === '0') {
                return { success: true, message: 'Payment completed' };
            } else if (result.ResultCode === '1032') {
                return { failed: true, message: 'Payment cancelled by user' };
            } else if (result.ResultCode === '1037') {
                return { failed: true, message: 'Insufficient funds' };
            } else {
                return { pending: true, message: 'Payment pending' };
            }
            
        } catch (error) {
            console.error('Error checking payment status:', error);
            return { pending: true, message: 'Status check failed' };
        }
    }
    
    // Get M-Pesa OAuth access token
    async getMpesaAccessToken() {
        try {
            const response = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
                method: 'GET',
                headers: {
                    'Authorization': 'Basic ' + btoa('CMyZ5M09aM7wXGbgApJx91Cg6wereucKA32wydj96fzV4qFs:gkszHAGta5kclANeuQHgsN2AZAIxWezm4shWF5GYnHOqGqfl78GhyDpm04pGGIGG')
                }
            });
            
            if (!response.ok) {
                throw new Error(`OAuth error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.access_token;
            
        } catch (error) {
            console.error('OAuth Error:', error);
            throw error;
        }
    }
}

// Initialize Account Manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AccountManager();
});
