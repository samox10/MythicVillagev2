<script setup>
import { ref, computed } from 'vue'
import BuildingLayout from './BuildingLayout.vue'
import WorkerSelectModal from './WorkerSelectModal.vue'
import { useGameStore } from '../stores/gameStore'
import { useForgeStore } from '../stores/forgeStore'
import { PROJETOS_FORJA } from '../data/equipments'
import { CALIBRATION_TIERS, STAT_SCALING } from '../data/balancing'
// Função de cheat para adicionar pedras de calibração e ouro, para facilitar os testes do módulo de aprimoramento
const cheatPedras = () => {
  gameStore.inventory.pedra_calib_1 = (gameStore.inventory.pedra_calib_1 || 0) + 50
  gameStore.inventory.pedra_calib_2 = (gameStore.inventory.pedra_calib_2 || 0) + 50
  gameStore.inventory.pedra_calib_3 = (gameStore.inventory.pedra_calib_3 || 0) + 50
  gameStore.inventory.pedra_seguranca = (gameStore.inventory.pedra_seguranca || 0) + 50
  gameStore.resources.goldCoin += 100000
  alert("Chegou o carregamento de pedras e ouro!")
}
// A função de cheat pode ser chamada no console do navegador digitando: cheatPedras()
// FIM

const gameStore = useGameStore()
const forgeStore = useForgeStore()

const showWorkerSelect = ref(false)
const abaAtual = ref('craft')

// ==========================================
// FILTROS TÁTICOS AVANÇADOS
// ==========================================
const showFilterModal = ref(false)
const filtroNome = ref('')
const filtroCategoria = ref('Todas') // Agora é um valor único
const statusFiltros = ref([])
const filtroLevelMin = ref(1)
const filtroLevelMax = ref(100)

const opcoesCategoria = ['Todas', 'Elmo', 'Peitoral', 'Calça', 'Bota', 'Luva', 'Escudo', 'Arma', 'Flechas']
const opcoesStatus = ['Ataque Físico', 'Ataque Mágico', 'Defesa Física', 'Defesa Mágica', 'Chance Crítico', 'Dano Crítico']

const novoFiltroStat = ref('Ataque Físico')
const novoFiltroVal = ref(10)

const adicionarFiltroStatus = () => {
  if (novoFiltroVal.value < 0) return
  statusFiltros.value.push({ id: Date.now(), stat: novoFiltroStat.value, minVal: novoFiltroVal.value })
}
const removerFiltroStatus = (id) => { statusFiltros.value = statusFiltros.value.filter(f => f.id !== id) }

const limparFiltros = () => { 
  filtroNome.value = ''
  filtroCategoria.value = 'Todas'
  statusFiltros.value = []
  filtroLevelMin.value = 1
  filtroLevelMax.value = 100
  novoFiltroStat.value = opcoesStatus[0]
  novoFiltroVal.value = 10
}
const nivelDaForja = computed(() => {
  const predio = gameStore.buildings.find(b => b.key === 'forja')
  return predio ? predio.level : 0
})
const projetosFiltrados = computed(() => {
   return PROJETOS_FORJA.filter(proj => {
      if (filtroNome.value && !proj.nome.toLowerCase().includes(filtroNome.value.toLowerCase())) return false
      // Filtro do Select de Categoria (Agora só permite escolher uma categoria ou "Todas")
      if (filtroCategoria.value !== 'Todas' && proj.tipo.toLowerCase() !== filtroCategoria.value.toLowerCase()) return false
      
      const min = filtroLevelMin.value !== '' ? Number(filtroLevelMin.value) : 1
      const max = filtroLevelMax.value !== '' ? Number(filtroLevelMax.value) : 999
      if (proj.level < min || proj.level > max) return false 

      for (const filtro of statusFiltros.value) {
         const statNoItem = proj.stats.find(s => s.nome === filtro.stat)
         if (!statNoItem || statNoItem.max < filtro.minVal) return false 
      }
      return true
   })
})
const acelerarProcesso = () => {
  const tempoRestante = forgeStore.activeCraft.totalTime - forgeStore.activeCraft.progress
  const custo = Math.max(1, Math.ceil(tempoRestante / 10))
  
  if (confirm(`Deseja acelerar a síntese pagando ${custo} Mythic Coins?`)) {
    const result = forgeStore.speedUpCraft()
    if (!result.success) alert(result.msg)
  }
}
// ==========================================
// MODAL DE RECOMPENSA (EXTRAÇÃO)
// ==========================================
const showRewardModal = ref(false)

const abrirModalRecompensa = () => {
  showRewardModal.value = true
}

const confirmarExtracao = () => {
  forgeStore.collectItem() // Agora sim manda pro inventário
  showRewardModal.value = false // E fecha o modal
}
// Variável para controlar a dupla confirmação
const confirmandoReciclagem = ref(false)

const tentarReciclar = () => {
  // Primeiro clique: entra em modo de confirmação
  if (!confirmandoReciclagem.value) {
    confirmandoReciclagem.value = true
    
    // Se o jogador não confirmar em 3 segundos, o botão volta ao normal
    setTimeout(() => {
      confirmandoReciclagem.value = false
    }, 3000)
    return
  }

  // Segundo clique: executa a reciclagem de fato
  gameStore.recycleItem(forgeStore.readyItem)
  forgeStore.readyItem = null
  showRewardModal.value = false
  confirmandoReciclagem.value = false // Reseta para a próxima vez
}

const availableBlacksmiths = computed(() => {
  return gameStore.workers.filter(w => w.jobKey === 'ferreiro' && (w.strikeDays || 0) === 0 && !w.injury && w.id !== forgeStore.workerId)
})
const selectWorker = (id) => { forgeStore.assignWorker(id); showWorkerSelect.value = false }

const equipamentoSelecionado = ref(PROJETOS_FORJA[0] || null)
const selecionarProjeto = (projeto) => { equipamentoSelecionado.value = projeto }
// CÁLCULO DE TEMPO EM TEMPO REAL
const tempoEstimado = computed(() => {
  if (!equipamentoSelecionado.value) return 0
  const eficiencia = forgeStore.currentEfficiency || 0
  const speedMultiplier = 1 + (eficiencia / 100)
  return Math.max(1, Math.floor(equipamentoSelecionado.value.tempoBase / speedMultiplier))
})

const podeForjar = computed(() => {
  if (!equipamentoSelecionado.value || !forgeStore.workerId || forgeStore.activeCraft.projeto || forgeStore.readyItem) return false 
  for (const mat of equipamentoSelecionado.value.custo) {
    if (mat.tipo === 'recurso' && gameStore.resources[mat.id] < mat.qtd) return false
    if (mat.tipo === 'inventario' && (gameStore.inventory[mat.id] || 0) < mat.qtd) return false
  }
  return true
})
// ==========================================
// MODAIS DE CONFIRMAÇÃO (ACELERAR / CANCELAR)
// ==========================================
const showSpeedUpModal = ref(false)
const showCancelModal = ref(false)

// Calcula o custo para mostrar no modal antes de cobrar
const custoAcelerar = computed(() => {
  if (!forgeStore.activeCraft.projeto) return 0
  const tempoRestante = forgeStore.activeCraft.totalTime - forgeStore.activeCraft.progress
  return Math.max(1, Math.ceil(tempoRestante / 10))
})

const abrirModalAcelerar = () => { showSpeedUpModal.value = true }
const fecharModalAcelerar = () => { showSpeedUpModal.value = false }

const confirmarAcelerar = () => {
  const result = forgeStore.speedUpCraft()
  if (!result.success) alert(result.msg)
  fecharModalAcelerar()
}

const abrirModalCancelar = () => { showCancelModal.value = true }
const fecharModalCancelar = () => { showCancelModal.value = false }

const confirmarCancelar = () => {
  forgeStore.cancelCraft(true) // Cancela com 80% de reembolso
  fecharModalCancelar()
}
// ==========================================
// MÓDULO DE CALIBRAÇÃO (Aprimoramento)
// ==========================================
const equipamentoCalibracao = ref(null)
const usarPedraSeguranca = ref(false)

const isCalibrating = ref(false) // Controla a tela de suspense
const calibrationResult = ref(null) // Guarda o resultado (sucesso, falha) para mostrar na tela
const skipAnimation = ref(false) // Controla a caixinha de pular animação

// Função para selecionar o equipamento a ser calibrado, que pode ser chamado de um clique em um item do inventário ou de uma lista de equipamentos forjados
const selecionarParaCalibracao = (eqp) => { 
  equipamentoCalibracao.value = eqp
  usarPedraSeguranca.value = false // Reseta o checkbox ao trocar de item
}

// Filtro do Inventário (Usa as exatas mesmas regras do filtro de craft!)
const inventarioFiltrado = computed(() => {
  const lista = gameStore.equipments || []
  return lista.filter(eqp => {
    if (filtroNome.value && !eqp.nome.toLowerCase().includes(filtroNome.value.toLowerCase())) return false
    if (filtroCategoria.value !== 'Todas' && eqp.tipo.toLowerCase() !== filtroCategoria.value.toLowerCase()) return false
    
    const min = filtroLevelMin.value !== '' ? Number(filtroLevelMin.value) : 1
    const max = filtroLevelMax.value !== '' ? Number(filtroLevelMax.value) : 999
    if (eqp.level < min || eqp.level > max) return false 

    for (const filtro of statusFiltros.value) {
      const statNoItem = eqp.stats.find(s => s.nome === filtro.stat)
      if (!statNoItem || statNoItem.valor < filtro.minVal) return false 
    }
    return true
  })
})
// Regra do aprimoramento atual, baseada no nível do item selecionado para aprimorar
const regraCalibracao = computed(() => {
  if (!equipamentoCalibracao.value) return null
  const nivelAtual = equipamentoCalibracao.value.enhancement || 0
  return CALIBRATION_TIERS.find(t => t.level === nivelAtual) || null
})
// Função para prever se o status vai subir no próximo nível e quanto
const prevNextStat = (stat, currentEnhancement) => {
  const config = STAT_SCALING[stat.nome] || STAT_SCALING['default']
  const nextEnhancement = currentEnhancement + 1
  
  const currentBonusTimes = Math.floor(currentEnhancement / config.every)
  const nextBonusTimes = Math.floor(nextEnhancement / config.every)
  
  if (nextBonusTimes > currentBonusTimes) {
    return { vaiSubir: true, valorAlvo: stat.valor + config.step }
  }
  return { vaiSubir: false, valorAlvo: stat.valor } // Não sobe neste nível
}
// Variável para guardar o relógio da animação
let timerCalibracao = null

