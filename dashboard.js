
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
const POST_URL = "https://script.google.com/macros/s/AKfycbwyskR4t-xWkLNayF_EWCNor559MNCxES4rdjXdyq0nxIvhyf6yuWDsX9_7jALFNcF5/exec";

const KOLAM_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=kolam";

const RECORDING_CSV = "https://docs.google.com/spreadsheets/d/1nOsnlFTh00jCF-RbwXyH2IHFgg-SRrbKKo3_y5JZDto/gviz/tq?tqx=out:csv&sheet=recording";

// =======================
// STATE
// =======================
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

  // NAVIGATION
  menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  menuItems.forEach(item => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-section");

      sections.forEach(sec => sec.classList.remove("active"));
      document.getElementById(target).classList.add("active");

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
    formData.append("tanggal", new Date().toISOString().split("T")[0]);
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

      alert("Recording berhasil!");
      closeModal();
      loadKolam();

    } catch (err) {
      console.error("ERROR RECORDING:", err);
      alert("Gagal simpan recording!");
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

    alert("Kolam berhasil ditambahkan!");
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
      <button onclick="editKolam(${k.id})">Edit</button>
      <button onclick="openPrint(${k.id})">Cetak</button>
    `;

    container.appendChild(div);
  });
}

// =======================
// ACTION
// =======================
function openRecording(id) {
  selectedKolamId = id;
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

  const tanggal = new Date().toISOString().split("T")[0];

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

  const today = new Date().toISOString().split("T")[0];

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
