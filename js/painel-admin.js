document.addEventListener("DOMContentLoaded", () => {
    const search = document.getElementById("professional-search");
    const specialty = document.getElementById("specialty-filter");
    const cards = document.querySelectorAll(".professional-card");

    function filterProfessionals() {
        const query = (search?.value || "").toLowerCase();
        const selected = specialty?.value || "";
        cards.forEach(card => {
            const matchesName = card.dataset.name.toLowerCase().includes(query);
            const matchesSpecialty = !selected || card.dataset.specialty === selected;
            card.hidden = !(matchesName && matchesSpecialty);
        });
    }

    search?.addEventListener("input", filterProfessionals);
    specialty?.addEventListener("change", filterProfessionals);

    const appointmentFilter = document.getElementById("appointment-filter");
    appointmentFilter?.addEventListener("change", () => {
        document.querySelectorAll("[data-appointment-status]").forEach(row => {
            row.hidden = appointmentFilter.value !== "all" && row.dataset.appointmentStatus !== appointmentFilter.value;
        });
    });
});