const executarForja = () => {
  const result = forgeStore.calibrateItem(equipamentoCalibracao.value, usarPedraSeguranca.value)
  isCalibrating.value = false // Desliga o suspense
  
  if (!result.success) {
    alert(result.msg)
  } else {
    calibrationResult.value = {
      type: result.type,
      newLevel: result.newLevel,
      item: equipamentoCalibracao.value
    }
  }
}

const iniciarCalibracao = () => {
  if (!equipamentoCalibracao.value) return
  
  isCalibrating.value = true // Liga a cena de suspense
  
  // Guarda o cronômetro para podermos cancelar se o usuário pular
  timerCalibracao = setTimeout(() => {
    executarForja()
  }, 2500)
}

// NOVA FUNÇÃO: Pula a animação imediatamente
const pularAnimacaoAgora = () => {
  if (timerCalibracao) clearTimeout(timerCalibracao) // Para o relógio de 2.5s
  executarForja() // Mostra o resultado na hora
}

const fecharResultadoCalibracao = () => {
  calibrationResult.value = null
}
// ==========================================
// FUNÇÕES AUXILIARES
const iniciarProcesso = () => {
  const result = forgeStore.startCraft(equipamentoSelecionado.value)
  if (!result.success) alert(result.msg) 
}

const getProgressPct = computed(() => {
  if (!forgeStore.activeCraft.projeto || forgeStore.activeCraft.totalTime === 0) return '0%'
  const pct = (forgeStore.activeCraft.progress / forgeStore.activeCraft.totalTime) * 100
  return `${Math.min(100, pct).toFixed(1)}%` 
})

const handleImageError = (event) => { event.target.style.opacity = '0.1' }
</script>

