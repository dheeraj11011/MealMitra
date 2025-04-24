// Global variables
let donations = [];
let foodRequests = [];
let isDonationsLoaded = false;
let isRequestsLoaded = false;

// DOM elements
const donationForm = document.getElementById("donationForm");
const donationList = document.getElementById("donationList");
const requestFoodForm = document.getElementById("requestFoodForm");
const foodRequestList = document.getElementById("foodRequestList");

// Initialize application
document.addEventListener("DOMContentLoaded", function() {
    initializeDonationSystem();
    initializeRequestSystem();
    setupSearchFunctionality();
    setupSidebarBehavior();
});

// Donation System
function initializeDonationSystem() {
    if (donationForm) {
        // Ensure only one listener is attached
        donationForm.removeEventListener("submit", handleDonationSubmit);
        donationForm.addEventListener("submit", handleDonationSubmit);
        console.log("Donation form listener attached");
    }
    
    if (donationList && !isDonationsLoaded) {
        fetchAndUpdateDonations();
    }
}

async function handleDonationSubmit(event) {
    event.preventDefault();

    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");
    if (errorMessage && successMessage) {
        errorMessage.style.display = "none";
        successMessage.style.display = "none";
    }

    const formData = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        mobile: formatMobileNumber(document.getElementById("mobile").value.trim()),
        foodDetails: document.getElementById("foodDetails").value,
        expiryDate: document.getElementById("expiryDate").value,
        location: document.getElementById("location").value
    };

    if (!validateMobileNumber(formData.mobile)) {
        if (errorMessage) {
            errorMessage.textContent = "Invalid phone number. Use format: +[country code][number], e.g., +966123456789";
            errorMessage.style.display = "block";
        } else {
            alert("Invalid phone number. Use format: +[country code][number], e.g., +966123456789");
        }
        return;
    }

    console.log("Submitting donation:", formData);

    try {
        const response = await fetch("http://localhost:5000/submit-donation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        console.log("Server response:", { status: response.status, result });

        if (response.ok) { // Status 200-299
            if (successMessage) {
                successMessage.textContent = result.message || "Donation submitted successfully!";
                successMessage.style.display = "block";
            }
            donationForm.reset();
            setTimeout(() => window.location.href = "donations.html", 1000); // Delay to show success
        } else {
            throw new Error(result.message || "Failed to submit donation");
        }
    } catch (error) {
        console.error("Donation submission error:", error);
        if (errorMessage) {
            errorMessage.textContent = error.message || "Error submitting donation. Please try again later.";
            errorMessage.style.display = "block";
        } else {
            alert(error.message || "Error submitting donation. Please try again later.");
        }
    }
}

function formatMobileNumber(mobile) {
    if (!mobile.startsWith('+') && mobile.match(/^\d+$/)) {
        return `+${mobile}`;
    }
    return mobile;
}

function validateMobileNumber(mobile) {
    return /^\+[1-9]\d{9,14}$/.test(mobile);
}

async function fetchAndUpdateDonations() {
    if (isDonationsLoaded) return;

    try {
        const response = await fetch("http://localhost:5000/api/donations");
        if (!response.ok) throw new Error("Failed to fetch donations");
        
        donations = await response.json();
        updateDonationList(donations);
        isDonationsLoaded = true;
    } catch (error) {
        console.error("Donation fetch error:", error);
        if (donationList) {
            donationList.innerHTML = "<p>Error loading donations. Please try again later.</p>";
        }
    }
}

function updateDonationList(donationArray = donations) {
    if (!donationList) return;
    
    donationList.innerHTML = donationArray.length === 0 
        ? "<p>No donations found for this location.</p>"
        : donationArray.map(createDonationItem).join("");
}

function createDonationItem(donation) {
    const isExpired = new Date(donation.expiryDate) < new Date();
    const isAccepted = donation.status === 'Accepted';
    
    return `
        <div class="donation-item">
            <h3>Donor: ${donation.name}</h3>
            <p>Email: ${donation.email}</p>
            <p>Mobile: ${donation.mobile}</p>
            <p>Food Details: ${donation.foodDetails}</p>
            <p>Location: <a href="https://www.google.com/maps/search/${encodeURIComponent(donation.location)}" target="_blank">${donation.location}</a></p>
            <p>Expiry Date: ${donation.expiryDate}</p>
            <p class="${isExpired ? 'expired' : ''}">${isExpired ? 'Expired' : ''}</p>
            <p>Status: ${donation.status}</p>
            <button class="receive-btn" onclick="receiveFood(this, '${donation._id}')" ${isAccepted ? 'disabled' : ''}>
                ${isAccepted ? 'Food Received' : 'Receive Food'}
            </button>
        </div>
    `;
}

// Food Request System
function initializeRequestSystem() {
    if (requestFoodForm) {
        requestFoodForm.removeEventListener("submit", handleRequestSubmit);
        requestFoodForm.addEventListener("submit", handleRequestSubmit);
        console.log("Request form listener attached");
    }
    
    if (foodRequestList && !isRequestsLoaded) {
        fetchAndUpdateFoodRequests();
    }
}

