import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useGameStore } from './gameStore'
import { PROJETOS_FORJA } from '../data/equipments'
import { CALIBRATION_TIERS, STAT_SCALING } from '../data/balancing'

export const useForgeStore = defineStore('forge', () => {
  const gameStore = useGameStore()
  
  const workerId = ref(null)
  
  const activeCraft = ref({
    projeto: null,
    progress: 0,
    totalTime: 0
  })

  const readyItem = ref(null)
  const currentWorker = computed(() => {
    if (!workerId.value) return null
    return gameStore.workers.find(w => w.id === workerId.value) || null
  })

  const currentEfficiency = computed(() => {
    const worker = currentWorker.value
    if (!worker) return 0
    
    const stats = gameStore.getWorkerStats(worker)
    return stats.finalEff || 0 
  })

  function assignWorker(id) {
    if (workerId.value) {
      const oldW = gameStore.workers.find(w => w.id === workerId.value)
      if (oldW) oldW.assignment = null
    }
    if (workerId.value === id) { 
      workerId.value = null 
    } else {
      workerId.value = id
      const newW = gameStore.workers.find(w => w.id === id)
      if (newW) newW.assignment = 'Ferreiro'
    }
  }

  function rolarDadoViciado(min, max, eficiencia) {
    if (min === max) return min
    const pesoDaCurva = 1 + (eficiencia / 150)
    const rolagemPura = Math.random()
    const rolagemViciada = Math.pow(rolagemPura, 1 / pesoDaCurva)
    return Math.floor(min + (rolagemViciada * (max - min + 1)))
  }

  function startCraft(projeto) {
    if (!workerId.value) return { success: false, msg: "Falta Ferreiro." }
    if (activeCraft.value.projeto) return { success: false, msg: "A bigorna já está em uso." }
    if (readyItem.value) return { success: false, msg: "Colete o item pronto primeiro." }

    for (const mat of projeto.custo) {
      if (mat.tipo === 'recurso') {
         if (gameStore.resources[mat.id] < mat.qtd) return { success: false, msg: `Falta ${mat.nome}.` }
      } else if (mat.tipo === 'inventario') {
         if ((gameStore.inventory[mat.id] || 0) < mat.qtd) return { success: false, msg: `Falta ${mat.nome}.` }
      }
    }

    for (const mat of projeto.custo) {
      if (mat.tipo === 'recurso') gameStore.resources[mat.id] -= mat.qtd
      else gameStore.inventory[mat.id] -= mat.qtd
    }

    // NOVA MATEMÁTICA DE TEMPO:
    // Ex: Se o item leva 100s e a eficiência é 50%, a conta é: 100 / 1.5 = ~66 segundos.
    // Isso impede que o tempo fique negativo mesmo se a eficiência passar de 100%.
    const speedMultiplier = 1 + (currentEfficiency.value / 100)
    const tempoReduzido = Math.max(1, Math.floor(projeto.tempoBase / speedMultiplier)) // Mínimo de 1 seg

    activeCraft.value = {
      projeto: projeto,
      progress: 0,
      totalTime: tempoReduzido // Agora ele salva o tempo já com "desconto"
    }

    return { success: true }
  }
  // A função cancelCraft foi atualizada para devolver apenas 80% dos materiais, arredondando para baixo. Isso cria uma penalidade justa para o jogador que decide cancelar um projeto, sem ser muito punitivo.
  function cancelCraft(refund = true) {
    if (!activeCraft.value.projeto) return
    
    if (refund) {
      for (const mat of activeCraft.value.projeto.custo) {
        // Devolve apenas 80% arredondado para baixo
        const devolucao = Math.floor(mat.qtd * 0.8) 
        if (devolucao > 0) {
          if (mat.tipo === 'recurso') gameStore.resources[mat.id] += devolucao
          else gameStore.inventory[mat.id] = (gameStore.inventory[mat.id] || 0) + devolucao
        }
      }
    }
    
    activeCraft.value = { projeto: null, progress: 0, totalTime: 0 }
  }

  // Acelerar Craft (Custando Mythic Coins)
  function speedUpCraft() {
    if (!activeCraft.value.projeto) return { success: false, msg: "Nenhum projeto ativo." }

    const tempoRestante = activeCraft.value.totalTime - activeCraft.value.progress
    // Custo: 1 Mythic Coin a cada 10 segundos restantes (Mínimo cobrado = 1)
    const custoMythic = Math.max(1, Math.ceil(tempoRestante / 10))

    if (gameStore.resources.mythicCoin < custoMythic) {
      return { success: false, msg: `Mythic Coins insuficientes! Necessário: ${custoMythic} Ⓜ️` }
    }

    gameStore.resources.mythicCoin -= custoMythic
    activeCraft.value.progress = activeCraft.value.totalTime
    finalizarItem()
    return { success: true }
  }
  // A função forgeTick deve ser chamada a cada segundo (ou a cada "tick" do jogo) para atualizar o progresso da forja. Ela verifica se há um projeto ativo, se o trabalhador está disponível e então incrementa o progresso. Se o progresso atingir ou ultrapassar o tempo total, o item é finalizado automaticamente.
  function forgeTick() {
    if (!activeCraft.value.projeto) return
    if (!currentWorker.value || (currentWorker.value.strikeDays || 0) > 0 || currentWorker.value.injury) return

    // O tempo foi reduzido na criação, então o relógio anda de 1 em 1s normal
    const step = 1
    
    activeCraft.value.progress = Math.min(activeCraft.value.progress + step, activeCraft.value.totalTime)

    if (activeCraft.value.progress >= activeCraft.value.totalTime) {
      finalizarItem()
    }
  }
  // A função finalizarItem é responsável por calcular os atributos finais do item com base nos valores mínimos e máximos definidos no projeto, levando em consideração a eficiência do trabalhador. 
  // Ela também determina a raridade do item com base na "sorte" dos atributos rolados. O item finalizado é então armazenado em readyItem, pronto para ser coletado pelo jogador.
  function finalizarItem() {
    const projeto = activeCraft.value.projeto
    const statsRolados = []
    
    let somaPorcentagens = 0
    let qtdStats = 0

    for (const statBase of projeto.stats) {
      const valorFinal = rolarDadoViciado(statBase.min, statBase.max, currentEfficiency.value)
      // NOVO: Adicionamos o 'baseValor' para nunca perdermos o roll original
      statsRolados.push({ id: statBase.id, nome: statBase.nome, icone: statBase.icone, valor: valorFinal, baseValor: valorFinal })
      
      if (statBase.max > statBase.min) {
        somaPorcentagens += (valorFinal - statBase.min) / (statBase.max - statBase.min)
        qtdStats++
      }
    }

    // Calcula a raridade baseada na sorte dos status
    let raridade = 'Comum'
    let corRaridade = '#94a3b8' // Cinza

    if (qtdStats > 0) {
      const mediaRoll = somaPorcentagens / qtdStats
      if (mediaRoll >= 0.95) { raridade = 'Lendário'; corRaridade = '#eab308' } // Dourado
      else if (mediaRoll >= 0.80) { raridade = 'Épico'; corRaridade = '#a855f7' } // Roxo
      else if (mediaRoll >= 0.50) { raridade = 'Raro'; corRaridade = '#3b82f6' } // Azul
      else if (mediaRoll >= 0.20) { raridade = 'Incomum'; corRaridade = '#22c55e' } // Verde
    }

    readyItem.value = {
      idUnico: 'eqp_' + Date.now(),
      idProjeto: projeto.id,
      nome: projeto.nome,
      tipo: projeto.tipo,
      level: projeto.level,
      img: projeto.img,
      stats: statsRolados,
      criador: currentWorker.value.name,
      raridade: raridade,
      corRaridade: corRaridade,
      bonusNivel10: projeto.bonusNivel10,
      enhancement: 0
    }

    activeCraft.value = { projeto: null, progress: 0, totalTime: 0 }
  }

  function collectItem() {
    if (!readyItem.value) return
    if (!gameStore.equipments) gameStore.equipments = []
    
    gameStore.equipments.unshift(readyItem.value)
    readyItem.value = null
  }

  function loadForge() {
    const saved = localStorage.getItem('mythic_forge_save_v3')
    if (saved) {
      const data = JSON.parse(saved)
      
      if (data.workerId) {
        const w = gameStore.workers.find(x => x.id === data.workerId)
        if (w) {
          workerId.value = data.workerId
          w.assignment = 'Ferreiro'
        } else {
          workerId.value = null 
        }
      }

      if (data.activeCraft && data.activeCraft.projectId) {
        const proj = PROJETOS_FORJA.find(p => p.id === data.activeCraft.projectId)
        if (proj) {
          activeCraft.value = {
            projeto: proj,
            progress: data.activeCraft.progress,
            totalTime: data.activeCraft.totalTime
          }
        }
      }
      
      if (data.readyItem) readyItem.value = data.readyItem
    }
  }
  // NOVA FUNÇÃO: Executa a tentativa de calibração
  function calibrateItem(item, useSafeStone) {
    if (!item) return { success: false, msg: "Nenhum item selecionado." }
    const currentLevel = item.enhancement || 0
    if (currentLevel >= 10) return { success: false, msg: "Calibração máxima atingida." }

    const tierRule = CALIBRATION_TIERS.find(t => t.level === currentLevel)
    if (!tierRule) return { success: false, msg: "Erro na regra de calibração." }

    // Verifica Custos
    if (gameStore.resources.goldCoin < tierRule.gold) return { success: false, msg: "Ouro insuficiente." }
    if ((gameStore.inventory[tierRule.stoneId] || 0) < 1) return { success: false, msg: "Pedra de calibração insuficiente." }
    
    // Verifica Pedra de Segurança
    if (useSafeStone && tierRule.canDowngrade) {
      if ((gameStore.inventory.pedra_seguranca || 0) < 1) return { success: false, msg: "Pedra de segurança insuficiente." }
      gameStore.inventory.pedra_seguranca -= 1
    }

    // Cobrar Recursos
    gameStore.resources.goldCoin -= tierRule.gold
    gameStore.inventory[tierRule.stoneId] -= 1

    // Rolar a Sorte
    const roll = Math.random() * 100
    let resultType = 'success'

    if (roll <= tierRule.chance) {
      // SUCESSO! Sobe 1 nível
      item.enhancement = currentLevel + 1
      recalcularStats(item)
    } else {
      // FALHA!
      if (tierRule.canDowngrade && !useSafeStone) {
        // Falhou e quebrou (cai 1 nível)
        item.enhancement = Math.max(0, currentLevel - 1)
        recalcularStats(item)
        resultType = 'downgrade'
      } else {
        // Falhou, mas manteve o nível
        resultType = 'fail'
      }
    }

    // Força a atualização do Vue
    gameStore.equipments = [...gameStore.equipments]
    return { success: true, type: resultType, newLevel: item.enhancement }
  }

  // Função interna para atualizar os valores matemáticos
  function recalcularStats(item) {
    if(!item.enhancement) item.enhancement = 0
    
    for (const stat of item.stats) {
      // Garante que itens antigos ganhem o baseValor
      if (stat.baseValor === undefined) stat.baseValor = stat.valor 
      
      const config = STAT_SCALING[stat.nome] || STAT_SCALING['default']
      const bonusTimes = Math.floor(item.enhancement / config.every)
      const totalBonus = bonusTimes * config.step
      
      stat.valor = stat.baseValor + totalBonus
    }
  }

  watch(() => ({ workerId: workerId.value, activeCraft: activeCraft.value, readyItem: readyItem.value }), (newState) => {
    const saveState = {
      workerId: newState.workerId,
      activeCraft: {
        projectId: newState.activeCraft.projeto ? newState.activeCraft.projeto.id : null,
        progress: newState.activeCraft.progress,
        totalTime: newState.activeCraft.totalTime
      },
      readyItem: newState.readyItem
    }
    localStorage.setItem('mythic_forge_save_v3', JSON.stringify(saveState))
  }, { deep: true })

  return { workerId, currentWorker, currentEfficiency, activeCraft, readyItem, STAT_SCALING,assignWorker, startCraft, cancelCraft, speedUpCraft, forgeTick, collectItem, loadForge, calibrateItem }
})