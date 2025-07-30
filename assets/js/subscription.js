
// Subscription page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadSubscriptionData();
    loadPaymentHistory();
    loadPaymentMethod();
    setupCardFormatting();
});

function loadSubscriptionData() {
    const isSubscribed = localStorage.getItem('isSubscribed') === 'true';
    const subscriptionPlan = localStorage.getItem('subscriptionPlan') || 'free';
    const subscriptionDate = localStorage.getItem('subscriptionDate');
    
    const planName = document.getElementById('currentPlanName');
    const planPrice = document.getElementById('currentPlanPrice');
    const planStatus = document.getElementById('currentPlanStatus');
    const nextBilling = document.getElementById('nextBilling');
    
    if (isSubscribed && subscriptionPlan !== 'free') {
        const planDetails = {
            premium: { name: 'Premium Plan', price: '$9.99/month' },
            pro: { name: 'Pro Plan', price: '$19.99/month' }
        };
        
        const plan = planDetails[subscriptionPlan] || planDetails.premium;
        planName.textContent = plan.name;
        planPrice.textContent = plan.price;
        planStatus.textContent = 'Active';
        planStatus.className = 'plan-status active';
        
        if (subscriptionDate) {
            const nextBillingDate = new Date(subscriptionDate);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            nextBilling.textContent = `Next billing: ${nextBillingDate.toLocaleDateString()}`;
        }
    } else {
        planName.textContent = 'Free Plan';
        planPrice.textContent = '$0/month';
        planStatus.textContent = 'Active';
        planStatus.className = 'plan-status';
        nextBilling.textContent = 'No billing date';
    }
}

function loadPaymentHistory() {
    const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]');
    const tbody = document.getElementById('paymentHistoryBody');
    
    if (paymentHistory.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #666;">
                    No payment history available
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = paymentHistory.map(payment => `
        <tr>
            <td>${new Date(payment.date).toLocaleDateString()}</td>
            <td>${payment.plan}</td>
            <td>$${payment.amount}</td>
            <td><span class="status-badge ${payment.status.toLowerCase()}">${payment.status}</span></td>
            <td><button class="btn-link" onclick="downloadInvoice('${payment.id}')">Download</button></td>
        </tr>
    `).join('');
}

function loadPaymentMethod() {
    const paymentMethod = JSON.parse(localStorage.getItem('paymentMethod') || '{}');
    const card = document.getElementById('paymentMethodCard');
    
    if (paymentMethod.cardNumber) {
        const maskedCard = '**** **** **** ' + paymentMethod.cardNumber.slice(-4);
        card.innerHTML = `
            <div class="card-info">
                <div class="card-type">💳 ${paymentMethod.cardType || 'Credit Card'}</div>
                <div class="card-details">${maskedCard} • Expires ${paymentMethod.expiry}</div>
            </div>
            <div class="card-actions">
                <button class="btn btn-secondary" onclick="addPaymentMethod()">Update</button>
                <button class="btn btn-danger" onclick="removePaymentMethod()">Remove</button>
            </div>
        `;
    }
}

function selectPlan(planType) {
    const plans = {
        premium: { name: 'Premium Plan', price: 9.99 },
        pro: { name: 'Pro Plan', price: 19.99 }
    };
    
    const plan = plans[planType];
    if (!plan) return;
    
    // Check if payment method exists
    const paymentMethod = JSON.parse(localStorage.getItem('paymentMethod') || '{}');
    if (!paymentMethod.cardNumber) {
        showAlert('Please add a payment method first', 'error');
        addPaymentMethod();
        return;
    }
    
    if (confirm(`Upgrade to ${plan.name} for $${plan.price}/month?`)) {
        processSubscription(planType, plan);
    }
}

function processSubscription(planType, plan) {
    showAlert('Processing subscription...', 'info');
    
    // Simulate payment processing
    setTimeout(() => {
        localStorage.setItem('isSubscribed', 'true');
        localStorage.setItem('subscriptionPlan', planType);
        localStorage.setItem('subscriptionDate', new Date().toISOString());
        
        // Add to payment history
        const paymentHistory = JSON.parse(localStorage.getItem('paymentHistory') || '[]');
        paymentHistory.unshift({
            id: 'INV-' + Date.now(),
            date: new Date().toISOString(),
            plan: plan.name,
            amount: plan.price.toFixed(2),
            status: 'Paid'
        });
        localStorage.setItem('paymentHistory', JSON.stringify(paymentHistory));
        
        showAlert(`Successfully subscribed to ${plan.name}!`, 'success');
        
        // Refresh the page
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    }, 3000);
}

function addPaymentMethod() {
    document.getElementById('paymentModal').style.display = 'block';
}

function savePaymentMethod() {
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s/g, '');
    const expiryDate = document.getElementById('expiryDate').value;
    const cvv = document.getElementById('cvv').value;
    const cardName = document.getElementById('cardName').value;
    const billingAddress = document.getElementById('billingAddress').value;
    
    if (!cardNumber || !expiryDate || !cvv || !cardName) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }
    
    if (cardNumber.length < 16) {
        showAlert('Please enter a valid card number', 'error');
        return;
    }
    
    // Determine card type
    let cardType = 'Credit Card';
    if (cardNumber.startsWith('4')) cardType = 'Visa';
    else if (cardNumber.startsWith('5')) cardType = 'Mastercard';
    else if (cardNumber.startsWith('3')) cardType = 'American Express';
    
    const paymentMethod = {
        cardNumber: cardNumber,
        expiry: expiryDate,
        cardName: cardName,
        cardType: cardType,
        billingAddress: billingAddress
    };
    
    localStorage.setItem('paymentMethod', JSON.stringify(paymentMethod));
    
    showAlert('Payment method saved successfully!', 'success');
    closeModal('paymentModal');
    
    // Refresh payment method display
    loadPaymentMethod();
}

function removePaymentMethod() {
    if (confirm('Are you sure you want to remove this payment method?')) {
        localStorage.removeItem('paymentMethod');
        showAlert('Payment method removed', 'success');
        loadPaymentMethod();
    }
}

function setupCardFormatting() {
    const cardNumberInput = document.getElementById('cardNumber');
    const expiryInput = document.getElementById('expiryDate');
    
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
}

function downloadInvoice(invoiceId) {
    showAlert('Invoice download feature coming soon!', 'info');
}

console.log('Subscription functionality loaded');
