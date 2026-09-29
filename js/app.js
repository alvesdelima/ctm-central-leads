// ======================================================
// CENTRAL DE LEADS - CTM
// ======================================================

// ======================================================
// CONFIGURAÇÃO DAS APIs N8N
// ======================================================

// Webhook GET - buscar leads
const API_URL =
  "https://webhook.gestoraautomatica.online/webhook/ctm-central-leads";

// Webhook PATCH - atualizar lead
const UPDATE_API_URL =
  "https://webhook.gestoraautomatica.online/webhook/ctm-central-leads-update";

// ======================================================
// ESTADO DA APLICAÇÃO
// ======================================================

const leads = [];

let currentLead = null;

// ======================================================
// ELEMENTOS DA TELA
// ======================================================

// Tabela
const leadsTable = document.getElementById("leads-table");

// Cards
const totalLeads = document.getElementById("total-leads");
const qualifiedLeads = document.getElementById("qualified-leads");
const scheduledLeads = document.getElementById("scheduled-leads");

// Contador
const leadCount = document.getElementById("lead-count");

// Busca e filtros
const searchInput = document.getElementById("search");

const qualificationFilter = document.getElementById("qualification-filter");

const scheduleFilter = document.getElementById("schedule-filter");

// Botão atualizar
const refreshButton = document.querySelector(".refresh-button");

// ======================================================
// ELEMENTOS DO MODAL
// ======================================================

const modal = document.getElementById("lead-modal");

const closeModalButton = document.getElementById("close-modal");

const cancelModalButton = document.getElementById("cancel-modal");

const saveLeadButton = document.getElementById("save-lead");

const modalLeadName = document.getElementById("modal-lead-name");

const modalLeadPhone = document.getElementById("modal-lead-phone");

const modalReason = document.getElementById("modal-reason");

const whatsappButton = document.getElementById("whatsapp-button");

// Qualificação

const qualifiedYes = document.getElementById("qualified-yes");

const qualifiedNo = document.getElementById("qualified-no");

// Agendamento

const scheduledYes = document.getElementById("scheduled-yes");

const scheduledNo = document.getElementById("scheduled-no");

// ======================================================
// FORMATAR DATA
// ======================================================

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
  }).format(date);
}

// ======================================================
// FORMATAR TELEFONE
// ======================================================

function formatPhone(phone) {
  if (!phone) {
    return "-";
  }

  const numbers = String(phone).replace(/\D/g, "");

  // Exemplo:
  // 558188767168
  // vira
  // (81) 8876-7168

  if (numbers.startsWith("55") && numbers.length >= 12) {
    const withoutCountry = numbers.slice(2);

    const ddd = withoutCountry.slice(0, 2);

    const number = withoutCountry.slice(2);

    // Celular com 9 dígitos
    if (number.length === 9) {
      return `(${ddd}) ${number.slice(0, 5)}-${number.slice(5)}`;
    }

    // Número com 8 dígitos
    if (number.length === 8) {
      return `(${ddd}) ${number.slice(0, 4)}-${number.slice(4)}`;
    }
  }

  return phone;
}

// ======================================================
// BUSCAR LEADS NO N8N
// ======================================================

async function loadLeads() {
  try {
    if (refreshButton) {
      refreshButton.disabled = true;

      refreshButton.textContent = "Atualizando...";
    }

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    const data = await response.json();

    console.log("Leads recebidos:", data);

    if (!Array.isArray(data)) {
      throw new Error("A resposta da API não é uma lista de leads.");
    }

    // Limpa array atual

    leads.length = 0;

    // Adiciona dados do PostgreSQL

    data.forEach((lead) => {
      leads.push({
        id: Number(lead.id),

        data: lead.data,

        nome: lead.nome || "",

        telefone: lead.telefone || "",

        qualificado: lead.qualificado === true,

        motivo: lead.motivo || "",

        agendou: lead.agendou === true,

        atendido: lead.atendido === true,
      });
    });

    applyFilters();
  } catch (error) {
    console.error("Erro ao buscar leads:", error);

    leadsTable.innerHTML = `

            <tr>

                <td colspan="7">

                    <div style="
                        padding: 30px;
                        text-align: center;
                        color: #f87171;
                    ">

                        Não foi possível carregar os leads.

                    </div>

                </td>

            </tr>

        `;
  } finally {
    if (refreshButton) {
      refreshButton.disabled = false;

      refreshButton.textContent = "↻ Atualizar";
    }
  }
}

// ======================================================
// RENDERIZAR LEADS
// ======================================================