<template>
  <BuildingLayout
    title="Sintetizador Arcano" :level="nivelDaForja" :maxLevel="10" icon="⚗️"
    :leader="forgeStore.currentWorker" leader-label="Operador" leader-stat-label="EFICIÊNCIA"
    empty-title="SISTEMA OFFLINE" empty-desc="Nenhum operador logado.\nMódulos desativados." :hide-help="true"
    @remove-leader="forgeStore.assignWorker(null)" @assign-leader="showWorkerSelect = true"
  >
    <div v-if="showFilterModal" class="modal-overlay" @click.self="showFilterModal = false">
      <div class="modal-box tactical-modal bento-modal">
        
        <div class="modal-header">
           <div class="mh-title">
              <span class="mh-icon">⎈</span>
              <span>PARÂMETROS DE BUSCA</span>
           </div>
           <button class="btn-close" @click="showFilterModal = false">✕</button>
        </div>
        
        <div class="modal-body bento-grid">
           
           <div class="bento-block">
              <span class="filter-label">CATEGORIA ALVO</span>
              <select v-model="filtroCategoria" class="cyber-select category-select">
                 <option v-for="cat in opcoesCategoria" :key="cat" :value="cat">
                    {{ cat === 'Todas' ? 'Todas as Categorias' : cat }}
                 </option>
              </select>
           </div>

           <div class="bento-block">
              <span class="filter-label">FAIXA DE NÍVEL</span>
              <div class="level-group">
                 <div class="level-input-wrapper">
                    <span class="level-prefix">MIN</span>
                    <input type="number" v-model.number="filtroLevelMin" class="level-clean-input">
                 </div>
                 <div class="level-divider"></div>
                 <div class="level-input-wrapper">
                    <span class="level-prefix">MAX</span>
                    <input type="number" v-model.number="filtroLevelMax" class="level-clean-input">
                 </div>
              </div>
           </div>

           <div class="bento-block full-width-block">
              <span class="filter-label">EXIGÊNCIAS DE ATRIBUTOS</span>
              
              <div class="add-stat-row">
                 <select v-model="novoFiltroStat" class="cyber-select">
                    <option v-for="opt in opcoesStatus" :key="opt" :value="opt">{{ opt }}</option>
                 </select>
                 <input type="number" v-model.number="novoFiltroVal" class="cyber-input" min="1" placeholder="Val">
                 <button class="btn-add-stat" @click="adicionarFiltroStatus" title="Adicionar Regra">✚</button>
              </div>

              <div class="active-stats-list" v-if="statusFiltros.length > 0">
                 <div v-for="filtro in statusFiltros" :key="filtro.id" class="stat-badge">
                    <span class="sb-name">{{ filtro.stat }}</span>
                    <span class="sb-val">{{ filtro.minVal }}</span>
                    <button class="btn-remove-stat" @click="removerFiltroStatus(filtro.id)">✕</button>
                 </div>
              </div>
              <div v-else class="empty-stats">Nenhuma regra de atributo ativa.</div>
           </div>

        </div>
        
        <div class="modal-footer">
           <button class="btn-clear" @click="limparFiltros">Restaurar Padrão</button>
           <button class="btn-apply" @click="showFilterModal = false">CONFIRMAR BUSCA</button>
        </div>
        
      </div>
    </div>
    <!-- Modal de recompensa, mostrando o item forjado e seus atributos, com um botão para confirmar a extração -->
    <div v-if="showRewardModal && forgeStore.readyItem" class="modal-overlay" @click.self="confirmarExtracao">
      <div class="clean-reward-modal">        
        <div class="crm-top">
           <span class="crm-sys">PROJETO CONCLUÍDO</span>
        </div>
        <div class="crm-mid">
           <div class="crm-img-bg">
              <img :src="forgeStore.readyItem.img" @error="handleImageError" class="crm-img">
           </div>
           <div class="crm-title-area">
              <h2 class="crm-name">{{ forgeStore.readyItem.nome }}</h2>
              <div class="crm-badges">
                 <span class="crm-b-lvl">Nível {{ forgeStore.readyItem.level }}</span>
                 <span class="crm-b-type">{{ forgeStore.readyItem.tipo }}</span>
                 <span class="crm-b-rarity" :style="{ background: forgeStore.readyItem.corRaridade }">{{ forgeStore.readyItem.raridade }}</span>
              </div>
           </div>
        </div>
        <div class="crm-stats" v-if="forgeStore.readyItem.stats && forgeStore.readyItem.stats.length > 0">
           <div class="crm-stat-row" v-for="(stat, idx) in forgeStore.readyItem.stats" :key="idx">
              <div class="crm-s-label">
                 <img :src="stat.icone" @error="handleImageError">
                 <span>{{ stat.nome }}</span>
              </div>
              <span class="crm-s-value">+{{ stat.valor }}</span>
           </div>
        </div>
        <div class="crm-bot" style="display: flex; gap: 10px;">
           <button class="btn-clean-recycle" 
                   :class="{ 'confirm-mode': confirmandoReciclagem }" 
                   @click="tentarReciclar">
             {{ confirmandoReciclagem ? 'CONFIRMAR' : 'RECICLAR ITEM' }}
           </button>
           <button class="btn-clean-collect" @click="confirmarExtracao">GUARDAR</button>
        </div>
      </div>
    </div>
    <!-- Modal de confirmação para acelerar o processo, mostrando o custo em Mythic Coins -->
    <div v-if="showSpeedUpModal" class="modal-overlay" @click.self="fecharModalAcelerar">
      <div class="modal-box" style="width: 320px; text-align: center; background: #1e293b; border: 1px solid #475569; border-top: 3px solid #ea580c; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); overflow: hidden;">
        <div class="modal-header" style="justify-content: center;">
          <span class="mh-title" style="color: #ea580c;">⚠️ INJEÇÃO DE ENERGIA</span>
        </div>
        <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
          <p style="font-size: 13px; color: #cbd5e1; margin: 0;">Deseja injetar energia para concluir a síntese imediatamente?</p>
          <div style="background: rgba(15, 23, 42, 0.5); padding: 10px; border-radius: 4px; border: 1px solid #334155;">
            <span style="font-size: 11px; color: #94a3b8; letter-spacing: 1px;">CUSTO DA OPERAÇÃO:</span><br>
            <span style="font-size: 18px; color: #38bdf8; font-weight: bold; font-family: monospace;">{{ custoAcelerar }} Ⓜ️ Mythic Coins</span>
          </div>
        </div>
        <div class="modal-footer" style="justify-content: space-between;">
          <button class="btn-clear" @click="fecharModalAcelerar">CANCELAR</button>
          <button class="btn-apply" style="background: #ea580c; box-shadow: 0 0 10px rgba(234, 88, 12, 0.4);" @click="confirmarAcelerar">PAGAR E CONCLUIR</button>
        </div>
      </div>
    </div>
    <!-- Modal de confirmação para cancelar o processo, com aviso de penalidade -->
    <div v-if="showCancelModal" class="modal-overlay" @click.self="fecharModalCancelar">
      <div class="modal-box" style="width: 320px; text-align: center; background: #1e293b; border: 1px solid #475569; border-top: 3px solid #ea580c; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); overflow: hidden;">
        <div class="modal-header" style="justify-content: center; border-bottom-color: #7f1d1d;">
          <span class="mh-title" style="color: #ef4444;">⚠️ ABORTAR SÍNTESE</span>
        </div>
        <div class="modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
          <p style="font-size: 13px; color: #cbd5e1; margin: 0;">Tem certeza que deseja interromper o processo do equipamento?</p>
          <div style="background: rgba(127, 29, 29, 0.15); padding: 10px; border-radius: 4px; border: 1px solid #7f1d1d;">
            <span style="font-size: 11px; color: #fca5a5; letter-spacing: 1px;">PENALIDADE DE DESCARTE:</span><br>
            <span style="font-size: 12px; color: #ef4444; font-weight: bold;">Parte dos materiais (20%) será perdida no processo.</span>
          </div>
        </div>
        <div class="modal-footer" style="justify-content: space-between; border-top-color: #7f1d1d;">
          <button class="btn-clear" @click="fecharModalCancelar">MANTER PROCESSO</button>
          <button class="btn-apply" style="background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);" @click="confirmarCancelar">ABORTAR AGORA</button>
        </div>
      </div>
    </div>
    <nav class="hud-pill-tabs">
       <button class="p-tab" :class="{ 'active': abaAtual === 'craft' }" @click="abaAtual = 'craft'">
         [ MÓDULO DE SÍNTESE ]
       </button>
       <button class="p-tab" :class="{ 'active': abaAtual === 'aprimoramento' }" @click="abaAtual = 'aprimoramento'">
         [ MÓDULO DE CALIBRAÇÃO ]
       </button>
       
       <button class="p-tab" style="color: #ef4444;" @click="cheatPedras">
         [ 🐛 GERAR PEDRAS ]
       </button>
    </nav>
    
    <div v-if="abaAtual === 'craft'" class="modular-canvas">      
      <div class="top-modules-row">        
        <aside class="hud-module m-list">
           <div class="module-header">
              <span>BANCO DE DIAGRAMAS</span>
              <button class="btn-filter-icon" @click="showFilterModal = true" :class="{'active': filtroCategoria !== 'Todas' || statusFiltros.length > 0}">⚙</button>
           </div>
           <div class="m-search">
              <input type="text" v-model="filtroNome" placeholder="Buscar no banco de dados...">
           </div>           
           <div class="m-scroll-list">
              <div v-if="projetosFiltrados.length === 0" class="empty-msg">Nenhum registro encontrado.</div>
              
              <div v-for="proj in projetosFiltrados" :key="proj.id" 
                   class="m-item" 
                   :class="{ 'selected holo-glow': equipamentoSelecionado && equipamentoSelecionado.id === proj.id }"
                   @click="selecionarProjeto(proj)">
                 <img :src="proj.img" @error="handleImageError" class="m-item-icon" :style="{ borderColor: proj.corRaridade || '#334155' }">
                 
                 <div class="m-item-texts">
                    <span class="m-item-name" :style="{ color: proj.corRaridade || '#e2e8f0' }">{{ proj.nome }}</span>
                    <span class="m-item-lvl">Lv.{{ proj.level }} • {{ proj.tipo }}</span>
                 </div>
              </div>
           </div>
        </aside>
        <main class="hud-module m-inspector" v-if="equipamentoSelecionado">           
           <header class="ins-head">
              <div class="ins-img-box cyan-pulse">
                 <img :src="equipamentoSelecionado.img" @error="handleImageError">
              </div>
              <div class="ins-title-box">
                 <h2>{{ equipamentoSelecionado.nome }}</h2>
                 <span class="ins-meta">{{ equipamentoSelecionado.tipo }} | CICLO ESTIMADO: {{ tempoEstimado }}s</span>
              </div>
           </header>
           <section class="ins-stats">
              <div class="section-title">PROJEÇÃO DE ATRIBUTOS</div>
              
              <div class="stats-scroll-area">
                 <div class="stats-grid">
                    <div v-for="n in 8" :key="n" class="micro-stat" :class="{'empty-stat': !equipamentoSelecionado.stats[n-1]}">
                       <template v-if="equipamentoSelecionado.stats[n-1]">
                          <span class="ms-lbl">
                             <img :src="equipamentoSelecionado.stats[n-1].icone" @error="handleImageError">
                             {{ equipamentoSelecionado.stats[n-1].nome }}
                          </span>
                          <span class="ms-val">{{ equipamentoSelecionado.stats[n-1].min }} <span class="dim">~</span> {{ equipamentoSelecionado.stats[n-1].max }}</span>
                       </template>
                    </div>
                 </div>

                 <div class="bonus-nivel-10" v-if="equipamentoSelecionado.bonusNivel10">
                    <span class="bn10-icon">✦</span>
                    <p class="bn10-desc">{{ equipamentoSelecionado.bonusNivel10 }}</p>
                    <span class="bn10-tag">REQ. +10</span>
                 </div>
              </div>
           </section>
           <footer class="ins-footer">
              <div class="cost-section">
                 <span class="section-title">REQUISITOS DE SÍNTESE</span>
                 <div class="costs-wrapper">
                    <div v-for="(mat, idx) in equipamentoSelecionado.custo" :key="idx" class="micro-mat">
                       <img :src="mat.img" @error="handleImageError">
                       <span :class="{'err': (mat.tipo === 'recurso' ? gameStore.resources[mat.id] : (gameStore.inventory[mat.id] || 0)) < mat.qtd }">
                          {{ mat.qtd }}
                       </span>
                    </div>
                 </div>
              </div>
              <div class="action-section">
                 <button class="btn-core ignite" @click="iniciarProcesso" :disabled="!podeForjar">
                    CRAFTAR
                 </button>
              </div>
           </footer>
        </main>
        <main class="hud-module m-inspector empty-board" v-else>
           <div class="hologram-placeholder">
              <span class="h-icon">⚗️</span>
              <p>Aguardando diagrama.</p>
           </div>
        </main>
      </div>
      <div class="hud-module m-synthesis-bay forge-core">         
         <div v-if="!forgeStore.activeCraft.projeto && !forgeStore.readyItem" class="bay-idle">
            <span class="status-dot"></span>
            <span class="ti-main">NÚCLEO OCIOSO</span>
         </div>
         <div v-else-if="forgeStore.activeCraft.projeto" class="bay-working sym-mode">            
            <div class="sym-left">
               <div class="tw-icon-wrapper orange-pulse">
                  <img :src="forgeStore.activeCraft.projeto.img" class="tw-icon" @error="handleImageError">
               </div>
            </div>
            <div class="sym-center">
               <span class="sym-title">FORJANDO: {{ forgeStore.activeCraft.projeto.nome }}</span>
               <div class="sym-track">
                  <div class="sym-fill" :style="{ width: getProgressPct }"></div>
                  <span class="sym-time-overlay">{{ forgeStore.activeCraft.progress.toFixed(0) }}s / {{ forgeStore.activeCraft.totalTime }}s</span>
               </div>
            </div>
            <div class="sym-right">
               <button class="btn-sym accel" @click="abrirModalAcelerar">ACELERAR</button>
               <button class="btn-sym cancel" @click="abrirModalCancelar">ABORTAR</button>
            </div>
         </div>
         <div v-else-if="forgeStore.readyItem" class="bay-done sym-mode">
            <div class="sym-left">
               <div class="tw-icon-wrapper success-glow">
                  <img :src="forgeStore.readyItem.img" class="tw-icon" @error="handleImageError">
               </div>
            </div>
            <div class="sym-center">
               <span class="sym-title ready-text">{{ forgeStore.readyItem.nome }}</span>
               <span class="ready-sub">SÍNTESE CONCLUÍDA</span>
            </div>
            <div class="sym-right">
               <button class="btn-sym extract" @click="abrirModalRecompensa">
                  COLETAR
               </button>
            </div>
         </div>
         

      </div>


    </div>

    <div v-if="abaAtual === 'aprimoramento'" class="modular-canvas">
      <div class="top-modules-row">
        
        <aside class="hud-module m-list">
           <div class="module-header">
              <span>MÓDULOS DE ARTEFATO</span>
              <button class="btn-filter-icon" @click="showFilterModal = true" :class="{'active': filtroCategoria !== 'Todas' || statusFiltros.length > 0}">⚙</button>
           </div>
           <div class="m-search">
              <input type="text" v-model="filtroNome" placeholder="Buscar no banco de dados...">
           </div>
           
           <div class="m-scroll-list">
              <div v-if="inventarioFiltrado.length === 0" class="empty-msg">Nenhum equipamento disponível.</div>
              
              <div v-for="eqp in inventarioFiltrado" :key="eqp.idUnico" 
                   class="m-item" 
                   :class="{ 'selected holo-glow': equipamentoCalibracao && equipamentoCalibracao.idUnico === eqp.idUnico }"
                   @click="selecionarParaCalibracao(eqp)">
                 <img :src="eqp.img" @error="handleImageError" class="m-item-icon" :style="{ borderColor: eqp.corRaridade || '#334155' }">
                 
                 <div class="m-item-texts">
                    <span class="m-item-name" :style="{ color: eqp.corRaridade || '#e2e8f0' }">
                      {{ eqp.nome }} <span v-if="eqp.enhancement > 0" style="color: #38bdf8;">(+{{ eqp.enhancement }})</span>
                    </span>
                    <span class="m-item-lvl">Lv.{{ eqp.level }} • {{ eqp.tipo }}</span>
                 </div>
              </div>
           </div>
        </aside>

        <main class="hud-module m-inspector" v-if="equipamentoCalibracao && regraCalibracao">
           
           <div class="cena-wrapper" v-if="!isCalibrating && !calibrationResult">
             <header class="altar-visual">
                <div class="av-side">
                   <div class="av-img-box" :style="{ borderColor: equipamentoCalibracao.corRaridade || '#334155' }">
                      <img :src="equipamentoCalibracao.img" @error="handleImageError">
                   </div>
                   <div class="av-info">
                      <span class="av-name">{{ equipamentoCalibracao.nome }}</span>
                      <span class="av-meta">ATUAL: <strong style="color: #94a3b8;">+{{ equipamentoCalibracao.enhancement || 0 }}</strong></span>
                   </div>
                </div>

                <div class="av-crucible">
                   <span class="av-crucible-chance">{{ regraCalibracao.chance }}%</span>
                   <div class="av-energy-flow">»»»»»</div>
                </div>

                <div class="av-side right-side">
                   <div class="av-info align-right">
                      <span class="av-name" style="color: #38bdf8;">ALVO: +{{ (equipamentoCalibracao.enhancement || 0) + 1 }}</span>
                      <span class="av-meta">PEDRA DE FUSÃO</span>
                   </div>
                   <div class="av-img-box fusion-stone-box">
                      <img :src="`/assets/recursos/${regraCalibracao.stoneId}.png`" @error="handleImageError">
                      <span class="av-stone-qty" :class="{'err': (gameStore.inventory[regraCalibracao.stoneId] || 0) < 1}">
                         {{ gameStore.inventory[regraCalibracao.stoneId] || 0 }}x
                      </span>
                   </div>
                </div>
             </header>

             <section class="crucible-projection">
                <div class="section-title" style="margin-bottom: 10px;">PROJEÇÃO DE ATRIBUTOS</div>
                
                <div class="scroll-area" style="flex: 1; overflow-y: auto; padding-right: 5px;">
                   
                   <div class="holographic-stats-crucible">
                      <div v-for="stat in equipamentoCalibracao.stats" :key="stat.id" class="hsc-row">
                         <div class="hsc-stat-label">
                            <img :src="stat.icone" @error="handleImageError">
                            <span>{{ stat.nome }}</span>
                         </div>
                         <div class="hsc-stat-values">
                            <span class="hsc-curr">{{ stat.valor }}</span>
                            <span class="hsc-arrow" :class="{ 'active': prevNextStat(stat, equipamentoCalibracao.enhancement || 0).vaiSubir }">⟿</span>
                            <span class="hsc-next" :class="{ 'active': prevNextStat(stat, equipamentoCalibracao.enhancement || 0).vaiSubir }">
                               {{ prevNextStat(stat, equipamentoCalibracao.enhancement || 0).valorAlvo }}
                            </span>
                         </div>
                      </div>
                   </div>

                   <div class="special-matrix-box" v-if="equipamentoCalibracao.bonusNivel10" :class="{ 'special-matrix-active': (equipamentoCalibracao.enhancement || 0) >= 10 }">
                      <span class="smb-icon">✦</span>
                      <p class="smb-desc">{{ equipamentoCalibracao.bonusNivel10 }}</p>
                      <span class="smb-tag" v-if="(equipamentoCalibracao.enhancement || 0) < 10">REQ. +10</span>
                      <span class="smb-tag active" v-else>ATIVADO</span>
                   </div>

                </div>
             </section>

             <footer class="altar-crucible-footer">
                <div class="action-console-bar">
                   
                   <label class="console-left-toggle" :class="{ 'is-disabled': !regraCalibracao.canDowngrade }">
                      <input type="checkbox" v-model="usarPedraSeguranca" :disabled="!regraCalibracao.canDowngrade">
                      <div class="clt-icon">
                         <img :src="`/assets/recursos/pedra_calib_sec.png`" @error="handleImageError">
                      </div>
                      <div class="clt-info">
                         <span class="clt-title">MÓDULO DE PROTEÇÃO</span>
                         <span class="clt-status" v-if="regraCalibracao.canDowngrade">
                            <span class="led-dot" :class="usarPedraSeguranca ? 'on' : 'off'"></span>
                            {{ usarPedraSeguranca ? 'SISTEMA ATIVADO' : 'INATIVO' }} <span class="dim">({{ gameStore.inventory.pedra_seguranca || 0 }}x)</span>
                         </span>
                         <span class="clt-status disabled" v-else>
                            NÃO EXIGIDO
                         </span>
                      </div>
                   </label>

                   <div class="console-divider"></div>

                   <div class="console-right-action" style="flex-direction: column; gap: 5px;">
                      <button class="btn-fused-action ignite" @click="iniciarCalibracao" :disabled="(gameStore.inventory[regraCalibracao.stoneId] || 0) < 1">
                         <div class="bfa-text">APRIMORAR</div>
                         <div class="bfa-cost" :class="{'err': gameStore.resources.goldCoin < regraCalibracao.gold }">
                            💰 {{ regraCalibracao.gold }}
                         </div>
                      </button>
                   </div>
                </div>
             </footer>
           </div>

           <div class="cena-wrapper suspense-screen" v-else-if="isCalibrating">
              <div class="suspense-core">
                 <div class="sc-ring ring-1"></div>
                 <div class="sc-ring ring-2"></div>
                 <img :src="equipamentoCalibracao.img" class="sc-item pulse-item" @error="handleImageError">
              </div>
              <h3 class="suspense-title">FUSIONANDO MATRIZ...</h3>
              <p class="suspense-sub">Injetando energia no núcleo do equipamento</p>
              
              <button class="btn-skip-anim" @click="pularAnimacaoAgora">PULAR ⏭</button>
           </div>

           <div class="cena-wrapper result-screen" v-else-if="calibrationResult">
              
              <div v-if="calibrationResult.type === 'success'" class="rs-content success">
                 <div class="rs-icon-box">
                    <img :src="calibrationResult.item.img" @error="handleImageError">
                 </div>
                 <h2 class="rs-title">CALIBRAÇÃO BEM-SUCEDIDA!</h2>
                 <p class="rs-desc">O equipamento ressoou com a energia e foi aprimorado para <strong style="color: #38bdf8;">+{{ calibrationResult.newLevel }}</strong>.</p>
              </div>

              <div v-else-if="calibrationResult.type === 'downgrade'" class="rs-content downgrade">
                 <div class="rs-icon-box">
                    <img :src="calibrationResult.item.img" style="filter: grayscale(1);" @error="handleImageError">
                 </div>
                 <h2 class="rs-title">FALHA CRÍTICA!</h2>
                 <p class="rs-desc">A estrutura rejeitou a energia. O equipamento sofreu danos e <strong style="color: #ef4444;">caiu para +{{ calibrationResult.newLevel }}</strong>.</p>
              </div>

              <div v-else class="rs-content fail">
                 <div class="rs-icon-box">
                    <img :src="calibrationResult.item.img" style="opacity: 0.5;" @error="handleImageError">
                 </div>
                 <h2 class="rs-title">FALHA NA SÍNTESE</h2>
                 <p class="rs-desc">A fusão dissipou-se antes de concluir. <strong style="color: #94a3b8;">O nível foi mantido em +{{ calibrationResult.newLevel }}</strong>.</p>
              </div>

              <button class="btn-continue" @click="fecharResultadoCalibracao">C O N T I N U A R</button>
           </div>

        </main>

        <main class="hud-module m-inspector" v-else-if="equipamentoCalibracao && !regraCalibracao">
           <div class="cena-wrapper">
             
             <header class="altar-visual">
                <div class="av-side">
                   <div class="av-img-box" :style="{ borderColor: equipamentoCalibracao.corRaridade || '#334155' }">
                      <img :src="equipamentoCalibracao.img" @error="handleImageError">
                   </div>
                   <div class="av-info">
                      <span class="av-name">{{ equipamentoCalibracao.nome }}</span>
                      <span class="av-meta">NÍVEL MÁXIMO: <strong style="color: #38bdf8;">+{{ equipamentoCalibracao.enhancement || 0 }}</strong></span>
                   </div>
                </div>

                <div class="av-crucible" style="flex: 1; align-items: center; justify-content: center; opacity: 0.8;">
                   <span style="font-size: 16px; font-weight: 800; color: #64748b; letter-spacing: 3px; text-shadow: 0 0 10px rgba(0,0,0,0.5);">LIMITE ATINGIDO</span>
                </div>
             </header>

             <section class="crucible-projection">
                <div class="section-title" style="margin-bottom: 10px;">ATRIBUTOS CONSOLIDADOS</div>
                
                <div class="scroll-area" style="flex: 1; overflow-y: auto; padding-right: 5px;">
                   
                   <div class="holographic-stats-crucible">
                      <div v-for="stat in equipamentoCalibracao.stats" :key="stat.id" class="hsc-row">
                         <div class="hsc-stat-label">
                            <img :src="stat.icone" @error="handleImageError">
                            <span>{{ stat.nome }}</span>
                         </div>
                         <div class="hsc-stat-values">
                            <span class="hsc-curr" style="color: #38bdf8; font-weight: 800;">
                               {{ stat.valor }}
                            </span>
                         </div>
                      </div>
                   </div>

                   <div class="special-matrix-box special-matrix-active max-matrix-glow" v-if="equipamentoCalibracao.bonusNivel10">
                      <span class="smb-icon">✦</span>
                      <p class="smb-desc" style="font-size: 11px; color: #fef08a; font-weight: 700;">
                         {{ equipamentoCalibracao.bonusNivel10 }}
                      </p>
                      <span class="smb-tag active" style="font-size: 10px; padding: 4px 8px; box-shadow: 0 0 10px rgba(250, 204, 21, 0.5);">
                         PERK ATIVO
                      </span>
                   </div>

                </div>
             </section>

             </div>
        </main>

        <main class="hud-module m-inspector empty-board" v-else>
           <div class="hologram-placeholder">
              <span class="h-icon">⚙️</span>
              <p>Selecione um equipamento para calibração.</p>
           </div>
        </main>

      </div>
    </div>

    <WorkerSelectModal v-if="showWorkerSelect" title="ATRIBUIR OPERADOR" :workers="availableBlacksmiths" @close="showWorkerSelect = false" @select="selectWorker" />
  </BuildingLayout>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@300;400;600;700&display=swap');

