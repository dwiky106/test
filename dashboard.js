
// =======================
// GLOBAL HELPER (WAJIB PALING ATAS)
// =======================

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.innerText = message;
  toast.className = "";
  toast.classList.add(`toast-${type}`);

  toast.style.display = "block";

  setTimeout(() => {
    toast.style.display = "none";
  }, 3000);
}

function showLoading(text = "Memproses...") {

  // 🔥 hapus kalau sudah ada
  const old = document.getElementById("GLOBAL_LOADING");
  if (old) old.remove();

  // 🔥 buat baru
  const el = document.createElement("div");
  el.id = "GLOBAL_LOADING";

  el.style.position = "fixed";
  el.style.top = "0";
  el.style.left = "0";
  el.style.width = "100vw";
  el.style.height = "100vh";
  el.style.background = "rgba(0,0,0,0.8)";
  el.style.zIndex = "999999";
  el.style.display = "flex";
  el.style.justifyContent = "center";
  el.style.alignItems = "center";
  el.style.flexDirection = "column";

  el.innerHTML = `
    <div style="
      width:60px;
      height:60px;
      border:6px solid #ccc;
      border-top:6px solid #00b4d8;
      border-radius:50%;
      animation: spin 1s linear infinite;
    "></div>

    <p style="color:white;margin-top:15px;font-size:16px;">
      ${text}
    </p>
  `;

  document.body.appendChild(el);
}

function hideLoading() {
  const el = document.getElementById("GLOBAL_LOADING");
  if (el) el.remove();
}

const originalFetch = window.fetch;

window.fetch = async (...args) => {
  showLoading("Memproses...");

  try {
    const res = await originalFetch(...args);
    return res;
  } finally {
    hideLoading();
  }
};
// =======================
// CONFIG
// =======================
const POST_URL = "https://script.google.com/macros/s/AKfycbwjlsCbWaYLyLWRFDznpCKR0n25-go14z7qBC2ZWMopbdpHCyx6vRZoLiLXeh84sDc/exec";

const KOLAM_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=kolam";

const RECORDING_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=recording";

const STOK_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=stok_pakan";

const LOG_PAKAN_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=log_pakan";

// =======================
// STATE
// =======================
let selectedKurasId = null;
let selectedEditKolam = null;
let selectedEditId = null;
let kolamData = [];
let selectedKolamId = null;
let filterState = {};

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {

  const container = document.getElementById("kolamContainer");
  const searchInput = document.getElementById("searchKolam");
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const menuItems = document.querySelectorAll(".sidebar li");
  const sections = document.querySelectorAll(".section");
  // 🔥 LOAD HALAMAN TERAKHIR
const lastPage = localStorage.getItem("activeMenu");

if (lastPage) {
  sections.forEach(sec => sec.classList.remove("active"));
  const target = document.getElementById(lastPage);
  if (target) target.classList.add("active");
}

  // NAVIGATION
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

menuItems.forEach(item => {
  item.addEventListener("click", () => {
    const target = item.getAttribute("data-section");

    sections.forEach(sec => sec.classList.remove("active"));
    document.getElementById(target).classList.add("active");

    localStorage.setItem("activeSection", target);

    if (target === "pakan") {
      loadPakanPage(); // 🔥 AUTO LOAD
    }

    sidebar.classList.remove("active");
  });
});

  // SEARCH
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderKolam(container, searchInput.value);
    });
  }

  // SUBMIT RECORDING
  document.getElementById("submitRecording").onclick = async () => {

    const suhu = document.getElementById("inputSuhu").value;
    const ph = document.getElementById("inputPh").value;
    const doAir = document.getElementById("inputDo").value;
    const kematian = document.getElementById("inputKematian").value;
    const jenis = document.getElementById("jenisPakan").value;
    const pakan = document.getElementById("inputPakan").value;

    if (!suhu || !ph || !doAir) {
      alert("Isi data dengan benar!");
      return;
    }

    if (!jenis) {
      alert("Pilih jenis pakan!");
      return;
    }

    const formData = new URLSearchParams();
    formData.append("action", "recording");
    formData.append("kolam_id", selectedKolamId);
    formData.append("tanggal", new Date().toLocaleDateString("sv-SE"));
    formData.append("suhu", suhu);
    formData.append("ph", ph);
    formData.append("do", doAir);
    formData.append("kematian", kematian || 0);
    formData.append("jenis_pakan", jenis);
    formData.append("pakan", pakan || 0);

    try {
      await fetch(POST_URL, {
        method: "POST",
        body: formData
      });

      showToast("Recording berhasil!", "success");

      await loadStokPakan();
      await loadPengeluaranPakan();
      await loadKolamPakan();

      closeModal();
      loadKolam();

    } catch (err) {
      console.error("ERROR RECORDING:", err);
      showToast("Gagal simpan recording!");
    }
  };

  // LOAD DATA AWAL
  loadKolam();
});

