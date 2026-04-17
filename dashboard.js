
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
const POST_URL = "https://script.google.com/macros/s/AKfycbyiI2siSr_RHO5DCdlmWPRdw03Hk6Re3sWxwbCWWpTx3ZI4H-9Rpl7iOZ_FzadFAdoj/exec";

const KOLAM_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=kolam";

const RECORDING_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=recording";

const STOK_PAKAN_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=stok_pakan";

const LOG_PAKAN_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=log_pakan";

const LOG_STOK_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=log_stok";

const SAMPLING_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=sampling";


// =======================
// STATE
// =======================
let samplingData = [];
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

    if (target === "lab") {
  loadLab();
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
    const pakanKg = parseFloat(document.getElementById("inputPakan").value) || 0;
    const pakanGram = pakanKg * 1000;

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
    formData.append("pakan", pakanGram);

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
  tanggal_masuk: row[5],   // 🔥 TAMBAHAN
  tanggal_panen: row[6],

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
    kolamData.forEach(async (k) => {
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

    <div>🐟 Umur: ${hitungUmur(k.tanggal_masuk, k.tanggal_panen)} hari</div>


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
      <button onclick="openIkanMasuk(${k.id})">🐟 Masuk</button>
      <button onclick="openPanen(${k.id})">📦 Panen</button>
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

  const pakanKg = parseFloat(document.getElementById("editPakan").value) || 0;
  const pakanGram = pakanKg * 1000;

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
  formData.append("pakan", pakanGram); // ✅ INI YANG BENAR

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

  // 🔥 GANTI DI SINI
  for (const k of kolamData) {

    const rata = await getRataPakanPerKolam(k.id);

    const div = document.createElement("div");
    div.className = "kolam-box";

    const dataPakan = pengeluaran[k.id] || {};

    let list = "";

    for (let jenis in dataPakan) {
      list += `<div>🐟 ${jenis} : ${(dataPakan[jenis] / 1000).toFixed(2)} kg</div>`;
    }

    div.innerHTML = `
      <strong>${k.nama}</strong>
      ${list || "<small>Tidak ada data</small>"}

      <div style="font-size:12px;color:#555;">
        📊 Rata-rata: ${rata.toFixed(5)} gram/ekor
      </div>

      <button onclick="openFilterPakan(${k.id})">
        📊 Cek Pengeluaran Pakan
      </button>
    `;

    container.appendChild(div);
  }
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
        ${jenis} : <b>${(grouped[jenis] / 1000).toFixed(2)} kg</b>
      </div>
    `;
  });

  el.innerHTML = html;
}

async function loadPakanPage() {
  await loadKolam();
  await loadStokPakan();
  await loadPengeluaranPakan();
  await loadKolamPakan(); // 🔥 ini penting biar kolam muncul
}

function closeStokPakan() {
  const modal = document.getElementById("modalStok");
  modal.style.display = "none";
}

async function loadStokPakan() {

  const res = await fetch(STOK_PAKAN_CSV);
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
          <b>${(stok / 1000).toFixed(2)} kg</b>
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
        <strong>${(grouped[jenis] / 1000).toFixed(2)} kg</strong>
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

  const nama = document.getElementById("stokNama").value.trim();

  if (!nama) {
    showToast("Isi nama pakan", "error");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "tambah_jenis_pakan"); // ✅ FIX
  formData.append("jenis", nama);

  const res = await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  const text = await res.text();
  console.log("RESPONSE:", text);

  showToast("Jenis pakan berhasil ditambahkan", "success");

  closeTambahStok();
  loadStokPakan();
}

async function loadJenisPakanKolam(kolamId) {

  const res = await fetch(STOK_PAKAN_CSV);
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
  const jumlahKg = parseFloat(document.getElementById("stokKolamJumlah").value) || 0;
const jumlahGram = jumlahKg * 1000;

  if (!nama || jumlahKg <= 0) {
    showToast("Isi data dengan benar", "info");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "tambah_stok_kolam");
  formData.append("kolam_id", selectedKolamPakanId);
  formData.append("nama", nama);
  formData.append("jumlah", jumlahGram);

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

  const res = await fetch(STOK_PAKAN_CSV);
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
  const stokKg = parseFloat(document.getElementById("editStokPakan").value) || 0;
  const stokGram = stokKg * 1000;

  if (!namaBaru || stokKg <= 0) {
    showToast("Isi data dengan benar", "error");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "edit_pakan");
  formData.append("nama_lama", selectedPakanName);
  formData.append("nama_baru", namaBaru);
  formData.append("stok", stokGram);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  showToast("Pakan berhasil diupdate", "success");

  closeEditPakan();
  await loadStokPakan();
}

function openHapusPakan() {

  const select = document.getElementById("hapusPakanSelect");
  select.innerHTML = "";

  fetch(STOK_PAKAN_CSV)
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

  const res = await fetch(STOK_PAKAN_CSV);
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

async function openTambahStokMaster() {

  const select = document.getElementById("tambahStokJenis");
  select.innerHTML = "";

  const res = await fetch(STOK_PAKAN_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  rows.forEach(r => {
    const jenis = r[1];

    const opt = document.createElement("option");
    opt.value = jenis;
    opt.textContent = jenis;

    select.appendChild(opt);
  });

  document.getElementById("modalTambahStokMaster").style.display = "block";
}

function closeTambahStokMaster() {
  document.getElementById("modalTambahStokMaster").style.display = "none";
}

async function submitTambahStokMaster() {

  const jenis = document.getElementById("tambahStokJenis").value;
  const jumlahKg = parseFloat(document.getElementById("tambahStokJumlah").value) || 0;
  const jumlahGram = jumlahKg * 1000;

  if (!jenis || jumlahKg <= 0) {
    showToast("Isi data dengan benar", "error");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "tambah_stok_master");
  formData.append("jenis", jenis);
  formData.append("jumlah", jumlahGram);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  showToast("Stok berhasil ditambah", "success");

  closeTambahStokMaster();
  loadPakanPage();
}

async function openRiwayatStok() {

  const container = document.getElementById("riwayatJenis");
  container.innerHTML = "";

  const res = await fetch(STOK_PAKAN_CSV);
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

  document.getElementById("modalRiwayatStok").style.display = "block";
}

function closeRiwayatStok() {
  document.getElementById("modalRiwayatStok").style.display = "none";
}

let dataRiwayatGlobal = [];

async function submitRiwayatStok() {

  const start = document.getElementById("riwayatStart").value;
  const end = document.getElementById("riwayatEnd").value;
  const format = document.getElementById("formatLaporan").value;
  
  if (!format) {
    showToast("Pilih format dulu", "error");
    return;
  }

  const checks = document.querySelectorAll("#riwayatJenis input:checked");
  const jenisDipilih = Array.from(checks).map(c => c.value);

  const res = await fetch(LOG_STOK_CSV);
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
    const tipe = r[4];

    if (!jenisDipilih.includes(jenis)) return;

    if (start && tanggal < start) return;
    if (end && tanggal > end) return;

    hasil.push(r);
  });

  dataRiwayatGlobal = hasil;

  tampilkanRiwayat(hasil);
}

function tampilkanRiwayat(data) {

  let total = 0;
  let html = `
    <div style="width:260px;font-family:monospace;background:white;padding:10px;">
      <h3 style="text-align:center;">STOK MASUK</h3>
      <hr>
  `;

  data.forEach(d => {
    total += Number(d[2]);

    html += `
      <div style="font-size:12px;">
        ${d[3]}<br>
        ${d[1]} : ${d[2]} gram
      </div>
      <hr>
    `;
  });

  html += `
    <div style="text-align:center;">
      TOTAL : ${total} gram
    </div>
  </div>
  `;

  document.getElementById("hasilRiwayat").innerHTML = html;
  document.getElementById("modalHasilRiwayat").style.display = "block";
}

function downloadRiwayat() {

  const format = document.getElementById("formatLaporan").value;
  const el = document.getElementById("hasilRiwayat");

  html2canvas(el).then(canvas => {

    if (format === "jpg") {

      const link = document.createElement("a");
      link.download = "riwayat_stok.jpg";
      link.href = canvas.toDataURL("image/jpeg");
      link.click();

    } else if (format === "pdf") {

      const img = canvas.toDataURL("image/jpeg");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();

      pdf.addImage(img, "JPEG", 10, 10, 180, 0);
      pdf.save("riwayat_stok.pdf");
    }

  });
}

async function submitTambahJenisPakan() {

  const input = document.getElementById("namaJenisPakan");

  if (!input) {
    console.error("Input namaJenisPakan tidak ditemukan");
    return;
  }

  const jenis = input.value.trim();

  if (!jenis) {
    showToast("Isi nama pakan", "error");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "tambah_jenis_pakan");
  formData.append("jenis", jenis);

  try {
    const res = await fetch(POST_URL, {
      method: "POST",
      body: formData
    });

    const result = await res.text();
    console.log("RESPONSE:", result);

    if (result.includes("PAKAN_SUDAH_ADA")) {
      showToast("Pakan sudah ada", "error");
      return;
    }

    showToast("Jenis pakan berhasil ditambahkan", "success");

    input.value = "";

    await loadStokPakan();

  } catch (err) {
    console.error(err);
    showToast("Gagal kirim data", "error");
  }
}

async function submitTambahJenisPakan() {

  const nama = document.getElementById("stokNama").value.trim();

  if (!nama) {
    showToast("Isi nama pakan", "error");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "tambah_jenis_pakan"); // 🔥 INI KUNCI
  formData.append("jenis", nama);

  try {
    const res = await fetch(POST_URL, {
      method: "POST",
      body: formData
    });

    const result = await res.text();
    console.log("RESULT:", result);

    showToast("Jenis pakan berhasil ditambahkan", "success");

    document.getElementById("stokNama").value = "";

    closeTambahStok(); // tutup modal
    loadStokPakan();   // refresh list

  } catch (err) {
    console.error(err);
    showToast("Gagal kirim data", "error");
  }
}

function closeHasilRiwayat() {
  document.getElementById("modalHasilRiwayat").style.display = "none";
}

async function getRataPakanPerKolam(kolamId) {

  // ambil log pakan
  const resLog = await fetch(RECORDING_CSV);
  const textLog = await resLog.text();

  const rowsLog = textLog.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rowsLog.shift();

  let totalPakan = 0;

 rowsLog.forEach(r => {
  if (String(r[1]).trim() === String(kolamId).trim()) {
    const jumlah = parseFloat(String(r[8]).replace(",", "").trim()) || 0;
totalPakan += jumlah;
  }
});

  // ambil populasi kolam
  const resKolam = await fetch(KOLAM_CSV);
  const textKolam = await resKolam.text();

  const rowsKolam = textKolam.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rowsKolam.shift();

  let populasi = 0;

  rowsKolam.forEach(r => {
    if (String(r[0]) === String(kolamId)) {
      populasi = Number(r[3] || 0);
    }
  });

  if (populasi === 0) return 0;

  return totalPakan / populasi;
}

async function submitTambahJenisPakan() {

  const nama = document.getElementById("stokNama").value.trim();

  if (!nama) {
    showToast("Isi nama pakan", "error");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "tambah_jenis_pakan"); // 🔥 beda di sini
  formData.append("jenis", nama);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  showToast("Jenis pakan berhasil ditambahkan", "success");

  closeTambahStok();
  loadStokPakan();
}

function openIkanMasuk(id) {
  selectedKolamId = id;
  document.getElementById("modalIkanMasuk").style.display = "block";
}

function closeIkanMasuk() {
  document.getElementById("modalIkanMasuk").style.display = "none";
}

function openPanen(id) {
  selectedKolamId = id;
  document.getElementById("modalPanen").style.display = "block";
}

function closePanen() {
  document.getElementById("modalPanen").style.display = "none";
}

async function submitIkanMasuk() {

  const tanggal = document.getElementById("tanggalMasuk").value;

  if (!tanggal) {
    showToast("Pilih tanggal dulu", "error");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "set_tanggal_masuk");
  formData.append("kolamId", selectedKolamId);
  formData.append("tanggal", tanggal);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  closeIkanMasuk();
  loadKolam();
}

async function submitPanen() {

  const tanggal = document.getElementById("tanggalPanen").value;

  if (!tanggal) {
    showToast("Pilih tanggal dulu", "error");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "set_tanggal_panen");
  formData.append("kolamId", selectedKolamId);
  formData.append("tanggal", tanggal);

  await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  closePanen();
  loadKolam();
}

function hitungUmur(tanggal_masuk, tanggal_panen) {

  if (!tanggal_masuk) return "-";

  const start = new Date(tanggal_masuk);
  const end = tanggal_panen ? new Date(tanggal_panen) : new Date();

  const diff = end - start;

  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// =======================
// LABORATORIUM
// =======================
async function loadLab() {

  // 🔥 pastikan kolam sudah ke-load
  if (!kolamData || kolamData.length === 0) {
    await loadKolam();
  }
    await loadSampling();
  

  const rows = await getRecordingLab();

  console.log("LAB ROWS:", rows);
  console.log("KOLAM DATA:", kolamData);

  renderLabMaster(rows);
  renderLabKolam(rows);
  renderChart(rows);
  renderLabMaster(rows);
  renderRanking(rows); // 🔥 tambah ini
  renderLabKolam(rows);
  renderChart(rows);
  renderChartSR(rows);
  renderChartMortalitas(rows);
}

// =======================
// AMBIL DATA RECORDING + FILTER
// =======================
async function getRecordingLab() {

  const start = document.getElementById("labStart")?.value;
  const end = document.getElementById("labEnd")?.value;

  const res = await fetch(RECORDING_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  return rows.filter(r => {
    const tanggal = r[2];

    if (start && tanggal < start) return false;
    if (end && tanggal > end) return false;

    return true;
  });
}

// =======================
// HITUNG DATA PER KOLAM
// =======================
function hitungLab(kolamId, rows) {

  let totalPakan = 0;
  let totalMati = 0;

  // 🔥 PINDAHKAN KE ATAS
  const kolam = kolamData.find(k => Number(k.id) === Number(kolamId));

  if (!kolam) return { sr: 0, mortalitas: 0, fcr: 0, efisiensi: 0 };

  rows.forEach(r => {
    if (Number(r[1]) === Number(kolamId)) {
      totalPakan += Number(r[8] || 0);
      totalMati += Number(r[6] || 0);
    }
  });

  const awal = kolam.kapasitas || 0;
  const akhir = kolam.populasi || 0;

  // 🔥 SAMPLING
  const sampling = getSamplingAktif(kolamId);

  let biomassa = 0;

  if (sampling) {
    biomassa = (kolam.populasi || 0) * sampling.berat;
  }

  const sr = awal ? (akhir / awal) * 100 : 0;
  const mortalitas = awal ? (totalMati / awal) * 100 : 0;
  const fcr = biomassa ? totalPakan / biomassa : 0;
  const efisiensi = fcr ? (1 / fcr) * 100 : 0;

  return { sr, mortalitas, fcr, efisiensi };
}

// =======================
// RENDER MASTER
// =======================
function renderLabMaster(rows) {

  let totalPakan = 0;
  let totalMati = 0;
  let totalAwal = 0;
  let totalAkhir = 0;

  kolamData.forEach(k => {
    totalAwal += k.kapasitas || 0;
    totalAkhir += k.populasi || 0;
  });

  rows.forEach(r => {
    totalPakan += Number(r[8] || 0);
    totalMati += Number(r[6] || 0);
  });

  // 🔥 TAMBAHKAN INI
  const sr = totalAwal ? (totalAkhir / totalAwal) * 100 : 0;

  if (rows.length === 0) {
    document.getElementById("labMaster").innerHTML = `
      <div style="padding:15px; text-align:center; color:#999;">
        Tidak ada data pada rentang tanggal ini
      </div>
    `;
    return;
  }

  const mortalitas = totalAwal ? (totalMati / totalAwal) * 100 : 0;
  const fcr = totalAkhir ? totalPakan / totalAkhir : 0;
  const efisiensi = fcr ? (1 / fcr) * 100 : 0;

  document.getElementById("labMaster").innerHTML = `
    <div class="lab-grid">

      <div class="lab-card sr">
        <small>Survival Rate</small>
        <h2>${sr.toFixed(2)}%</h2>
      </div>

      <div class="lab-card mortalitas">
        <small>Mortalitas</small>
        <h2>${mortalitas.toFixed(2)}%</h2>
      </div>

      <div class="lab-card fcr">
        <small>FCR</small>
        <h2>${fcr.toFixed(3)}</h2>
      </div>

      <div class="lab-card efisiensi">
        <small>Efisiensi</small>
        <h2>${efisiensi.toFixed(2)}%</h2>
      </div>

    </div>
  `;
}

// =======================
// RENDER PER KOLAM
// =======================
function renderLabKolam(rows) {

  if (rows.length === 0) {
  document.getElementById("labKolam").innerHTML = `
    <div style="padding:15px; text-align:center; color:#999;">
      Tidak ada data kolam pada periode ini
    </div>
  `;
  return;
}
  const container = document.getElementById("labKolam");
  container.innerHTML = "";

  kolamData.forEach(k => {

  const hasData = rows.some(r => Number(r[1]) === Number(k.id));

  if (!hasData) return; // 🔥 ini kunci penting

  const data = hitungLab(k.id, rows);

    const sampling = getSamplingAktif(k.id, new Date());
    const warnaSR = getWarnaSR(data.sr);
    const warnaM = getWarnaMortalitas(data.mortalitas);
    const warnaFCR = getWarnaFCR(data.fcr);
    const warnaE = getWarnaEfisiensi(data.efisiensi);
    const div = document.createElement("div");
    div.className = "kolam-box";

div.innerHTML = `
  <div class="lab-kolam-card">

    <div class="lab-header">
      <strong>${k.nama}</strong>
      <button onclick="openSampling(${k.id})">📏 Sampling</button>
    </div>

    <div class="lab-content">

      <div class="lab-item ${warnaSR}">
        <span>SR</span>
        <b>${data.sr.toFixed(2)}%</b>
      </div>

      <div class="lab-item ${warnaM}">
        <span>Mortalitas</span>
        <b>${data.mortalitas.toFixed(2)}%</b>
      </div>

      <div class="lab-item ${warnaFCR}">
        <span>FCR</span>
        <b>${data.fcr.toFixed(3)}</b>
      </div>

      <div class="lab-item ${warnaE}">
        <span>Efisiensi</span>
        <b>${data.efisiensi.toFixed(2)}%</b>
      </div>

    </div>

  </div>
`;

    container.appendChild(div);
  });
}

function getWarnaSR(sr) {
  if (sr >= 90) return "green";
  if (sr >= 70) return "orange";
  return "red";
}

function getWarnaFCR(fcr) {
  if (fcr <= 1.2) return "green";
  if (fcr <= 1.8) return "orange";
  return "red";
}

function getWarnaMortalitas(m) {
  if (m <= 5) return "green";
  if (m <= 15) return "orange";
  return "red";
}

function getWarnaEfisiensi(e) {
  if (e >= 80) return "green";
  if (e >= 60) return "orange";
  return "red";
}

let chartLab = null;

function renderChart(rows) {

  const dataPerTanggal = {};

  rows.forEach(r => {
    const tanggal = r[2];
    const pakan = Number(r[8] || 0);

    if (!dataPerTanggal[tanggal]) {
      dataPerTanggal[tanggal] = 0;
    }

    dataPerTanggal[tanggal] += pakan;
  });

  const labels = Object.keys(dataPerTanggal);
  const data = Object.values(dataPerTanggal);

  const ctx = document.getElementById("labChart");

  if (chartLab) {
    chartLab.destroy();
  }

  chartLab = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Pakan Harian (gram)",
        data: data,
        borderWidth: 2,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      }
    }
  });
}

function renderRanking(rows) {

  const hasil = [];

  kolamData.forEach(k => {

    const data = hitungLab(k.id, rows);

    // skip kalau tidak ada data
    const hasData = rows.some(r => Number(r[1]) === Number(k.id));
    if (!hasData) return;

    hasil.push({
      nama: k.nama,
      sr: data.sr,
      fcr: data.fcr,
      score: (data.sr || 0) - (data.fcr || 0) * 10 // 🔥 rumus ranking
    });
  });

  // sorting terbaik ke terburuk
  hasil.sort((a, b) => b.score - a.score);

  const container = document.getElementById("labRanking");

  if (hasil.length === 0) {
    container.innerHTML = `<div style="color:#999;">Tidak ada data</div>`;
    return;
  }

  container.innerHTML = hasil.map((k, i) => `
    <div class="ranking-item">
      <span>#${i + 1} ${k.nama}</span>
      <b>${k.sr.toFixed(1)}%</b>
    </div>
  `).join("");
}

let chartSR = null;

function renderChartSR(rows) {

  const data = {};

  rows.forEach(r => {
    const tgl = r[2];
    const mati = Number(r[6] || 0);

    if (!data[tgl]) data[tgl] = { mati: 0 };
    data[tgl].mati += mati;
  });

  const labels = Object.keys(data);
  const values = labels.map(t => data[t].mati);

  if (chartSR) chartSR.destroy();

  chartSR = new Chart(document.getElementById("chartSR"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Mortalitas Harian",
        data: values,
        borderWidth: 2,
        tension: 0.3
      }]
    }
  });
}

let chartM = null;

function renderChartMortalitas(rows) {

  const data = {};

  rows.forEach(r => {
    const tgl = r[2];
    const mati = Number(r[6] || 0);

    if (!data[tgl]) data[tgl] = 0;
    data[tgl] += mati;
  });

  const labels = Object.keys(data);
  const values = Object.values(data);

  if (chartM) chartM.destroy();

  chartM = new Chart(document.getElementById("chartMortalitas"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Jumlah Kematian",
        data: values
      }]
    }
  });
}

async function loadSampling() {

  const res = await fetch(SAMPLING_CSV);
  const text = await res.text();

  const rows = text.trim().split("\n").map(r =>
    r.replace(/"/g, "").split(",")
  );

  rows.shift();

  samplingData = rows;
}

function getSamplingAktif(kolamId, tanggal) {

  const tgl = new Date(tanggal);

  let terbaru = null;

  samplingData.forEach(s => {

    if (Number(s[1]) !== Number(kolamId)) return;

    const tglSampling = new Date(s[0]);

    if (tglSampling <= tgl) {
      if (!terbaru || new Date(terbaru[0]) < tglSampling) {
        terbaru = s;
      }
    }

  });

  if (!terbaru) return null;

  return {
    berat: Number(terbaru[2]),
    panjang: Number(terbaru[3])
  };
}

let selectedKolamSampling = null;

function openSampling(id) {
  selectedKolamSampling = id;
  document.getElementById("modalSampling").style.display = "block";
}

function closeSampling() {
  document.getElementById("modalSampling").style.display = "none";
}

async function submitSampling() {

  const tanggal = document.getElementById("samplingTanggal").value;
  const berat = document.getElementById("samplingBerat").value;
  const panjang = document.getElementById("samplingPanjang").value;

  if (!tanggal || !berat || !panjang) {
    alert("Isi semua data!");
    return;
  }

  const formData = new URLSearchParams();
  formData.append("action", "tambah_sampling");
  formData.append("kolamId", selectedKolamSampling);
  formData.append("tanggal", tanggal);
  formData.append("berat", berat);
  formData.append("panjang", panjang);

  const res = await fetch(POST_URL, {
    method: "POST",
    body: formData
  });

  const text = await res.text();
  console.log("RESPONSE:", text);

  closeSampling();
  loadLab();
}