async function handleRequestSubmit(event) {
    event.preventDefault();

    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");
    if (errorMessage && successMessage) {
        errorMessage.style.display = "none";
        successMessage.style.display = "none";
    }

    const requestData = {
        requestorName: document.getElementById("requestorName").value,
        requestorMobile: document.getElementById("requestorMobile").value,
        requestorLocation: document.getElementById("requestorLocation").value
    };

    console.log("Submitting food request:", requestData);

    try {
        const response = await fetch("http://localhost:5000/api/request-food", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();
        console.log("Server response:", { status: response.status, result });

        if (response.ok) {
            if (successMessage) {
                successMessage.textContent = result.message || "Food request submitted successfully!";
                successMessage.style.display = "block";
            }
            requestFoodForm.reset();
            setTimeout(() => window.location.href = "Food_Request.html", 1000);
        } else {
            throw new Error(result.message || "Failed to submit request");
        }
    } catch (error) {
        console.error("Request submission error:", error);
        if (errorMessage) {
            errorMessage.textContent = error.message || "Error submitting request. Please try again later.";
            errorMessage.style.display = "block";
        } else {
            alert(error.message || "Error submitting request. Please try again later.");
        }
    }
}

async function fetchAndUpdateFoodRequests() {
    if (isRequestsLoaded) return;

    try {
        const response = await fetch("http://localhost:5000/api/food-requests");
        if (!response.ok) throw new Error("Failed to fetch requests");
        
        foodRequests = await response.json();
        updateFoodRequestList(foodRequests);
        isRequestsLoaded = true;
    } catch (error) {
        console.error("Request fetch error:", error);
        if (foodRequestList) {
            foodRequestList.innerHTML = "<p>Error loading requests. Please try again later.</p>";
        }
    }
}

function updateFoodRequestList(requestArray = foodRequests) {
    if (!foodRequestList) return;
    
    foodRequestList.innerHTML = requestArray.length === 0
        ? "<p>No food requests found.</p>"
        : requestArray.map(createRequestItem).join("");
}

function createRequestItem(request) {
    return `
        <div class="food-request-item">
            <h3>Requestor: ${request.requestorName}</h3>
            <p>Mobile: ${request.requestorMobile}</p>
            <p>Location: <a href="https://www.google.com/maps/search/${encodeURIComponent(request.requestorLocation)}" target="_blank">${request.requestorLocation}</a></p>
            <button onclick="acceptRequest('${request._id}')">Accept Request</button>
             
        </div>
    `;
}

// Shared Functions
function setupSearchFunctionality() {
    const searchButton = document.getElementById("searchButton");
    const searchInput = document.getElementById("locationSearch");

    if (!searchButton || !searchInput) return;

    const searchHandler = () => {
        const searchValue = searchInput.value.trim().toLowerCase();
        
        if (donationList) {
            const filteredDonations = donations.filter(d => 
                d.location.toLowerCase().includes(searchValue)
            );
            updateDonationList(filteredDonations);
        }
        
        if (foodRequestList) {
            const filteredRequests = foodRequests.filter(r => 
                r.requestorLocation.toLowerCase().includes(searchValue)
            );
            updateFoodRequestList(filteredRequests);
        }
    };

    searchButton.addEventListener("click", searchHandler);
    searchInput.addEventListener("input", searchHandler);
}

function setupSidebarBehavior() {
    const sidebar = document.getElementById("sidebar");
    const hamburger = document.querySelector(".hamburger");

    if (sidebar && hamburger) {
        document.addEventListener("click", function(event) {
            if (!sidebar.contains(event.target) && !hamburger.contains(event.target)) {
                sidebar.style.left = "-250px";
            }
        });
    }
}

// Button Actions
async function receiveFood(button, donationId) {
    if (button.disabled) return;
    
    button.disabled = true;
    
    try {
        const response = await fetch(`http://localhost:5000/api/donations/${donationId}/accept`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to accept donation");
        }

        button.innerText = "Food Received";
        button.style.backgroundColor = "#4CAF50";
        button.style.color = "white";
        button.classList.add("received");

        isDonationsLoaded = false;
        await fetchAndUpdateDonations();
    } catch (error) {
        console.error("Donation acceptance error:", error);
        alert("Failed to accept donation: " + error.message);
        button.disabled = false;
    }
}

async function acceptRequest(requestId) {
    try {
        const response = await fetch(`http://localhost:5000/api/food-requests/${requestId}/accept`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" }
        });

        if (response.ok) {
            alert("Request accepted!");
            await fetchAndUpdateFoodRequests();
        } else {
            const errorData = await response.json();
            alert(errorData.message || "Failed to accept request.");
        }
    } catch (error) {
        console.error("Request acceptance error:", error);
        alert("Error accepting request: " + error.message);
    }
}

 

function toggleChat() {
    const chatBox = document.getElementById("chat-box");
    chatBox.style.display = chatBox.style.display === "none" ? "block" : "none";
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message) return;

    const log = document.getElementById("chat-log");
    log.innerHTML += `<div><strong>You:</strong> ${message}</div>`;
    input.value = '';

    // Add typing indicator
    const typingId = `typing-${Date.now()}`;
    log.innerHTML += `<div id="${typingId}"><strong>Bot:</strong> Typing...</div>`;
    log.scrollTop = log.scrollHeight;

    try {
        const res = await fetch('http://localhost:5000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        const data = await res.json();

        // Remove typing indicator
        document.getElementById(typingId).remove();

        if (data.reply) {
            log.innerHTML += `<div><strong>Bot:</strong> ${data.reply}</div>`;
        } else if (data.error) {
            log.innerHTML += `<div><strong>Bot:</strong> Error: ${data.error}${data.details ? ' - ' + data.details : ''}</div>`;
        } else {
            log.innerHTML += `<div><strong>Bot:</strong> Unexpected response from server.</div>`;
        }
    } catch (error) {
        console.error("Fetch error:", error);
        document.getElementById(typingId).remove();
        log.innerHTML += `<div><strong>Bot:</strong> Failed to connect to the server. Please try again later.</div>`;
    }

    log.scrollTop = log.scrollHeight;
}