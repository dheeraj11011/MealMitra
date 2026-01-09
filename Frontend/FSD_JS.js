// ------------------------
// 🌍 BASE API URL (Render Backend)
// ------------------------
const BASE_URL = "https://mealmitra-khuf.onrender.com";

// GLOBAL DATA
let donations = [];
let foodRequests = [];
let isDonationsLoaded = false;
let isRequestsLoaded = false;

// DOM ELEMENTS
const donationForm = document.getElementById("donationForm");
const donationList = document.getElementById("donationList");
const requestFoodForm = document.getElementById("requestFoodForm");
const foodRequestList = document.getElementById("foodRequestList");

// ------------------------
// INIT APP
// ------------------------
document.addEventListener("DOMContentLoaded", () => {
    initializeDonationSystem();
    initializeRequestSystem();
    setupSearchFunctionality();
    setupSidebarBehavior();
});


// =======================
// 🍱 DONATION SYSTEM
// =======================
function initializeDonationSystem() {
    if (donationForm) {
        donationForm.addEventListener("submit", handleDonationSubmit);
    }

    if (donationList && !isDonationsLoaded) {
        fetchAndUpdateDonations();
    }
}

async function handleDonationSubmit(event) {
    event.preventDefault();

    const errorMessage = document.getElementById("error-message");
    const successMessage = document.getElementById("success-message");

    if (errorMessage) errorMessage.style.display = "none";
    if (successMessage) successMessage.style.display = "none";

    const formData = {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        mobile: formatMobileNumber(document.getElementById("mobile").value),
        foodDetails: document.getElementById("foodDetails").value,
        expiryDate: document.getElementById("expiryDate").value,
        location: document.getElementById("location").value
    };

    if (!validateMobileNumber(formData.mobile)) {
        errorMessage.textContent = "Invalid mobile number! Use format: +911234567890";
        errorMessage.style.display = "block";
        return;
    }

   try {
    const response = await fetch(`${BASE_URL}/api/submit-donation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
    });

    const result = await response.json();

    if (response.ok) {
        successMessage.textContent = result.message;
        successMessage.style.display = "block";
        donationForm.reset();
        setTimeout(() => (window.location.href = "donations.html"), 800);
    } else {
        throw new Error(result.message);
    }
} catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.style.display = "block";
}

}

function formatMobileNumber(num) {
    if (!num.startsWith("+")) return "+" + num;
    return num;
}

function validateMobileNumber(m) {
    return /^\+[1-9]\d{9,14}$/.test(m);
}

async function fetchAndUpdateDonations() {
    try {
        const response = await fetch(`${BASE_URL}/api/donations`);
        donations = await response.json();
        updateDonationList();
        isDonationsLoaded = true;
    } catch (error) {
        donationList.innerHTML = "<p>Error loading donations.</p>";
    }
}

function updateDonationList() {
    if (!donationList) return;
    donationList.innerHTML =
        donations.length ? donations.map(createDonationItem).join("") : "<p>No donations available.</p>";
}

function createDonationItem(d) {
    const isAccepted = d.status === "Accepted";

    return `
        <div class="donation-item">
            <h3>${d.name}</h3>
            <p>Email: ${d.email}</p>
            <p>Mobile: ${d.mobile}</p>
            <p>Food: ${d.foodDetails}</p>
            <p>Location: 
                <a href="https://www.google.com/maps/search/${encodeURIComponent(d.location)}" target="_blank">
                    ${d.location}
                </a>
            </p>
            <p>Expiry: ${d.expiryDate}</p>
            <p>Status: ${d.status}</p>
            <button onclick="receiveFood(this, '${d._id}')" ${isAccepted ? "disabled" : ""}>
                ${isAccepted ? "Food Received" : "Receive Food"}
            </button>
        </div>
    `;
}

async function receiveFood(button, id) {
    try {
        button.disabled = true;

        const response = await fetch(`${BASE_URL}/api/donations/${id}/accept`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) throw new Error("Failed to accept");

        button.innerText = "Food Received";
        button.style.background = "green";

        await fetchAndUpdateDonations();
    } catch (e) {
        alert("Error: " + e.message);
        button.disabled = false;
    }
}



// =======================
// 🍽 FOOD REQUEST SYSTEM
// =======================
function initializeRequestSystem() {
    if (requestFoodForm) {
        requestFoodForm.addEventListener("submit", handleRequestSubmit);
    }

    if (foodRequestList && !isRequestsLoaded) {
        fetchAndUpdateFoodRequests();
    }
}

async function handleRequestSubmit(event) {
    event.preventDefault();

    const reqData = {
        requestorName: document.getElementById("requestorName").value,
        requestorMobile: document.getElementById("requestorMobile").value,
        requestorLocation: document.getElementById("requestorLocation").value
    };

    try {
        const response = await fetch(`${BASE_URL}/api/request-food`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(reqData)
        });

        const data = await response.json();

        if (response.ok) {
            alert("Food request submitted!");
            requestFoodForm.reset();
            setTimeout(() => (window.location.href = "Food_Request.html"), 800);
        } else {
            throw new Error(data.message);
        }
    } catch (err) {
        alert("Error submitting request");
    }
}

async function fetchAndUpdateFoodRequests() {
    try {
        const response = await fetch(`${BASE_URL}/api/food-requests`);
        foodRequests = await response.json();
        updateFoodRequestList();
        isRequestsLoaded = true;
    } catch (e) {
        foodRequestList.innerHTML = "<p>Error loading requests.</p>";
    }
}

function updateFoodRequestList() {
    if (!foodRequestList) return;

    foodRequestList.innerHTML = foodRequests.length
        ? foodRequests.map(createRequestItem).join("")
        : "<p>No requests found.</p>";
}

function createRequestItem(r) {
    return `
        <div class="food-request-item">
            <h3>${r.requestorName}</h3>
            <p>${r.requestorMobile}</p>
            <p>
                <a href="https://www.google.com/maps/search/${encodeURIComponent(r.requestorLocation)}" target="_blank">
                    ${r.requestorLocation}
                </a>
            </p>
            <button onclick="acceptRequest('${r._id}')">Accept Request</button>
        </div>
    `;
}

async function acceptRequest(id) {
    const response = await fetch(`${BASE_URL}/api/food-requests/${id}/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
    });

    if (response.ok) {
        alert("Accepted!");
        fetchAndUpdateFoodRequests();
    } else {
        alert("Error accepting request!");
    }
}



// =======================
// 🤖 AI CHATBOT SYSTEM
// =======================

let sessionId = null;

function toggleChat() {
    const box = document.getElementById("chat-box");
    box.style.display = box.style.display === "none" ? "block" : "none";
}

async function sendMessage() {
    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (!text) return;

    const log = document.getElementById("chat-log");
    log.innerHTML += `<div><strong>You:</strong> ${text}</div>`;
    input.value = "";

    const typingId = `t-${Date.now()}`;
    log.innerHTML += `<div id="${typingId}">Bot: Typing...</div>`;

    try {
        const res = await fetch(`${BASE_URL}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: text, sessionId })
        });

        const data = await res.json();
        document.getElementById(typingId).remove();

        if (data.reply) {
            log.innerHTML += `<div><strong>Bot:</strong> ${data.reply}</div>`;
        }

        if (data.sessionId) sessionId = data.sessionId;
    } catch (error) {
        document.getElementById(typingId).remove();
        log.innerHTML += `<div><strong>Bot:</strong> Could not connect to server.</div>`;
    }

    log.scrollTop = log.scrollHeight;
}
