const STORAGE_KEY = "library.books";
const SEED_KEY = "library.seeded";
const BOOKS_PER_SHELF = 6;
const DEFAULT_COLOR = "#8c5a3b";

const bookshelf = document.getElementById("bookshelf");
const emptyState = document.getElementById("emptyState");

const statTotal = document.getElementById("statTotal");
const statRead = document.getElementById("statRead");
const statUnread = document.getElementById("statUnread");
const statPages = document.getElementById("statPages");
const progressPercent = document.getElementById("progressPercent");
const progressBar = document.getElementById("progressBar");
const progressTrack = document.getElementById("progressTrack");

const searchInput = document.getElementById("searchInput");
const filterGroup = document.getElementById("filterGroup");
const sortSelect = document.getElementById("sortSelect");

const lightToggle = document.getElementById("lightToggle");
const shelfHint = document.getElementById("shelfHint");

const addBookBtn = document.getElementById("addBookBtn");
const bookDialog = document.getElementById("bookDialog");
const bookForm = document.getElementById("bookForm");
const cancelBtn = document.getElementById("cancelBtn");
const formError = document.getElementById("formError");

const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const pagesInput = document.getElementById("pages");
const readInput = document.getElementById("read");
const colorInput = document.getElementById("color");

const detailDialog = document.getElementById("detailDialog");
const detailCover = document.getElementById("detailCover");
const detailCoverTitle = document.getElementById("detailCoverTitle");
const detailCoverAuthor = document.getElementById("detailCoverAuthor");
const detailTitle = document.getElementById("detailTitle");
const detailAuthor = document.getElementById("detailAuthor");
const detailMeta = document.getElementById("detailMeta");
const detailToggle = document.getElementById("detailToggle");
const detailRemove = document.getElementById("detailRemove");
const detailClose = document.getElementById("detailClose");

const toasts = document.getElementById("toasts");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function splitText(el) {
  if (!el) return;
  const text = el.textContent;
  el.textContent = "";
  Array.from(text).forEach((char, index) => {
    const span = document.createElement("span");
    span.className = char === " " ? "letter space" : "letter";
    span.style.setProperty("--i", String(index));
    span.textContent = char === " " ? "\u00A0" : char;
    el.appendChild(span);
  });
}

splitText(document.querySelector(".brand h1"));
splitText(document.querySelector(".tagline"));

let books = loadBooks();
let activeBookId = null;
let newBookId = null;
let searchTerm = "";
let statusFilter = "all";
let sortBy = "newest";
let lightsOn = localStorage.getItem("library.lights") === "on";

function applyLights() {
  document.body.classList.toggle("lights-on", lightsOn);
  lightToggle.setAttribute("aria-checked", String(lightsOn));
  shelfHint.textContent = lightsOn
    ? "Lights on — happy browsing!"
    : "Turn on the light to browse your shelves";
}

lightToggle.addEventListener("click", () => {
  lightsOn = !lightsOn;
  localStorage.setItem("library.lights", lightsOn ? "on" : "off");
  applyLights();
});

applyLights();

seedLibrary();

const shelfObserver =
  !reduceMotion && "IntersectionObserver" in window
    ? new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.12 }
      )
    : null;

/* ---------- Storage ---------- */
function loadBooks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function seedLibrary() {
  if (localStorage.getItem(SEED_KEY)) return;

  const samples = [
    { title: "The Hobbit", author: "J.R.R. Tolkien", pages: 310, read: true, color: "#7a4b2a" },
    { title: "1984", author: "George Orwell", pages: 328, read: true, color: "#8a2f2f" },
    { title: "The Great Gatsby", author: "F. Scott Fitzgerald", pages: 180, read: false, color: "#2f5d8a" },
    { title: "Sapiens", author: "Yuval Noah Harari", pages: 443, read: false, color: "#5c6e2f" },
    { title: "Pride and Prejudice", author: "Jane Austen", pages: 432, read: true, color: "#6b3f7a" },
    { title: "Clean Code", author: "Robert C. Martin", pages: 464, read: false, color: "#3f4b5a" },
    { title: "The Alchemist", author: "Paulo Coelho", pages: 197, read: true, color: "#b3541e" },
    { title: "Educated", author: "Tara Westover", pages: 352, read: false, color: "#4a6e5a" },
  ];

  const now = Date.now();
  samples.forEach((sample, index) => {
    books.push({
      id: createId(),
      addedAt: now - (samples.length - index) * 86400000,
      ...sample,
    });
  });

  saveBooks();
  localStorage.setItem(SEED_KEY, "1");
}