function renderLeads(lista) {
  leadsTable.innerHTML = "";

  // Nenhum lead

  if (lista.length === 0) {
    leadsTable.innerHTML = `

            <tr>

                <td colspan="7">

                    <div style="
                        padding: 35px;
                        text-align: center;
                        color: #7f8a9d;
                    ">

                        Nenhum lead encontrado.

                    </div>

                </td>

            </tr>

        `;

    updateDashboard(lista);

    return;
  }

  // Criar linhas

  lista.forEach((lead) => {
    const row = document.createElement("tr");

    // ----------------------------------------------
    // QUALIFICAÇÃO
    // ----------------------------------------------

    let qualificationStatus;

    if (lead.atendido === false) {
      qualificationStatus = `
        <span class="status pending">
            ● Pendente
        </span>
    `;
    } else if (lead.qualificado === true) {
      qualificationStatus = `
        <span class="status success">
            ✓ Sim
        </span>
    `;
    } else {
      qualificationStatus = `
        <span class="status danger">
            ✕ Não
        </span>
    `;
    }

    // ----------------------------------------------
    // AGENDAMENTO
    // ----------------------------------------------

    let scheduleStatus;

    if (lead.agendou === true) {
      scheduleStatus = `
                <span class="status success">
                    ✓ Sim
                </span>
            `;
    } else {
      scheduleStatus = `
                <span class="status danger">
                    ✕ Não
                </span>
            `;
    }

    // ----------------------------------------------
    // LINHA
    // ----------------------------------------------

    row.innerHTML = `

            <td>
                ${formatDate(lead.data)}
            </td>

            <td>
                <strong>
                    ${escapeHTML(lead.nome)}
                </strong>
            </td>

            <td>
                ${escapeHTML(formatPhone(lead.telefone))}
            </td>

            <td>
                ${qualificationStatus}
            </td>

            <td>
                ${lead.motivo ? escapeHTML(lead.motivo) : "-"}
            </td>

            <td>
                ${scheduleStatus}
            </td>

            <td>

                <button
                    type="button"
                    class="action-button"
                    data-lead-id="${lead.id}"
                >
                    Ver lead
                </button>

            </td>

        `;

    leadsTable.appendChild(row);
  });

  updateDashboard(lista);
}

// ======================================================
// ATUALIZAR DASHBOARD
// ======================================================

function updateDashboard(lista) {
  // Cards devem representar todos os leads carregados,
  // não apenas os resultados filtrados.

  const total = leads.length;

  const qualified = leads.filter((lead) => lead.qualificado === true).length;

  const scheduled = leads.filter((lead) => lead.agendou === true).length;

  totalLeads.textContent = total;

  qualifiedLeads.textContent = qualified;

  scheduledLeads.textContent = scheduled;

  const visible = lista.length;

  leadCount.textContent = `${visible} ${visible === 1 ? "lead" : "leads"}`;
}

// ======================================================
// FILTROS
// ======================================================

function applyFilters() {
  let filteredLeads = [...leads];

  // ----------------------------------------------
  // BUSCA
  // ----------------------------------------------

  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";

  if (searchTerm) {
    filteredLeads = filteredLeads.filter((lead) => {
      const name = String(lead.nome || "").toLowerCase();

      const phone = String(lead.telefone || "").toLowerCase();

      return name.includes(searchTerm) || phone.includes(searchTerm);
    });
  }

  // ----------------------------------------------
  // QUALIFICAÇÃO
  // ----------------------------------------------

  if (qualificationFilter) {
    const value = qualificationFilter.value;

    if (value === "qualified") {
      filteredLeads = filteredLeads.filter((lead) => lead.qualificado === true);
    }

    if (value === "not-qualified") {
      filteredLeads = filteredLeads.filter(
        (lead) => lead.qualificado === false,
      );
    }
  }

  // ----------------------------------------------
  // AGENDAMENTO
  // ----------------------------------------------

  if (scheduleFilter) {
    const value = scheduleFilter.value;

    if (value === "scheduled") {
      filteredLeads = filteredLeads.filter((lead) => lead.agendou === true);
    }

    if (value === "not-scheduled") {
      filteredLeads = filteredLeads.filter((lead) => lead.agendou === false);
    }
  }

  renderLeads(filteredLeads);
}

// ======================================================
// EVENTOS DOS FILTROS
// ======================================================

if (searchInput) {
  searchInput.addEventListener("input", applyFilters);
}

if (qualificationFilter) {
  qualificationFilter.addEventListener("change", applyFilters);
}

if (scheduleFilter) {
  scheduleFilter.addEventListener("change", applyFilters);
}

// ======================================================
// BOTÃO ATUALIZAR
// ======================================================

if (refreshButton) {
  refreshButton.addEventListener("click", loadLeads);
}

// ======================================================
// CLIQUE NA TABELA
// ======================================================

leadsTable.addEventListener("click", (event) => {
  const button = event.target.closest(".action-button");

  if (!button) {
    return;
  }

  const leadId = Number(button.dataset.leadId);

  openLeadModal(leadId);
});

// ======================================================
// ABRIR MODAL
// ======================================================

