// client-onboarding.js

// Live Google Apps Script Web App URL (deployed with "Anyone" access)
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwVQY4cPNtl2CYO26nq0CgMqjC0TJBXWhWKnm_NxJJSUVhIxi1Jpy4xP1j9ZSoOc5tzkQ/exec";

(function () {
  const form = document.getElementById("onboardingForm");
  const fieldsets = Array.from(form.querySelectorAll("fieldset"));
  const totalSteps = fieldsets.length;
  let currentStep = 0;

  const progressBar = document.getElementById("progressBar");
  const progressPercent = document.getElementById("progressPercent");
  const stepLabel = document.getElementById("stepLabel");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const stepPills = Array.from(document.querySelectorAll(".step-pill"));

  /* ---------- CHIP UI HANDLING ---------- */

  function updateChipSelection() {
    document.querySelectorAll(".chip").forEach((chip) => {
      const input = chip.querySelector("input");
      if (!input) return;

      if (input.type === "radio") {
        const name = input.name;
        const checked = document.querySelector(`input[name="${name}"]:checked`);
        chip.classList.toggle("selected", checked === input);
      } else if (input.type === "checkbox") {
        chip.classList.toggle("selected", input.checked);
      }
    });
  }

  document.addEventListener("change", (e) => {
    if (e.target.closest(".chip")) {
      updateChipSelection();
    }
  });

  /* ---------- STEP / PROGRESS HANDLING ---------- */

  function showStep(stepIndex) {
    fieldsets.forEach((fs, idx) => {
      fs.classList.toggle("active", idx === stepIndex);
    });

    const title = fieldsets[stepIndex].dataset.title || `Section ${stepIndex + 1}`;
    stepLabel.textContent = `Section ${stepIndex + 1} of ${totalSteps} · ${title}`;

    const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);
    progressBar.style.width = `${progress}%`;
    progressPercent.textContent = `${progress}%`;

    prevBtn.style.visibility = stepIndex === 0 ? "hidden" : "visible";
    nextBtn.textContent = stepIndex === totalSteps - 1 ? "Submit" : "Next →";

    stepPills.forEach((pill, idx) => {
      pill.classList.toggle("active", idx === stepIndex);
      pill.classList.toggle("completed", idx < stepIndex);
    });

    currentStep = stepIndex;
  }

  prevBtn.addEventListener("click", () => {
    if (currentStep > 0) showStep(currentStep - 1);
  });

  nextBtn.addEventListener("click", () => {
    if (currentStep < totalSteps - 1) {
      showStep(currentStep + 1);
    } else {
      submitForm();
    }
  });

  stepPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const target = parseInt(pill.dataset.step, 10);
      // Allow moving to any previous or current step; block jumping ahead of first unseen step if you wish
      if (target <= currentStep) {
        showStep(target);
      }
    });
  });

  /* ---------- SUBMISSION TO GOOGLE SHEETS ---------- */

  function submitForm() {
    const formData = new FormData(form);
    const payload = {};

    for (const [key, value] of formData.entries()) {
      if (payload[key]) {
        if (Array.isArray(payload[key])) {
          payload[key].push(value);
        } else {
          payload[key] = [payload[key], value];
        }
      } else {
        payload[key] = value;
      }
    }

    // UX: disable button while submitting
    nextBtn.disabled = true;
    nextBtn.textContent = "Submitting...";

    // IMPORTANT: no custom headers → simple POST, avoids preflight/CORS issues
    fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("HTTP " + res.status + " " + res.statusText);
        }
        // Try JSON; if it fails, treat as success
        return res.json().catch(() => ({}));
      })
      .then((data) => {
        console.log("Google Sheets response:", data);
        if (data.status && data.status !== "success") {
          throw new Error(data.message || "Apps Script returned an error");
        }

        alert("Thank you. Your New Client Questionnaire has been submitted.");
        form.reset();
        updateChipSelection();
        showStep(0);
      })
      .catch((err) => {
        console.error("Error submitting form:", err);
        alert("Error submitting form: " + err.message);
      })
      .finally(() => {
        nextBtn.disabled = false;
        nextBtn.textContent = "Submit";
      });
  }

  /* ---------- INITIALISE ---------- */

  showStep(0);
  updateChipSelection();
})();