* { box-sizing: border-box; }

/* =========================================
   ABAS PÍLULA FLUTUANTES (Ideia C)
========================================== */
.hud-pill-tabs { display: flex; gap: 15px; padding-left: 5px; margin-bottom: 15px; }
.p-tab {
  background: transparent; border: none; color: #64748b; font-family: 'Chakra Petch', sans-serif;
  font-weight: 700; font-size: 12px; letter-spacing: 1px; cursor: pointer; transition: 0.2s;
}
.p-tab:hover { color: #94a3b8; }
.p-tab.active { color: #38bdf8; text-shadow: 0 0 8px rgba(56, 189, 248, 0.5); }

/* =========================================
   CANVAS MODULAR (O Fundo Tático Ideia C)
========================================== */
.modular-canvas {
  display: flex; flex-direction: column; gap: 15px; 
  height: 560px; /* Altura fixa mantida para estabilidade */
  /* Fundo pontilhado, bordas e sombras foram removidos para deixar as janelas soltas */
  font-family: 'Chakra Petch', sans-serif; color: #e2e8f0;
}

/* Base dos Módulos Flutuantes (Efeito Vidro) */
.hud-module {
  background: rgba(15, 23, 42, 0.85); 
  backdrop-filter: blur(4px);
  border: 1px solid #334155;
  border-top: 2px solid #38bdf8; /* Borda Ciano Padrão */
  border-radius: 6px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.4);
  display: flex; flex-direction: column; overflow: hidden;
}
.module-header { 
  background: rgba(30, 41, 59, 0.6); padding: 8px 12px; border-bottom: 1px solid #334155;
  font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; display: flex; justify-content: space-between; align-items: center;
}

/* =========================================
   LINHA SUPERIOR (Estrutura A: Lista + Inspetor)
========================================== */
.top-modules-row { display: flex; gap: 15px; flex: 1; min-height: 0; }

/* COLUNA ESQUERDA: LISTA */
.m-list { width: 300px; flex-shrink: 0; }
.btn-filter-icon { background: none; border: none; color: #38bdf8; cursor: pointer; transition: 0.2s; font-size: 14px; }
.btn-filter-icon:hover, .btn-filter-icon.active { color: #38bdf8; }
.m-search { padding: 10px; border-bottom: 1px solid #334155; background: rgba(30,41,59,0.3); }
.m-search input { width: 100%; background: #0f172a; border: 1px solid #334155; color: #e2e8f0; padding: 8px 10px; border-radius: 4px; font-family: inherit; font-size: 11px; outline: none; }
.m-search input::placeholder { color: #64748b; }

.m-scroll-list { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.m-scroll-list::-webkit-scrollbar { width: 4px; }
.m-scroll-list::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }

.empty-msg { font-size: 11px; color: #64748b; text-align: center; margin-top: 20px; }
.m-item { 
  display: flex; align-items: center; gap: 12px; padding: 8px; 
  background: #1e293b; border: 1px solid transparent; border-radius: 4px; cursor: pointer; transition: 0.2s; 
}
.m-item:hover { background: #252f42; border-color: #475569; }
.m-item-icon { width: 32px; height: 32px; object-fit: contain; background: #0f172a; border-radius: 4px; padding: 2px; border: 1px solid #334155; }
.m-item-texts { display: flex; flex-direction: column; }
.m-item-name { font-size: 12px; font-weight: 700; color: #e2e8f0; }
.m-item-lvl { font-size: 10px; color: #94a3b8; font-family: monospace; }
.m-item.selected.holo-glow { background: rgba(56, 189, 248, 0.1); border-color: #38bdf8; box-shadow: 0 0 10px rgba(56, 189, 248, 0.2); }
.m-item.selected .m-item-name { color: #38bdf8; }
.m-item.selected .m-item-icon { border-color: #38bdf8; }

/* COLUNA DIREITA: INSPETOR */
.m-inspector { flex: 1; display: flex; flex-direction: column; padding: 20px; gap: 20px; }
.empty-board { align-items: center; justify-content: center; opacity: 0.5; }
.hologram-placeholder { display: flex; flex-direction: column; align-items: center; }
.h-icon { font-size: 32px; margin-bottom: 10px; filter: grayscale(1); opacity: 0.7; }

.ins-head { display: flex; gap: 15px; align-items: center; border-bottom: 1px dashed #334155; padding-bottom: 15px; flex-shrink: 0; }
.ins-img-box { width: 70px; height: 70px; background: #0f172a; border: 1px solid #334155; border-radius: 6px; display: flex; align-items: center; justify-content: center; position: relative; }
.cyan-pulse::before { content: ''; position: absolute; inset: 0; box-shadow: 0 0 15px rgba(56, 189, 248, 0.3); animation: pulse-c 2s infinite alternate; border-radius: 6px; }
@keyframes pulse-c { 0% { opacity: 0.3; } 100% { opacity: 1; } }
.ins-img-box img { width: 45px; height: 45px; z-index: 1; object-fit: contain; }

.ins-title-box { display: flex; flex-direction: column; }
.ins-title-box h2 { margin: 0 0 4px 0; font-size: 20px; color: #e0f2fe; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; }
.ins-meta { font-size: 10px; color: #94a3b8; font-family: monospace; }

/* Grid de Status Fixo (Evita Pulos na Tela) */
.ins-stats { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.stats-scroll-area {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding-right: 5px; /* Espacinho pra barra de rolagem não grudar */
}
.stats-scroll-area::-webkit-scrollbar { width: 4px; }
.stats-scroll-area::-webkit-scrollbar-thumb { background: #334155; border-radius: 2px; }
.section-title { font-size: 10px; color: #64748b; letter-spacing: 1px; margin-bottom: 10px; font-weight: 700; border-left: 2px solid #38bdf8; padding-left: 6px; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
.micro-stat { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  background: rgba(30,41,59,0.5); 
  padding: 4px 10px; 
  border-radius: 4px; 
  border: 1px solid #1e293b; 
  height: 30px; 
}
.micro-stat.empty-stat { visibility: hidden; }
.ms-lbl { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #cbd5e1; }
.ms-lbl img { width: 14px; height: 14px; opacity: 0.8; }
.ms-val { font-size: 12px; font-weight: 700; color: #38bdf8; font-family: monospace; }
.dim { color: #64748b; margin: 0 2px; font-weight: 400; }

/* Rodapé do Inspetor (Custos e Botão) */
.ins-footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px dashed #334155; padding-top: 15px; height: 70px; flex-shrink: 0; }
.cost-section { display: flex; flex-direction: column; gap: 6px; }
.costs-wrapper { display: flex; flex-wrap: wrap; gap: 6px; }
.micro-mat { display: flex; align-items: center; gap: 4px; background: #1e293b; padding: 4px 8px; border-radius: 4px; border: 1px solid #334155; }
.micro-mat img { width: 14px; height: 14px; }
.micro-mat span { font-size: 11px; font-weight: 700; color: #e2e8f0; font-family: monospace; }
.micro-mat span.err { color: #ef4444; }

/* Botão Principal (Ação Tática - Paleta Arcana/Hitech) */
.btn-core { 
  height: 34px;
  padding: 0 20px;
  border: none; 
  font-size: 11px; 
  font-weight: 800; 
  letter-spacing: 2px; 
  cursor: pointer; 
  transition: all 0.2s ease; 
  font-family: inherit; 
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Mantendo formato, mudando para Ciano/Azul com Brilho */
.btn-core.ignite { 
  background: linear-gradient(45deg, #06b6d4, #2563eb); 
  color: #fff; 
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  
  /* NOVA COR DA BORDA: Ciano brilhante no lugar do amarelo */
  border-right: 3px solid #38bdf8; 
}

.btn-core.ignite:hover:not(:disabled) { 
  background: linear-gradient(45deg, #22d3ee, #3b82f6); 
  transform: scale(1.03); 
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.5);
}

/* Estado bloqueado */
.btn-core.ignite:disabled { 
  background: #1e293b; 
  color: #475569; 
  border-right: 3px solid #334155;
  cursor: not-allowed; 
  transform: none;
  box-shadow: none;
}

/* =========================================
   LINHA INFERIOR: BAIA DE SÍNTESE (Modelo Simétrico)
========================================== */
.m-synthesis-bay { height: 80px; flex-shrink: 0; padding: 0 15px; justify-content: center; }
.forge-core { border-top-color: #ea580c; box-shadow: 0 5px 15px rgba(234, 88, 12, 0.1); }

.bay-idle { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; opacity: 0.5; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: #64748b; }
.ti-main { font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 2px; }

/* Layout Simétrico (Esquerda, Centro, Direita) */
.sym-mode { display: flex; align-items: center; width: 100%; gap: 15px; }

.sym-left { flex-shrink: 0; }
.tw-icon-wrapper { width: 44px; height: 44px; background: #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #334155; }
.tw-icon { width: 26px; height: 26px; object-fit: contain; } /* Mantém o ícone pequeno na extração! */
.orange-pulse { border-color: #ea580c; box-shadow: 0 0 10px rgba(234,88,12,0.4); animation: shake 0.5s infinite alternate; }
@keyframes shake { 0% { transform: translateY(0px); } 100% { transform: translateY(-2px); } }

.sym-center { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.sym-title { font-size: 11px; color: #ea580c; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
.sym-track { position: relative; width: 100%; height: 16px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; overflow: hidden; display: flex; align-items: center; justify-content: center;}
.sym-fill { position: absolute; left: 0; top: 0; height: 100%; background: linear-gradient(90deg, #b45309, #facc15); transition: width 1s linear; z-index: 1;}
.sym-time-overlay { position: relative; z-index: 2; font-size: 10px; color: #fff; font-family: monospace; font-weight: bold; text-shadow: 0 0 3px #000; }

.sym-right { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; width: 100px; }
.btn-sym { height: 22px; width: 100%; border: none; border-radius: 4px; font-size: 9px; font-weight: bold; cursor: pointer; transition: 0.2s; font-family: inherit; }
.btn-sym.accel { background: #b45309; color: #fff; }
.btn-sym.accel:hover { background: #d97706; }
.btn-sym.cancel { background: transparent; border: 1px solid #7f1d1d; color: #ef4444; }
.btn-sym.cancel:hover { background: #7f1d1d; color: #fff; }

/* Concluído Simétrico */
.success-glow { border-color: #10b981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); }
.ready-text { color: #10b981; font-size: 14px; }
.ready-sub { font-size: 9px; color: #64748b; letter-spacing: 1px; }
.btn-sym.extract { 
  background: linear-gradient(45deg, #059669, #10b981); 
  color: #fff; 
  height: 38px; /* Ajustado para ficar mais elegante e proporcional */
  font-size: 11px; 
  font-weight: 800;
  letter-spacing: 2px; 
  /* Mesmo corte Cyberpunk do botão de Craftar */
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  border-right: 3px solid #6ee7b7; /* Detalhe verde claro (Neon) na direita */
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.btn-sym.extract:hover { 
  background: linear-gradient(45deg, #10b981, #34d399); 
  transform: scale(1.03); 
  /* Glow verde indicando sucesso */
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.6); 
}

/* =========================================
   MODAL DE FILTROS (MODELO MATRIZ / BENTO GRID)
========================================== */
.modal-overlay { 
  position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
  background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); 
  z-index: 999; display: flex; justify-content: center; align-items: center; 
}
/* Tira as setas dos inputs de número */
input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
input[type=number] { 
  appearance: textfield; /* Padrão moderno (Tira o aviso do VS Code) */
  -moz-appearance: textfield; /* Mantém para Firefox mais antigos */
}
/* Modal mais largo para suportar a grade */
.tactical-modal.bento-modal { 
  width: 520px; /* Largura expandida */
  background: #1e293b; 
  border: 1px solid #475569; border-top: 3px solid #38bdf8; border-radius: 8px; 
  display: flex; flex-direction: column; 
  box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 20px rgba(56, 189, 248, 0.05);
  animation: modal-boot 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
@keyframes modal-boot { 0% { transform: scale(0.9) translateY(20px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }

.modal-header { padding: 15px 20px; border-bottom: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; background: rgba(51, 65, 85, 0.3); border-radius: 8px 8px 0 0; }
.mh-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #f1f5f9; letter-spacing: 1px; }
.mh-icon { color: #38bdf8; font-size: 16px; }
.btn-close { background: none; border: none; color: #94a3b8; font-size: 16px; cursor: pointer; transition: 0.2s; }
.btn-close:hover { color: #ef4444; transform: scale(1.1); }

/* --- A MÁGICA DO GRID --- */
.bento-grid { 
  padding: 20px; 
  display: grid; 
  grid-template-columns: 1fr 1fr; /* Duas colunas iguais */
  gap: 20px; /* Espaçamento entre os blocos */
}
.bento-block { display: flex; flex-direction: column; gap: 8px; }
.full-width-block { grid-column: 1 / -1; } /* Faz o bloco ocupar as duas colunas */

.filter-label { font-size: 10px; color: #94a3b8; font-weight: 700; letter-spacing: 2px; border-left: 2px solid #38bdf8; padding-left: 8px; }

/* Controles de Nível */
.level-group { display: flex; align-items: center; background: #0f172a; border: 1px solid #334155; border-radius: 4px; height: 38px; overflow: hidden; }
.level-input-wrapper { flex: 1; display: flex; align-items: center; padding: 0 10px; }
.level-prefix { font-size: 9px; color: #64748b; font-weight: bold; margin-right: 8px; }
.level-clean-input { width: 100%; background: transparent; border: none; color: #38bdf8; font-family: monospace; font-size: 14px; font-weight: bold; outline: none; }
.level-divider { width: 1px; height: 20px; background: #334155; }

/* Controles Base e Atributos */
.category-select { height: 38px; width: 100%; padding: 0 10px; }
.add-stat-row { display: flex; gap: 8px; height: 38px; }
.cyber-select { flex: 1; background: #0f172a; border: 1px solid #334155; color: #e2e8f0; font-family: inherit; font-size: 12px; border-radius: 4px; outline: none; cursor: pointer; padding-left: 10px; }
.cyber-input { width: 70px; background: #0f172a; border: 1px solid #334155; color: #38bdf8; font-family: monospace; font-size: 13px; font-weight: bold; text-align: center; border-radius: 4px; outline: none; transition: 0.2s;}
.cyber-input:focus { border-color: #38bdf8; box-shadow: 0 0 5px rgba(56,189,248,0.2); }
.btn-add-stat { width: 38px; background: rgba(56, 189, 248, 0.1); border: 1px solid #38bdf8; color: #38bdf8; border-radius: 4px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.2s; }
.btn-add-stat:hover { background: #38bdf8; color: #0f172a; }

/* Lista de Atributos com Altura Máxima */
.active-stats-list { display: flex; flex-direction: column; gap: 6px; margin-top: 5px; max-height: 120px; overflow-y: auto; padding-right: 5px; }
.active-stats-list::-webkit-scrollbar { width: 4px; }
.active-stats-list::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }

.stat-badge { display: flex; align-items: center; background: #0f172a; border: 1px solid #334155; padding: 8px 12px; border-radius: 4px; gap: 10px; }
.sb-name { flex: 1; font-size: 11px; color: #e2e8f0; font-weight: 600; }
.sb-val { font-size: 13px; color: #38bdf8; font-family: monospace; font-weight: bold; }
.btn-remove-stat { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 12px; font-weight: bold; transition: 0.2s; }
.btn-remove-stat:hover { color: #b91c1c; transform: scale(1.2); }
.empty-stats { font-size: 10px; color: #64748b; font-style: italic; text-align: center; margin-top: 15px; margin-bottom: 10px; }

/* Bônus de Nível 10 (Apenas Exibição, Não Interativo) */
.bonus-nivel-10 {
  margin-top: auto; /* Empurra a caixa pro final do espaço disponível, ajudando no alinhamento */
  padding: 6px 12px; /* Diminuímos o padding vertical (era 12px, agora é 6px) para afinar a caixa */
  background: linear-gradient(90deg, rgba(234, 179, 8, 0.1) 0%, rgba(30, 41, 59, 0.4) 100%);
  border: 1px solid rgba(234, 179, 8, 0.2);
  border-left: 3px solid #eab308;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: inset 0 0 15px rgba(234, 179, 8, 0.05);
}

.bn10-icon {
  font-size: 16px;
  color: #eab308;
  text-shadow: 0 0 10px rgba(234, 179, 8, 0.6);
  animation: pulse-star 2s infinite alternate;
}

@keyframes pulse-star {
  0% { opacity: 0.6; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1.1); }
}

.bn10-desc {
  margin: 0;
  font-size: 11px; /* Fonte levemente menor (era 12px) para caber melhor */
  color: #fef08a; 
  font-weight: 600;
  line-height: 1.2; /* Linha mais justa para não gerar espaço extra */
  flex: 1;
  letter-spacing: 0.5px;
}
.bn10-tag {
  font-size: 10px;
  color: #713f12;
  background: #facc15;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 800;
  letter-spacing: 1px;
  box-shadow: 0 0 10px rgba(250, 204, 21, 0.3);
  white-space: nowrap;
}

/* Footer */
.modal-footer { padding: 15px 20px; border-top: 1px solid #334155; display: flex; justify-content: space-between; align-items: center; background: rgba(51, 65, 85, 0.2); border-radius: 0 0 8px 8px; }
.btn-clear { background: transparent; border: none; color: #94a3b8; font-size: 11px; cursor: pointer; transition: 0.2s; font-family: inherit; }
.btn-clear:hover { color: #f8fafc; text-decoration: underline; }
.btn-apply { background: #38bdf8; color: #0f172a; border: none; padding: 10px 20px; border-radius: 4px; font-size: 11px; font-weight: 800; letter-spacing: 1px; cursor: pointer; transition: 0.2s; font-family: inherit; box-shadow: 0 0 10px rgba(56, 189, 248, 0.3); }
.btn-apply:hover { background: #7dd3fc; box-shadow: 0 0 15px rgba(56, 189, 248, 0.5); transform: translateY(-1px); }

/* Adaptação para Celular */
@media (max-width: 600px) {
  .tactical-modal.bento-modal { width: 90%; }
  .bento-grid { grid-template-columns: 1fr; gap: 15px; }
}
/* =========================================
   RECOMPENSA: MODELO 4 (INTERFACE CLEAN)
========================================== */
.clean-reward-modal {
  width: 340px; background: #0f172a;
  border: 1px solid #334155; border-radius: 6px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 15px 40px rgba(0,0,0,0.6);
  animation: clean-boot 0.3s ease-out forwards;
}
@keyframes clean-boot { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }

.crm-top { padding: 12px 20px; background: #1e293b; border-bottom: 2px solid #10b981; text-align: center; }
.crm-sys { font-size: 11px; color: #10b981; font-weight: 800; letter-spacing: 2px; }

.crm-mid { padding: 25px 20px; display: flex; flex-direction: column; align-items: center; gap: 15px; background: radial-gradient(circle at center, rgba(30, 41, 59, 0.8) 0%, transparent 70%); }
.crm-img-bg { width: 80px; height: 80px; background: #1e293b; border: 1px solid #475569; border-radius: 8px; display: flex; justify-content: center; align-items: center; box-shadow: inset 0 0 15px rgba(16, 185, 129, 0.1); }
.crm-img { width: 55px; height: 55px; object-fit: contain; }

.crm-title-area { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.crm-name { margin: 0; font-size: 18px; color: #f8fafc; font-weight: 800; text-align: center; }
.crm-badges { display: flex; gap: 8px; }
.crm-b-lvl { font-size: 10px; background: #38bdf8; color: #0f172a; padding: 2px 6px; border-radius: 3px; font-weight: 800; }
.crm-b-type { font-size: 10px; background: #334155; color: #cbd5e1; padding: 2px 6px; border-radius: 3px; font-weight: 700; text-transform: uppercase; }

.crm-stats { padding: 0 20px 20px 20px; display: flex; flex-direction: column; gap: 4px; }
.crm-stat-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(30, 41, 59, 0.4); border-radius: 4px; border: 1px solid #1e293b; }
.crm-s-label { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #cbd5e1; font-weight: 600; }
.crm-s-label img { width: 14px; height: 14px; opacity: 0.8; }
.crm-s-value { font-size: 13px; font-family: monospace; font-weight: 800; color: #10b981; }

.crm-bot { padding: 15px 20px; background: #1e293b; border-top: 1px solid #334155; }
.crm-b-rarity { font-size: 10px; color: #0f172a; padding: 2px 6px; border-radius: 3px; font-weight: 800; text-transform: uppercase; }
.btn-clean-collect { flex: 1; height: 40px; background: transparent; border: 1px solid #10b981; color: #10b981; border-radius: 4px; font-size: 11px; font-weight: 800; letter-spacing: 1px; cursor: pointer; transition: 0.2s; font-family: inherit; }
.btn-clean-collect:hover { background: #10b981; color: #0f172a; box-shadow: 0 0 10px rgba(16, 185, 129, 0.5); }


.btn-clean-recycle { flex: 1; height: 40px; background: transparent; border: 1px solid #ef4444; color: #ef4444; border-radius: 4px; font-size: 11px; font-weight: 800; letter-spacing: 1px; cursor: pointer; transition: 0.2s; font-family: inherit; }
.btn-clean-recycle:hover { background: #ef4444; color: #0f172a; box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
.btn-clean-recycle.confirm-mode {
  background: #ef4444;
  color: #0f172a;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
  animation: pulse-danger 0.4s infinite alternate;
}
@keyframes pulse-danger {
  0% { transform: scale(1); }
  100% { transform: scale(1.02); background: #f87171; }
}
/* =========================================
   ATRIBUTO ESPECIAL (+10) - Sistema Apagado vs Brilhante
========================================== */
/* Estado Apagado (Padrão) */
.bonus-nivel-10 {
  margin-top: auto;
  padding: 6px 12px;
  background: rgba(15, 23, 42, 0.4);
  border: 1px dashed #334155;
  border-left: 3px solid #475569;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.3s ease;
}
.bn10-icon { font-size: 16px; color: #475569; }
.bn10-desc {
  margin: 0;
  font-size: 11px;
  color: #64748b; /* Texto cinza escuro, quase apagado */
  font-weight: 600;
  line-height: 1.2;
  flex: 1;
  letter-spacing: 0.5px;
}
.bn10-tag { font-size: 10px; color: #94a3b8; background: #1e293b; padding: 3px 8px; border-radius: 4px; font-weight: 800; letter-spacing: 1px; }

/* Estado Brilhante (Ativado no +10) */
.bonus-nivel-10.bn10-active {
  background: linear-gradient(90deg, rgba(234, 179, 8, 0.1) 0%, rgba(30, 41, 59, 0.4) 100%);
  border: 1px solid rgba(234, 179, 8, 0.2);
  border-left: 3px solid #eab308;
  box-shadow: inset 0 0 15px rgba(234, 179, 8, 0.05);
}
.bonus-nivel-10.bn10-active .bn10-icon {
  color: #eab308;
  text-shadow: 0 0 10px rgba(234, 179, 8, 0.6);
  animation: pulse-star 2s infinite alternate;
}
.bonus-nivel-10.bn10-active .bn10-desc { color: #fef08a; } /* Amarelo brilhante */
.bonus-nivel-10.bn10-active .bn10-tag { background: #facc15; color: #713f12; box-shadow: 0 0 10px rgba(250, 204, 21, 0.3); }

/* (Seu CSS do Checkbox .safe-stone-box e etc continuam iguais) */

/* Checkbox Cyberpunk (Pedra de Segurança) */
.safe-stone-box { margin-top: 10px; padding-top: 10px; border-top: 1px dashed #334155; }
.cyber-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; position: relative; user-select: none; }
.cyber-checkbox input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
.checkmark { height: 16px; width: 16px; background-color: #0f172a; border: 1px solid #475569; border-radius: 3px; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
.cyber-checkbox:hover input ~ .checkmark { border-color: #38bdf8; }
.cyber-checkbox input:checked ~ .checkmark { background-color: #38bdf8; border-color: #38bdf8; box-shadow: 0 0 8px rgba(56, 189, 248, 0.5); }
.checkmark:after { content: ""; position: absolute; display: none; width: 4px; height: 8px; border: solid #0f172a; border-width: 0 2px 2px 0; transform: rotate(45deg); }
.cyber-checkbox input:checked ~ .checkmark:after { display: block; }
.cb-text { font-size: 10px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; }
.cyber-checkbox input:checked ~ .cb-text { color: #38bdf8; }






/* =========================================
   LAYOUT BENTO BOX (CALIBRAÇÃO) - COMPLETO E LIMPO
========================================== */
.bento-inspector {
  display: flex;
  flex-direction: column;
  gap: 15px;
  background: transparent;
  border: none;
  padding: 0;
}

/* Blocos Modulares Padrão */
.bento-box {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 15px;
  box-shadow: inset 0 0 15px rgba(0,0,0,0.2);
}

/* =========================================
   BLOCO 1: O VISOR (Arma + Taxa + Pedra)
========================================== */
.bento-visor {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  background: linear-gradient(90deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 50%, rgba(30,41,59,0.8) 100%);
  border-top: 2px solid #38bdf8;
}
.bv-side { display: flex; align-items: center; gap: 12px; width: 35%; }
.bv-side.right-side { justify-content: flex-end; }
.bv-img-box { width: 56px; height: 56px; background: #0f172a; border: 2px solid; border-radius: 8px; display: flex; justify-content: center; align-items: center; padding: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
.bv-img-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
.bv-info { display: flex; flex-direction: column; gap: 4px; }
.bv-info.align-right { align-items: flex-end; text-align: right; }
.bv-name { font-size: 13px; font-weight: 800; color: #f8fafc; letter-spacing: 0.5px; }
.bv-lvl { font-size: 10px; color: #64748b; font-weight: 700; letter-spacing: 1px; }

.bv-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 1px dashed #334155; border-right: 1px dashed #334155; margin: 0 10px; }
.bv-flow-text { font-size: 9px; color: #94a3b8; font-weight: 800; letter-spacing: 2px; }
.bv-chance { font-size: 24px; font-weight: 800; color: #10b981; font-family: monospace; text-shadow: 0 0 10px rgba(16, 185, 129, 0.4); margin-top: -2px; }
.bv-arrows { font-size: 14px; color: #38bdf8; letter-spacing: 4px; animation: flow-right 1s infinite linear; opacity: 0.7; }
@keyframes flow-right { 0% { transform: translateX(-5px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(5px); opacity: 0; } }

/* Tag da Pedra */
.stone-box { border-color: #a855f7; background: radial-gradient(circle, rgba(168,85,247,0.2) 0%, #0f172a 100%); position: relative; overflow: visible; }
.stone-qty {
  position: absolute;
  bottom: -8px;
  background: #a855f7;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid #1e293b;
  box-shadow: 0 4px 6px rgba(0,0,0,0.5);
}
.stone-qty.err { background: #ef4444; border-color: #7f1d1d; }

/* =========================================
   ALTAR DE CALIBRAÇÃO (DESIGN HÍBRIDO RPG)
========================================== */
.crucible-projection {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0; /* Ajuda a controlar o flex */
  padding: 5px 0;
}

/* =========================================
   1. CABEÇALHO VISUAL (O ALTAR)
========================================== */
.altar-visual {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 12px;
  background: linear-gradient(90deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 50%, rgba(30,41,59,0.8) 100%);
  margin-bottom: 12px;
}
.av-side { display: flex; align-items: center; gap: 10px; width: 35%; }
.av-side.right-side { justify-content: flex-end; }
.av-img-box { width: 52px; height: 52px; background: #0f172a; border: 1px solid; border-radius: 6px; display: flex; justify-content: center; align-items: center; padding: 3px; position: relative; overflow: visible; }
.av-img-box img { width: 42px; height: 42px; object-fit: contain; display: block; margin: auto; }
.fusion-stone-box { border-color: #334155; background: radial-gradient(circle, rgba(168,85,247,0.2) 0%, #0f172a 100%); }

.av-stone-qty {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #334155;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  padding: 1px 8px;
  border-radius: 10px;
  border: 1px solid #1e293b;
  box-shadow: 0 4px 6px rgba(0,0,0,0.5);
}
.av-stone-qty.err { background: #ef4444; border-color: #7f1d1d; }

.av-info { display: flex; flex-direction: column; gap: 4px; }
.av-info.align-right { align-items: flex-end; text-align: right; }
.av-name { font-size: 12px; font-weight: 800; color: #f8fafc; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
.av-meta { font-size: 10px; color: #64748b; font-weight: 700; }

.av-crucible { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 1px dashed #334155; border-right: 1px dashed #334155; margin: 0 10px; padding: 0 5px; }
.av-crucible-chance { font-size: 24px; font-weight: 800; color: #10b981; font-family: monospace; text-shadow: 0 0 10px rgba(16, 185, 129, 0.4); }
.av-energy-flow { font-size: 14px; color: #38bdf8; letter-spacing: 4px; animation: glow-flow 1s infinite linear; opacity: 0.7; }
@keyframes glow-flow { 0% { transform: translateX(-5px); opacity: 0.3; } 50% { opacity: 1; } 100% { transform: translateX(5px); opacity: 0.3; } }

/* =========================================
   2. MATRIZ DE STATUS (HOLOGRAPHIC CLÁSSICO)
========================================== */
.holographic-stats-crucible {
  display: flex;
  flex-direction: column;
  gap: 3px; /* Espaço mínimo para compactação */
  margin-bottom: 5px;
  padding-right: 5px; /* Espacinho pra barra de rolagem não grudar se der */
}

.hsc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 2px;
  border-bottom: 1px dashed rgba(51, 65, 85, 0.3); /* Linha divisória holográfica suave */
}
.hsc-row:last-child { border-bottom: none; }

.hsc-stat-label { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #cbd5e1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.hsc-stat-label img { width: 14px; height: 14px; opacity: 0.9; }

.hsc-stat-values { display: flex; align-items: center; gap: 8px; font-family: monospace; font-size: 13px; font-weight: bold; }
.hsc-curr { color: #94a3b8; }
.hsc-arrow { color: #334155; font-size: 12px; }
.hsc-arrow.active { color: #10b981; }
.hsc-next { color: #475569; }
.hsc-next.active { color: #10b981; text-shadow: 0 0 10px rgba(16, 185, 129, 0.3); }

/* Atributo Especial Clássico */
.special-matrix-box { margin-top: auto; padding: 6px 12px; background: rgba(15, 23, 42, 0.4); border: 1px dashed #334155; border-left: 3px solid #475569; border-radius: 4px; display: flex; align-items: center; gap: 10px; transition: all 0.3s ease; }
.smb-icon { font-size: 14px; color: #475569; }
.smb-desc { margin: 0; font-size: 10px; color: #64748b; font-weight: 600; line-height: 1.2; flex: 1; letter-spacing: 0.3px; }
.smb-tag { font-size: 9px; color: #94a3b8; background: #1e293b; padding: 3px 6px; border-radius: 4px; font-weight: 800; white-space: nowrap; }

.special-matrix-box.special-matrix-active { background: linear-gradient(90deg, rgba(234, 179, 8, 0.1) 0%, rgba(30, 41, 59, 0.4) 100%); border-color: rgba(234, 179, 8, 0.2); border-left-color: #eab308; box-shadow: inset 0 0 15px rgba(234, 179, 8, 0.05); }
.special-matrix-box.special-matrix-active .smb-icon { color: #eab308; text-shadow: 0 0 10px rgba(234, 179, 8, 0.6); animation: pulse-star 2s infinite alternate; }
.special-matrix-box.special-matrix-active .smb-desc { color: #fef08a; }
.special-matrix-box.special-matrix-active .smb-tag { background: #facc15; color: #713f12; box-shadow: 0 0 10px rgba(250, 204, 21, 0.3); }

/* =========================================
   3. RODAPÉ: CONSOLE DE AÇÃO INTEGRADO
========================================== */
.altar-crucible-footer {
  margin-top: auto;
  padding-top: 15px;
}

/* O Painel Principal que une tudo */
.action-console-bar {
  display: flex;
  align-items: stretch;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 8px;
  gap: 15px;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
}

/* --- ESQUERDA: Toggle de Proteção --- */
.console-left-toggle {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
  user-select: none;
}
.console-left-toggle input { display: none; } /* Esconde a checkbox nativa */

.console-left-toggle:hover:not(.is-disabled) {
  background: rgba(30, 41, 59, 0.6);
  border-color: #475569;
}
/* Estado Ativado (Brilho Neon) */
.console-left-toggle:has(input:checked) {
  background: rgba(56, 189, 248, 0.08);
  border-color: rgba(56, 189, 248, 0.4);
}

.console-left-toggle.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(1);
}

.clt-icon {
  width: 32px;
  height: 32px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: 0.2s;
}
.clt-icon img { width: 22px; height: 22px; object-fit: contain; opacity: 0.8; }
.console-left-toggle:has(input:checked) .clt-icon { border-color: #38bdf8; box-shadow: 0 0 10px rgba(56, 189, 248, 0.3); }
.console-left-toggle:has(input:checked) .clt-icon img { opacity: 1; }

.clt-info { display: flex; flex-direction: column; justify-content: center; gap: 2px; }
.clt-title { font-size: 10px; color: #94a3b8; font-weight: 800; letter-spacing: 0.5px; }
.clt-status { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #cbd5e1; font-weight: bold; }
.clt-status.disabled { color: #64748b; font-weight: 600; }
.dim { color: #64748b; font-weight: normal; }

/* Luzinha de LED indicadora */
.led-dot { width: 6px; height: 6px; border-radius: 50%; background: #475569; }
.led-dot.on { background: #38bdf8; box-shadow: 0 0 6px #38bdf8; }

/* --- MEIO: Divisor --- */
.console-divider {
  width: 1px;
  background: linear-gradient(to bottom, transparent, #475569, transparent);
  margin: 5px 0;
}

/* --- DIREITA: Ação Fundida (Botão + Custo) --- */
.console-right-action {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 240px; /* Largura TRAVADA para impedir Layout Shift */
  flex-shrink: 0;
  padding-right: 5px;
}

/* O Botão Duplo Tático com Paleta Ciano */
.btn-fused-action {
  width: 100%;
  height: 42px;
  display: flex;
  align-items: stretch;
  background: linear-gradient(45deg, #0891b2, #0ea5e9); /* Ciano/Azul HUD limpo */
  border: none;
  color: white;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s ease-in-out; /* Transição suave apenas de cor */
  padding: 0;
  /* O corte geométrico clássico do seu sistema */
  clip-path: polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}

/* :HOVER SEM MOVIMENTO OU SCALING (SÓ ILUMINAÇÃO) */
.btn-fused-action:hover:not(:disabled) {
  /* Fica sutilmente mais claro/vibrante */
  background: linear-gradient(45deg, #22d3ee, #38bdf8);
  /* Brilho neon suave */
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.4);
}

.btn-fused-action:disabled {
  background: #1e293b;
  color: #475569;
  cursor: not-allowed;
  transform: none; /* Garante que não se mova */
  box-shadow: none;
}

/* Metade Esquerda: A Ação */
.bfa-text {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
}

/* Metade Direita: O Custo TRAVADO */
.bfa-cost {
  background: rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90px; /* LARGURA FIXA: O segredo para acabar com o Layout Shift */
  flex-shrink: 0;
  font-family: monospace;
  font-size: 13px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s;
}

/* Fundo vermelho quando falta ouro */
.bfa-cost.err {
  background: rgba(239, 68, 68, 0.9);
  color: #fff;
  border-left-color: #ef4444;
}
.btn-fused-action:disabled .bfa-cost {
  background: rgba(0, 0, 0, 0.4);
  border-left-color: #334155;
  color: #64748b;
}

/* =========================================
   CENAS DE APRIMORAMENTO (SUSPENSE E RESULTADO)
========================================== */
.cena-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* Label do "Pular Animação" */
.skip-anim-label {
  font-size: 10px;
  color: #94a3b8;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  align-self: flex-end; /* Joga pra direita */
  user-select: none;
}
.skip-anim-label:hover { color: #e2e8f0; }

/* Cena de Suspense */
.suspense-screen { align-items: center; justify-content: center; text-align: center; gap: 15px; }
.suspense-core { position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; }
.sc-ring { position: absolute; border-radius: 50%; border: 2px dashed #38bdf8; opacity: 0.5; }
.ring-1 { width: 100%; height: 100%; animation: spinRight 3s linear infinite; }
.ring-2 { width: 75%; height: 75%; border-color: #a855f7; border-style: solid; border-top-color: transparent; border-bottom-color: transparent; animation: spinLeft 1.5s linear infinite; }
.sc-item { width: 50px; height: 50px; object-fit: contain; z-index: 2; }
.pulse-item { animation: throb 0.5s infinite alternate; filter: drop-shadow(0 0 10px #38bdf8); }
.suspense-title { font-size: 16px; color: #38bdf8; font-weight: 800; letter-spacing: 3px; margin: 0; animation: throbText 1s infinite alternate; }
.suspense-sub { font-size: 11px; color: #64748b; font-family: monospace; margin: 0; }

@keyframes spinRight { 100% { transform: rotate(360deg); } }
@keyframes spinLeft { 100% { transform: rotate(-360deg); } }
@keyframes throb { 0% { transform: scale(1); } 100% { transform: scale(1.1); } }
@keyframes throbText { 0% { opacity: 0.6; } 100% { opacity: 1; } }

/* Cena de Resultado */
.result-screen { align-items: center; justify-content: center; text-align: center; padding: 20px; gap: 30px; }
.rs-content { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.rs-icon-box { width: 80px; height: 80px; background: #0f172a; border-radius: 12px; display: flex; justify-content: center; align-items: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 2px solid; margin-bottom: 10px; }
.rs-icon-box img { width: 50px; height: 50px; object-fit: contain; }
.rs-title { font-size: 20px; font-weight: 900; margin: 0; letter-spacing: 1px; }
.rs-desc { font-size: 12px; color: #cbd5e1; max-width: 80%; line-height: 1.5; margin: 0; }

/* Variações de Cores do Resultado */
.success .rs-icon-box { border-color: #10b981; box-shadow: inset 0 0 20px rgba(16,185,129,0.3), 0 0 30px rgba(16,185,129,0.2); animation: successPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.success .rs-title { color: #10b981; }

.downgrade .rs-icon-box { border-color: #ef4444; box-shadow: inset 0 0 20px rgba(239,68,68,0.3); animation: shakeHard 0.4s; }
.downgrade .rs-title { color: #ef4444; }

.fail .rs-icon-box { border-color: #64748b; border-style: dashed; }
.fail .rs-title { color: #94a3b8; }

/* Botão Continuar */
.btn-continue {
  background: transparent;
  border: 1px solid #475569;
  color: #e2e8f0;
  padding: 12px 40px;
  border-radius: 4px;
  font-family: 'Chakra Petch', sans-serif;
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-continue:hover { background: #1e293b; border-color: #e2e8f0; transform: translateY(-2px); }

@keyframes successPop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
@keyframes shakeHard { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-10px); } 40%, 80% { transform: translateX(10px); } }
/* Botão de Pular a Animação */
.btn-skip-anim {
  margin-top: 20px;
  background: transparent;
  border: 1px dashed #475569;
  color: #94a3b8;
  padding: 6px 15px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  cursor: pointer;
  transition: 0.2s;
}
.btn-skip-anim:hover {
  border-color: #38bdf8;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
}
/* =========================================
   DESTAQUE DO PERK ATIVO NO NÍVEL MÁXIMO (+10)
========================================== */
/* Garante que a rolagem pegue a lista E o perk juntos */
.scroll-area::-webkit-scrollbar { width: 4px; }
.scroll-area::-webkit-scrollbar-thumb { background: #475569; border-radius: 2px; }

/* Removemos o 'margin-top: auto' antigo e colocamos 15px fixos para ficar logo abaixo dos atributos */
.special-matrix-box {
  margin-top: 15px !important; 
}

.max-matrix-glow {
  background: linear-gradient(90deg, rgba(234, 179, 8, 0.15) 0%, rgba(30, 41, 59, 0.6) 100%) !important;
  border: 1px solid rgba(250, 204, 21, 0.3) !important;
  border-left: 3px solid #facc15 !important;
  box-shadow: 0 0 15px rgba(250, 204, 21, 0.1), inset 0 0 10px rgba(250, 204, 21, 0.05) !important;
  animation: pulse-gold 2s infinite alternate;
}

.max-matrix-glow .smb-icon {
  font-size: 18px;
  animation: spin-star 4s linear infinite;
}
</style>