function openLeadModal(leadId) {
  const lead = leads.find((item) => Number(item.id) === Number(leadId));

  if (!lead) {
    console.error("Lead não encontrado:", leadId);

    return;
  }

  currentLead = lead;

  // ----------------------------------------------
  // NOME
  // ----------------------------------------------

  modalLeadName.textContent = lead.nome || "Lead";

  // ----------------------------------------------
  // TELEFONE
  // ----------------------------------------------

  modalLeadPhone.textContent = formatPhone(lead.telefone);

  // ----------------------------------------------
  // MOTIVO
  // ----------------------------------------------

  modalReason.value = lead.motivo || "";

  // ----------------------------------------------
  // WHATSAPP
  // ----------------------------------------------

  const phone = String(lead.telefone || "").replace(/\D/g, "");

  whatsappButton.href = `https://wa.me/${phone}`;

  // ----------------------------------------------
  // LIMPAR SELEÇÕES
  // ----------------------------------------------

  qualifiedYes.classList.remove("selected");

  qualifiedNo.classList.remove("selected");

  scheduledYes.classList.remove("selected");

  scheduledNo.classList.remove("selected");

  // ----------------------------------------------
  // QUALIFICAÇÃO
  // ----------------------------------------------

  if (lead.qualificado === true) {
    qualifiedYes.classList.add("selected");
  } else {
    qualifiedNo.classList.add("selected");
  }

  // ----------------------------------------------
  // AGENDAMENTO
  // ----------------------------------------------

  if (lead.agendou === true) {
    scheduledYes.classList.add("selected");
  } else {
    scheduledNo.classList.add("selected");
  }

  // ----------------------------------------------
  // ABRIR
  // ----------------------------------------------

  modal.classList.add("active");
}

// ======================================================
// FECHAR MODAL
// ======================================================

function closeLeadModal() {
  modal.classList.remove("active");

  currentLead = null;
}

// Botão X

closeModalButton.addEventListener("click", closeLeadModal);

// Botão cancelar

cancelModalButton.addEventListener("click", closeLeadModal);

// Clique fora do modal

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeLeadModal();
  }
});

// ESC fecha modal

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("active")) {
    closeLeadModal();
  }
});

// ======================================================
// QUALIFICAÇÃO
// ======================================================

qualifiedYes.addEventListener("click", () => {
  qualifiedYes.classList.add("selected");

  qualifiedNo.classList.remove("selected");
});

qualifiedNo.addEventListener("click", () => {
  qualifiedNo.classList.add("selected");

  qualifiedYes.classList.remove("selected");
});

// ======================================================
// AGENDAMENTO
// ======================================================

scheduledYes.addEventListener("click", () => {
  scheduledYes.classList.add("selected");

  scheduledNo.classList.remove("selected");
});

scheduledNo.addEventListener("click", () => {
  scheduledNo.classList.add("selected");

  scheduledYes.classList.remove("selected");
});

// ======================================================
// SALVAR ALTERAÇÕES
// ======================================================

saveLeadButton.addEventListener("click", async () => {
  if (!currentLead) {
    return;
  }

  // ----------------------------------------------
  // QUALIFICAÇÃO
  // ----------------------------------------------

  let qualified = false;

  if (qualifiedYes.classList.contains("selected")) {
    qualified = true;
  }

  // ----------------------------------------------
  // AGENDAMENTO
  // ----------------------------------------------

  let scheduled = false;

  if (scheduledYes.classList.contains("selected")) {
    scheduled = true;
  }

  // ----------------------------------------------
  // PAYLOAD
  // ----------------------------------------------

  const payload = {
    id: Number(currentLead.id),

    qualificado: qualified,

    motivo: modalReason.value.trim(),

    agendou: scheduled,
  };

  console.log("Enviando atualização:", payload);

  // ----------------------------------------------
  // ESTADO DO BOTÃO
  // ----------------------------------------------

  saveLeadButton.disabled = true;

  saveLeadButton.textContent = "Salvando...";

  try {
    // ------------------------------------------
    // PATCH PARA N8N
    // ------------------------------------------

    const response = await fetch(UPDATE_API_URL, {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(payload),
    });

    // ------------------------------------------
    // ERRO HTTP
    // ------------------------------------------

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status}`);
    }

    // ------------------------------------------
    // RESPOSTA N8N
    // ------------------------------------------

    let result = null;

    const responseText = await response.text();

    if (responseText) {
      try {
        result = JSON.parse(responseText);
      } catch {
        result = responseText;
      }
    }

    console.log("Resposta da atualização:", result);

    // ------------------------------------------
    // ATUALIZAR DADOS LOCAIS
    // ------------------------------------------

    currentLead.qualificado = qualified;

    currentLead.motivo = payload.motivo;

    currentLead.agendou = scheduled;

    // ------------------------------------------
    // FECHAR MODAL
    // ------------------------------------------

    closeLeadModal();

    // ------------------------------------------
    // RECARREGAR DO BANCO
    // ------------------------------------------

    await loadLeads();
  } catch (error) {
    console.error("Erro ao salvar lead:", error);

    alert("Não foi possível salvar as alterações.");
  } finally {
    saveLeadButton.disabled = false;

    saveLeadButton.textContent = "Salvar alterações";
  }
});

// ======================================================
// SEGURANÇA BÁSICA PARA TEXTO NA TABELA
// ======================================================

function escapeHTML(value) {
  const div = document.createElement("div");

  div.textContent = String(value ?? "");

  return div.innerHTML;
}

// ======================================================
// INICIAR APLICAÇÃO
// ======================================================

loadLeads();
