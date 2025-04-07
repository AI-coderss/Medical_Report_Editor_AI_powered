
const tabs = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".content");

tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
        // Remove active class from all tabs and contents
        tabs.forEach((t) => t.classList.remove("active"));
        contents.forEach((c) => c.classList.remove("active"));

        // Add active class to clicked tab and show content
        tab.classList.add("active");
        const targetId = tab.getAttribute("data-target");
        if (targetId) {
            document.getElementById(targetId).classList.add("active");
        }
    });
});

function toggleMenu() {
    document.getElementById("menu").classList.toggle("show");
}