// =======================
// TAMBAH KOLAM
// =======================
async function tambahKolam(nama, kapasitas) {

  const formData = new URLSearchParams();
  formData.append("action", "tambah_kolam");
  formData.append("nama", nama);
  formData.append("kapasitas", kapasitas);
  formData.append("status", "aktif");

  try {
    await fetch(POST_URL, {
      method: "POST",
      body: formData
    });

    showToast("Kolam berhasil ditambahkan!");
    loadKolam();

  } catch (err) {
    console.error("ERROR TAMBAH KOLAM:", err);
    alert("Gagal tambah kolam!");
  }
}

function submitKolam() {
  const nama = document.getElementById("namaKolam").value;
  const kapasitas = Number(document.getElementById("kapasitasKolam").value);

  if (!nama || kapasitas <= 0) {
    alert("Isi data dengan benar!");
    return;
  }

  tambahKolam(nama, kapasitas);

  document.getElementById("namaKolam").value = "";
  document.getElementById("kapasitasKolam").value = "";
}

// =======================
// LOAD KOLAM
// =======================
async function loadKolam() {
  try {
    const res = await fetch(KOLAM_CSV);
    const text = await res.text();

    const rows = text.trim().split("\n").map(r =>
      r.replace(/"/g, "").split(",")
    );

    rows.shift();

   kolamData = rows.map(row => ({
  id: Number(row[0]),
  nama: row[1],
  kapasitas: Number(row[2]),   // tebar awal
  populasi: Number(row[3]),    // 🔥 sisa ikan
  status: row[4],              // 🔥 status pindah ke index 4

  suhu: "-",
  ph: "-",
  do: "-",
  kematian: "-"
}));

    await loadRecording();

    const container = document.getElementById("kolamContainer");
    renderKolam(container);

  } catch (err) {
    console.error("LOAD KOLAM ERROR:", err);
  }
}

// =======================
// LOAD perbandingan
// =======================
function hitungPerbandingan(last, prev) {
  if (!prev || prev === 0) {
    return {
      status: "stabil",
      persen: "0%"
    };
  }

  const diff = last - prev;
  const percent = ((diff / prev) * 100).toFixed(1);

  if (diff > 0) {
    return {
      status: "naik",
      persen: "+" + percent + "%"
    };
  } else if (diff < 0) {
    return {
      status: "turun",
      persen: percent + "%"
    };
  } else {
    return {
      status: "stabil",
      persen: "0%"
    };
  }
}
// =======================
// LOAD RECORDING
// =======================
async function loadRecording() {
  try {
    const res = await fetch(RECORDING_CSV);
    const text = await res.text();

    if (!text || text.length < 10) return;

    const rows = text.trim().split("\n").map(r =>
      r.replace(/"/g, "").split(",")
    );

    rows.shift();

    // kelompokkan per kolam
    const grouped = {};

    rows.forEach(row => {

  const kolamId = Number(row[1]);
  const tanggal = row[2];

  // 🔥 AMBIL FILTER
  const filter = filterState[kolamId];

  // 🔥 FILTER DI SINI
  if (!isInDateRange(tanggal, filter)) return;

  if (!grouped[kolamId]) {
    grouped[kolamId] = [];
  }

  grouped[kolamId].push({
    suhu: Number(row[3]),
    ph: Number(row[4]),
    do: Number(row[5]),
    kematian: Number(row[6]),
    tanggal: row[2]
  });
});

    // ambil data terbaru + sebelumnya
    kolamData.forEach(k => {
      const data = grouped[k.id];

      if (!data || data.length === 0) return;

      const last = data[data.length - 1];
      const prev = data[data.length - 2];

      k.suhu = last.suhu;
      k.ph = last.ph;
      k.do = last.do;
      k.kematian = last.kematian;

      // 🔥 PERBANDINGAN SUHU
if (prev) {

  const suhuCompare = hitungPerbandingan(last.suhu, prev.suhu);
  const phCompare = hitungPerbandingan(last.ph, prev.ph);
  const doCompare = hitungPerbandingan(last.do, prev.do);
  const matiCompare = hitungPerbandingan(last.kematian, prev.kematian);

  k.suhu_status = suhuCompare.status;
  k.suhu_persen = suhuCompare.persen;

  k.ph_status = phCompare.status;
  k.ph_persen = phCompare.persen;

  k.do_status = doCompare.status;
  k.do_persen = doCompare.persen;

  k.kematian_status = matiCompare.status;
  k.kematian_persen = matiCompare.persen;

} else {
  k.suhu_status = k.ph_status = k.do_status = k.kematian_status = "stabil";
  k.suhu_persen = k.ph_persen = k.do_persen = k.kematian_persen = "0%";
}
    });

  } catch (err) {
    console.error("LOAD RECORDING ERROR:", err);
  }
}
// =======================
// RENDER
// =======================
function renderKolam(container, filter = "") {
  container.innerHTML = "";

  const data = kolamData.filter(k =>
    k.nama.toLowerCase().includes(filter.toLowerCase())
  );

  if (data.length === 0) {
    container.innerHTML = "<p>Kolam tidak ditemukan</p>";
    return;
  }

  data.forEach(k => {
    const div = document.createElement("div");
    div.className = "kolam-box";

    div.innerHTML = `
     <div class="kolam-header">
  <div class="kolam-title">
    <strong>${k.nama}</strong>

    <div class="kapasitas-box">
      <span class="kapasitas-label">🐟 Tebar</span>
      <span class="kapasitas-value">
        ${k.kapasitas.toLocaleString()} ekor
      </span>
    </div>

    <!-- 🔥 TAMBAHKAN DI SINI -->
    <div class="populasi-box">
      🐟 Populasi: ${(k.populasi || 0).toLocaleString()} ekor
    </div>

  </div>

  <span class="status ${k.status}">
    ${k.status}
  </span>
</div>

<div class="filter-box">

  <input type="date" id="start-${k.id}">
  <input type="date" id="end-${k.id}">

  <button onclick="applyFilter(${k.id})">Terapkan</button>

</div>
      <div class="data-grid">

  <div class="data-box ${getClass(k.suhu_status)}">
    <small>Suhu</small>
    <strong>${k.suhu}°C</strong>
    <span>${getIcon(k.suhu_status)} ${k.suhu_persen}</span>
  </div>

  <div class="data-box ${getClass(k.ph_status)}">
    <small>PH</small>
    <strong>${k.ph}</strong>
    <span>${getIcon(k.ph_status)} ${k.ph_persen}</span>
  </div>

  <div class="data-box ${getClass(k.do_status)}">
    <small>DO</small>
    <strong>${k.do}</strong>
    <span>${getIcon(k.do_status)} ${k.do_persen}</span>
  </div>

  <div class="data-box ${getClass(k.kematian_status, "kematian")}">
    <small>Mati</small>
    <strong>${k.kematian}</strong>
    <span>${getIcon(k.kematian_status)} ${k.kematian_persen}</span>
  </div>

</div>

      <button 
  onclick="${k.status === 'aktif' ? `openRecording(${k.id})` : ''}" 
  ${k.status !== 'aktif' ? 'disabled' : ''}
>
  Recording
</button>
      <button onclick="editKolam(${k.id})">Edit Kolam</button>
      <button onclick="openEditRecording(${k.id})">Edit Data</button>
      <button onclick="openPrint(${k.id})">Cetak</button>
      <button onclick="openKuras(${k.id})">Kuras Kolam</button>
    `;

    container.appendChild(div);
  });
}

// =======================
// ACTION
// =======================
async function openRecording(id) {
  selectedKolamId = id;

  await loadMasterPakan();
  renderDropdownPakan();

  document.getElementById("modalRecording").style.display = "block";
}

function closeModal() {
  document.getElementById("modalRecording").style.display = "none";
}

function getIcon(status) {
  if (status === "naik") return "⬆️";
  if (status === "turun") return "⬇️";
  return "➖";
}

function getColor(status, type = "normal") {
  if (type === "kematian") {
    if (status === "naik") return "red";
    if (status === "turun") return "green";
    return "gray";
  } else {
    if (status === "naik") return "green";
    if (status === "turun") return "red";
    return "gray";
  }
}

function getClass(status, type = "normal") {
  if (type === "kematian") {
    if (status === "naik") return "box-red";
    if (status === "turun") return "box-green";
    return "box-gray";
  } else {
    if (status === "naik") return "box-green";
    if (status === "turun") return "box-red";
    return "box-gray";
  }
}

let editKolamId = null;

function editKolam(id) {

  const kolam = kolamData.find(k => k.id === id);

  if (!kolam) {
    showToast("Kolam tidak ditemukan", "error");
    return;
  }

  const nama = document.getElementById("editNama");
  const kapasitas = document.getElementById("editKapasitas");
  const status = document.getElementById("editStatus");

  if (!nama || !kapasitas || !status) {
    showToast("Form edit belum siap!", "error");
    return;
  }

  nama.value = kolam.nama;
  kapasitas.value = kolam.kapasitas;
  status.value = kolam.status;

  editKolamId = id; // 🔥 FIX PENTING

  document.getElementById("modalEdit").style.display = "block"; // 🔥 FIX NAMA
}

function closeEdit() {
  document.getElementById("modalEdit").style.display = "none";
}

async function submitEdit() {

  const nama = document.getElementById("editNama").value;
  const kapasitas = document.getElementById("editKapasitas").value;
  const status = document.getElementById("editStatus").value; // 🔥 FIX

  if (!nama || !kapasitas) {
    showToast("Isi data dengan benar!", "info");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "edit_kolam");
  formData.append("id", editKolamId);
  formData.append("nama", nama);
  formData.append("kapasitas", kapasitas);
  formData.append("status", status);

  try {
    await fetch(POST_URL, {
      method: "POST",
      body: formData
    });

    showToast("Kolam berhasil diupdate", "success");

    closeEdit();
    loadKolam();

  } catch (err) {
    showToast("Gagal update kolam", "error");
  }
}

let selectedStatus = "aktif";

function setStatus(status) {
  selectedStatus = status;

  document.getElementById("btnAktif").classList.remove("active");
  document.getElementById("btnOff").classList.remove("active");

  if (status === "aktif") {
    document.getElementById("btnAktif").classList.add("active");
  } else {
    document.getElementById("btnOff").classList.add("active");
  }
}

function applyFilter(kolamId) {

  const start = document.getElementById(`start-${kolamId}`).value;
  const end = document.getElementById(`end-${kolamId}`).value;

  if (!start || !end) {
    alert("Pilih tanggal dulu!");
    return;
  }

  filterState[kolamId] = { start, end };

  loadKolam();
}

function isInDateRange(tanggal, filter) {

  if (!filter) return true;

  const d = new Date(tanggal);
  const start = new Date(filter.start);
  const end = new Date(filter.end);

  return d >= start && d <= end;
}

// =======================
// PRINT MODAL CONTROL
// =======================
let selectedPrintKolam = null;

function openPrint(id) {
  selectedPrintKolam = id;
  document.getElementById("modalPrint").style.display = "block";
}

function closePrint() {
  document.getElementById("modalPrint").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const printType = document.getElementById("printType");

  if (printType) {
    printType.onchange = function() {
      const val = this.value;

      document.getElementById("rangeBox").style.display =
        val === "range" ? "block" : "none";
    };
  }
});

async function cetakData() {

  const data = await getDataCetak();
  const kolam = kolamData.find(k => k.id === selectedPrintKolam);

  const lastData = data[data.length - 1];
  const recordingId = lastData ? lastData[0] : Date.now();

  const userRaw = currentUserName || "user";
  const user = userRaw.includes("@") ? userRaw.split("@")[0] : userRaw;

  const tanggal = new Date().toLocaleDateString("sv-SE");

  // 🔥 BARCODE VALUE
  const barcodeValue = recordingId.toString();

  // =======================
  // BUAT ELEMENT STRUK
  // =======================
  const div = document.createElement("div");

  div.style.width = "260px";
  div.style.padding = "10px";
  div.style.fontFamily = "monospace";
  div.style.background = "white";

  div.innerHTML = `
    <h3 style="text-align:center;">RECORDING</h3>
    <div style="text-align:center; font-size:12px;">${tanggal}</div>

    <hr>

    <div><b>Kolam:</b> ${kolam.nama}</div>
    <div><b>User:</b> ${user}</div>

    <hr>
  `;

  // =======================
  // DATA
  // =======================
  if (data.length === 0) {
    div.innerHTML += `<div style="text-align:center;">Tidak ada data</div>`;
  } else {
    data.forEach(d => {
      div.innerHTML += `
        <div style="font-size:12px; margin-bottom:6px;">
          ${d[2]}<br>
          Suhu : ${d[3]}<br>
          PH   : ${d[4]}<br>
          DO   : ${d[5]}<br>
          Mati : ${d[6]}<br>
          Pakan: ${d[8]}
        </div>
        <hr>
      `;
    });
  }

  // =======================
  // BARCODE
  // =======================
  const barcodeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  barcodeSvg.id = "barcode";

  div.appendChild(barcodeSvg);

  const label = document.createElement("div");
  label.innerText = "VALID";
  label.style.textAlign = "center";
  label.style.fontSize = "12px";

  div.appendChild(label);

  document.body.appendChild(div);

  // generate barcode
  JsBarcode(barcodeSvg, barcodeValue, {
    width: 1.5,
    height: 40,
    displayValue: false
  });

  // =======================
  // CONVERT KE GAMBAR
  // =======================
  html2canvas(div).then(canvas => {

    const link = document.createElement("a");
    link.download = `struk_${kolam.nama}_${tanggal}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 1.0);

    link.click();

    document.body.removeChild(div);
  });

  closePrint();
}

let currentUserName = "User";

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUserName = user.displayName || user.email;
    console.log("User Login:", currentUserName);
  }
});

// =======================
// AMBIL DATA CETAK (WAJIB ADA)
// =======================
async function getDataCetak() {

  const res = await fetch(RECORDING_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  const type = document.getElementById("printType").value;
  const start = document.getElementById("printStart").value;
  const end = document.getElementById("printEnd").value;

  const today = new Date().toLocaleDateString("sv-SE");

  return rows.filter(r => {

    const kolamId = Number(r[1]);
    const tanggal = r[2];

    if (kolamId !== selectedPrintKolam) return false;

    if (type === "today") {
      return tanggal === today;
    }

    if (type === "range") {
      if (!start || !end) return false;
      return tanggal >= start && tanggal <= end;
    }

    return true;
  });
}

function openEditRecording(id) {
  selectedEditKolam = id;
  document.getElementById("modalEditRecording").style.display = "block";
}

function closeEditRecording() {
  document.getElementById("modalEditRecording").style.display = "none";
}

async function loadDataEdit() {

  const tanggal = document.getElementById("editTanggal").value;

  if (!tanggal) {
    showToast("Pilih tanggal dulu", "info");
    return;
  }

  const res = await fetch(RECORDING_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  const data = rows.filter(r => {
    return Number(r[1]) === selectedEditKolam && r[2] === tanggal;
  });

  const container = document.getElementById("editFormContainer");

  if (data.length === 0) {
    container.innerHTML = "<p>Tidak ada data</p>";
    return;
  }

  // ambil data pertama (bisa kamu extend kalau multi data)
  const d = data[data.length - 1];

  selectedEditId = d[0]; // 🔥 penting

  container.innerHTML = `
    <div class="form-group">
      <label>Suhu</label>
      <input type="number" id="editSuhu" value="${d[3]}">
    </div>

    <div class="form-group">
      <label>PH</label>
      <input type="number" id="editPh" value="${d[4]}">
    </div>

    <div class="form-group">
      <label>DO</label>
      <input type="number" id="editDo" value="${d[5]}">
    </div>

    <div class="form-group">
      <label>Kematian</label>
      <input type="number" id="editMati" value="${d[6]}">
    </div>

    <div class="form-group">
      <label>Pakan</label>
      <input type="number" id="editPakan" value="${d[8]}">
    </div>

    <button onclick="submitEditRecording()">💾 Simpan Perubahan</button>
  `;
}

async function submitEditRecording() {

  const suhu = document.getElementById("editSuhu").value;
  const ph = document.getElementById("editPh").value;
  const doAir = document.getElementById("editDo").value;
  const mati = document.getElementById("editMati").value;
  const pakan = document.getElementById("editPakan").value;

  if (!suhu || !ph || !doAir) {
    showToast("Isi data dengan benar!", "info");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "edit_recording");
  formData.append("id", selectedEditId);
  formData.append("suhu", suhu);
  formData.append("ph", ph);
  formData.append("do", doAir);
  formData.append("kematian", mati);
  formData.append("pakan", pakan);

  try {
    await fetch(POST_URL, {
      method: "POST",
      body: formData
    });

    showToast("Data berhasil diupdate", "success");

    closeEditRecording();
    loadKolam();

  } catch (err) {
    showToast("Gagal update data", "error");
  }
}

function openKuras(id) {
  selectedKurasId = id;
  document.getElementById("modalKuras").style.display = "block";
}

function closeKuras() {
  document.getElementById("modalKuras").style.display = "none";
}

async function bersihkanKolam() {

  if (!confirm("Yakin ingin membersihkan semua data kolam ini?")) return;

  const formData = new URLSearchParams();
  formData.append("action", "clear_kolam");
  formData.append("kolam_id", selectedKurasId);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  showToast("Data kolam dibersihkan", "success");

  closeKuras();
  loadKolam();
}

async function bongkarKolam() {

  if (!confirm("PERMANEN! Yakin ingin menghapus kolam ini?")) return;

  const formData = new URLSearchParams();
  formData.append("action", "delete_kolam");
  formData.append("kolam_id", selectedKurasId);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  showToast("Kolam dihapus permanen", "success");

  closeKuras();
  loadKolam();
}
function refreshRecording() {
  showToast("Memuat ulang data...", "info");
  loadKolam();
}

setInterval(() => {
  loadKolam();
}, 60000);

let kolamPakan = [];

async function loadKolamPakan() {

  const container = document.getElementById("pakanContainer");
  container.innerHTML = "";

  const pengeluaran = await getPengeluaranPerKolam();

  kolamData.forEach(k => {

    const div = document.createElement("div");
    div.className = "kolam-box";

    const dataPakan = pengeluaran[k.id] || {};

    let list = "";

    for (let jenis in dataPakan) {
      list += `<div>🐟 ${jenis} : ${dataPakan[jenis]} gram</div>`;
    }

    div.innerHTML = `
      <strong>${k.nama}</strong>
      ${list || "<small>Tidak ada data</small>"}

      <button onclick="openFilterPakan(${k.id})">
        📊 Cek Pengeluaran Pakan
      </button>
    `;

    container.appendChild(div);
  });
}

function renderKolamPakan() {

  const container = document.getElementById("pakanContainer");

  if (!container) {
    console.error("pakanContainer tidak ditemukan");
    return;
  }

  container.innerHTML = "";

  kolamPakan.forEach(k => {

    const div = document.createElement("div");
    div.className = "kolam-box";

    div.innerHTML = `
      <strong>${k.nama}</strong>
      <div id="pakan-${k.id}">Loading...</div>
    `;

    container.appendChild(div);

    loadPakanKolam(k.id);
  });
}

async function loadPakanKolam(kolamId) {

  const res = await fetch(RECORDING_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  const data = rows.filter(r => r[1] == kolamId);

  const el = document.getElementById(`pakan-${kolamId}`);

  if (!el) return;

  if (data.length === 0) {
    el.innerHTML = "<small>Belum ada data pakan</small>";
    return;
  }

  const grouped = {};

  data.forEach(d => {
    const jenis = d[7];
    const jumlah = Number(d[8]);

    if (!grouped[jenis]) grouped[jenis] = 0;
    grouped[jenis] += jumlah;
  });

  let html = "";

  Object.keys(grouped).forEach(jenis => {
    html += `
      <div style="font-size:12px;margin-top:5px;">
        ${jenis} : <b>${grouped[jenis]} gr</b>
      </div>
    `;
  });

  el.innerHTML = html;
}

async function loadPakanPage() {
  await loadStokPakan();
  await loadPengeluaranPakan();
  await loadKolamPakan(); // 🔥 ini penting biar kolam muncul
}

function closeStokPakan() {
  const modal = document.getElementById("modalStok");
  modal.style.display = "none";
}

async function loadStokPakan() {

  const res = await fetch(STOK_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift(); // hapus header

  const el = document.getElementById("listStok");
  el.innerHTML = "";

  rows.forEach(r => {

    const nama = r[1]; // 🔥 INI YANG KURANG
    const stok = Number(r[2] || 0);

    el.innerHTML += `
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:6px;
      ">
        <span>${nama}</span>

        <div>
          <b>${stok} gram</b>
          <button onclick="openEditPakan('${nama}', ${stok})"
            style="margin-left:8px;font-size:11px;">
            Ubah Data
          </button>
        </div>
      </div>
    `;
  });
}

async function loadPengeluaranPakan() {

  const res = await fetch(LOG_PAKAN_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  const el = document.getElementById("listPengeluaran");

  if (!el) return;

  el.innerHTML = "";

  // 🔥 GROUP PER JENIS
  const grouped = {};

  rows.forEach(r => {

    const jenis = r[1]; // nama pakan
    const jumlah = Number(r[2]); // jumlah keluar

    if (!jenis || isNaN(jumlah)) return;

    if (!grouped[jenis]) {
      grouped[jenis] = 0;
    }

    grouped[jenis] += jumlah;
  });

  // 🔥 TAMPILKAN
  Object.keys(grouped).forEach(jenis => {

    el.innerHTML += `
      <div style="
        display:flex;
        justify-content:space-between;
        padding:6px 0;
        border-bottom:1px solid #eee;
      ">
        <span>${jenis}</span>
        <strong>${grouped[jenis]} gr</strong>
      </div>
    `;
  });

}
function openTambahStok() {
  const modal = document.getElementById("modalTambahStok");

  if (!modal) {
    console.error("modalTambahStok tidak ditemukan");
    alert("Modal tidak ada!");
    return;
  }

  modal.style.display = "block";
}

function closeTambahStok() {
  const modal = document.getElementById("modalTambahStok");
  if (modal) modal.style.display = "none";
}

async function submitStok() {

  const nama = document.getElementById("stokNama").value;
  const jumlah = document.getElementById("stokJumlah").value;

  const formData = new URLSearchParams();
  formData.append("action", "tambah_stok");
  formData.append("nama", nama);
  formData.append("jumlah", jumlah);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  closeTambahStok();
  loadStokPakan();
}

async function loadJenisPakanKolam(kolamId) {

  const res = await fetch(STOK_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  const el = document.getElementById(`pakanKolam-${kolamId}`);
  el.innerHTML = "";

  rows.forEach(r => {
    el.innerHTML += `
      <div>${r[1]}</div>
    `;
  });
}

let selectedKolamPakanId = null;

function closeTambahStokKolam() {
  document.getElementById("modalTambahStokKolam").style.display = "none";
}

async function submitTambahStokKolam() {

  const nama = document.getElementById("stokKolamNama").value;
  const jumlah = document.getElementById("stokKolamJumlah").value;

  if (!nama || !jumlah) {
    showToast("Isi data dengan benar", "info");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "tambah_stok_kolam");
  formData.append("kolam_id", selectedKolamPakanId);
  formData.append("nama", nama);
  formData.append("jumlah", jumlah);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  showToast("Stok kolam berhasil ditambah", "success");

  closeTambahStokKolam();
  loadKolamPakan();
}

let masterPakanList = [];

async function loadMasterPakan() {

  const res = await fetch(STOK_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  masterPakanList = rows.map(r => ({
    nama: r[1],
    stok: Number(r[2])
  }));
}

function renderDropdownPakan() {

  const select = document.getElementById("jenisPakan");

  if (!select) return;

  select.innerHTML = `<option value="">Pilih Pakan</option>`;

  masterPakanList.forEach(p => {
    select.innerHTML += `
      <option value="${p.nama}">
        ${p.nama} (${p.stok} gr)
      </option>
    `;
  });
}

function renderDropdownStokKolam() {

  const select = document.getElementById("stokKolamNama");

  if (!select) return;

  select.innerHTML = `<option value="">Pilih Pakan</option>`;

  masterPakanList.forEach(p => {
    select.innerHTML += `
      <option value="${p.nama}">
        ${p.nama}
      </option>
    `;
  });
}

async function tambahStokKolam(id) {
  selectedKolamPakanId = id;

  await loadMasterPakan();
  renderDropdownStokKolam();

  document.getElementById("modalTambahStokKolam").style.display = "block";
}

function openStokPakan() {
  const modal = document.getElementById("modalStok");

  if (!modal) {
    console.error("modalStok tidak ditemukan");
    alert("Modal tidak ada!");
    return;
  }

  modal.style.display = "block";

  console.log("MODAL DIBUKA"); // 🔥 TEST
}

function closeStokPakan() {
  const modal = document.getElementById("modalStok");
  if (modal) modal.style.display = "none";
}

let selectedPakanName = null;

function openEditPakan(nama, stok) {
  selectedPakanName = nama;

  document.getElementById("editNamaPakan").value = nama;
  document.getElementById("editStokPakan").value = stok;

  document.getElementById("modalEditPakan").style.display = "block";
}

function closeEditPakan() {
  document.getElementById("modalEditPakan").style.display = "none";
}

async function submitEditPakan() {

  const namaBaru = document.getElementById("editNamaPakan").value;
  const stokBaru = document.getElementById("editStokPakan").value;

  if (!namaBaru || !stokBaru) {
    showToast("Isi data dengan benar", "error");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "edit_pakan");
  formData.append("nama_lama", selectedPakanName);
  formData.append("nama_baru", namaBaru);
  formData.append("stok", stokBaru);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  showToast("Pakan berhasil diupdate", "success");

  closeEditPakan();

  await loadStokPakan(); // refresh
}

function openHapusPakan() {

  const select = document.getElementById("hapusPakanSelect");
  select.innerHTML = "";

  fetch(STOK_CSV)
    .then(res => res.text())
    .then(text => {

      const rows = text.trim().split("\n").map(r =>
        r.replace(/"/g, "").split(",")
      );

      rows.shift();

      rows.forEach(r => {
        const nama = r[1];

        const opt = document.createElement("option");
        opt.value = nama;
        opt.textContent = nama;

        select.appendChild(opt);
      });

    });

  document.getElementById("modalHapusPakan").style.display = "block";
}

function closeHapusPakan() {
  document.getElementById("modalHapusPakan").style.display = "none";
}

async function submitHapusPakan() {

  const nama = document.getElementById("hapusPakanSelect").value;

  if (!nama) {
    showToast("Pilih pakan dulu", "error");
    return;
  }

  const confirmDelete = confirm(`Yakin hapus pakan "${nama}"?`);

  if (!confirmDelete) return;

  const formData = new URLSearchParams();
  formData.append("action", "hapus_pakan");
  formData.append("nama", nama);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  showToast("Pakan berhasil dihapus", "success");

  closeHapusPakan();

  await loadStokPakan();
  await loadPengeluaranPakan();
  await loadKolamPakan();
}

function openHapusPengeluaran() {

  const select = document.getElementById("hapusPengeluaranSelect");
  select.innerHTML = "";

  fetch(LOG_PAKAN_CSV)
    .then(res => res.text())
    .then(text => {

      const rows = text.trim().split("\n").map(r =>
        r.replace(/"/g, "").split(",")
      );

      rows.shift();

      const unique = new Set();

      rows.forEach(r => {
        const jenis = r[1];
        if (jenis) unique.add(jenis);
      });

      unique.forEach(jenis => {
        const opt = document.createElement("option");
        opt.value = jenis;
        opt.textContent = jenis;
        select.appendChild(opt);
      });

    });

  document.getElementById("modalHapusPengeluaran").style.display = "block";
}

function closeHapusPengeluaran() {
  document.getElementById("modalHapusPengeluaran").style.display = "none";
}

async function submitHapusPengeluaran() {

  const jenis = document.getElementById("hapusPengeluaranSelect").value;

  if (!jenis) {
    showToast("Pilih jenis pakan", "error");
    return;
  }

  if (!confirm(`Yakin hapus semua pengeluaran "${jenis}"?`)) return;

  const formData = new URLSearchParams();
  formData.append("action", "hapus_pengeluaran");
  formData.append("jenis", jenis);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  showToast("Pengeluaran berhasil dihapus", "success");

  closeHapusPengeluaran();

  await loadPengeluaranPakan();
  await loadKolamPakan();
}

async function getPengeluaranPerKolam() {

  const res = await fetch(LOG_PAKAN_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  const hasil = {};

  rows.forEach(r => {

    const jenis = r[1];
    const jumlah = Number(r[2] || 0);
    const kolamId = r[4];

    if (!hasil[kolamId]) hasil[kolamId] = {};
    if (!hasil[kolamId][jenis]) hasil[kolamId][jenis] = 0;

    hasil[kolamId][jenis] += jumlah;
  });

  return hasil;
}

let selectedKolamFilter = null;

async function openFilterPakan(id) {

  selectedKolamFilter = id;

  const container = document.getElementById("filterJenis");
  container.innerHTML = "";

  const res = await fetch(STOK_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  rows.forEach(r => {

    const jenis = r[1];

   container.innerHTML += `
  <label>
    <input type="checkbox" value="${jenis}">
    ${jenis}
  </label>
`;
  });

  document.getElementById("modalFilterPakan").style.display = "block";
}

function closeFilter() {
  document.getElementById("modalFilterPakan").style.display = "none";
}

async function submitFilter() {

  const start = document.getElementById("filterStart").value;
  const end = document.getElementById("filterEnd").value;

  const checks = document.querySelectorAll("#filterJenis input:checked");

  const jenisDipilih = Array.from(checks).map(c => c.value);

  const res = await fetch(LOG_PAKAN_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  let hasil = [];

  rows.forEach(r => {

    const jenis = r[1];
    const jumlah = r[2];
    const tanggal = r[3];
    const kolamId = r[4];

    if (kolamId != selectedKolamFilter) return;
    if (!jenisDipilih.includes(jenis)) return;

    if (start && tanggal < start) return;
    if (end && tanggal > end) return;

    hasil.push(r);
  });

  tampilkanLaporan(hasil);
}

function tampilkanLaporan(data) {

  const el = document.getElementById("laporanBody");

  const tanggal = new Date().toLocaleDateString("sv-SE");

  let total = 0;

  let html = `
    <div style="
      width:260px;
      font-family:monospace;
      background:white;
      padding:10px;
    ">

      <h3 style="text-align:center;">LAPORAN PAKAN</h3>
      <div style="text-align:center;font-size:12px;">${tanggal}</div>

      <hr>
  `;

  data.forEach(d => {

    const jenis = d[1];
    const jumlah = Number(d[2]);
    const tgl = d[3];

    total += jumlah;

    html += `
      <div style="font-size:12px;margin-bottom:6px;">
        ${tgl}<br>
        ${jenis} : ${jumlah} gram
      </div>
      <hr>
    `;
  });

  html += `
      <div style="font-size:13px;text-align:center;">
        TOTAL : ${total} gram
      </div>

      <div style="text-align:center;margin-top:10px;">
        --- VALID ---
      </div>

    </div>
  `;

  el.innerHTML = html;

  document.getElementById("modalLaporan").style.display = "block";
}

function closeLaporan() {
  document.getElementById("modalLaporan").style.display = "none";
}

function downloadStruk() {

  const el = document.getElementById("laporanBody");

  html2canvas(el).then(canvas => {

    const link = document.createElement("a");
    link.download = `laporan_pakan_${Date.now()}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 1.0);

    link.click();
  });
}

function refreshPakan() {
  loadPakanPage();
  showToast("Data diperbarui", "success");
}

const defaultPage = localStorage.getItem("activeSection") || "recording";

if (defaultPage === "pakan") {
  loadPakanPage();
}