const menuToggle = document.getElementById("menuToggle");
const nav = document.getElementById("nav");

if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
        const isOpen = nav.classList.toggle("open");

        menuToggle.setAttribute("aria-expanded", String(isOpen));
        menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
    });
}

const navLinks = document.querySelectorAll(".nav-link");

navLinks.forEach(link => {
    link.addEventListener("click", () => {
        if (nav) {
            nav.classList.remove("open");
        }

        if (menuToggle) {
            menuToggle.setAttribute("aria-expanded", "false");
            menuToggle.setAttribute("aria-label", "Abrir menu");
        }
    });
});

const header = document.getElementById("header");

if (header) {
    window.addEventListener("scroll", () => {
        if (window.scrollY > 50) {
            header.classList.add("scrolled");
        } else {
            header.classList.remove("scrolled");
        }
    });
}

const sections = document.querySelectorAll("section[id]");

if (sections.length > 0 && navLinks.length > 0) {
    window.addEventListener("scroll", () => {
        let current = "";

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 150;
            const sectionHeight = section.offsetHeight;

            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute("id");
            }
        });

        navLinks.forEach(link => {
            link.classList.remove("active");

            if (link.getAttribute("href") === "#" + current) {
                link.classList.add("active");
            }
        });
    });
}

const backToTop = document.getElementById("backToTop");

if (backToTop) {
    window.addEventListener("scroll", () => {
        if (window.scrollY > 500) {
            backToTop.classList.add("show");
        } else {
            backToTop.classList.remove("show");
        }
    });

    backToTop.addEventListener("click", () => {
        window.scrollTo({
            top: 0, behavior: "smooth"
        });
    });
}

const revealElements = [
    ...document.querySelectorAll(".portfolio-card"),
    ...document.querySelectorAll(".service-card"),
    ...document.querySelectorAll(".stat"),
    ...document.querySelectorAll(".contact-box")
];

if (revealElements.length > 0) {
    revealElements.forEach(element => {
        element.classList.add("reveal");
    });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    },
        {
            threshold: 0.12
        }
    );

    revealElements.forEach(element => {
        observer.observe(element);
    });
}

const cards = document.querySelectorAll(".portfolio-card, .service-card, .card, .servico");

cards.forEach(card => {
    card.addEventListener("mouseenter", () => {
        card.style.zIndex = "5";
    });

    card.addEventListener("mouseleave", () => {
        card.style.zIndex = "1";
    });
});

const heroBackground = document.querySelector(".hero-background");

if (heroBackground) {
    window.addEventListener("scroll", () => {
        const scrollPosition = window.scrollY;

        if (scrollPosition < 700) {
            heroBackground.style.transform = `scale(1.02) translateY(${scrollPosition * 0.08}px)`;
        }
    });
}

const portfolioCards = document.querySelectorAll(".portfolio-card");

portfolioCards.forEach(card => {
    card.addEventListener("click", () => {
        card.classList.toggle("selected");
    });
});

const btnVerMais = document.getElementById("verMaisTrabalhos");
const trabalhosExtras = document.querySelectorAll(".trabalho-extra");

if (btnVerMais && trabalhosExtras.length > 0) {
    const textoBotao = btnVerMais.querySelector(".botao-texto");
    const iconeBotao = btnVerMais.querySelector(".botao-icone img");
    let aberto = false;

    btnVerMais.addEventListener("click", (event) => {
        event.preventDefault();
        aberto = !aberto;

        trabalhosExtras.forEach(card => {
            card.classList.toggle("mostrar", aberto);
        });

        if (textoBotao) {
            textoBotao.textContent = aberto ? "VER MENOS TRABALHOS" : "VER MAIS TRABALHOS";
        }

        if (iconeBotao) {
            iconeBotao.style.transform = aberto ? "rotate(45deg)" : "rotate(0deg)";
        }

        btnVerMais.setAttribute("aria-expanded", String(aberto));
    });
}

console.log("Beleza & Arte - site carregado com sucesso!");
console.log("Botão VER MAIS TRABALHOS pronto!");