/* ---------- Book actions ---------- */
function registerBook({ title, author, pages, read, color }) {
  const book = { id: createId(), addedAt: Date.now(), title, author, pages, read, color };
  books.push(book);
  newBookId = book.id;
  saveBooks();
  render();
  showToast(`"${title}" was added to the shelf`);
}

function removeBook(id) {
  const target = books.find((book) => book.id === id);
  books = books.filter((book) => book.id !== id);
  saveBooks();
  render({ animate: false });
  if (target) showToast(`"${target.title}" was removed`);
}

function requestRemove(id) {
  const el = bookshelf.querySelector(`.book[data-id="${CSS.escape(id)}"]`);

  if (!el || reduceMotion) {
    removeBook(id);
    return;
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    removeBook(id);
  };

  el.classList.add("is-leaving");
  el.addEventListener("animationend", finish, { once: true });
  setTimeout(finish, 400);
}

function toggleRead(id) {
  const book = books.find((entry) => entry.id === id);
  if (!book) return;
  book.read = !book.read;
  saveBooks();
  render({ animate: false });
  showToast(`"${book.title}" marked as ${book.read ? "read" : "unread"}`);
}

/* ---------- Filtering & sorting ---------- */
function visibleBooks() {
  const term = searchTerm.trim().toLowerCase();

  const list = books.filter((book) => {
    const matchesSearch =
      !term ||
      book.title.toLowerCase().includes(term) ||
      book.author.toLowerCase().includes(term);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "read" && book.read) ||
      (statusFilter === "unread" && !book.read);
    return matchesSearch && matchesStatus;
  });

  list.sort((a, b) => {
    switch (sortBy) {
      case "title":
        return a.title.localeCompare(b.title);
      case "author":
        return a.author.localeCompare(b.author);
      case "pages":
        return b.pages - a.pages;
      default:
        return (b.addedAt || 0) - (a.addedAt || 0);
    }
  });

  return list;
}

/* ---------- Rendering ---------- */
function bookHeight(book) {
  return Math.round(Math.min(260, Math.max(150, 130 + book.pages / 4)));
}

function spineWidth(book) {
  const seed = book.title.length + book.author.length;
  return 34 + (seed % 4) * 6;
}

function spineFontSize(book) {
  const available = bookHeight(book) - 56;
  const size = available / (Math.max(book.title.length, 1) * 1.08);
  return Math.round(Math.min(15, Math.max(9, size)));
}

function createBookElement(book, { animate, index }) {
  const el = document.createElement("article");
  el.className = "book";
  el.dataset.id = book.id;
  el.dataset.read = String(book.read);
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.setAttribute(
    "aria-label",
    `${book.title} by ${book.author}. ${book.read ? "Read" : "Not read yet"}. Open details`
  );
  el.style.setProperty("--book-color", book.color || DEFAULT_COLOR);
  el.style.setProperty("--book-height", `${bookHeight(book)}px`);
  el.style.setProperty("--spine-width", `${spineWidth(book)}px`);
  el.style.setProperty("--spine-font", `${spineFontSize(book)}px`);
  el.style.setProperty("--i", index);

  if (animate && !reduceMotion) el.classList.add("animate-in");
  if (book.id === newBookId) el.classList.add("is-new");

  const title = document.createElement("span");
  title.className = "spine-title";
  title.textContent = book.title;
  el.appendChild(title);

  return el;
}

function render({ animate = true } = {}) {
  const visible = visibleBooks();
  bookshelf.innerHTML = "";
  let index = 0;

  for (let i = 0; i < visible.length; i += BOOKS_PER_SHELF) {
    const row = document.createElement("div");
    row.className = "shelf-books";

    visible.slice(i, i + BOOKS_PER_SHELF).forEach((book) => {
      row.appendChild(createBookElement(book, { animate, index }));
      index += 1;
    });

    const board = document.createElement("div");
    board.className = "shelf-board";

    const shelf = document.createElement("section");
    shelf.className = "shelf";
    shelf.append(row, board);

    bookshelf.appendChild(shelf);

    if (shelfObserver && animate) {
      shelfObserver.observe(shelf);
    } else {
      shelf.classList.add("is-visible");
    }
  }

  updateEmptyState(visible.length);
  updateStats();
  newBookId = null;
}

function updateEmptyState(visibleCount) {
  if (visibleCount > 0) {
    emptyState.hidden = true;
    return;
  }

  emptyState.hidden = false;
  emptyState.textContent =
    books.length === 0
      ? "The shelves are empty. Add your first book!"
      : "No books match your search or filter.";
}

