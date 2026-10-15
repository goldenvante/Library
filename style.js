const STORAGE_KEY = "library.books";
const BOOKS_PER_SHELF = 6;
const DEFAULT_COLOR = "#8c5a3b";

const bookshelf = document.getElementById("bookshelf");
const emptyState = document.getElementById("emptyState");
const libraryStats = document.getElementById("libraryStats");

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
const detailTitle = document.getElementById("detailTitle");
const detailAuthor = document.getElementById("detailAuthor");
const detailMeta = document.getElementById("detailMeta");
const detailToggle = document.getElementById("detailToggle");
const detailRemove = document.getElementById("detailRemove");
const detailClose = document.getElementById("detailClose");

let books = loadBooks();
let activeBookId = null;

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function registerBook({ title, author, pages, read, color }) {
  books.push({ id: createId(), title, author, pages, read, color });
  saveBooks();
  render();
}

function removeBook(id) {
  books = books.filter((book) => book.id !== id);
  saveBooks();
  render();
}

function toggleRead(id) {
  const book = books.find((entry) => entry.id === id);
  if (!book) return;
  book.read = !book.read;
  saveBooks();
  render();
}

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

function createBookElement(book) {
  const el = document.createElement("article");
  el.className = "book";
  el.dataset.id = book.id;
  el.dataset.read = String(book.read);
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", `${book.title} by ${book.author}. ${book.read ? "Read" : "Not read yet"}. Open details`);
  el.style.setProperty("--book-color", book.color || DEFAULT_COLOR);
  el.style.setProperty("--book-height", `${bookHeight(book)}px`);
  el.style.setProperty("--spine-width", `${spineWidth(book)}px`);
  el.style.setProperty("--spine-font", `${spineFontSize(book)}px`);

  const title = document.createElement("span");
  title.className = "spine-title";
  title.textContent = book.title;
  el.appendChild(title);

  return el;
}

function render() {
  bookshelf.innerHTML = "";

  if (books.length === 0) {
    emptyState.hidden = false;
    updateStats();
    return;
  }
  emptyState.hidden = true;

  for (let i = 0; i < books.length; i += BOOKS_PER_SHELF) {
    const row = document.createElement("div");
    row.className = "shelf-books";

    books.slice(i, i + BOOKS_PER_SHELF).forEach((book) => {
      row.appendChild(createBookElement(book));
    });

    const board = document.createElement("div");
    board.className = "shelf-board";

    const shelf = document.createElement("section");
    shelf.className = "shelf";
    shelf.append(row, board);

    bookshelf.appendChild(shelf);
  }

  updateStats();
}

function updateStats() {
  const total = books.length;
  const read = books.filter((book) => book.read).length;
  const pages = books.reduce((sum, book) => sum + (Number(book.pages) || 0), 0);

  if (total === 0) {
    libraryStats.textContent = "No books registered yet";
    return;
  }

  libraryStats.textContent =
    `${total} book${total === 1 ? "" : "s"} · ${read} read · ${pages} pages`;
}

function refreshDetail() {
  const book = books.find((entry) => entry.id === activeBookId);
  if (!book) return;
  detailTitle.textContent = book.title;
  detailAuthor.textContent = book.author;
  detailMeta.textContent = `${book.pages} pages · ${book.read ? "Read" : "Not read yet"}`;
  detailToggle.textContent = book.read ? "Mark as unread" : "Mark as read";
}

function openDetail(id) {
  activeBookId = id;
  refreshDetail();
  detailDialog.showModal();
}

addBookBtn.addEventListener("click", () => {
  bookForm.reset();
  colorInput.value = DEFAULT_COLOR;
  formError.hidden = true;
  bookDialog.showModal();
});

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

detailToggle.addEventListener("click", () => {
  toggleRead(activeBookId);
  refreshDetail();
});

detailRemove.addEventListener("click", () => {
  removeBook(activeBookId);
  detailDialog.close();
});

detailClose.addEventListener("click", () => detailDialog.close());

[bookDialog, detailDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

render();