/* ---------- Stats ---------- */
function animateNumber(el, target) {
  const from = Number(el.dataset.value || 0);
  el.dataset.value = String(target);

  if (from !== target && !reduceMotion) {
    el.classList.remove("pop");
    void el.offsetWidth;
    el.classList.add("pop");
  }

  if (reduceMotion || from === target) {
    el.textContent = target.toLocaleString("en-US");
    return;
  }

  const duration = 550;
  const start = performance.now();

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = Math.round(from + (target - from) * eased).toLocaleString("en-US");
    if (t < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function updateStats() {
  const total = books.length;
  const read = books.filter((book) => book.read).length;
  const pages = books.reduce((sum, book) => sum + (Number(book.pages) || 0), 0);
  const percent = total ? Math.round((read / total) * 100) : 0;

  animateNumber(statTotal, total);
  animateNumber(statRead, read);
  animateNumber(statUnread, total - read);
  animateNumber(statPages, pages);

  progressBar.style.width = `${percent}%`;
  progressPercent.textContent = `${percent}%`;
  progressTrack.setAttribute("aria-valuenow", String(percent));
}

/* ---------- Toasts ---------- */
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.textContent = message;
  toasts.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 350);
  }, 2600);
}

/* ---------- Dialogs ---------- */
function openAddDialog() {
  bookForm.reset();
  colorInput.value = DEFAULT_COLOR;
  formError.hidden = true;
  bookDialog.showModal();
}

function refreshDetail() {
  const book = books.find((entry) => entry.id === activeBookId);
  if (!book) return;

  const color = book.color || DEFAULT_COLOR;
  detailCover.style.background =
    `linear-gradient(150deg, rgba(255,255,255,0.18), rgba(0,0,0,0.35)), ${color}`;
  detailCoverTitle.textContent = book.title;
  detailCoverAuthor.textContent = book.author;
  detailTitle.textContent = book.title;
  detailAuthor.textContent = book.author;
  detailMeta.textContent = `${book.pages} pages Â· ${book.read ? "Read" : "Not read yet"}`;
  detailToggle.textContent = book.read ? "Mark as unread" : "Mark as read";
}

function openDetail(id) {
  activeBookId = id;
  detailCover.style.transform = "";
  refreshDetail();
  detailDialog.showModal();
}

/* ---------- Events ---------- */
addBookBtn.addEventListener("click", openAddDialog);
cancelBtn.addEventListener("click", () => bookDialog.close());

bookForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const author = authorInput.value.trim();
  const pages = Number(pagesInput.value);

  if (!title || !author || !pagesInput.value.trim() || !Number.isInteger(pages) || pages < 1) {
    formError.textContent =
      "Please fill in the title, the author and a valid page count (whole number of 1 or more).";
    formError.hidden = false;
    return;
  }

  registerBook({
    title,
    author,
    pages,
    read: readInput.checked,
    color: colorInput.value,
  });

  bookDialog.close();
});

bookshelf.addEventListener("click", (event) => {
  const spine = event.target.closest(".book");
  if (spine) openDetail(spine.dataset.id);
});

bookshelf.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const spine = event.target.closest(".book");
  if (!spine) return;
  event.preventDefault();
  openDetail(spine.dataset.id);
});

bookshelf.addEventListener("mousemove", (event) => {
  const panel = event.target.closest(".shelf-books");
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  panel.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  panel.style.setProperty("--my", `${event.clientY - rect.top}px`);
});

detailDialog.addEventListener("mousemove", (event) => {
  if (reduceMotion) return;
  const rect = detailCover.getBoundingClientRect();
  if (rect.width === 0) return;
  const px = (event.clientX - rect.left) / rect.width - 0.5;
  const py = (event.clientY - rect.top) / rect.height - 0.5;
  detailCover.style.transform =
    `rotateY(${(px * 18).toFixed(2)}deg) rotateX(${(-py * 14).toFixed(2)}deg)`;
});

detailDialog.addEventListener("mouseleave", () => {
  detailCover.style.transform = "";
});

detailToggle.addEventListener("click", () => {
  toggleRead(activeBookId);
  refreshDetail();
});

detailRemove.addEventListener("click", () => {
  detailDialog.close();
  requestRemove(activeBookId);
});

detailClose.addEventListener("click", () => detailDialog.close());

[bookDialog, detailDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value;
  render();
});

sortSelect.addEventListener("change", () => {
  sortBy = sortSelect.value;
  render();
});

filterGroup.addEventListener("click", (event) => {
  const chip = event.target.closest(".chip");
  if (!chip) return;
  statusFilter = chip.dataset.filter;
  filterGroup.querySelectorAll(".chip").forEach((entry) => {
    entry.classList.toggle("is-active", entry === chip);
  });
  render();
});

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() !== "n" || event.ctrlKey || event.metaKey || event.altKey) return;
  const tag = document.activeElement ? document.activeElement.tagName : "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  if (bookDialog.open || detailDialog.open) return;
  event.preventDefault();
  openAddDialog();
});

render();
