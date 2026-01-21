<script setup>
import { ref, computed } from 'vue';
import { jogo, DADOS_ESTUDO } from '../jogo.js'; // Importe DADOS_ESTUDO

// --- ESTADO LOCAL ---
const corTier = (t) => ({'F':'#8A8A8A','E':'#659665','D':'#71c404','C':'#475fad','B':'#0233d1','A':'#8e44ad','S':'#f1c40f','SS':'#0fbdd1'}[t] || '#000');
const formatarNumero = (n) => n ? Number(n).toLocaleString('pt-BR') : '0';
const modalItemAberto = ref(false);
const slotItemSelecionado = ref(null); // 0 ou 1
const modalFuncionarioAberto = ref(false);
const slotFuncionarioSelecionado = ref(null); // 0, 1 ou 2

// Garante inicialização
if (!jogo.alocacaoBiblioteca) jogo.alocacaoBiblioteca = [null, null, null];
if (!jogo.estudos) jogo.estudos = [{ item: null }, { item: null }];

// --- COMPUTEDS ---

// Calcula a "Velocidade de Estudo" baseada na Sabedoria (Bonus)
const velocidadeEstudo = computed(() => {
    let total = 0;
    jogo.alocacaoBiblioteca.forEach(id => {
        if (id) {
            const func = jogo.funcionarios.find(f => f.id === id);
            if (func && func.bonus) total += func.bonus;
        }
    });
    return total;
});

// Filtra inventário apenas para itens de estudo
const inventarioEstudo = computed(() => {
    const lista = [];
    Object.keys(DADOS_ESTUDO).forEach(itemId => {
        const qtd = jogo.itens[itemId] || 0;
        if (qtd > 0) {
            lista.push({ 
                id: itemId, 
                qtd: qtd, 
                ...DADOS_ESTUDO[itemId] 
            });
        }
    });
    return lista;
});

const academicosDisponiveis = computed(() => {
    return jogo.funcionarios.filter(f => 
        f.profissao === 'academico' && 
        !jogo.alocacaoBiblioteca.includes(f.id)
    );
});

// --- AÇÕES FUNCIONÁRIOS ---
const abrirSelecaoFunc = (index) => {
    slotFuncionarioSelecionado.value = index;
    modalFuncionarioAberto.value = true;
};
const alocarFunc = (func) => {
    jogo.alocacaoBiblioteca[slotFuncionarioSelecionado.value] = func.id;
    modalFuncionarioAberto.value = false;
};
const desalocarFunc = (index) => {
    jogo.alocacaoBiblioteca[index] = null;
};
const getFuncionario = (index) => {
    const id = jogo.alocacaoBiblioteca[index];
    return id ? jogo.funcionarios.find(f => f.id === id) : null;
};

// --- AÇÕES ITENS DE ESTUDO ---
const abrirSelecaoItem = (index) => {
    // Se já tiver item estudando, não faz nada (ou poderia cancelar)
    if (jogo.estudos[index].item) return; 
    slotItemSelecionado.value = index;
    modalItemAberto.value = true;
};

const iniciarEstudo = (itemObj) => {
    const index = slotItemSelecionado.value;
    
    // Consome do inventário
    if (jogo.itens[itemObj.id] > 0) {
        jogo.itens[itemObj.id]--;
        
        // Configura o slot
        jogo.estudos[index] = {
            item: itemObj.id,
            tempoTotal: itemObj.tempo,
            tempoRestante: itemObj.tempo,
            progresso: 0
        };
        modalItemAberto.value = false;
    }
};

const cancelarEstudo = (index) => {
    const slot = jogo.estudos[index];
    if (slot.item) {
        // Devolve o item (Opcional: Se quiser punir, não devolve)
        jogo.itens[slot.item]++;
        
        // Reseta slot
        slot.item = null;
        slot.progresso = 0;
    }
};

// Formatar tempo (segundos -> MM:SS)
const formatarTempo = (s) => {
    if (s <= 0) return "00:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
};
</script>

<template>
<div class="mythic-container animacao-entrada">
    
    <div class="painel-topo">
        <div class="info-velocidade">
            <span class="icone-vel">🧠</span>
            <div>
                <h2>Sabedoria da Equipe</h2>
                <small>Velocidade de Estudo: <b :class="{'text-zero': velocidadeEstudo === 0, 'text-bom': velocidadeEstudo > 0}">{{ velocidadeEstudo.toFixed(2) }}x</b></small>
            </div>
        </div>
        
        <div class="slots-funcionarios">
        <div v-for="(slot, index) in jogo.alocacaoBiblioteca" :key="index" class="slot-wrapper">
            
            <button v-if="slot" class="btn-remove-card" @click.stop="desalocarFunc(index)">✖</button>

            <div v-if="slot" class="card-funcionario ferreiro-ativo" :style="{ borderColor: corTier(getFuncionario(index).tier) }">
                
                <div class="card-topo" :style="{ backgroundColor: corTier(getFuncionario(index).tier) }">
                    <div class="topo-esquerda">
                        <span class="tier-badge">{{ getFuncionario(index).tier }}</span>
                        <span class="card-nome">{{ getFuncionario(index).nome }}</span>
                    </div>
                    
                    <div class="molde-icone-prof">
                        <img src="/assets/ui/i_cientista.png" class="img-prof-inner" title="Acadêmico">
                    </div>
                </div>

                <div class="card-mid">
                    <div class="avatar-box">
                        <img :src="`/assets/faces/${getFuncionario(index).raca}/${getFuncionario(index).imagem}.png`" class="avatar-func">
                    </div>

                    <div class="tabela-dados-func">
                        <div class="linha-dado">
                            <span class="dado-label">Profissão:</span>
                            <span class="dado-valor">Acadêmico</span>
                        </div>
                        <div class="linha-dado">
                            <span class="dado-label">Raça:</span>
                            <span class="dado-valor capitalize">{{ getFuncionario(index).raca }}</span>
                        </div>
                        <div class="linha-dado">
                            <span class="dado-label">Sexo:</span>
                            <span class="dado-valor">{{ getFuncionario(index).sexo === 'masculino' ? 'Masculino' : 'Feminino' }}</span>
                        </div>
                        <div class="linha-dado">
                            <span class="dado-label">Salário:</span>
                            <span class="dado-valor">
                                {{ formatarNumero(getFuncionario(index).salario) }} 
                                <img src="/assets/ui/icone_goldC.png" class="tiny-coin">
                            </span>
                        </div>
                    </div>
                </div>

                <div class="rodape-card">
                    <div class="info-produtividade">
                        Sabedoria: <span class="verde">⚡ {{ getFuncionario(index).bonus.toFixed(2) }}</span>
                    </div>
                    <div class="frase-efeito">
                        "Estudando..."
                    </div>
                </div>
            </div>

            <div v-else class="card-funcionario vazio-ferreiro-card" @click="abrirSelecaoFunc(index)" style="cursor: pointer;">
                
                <div class="card-topo vazio-topo">
                    <div class="topo-esquerda">
                        <span class="tier-badge vazio-badge">-</span>
                        <span class="card-nome">Vaga Aberta</span>
                    </div>
                    <img src="/assets/ui/i_cientista.png" class="icon-prof-topo grayscale">
                </div>

                <div class="card-mid">
                    <div class="avatar-box vazio-avatar-box">
                         <img src="/assets/ui/icone_morador.png" class="avatar-vazio">
                    </div>

                    <div class="tabela-dados-func vazio-dados">
                        <div class="texto-central-vazio">
                            <span class="titulo-vazio">Sem Acadêmico<br></span>
                            <span class="subtitulo-vazio">ESTAMOS CONTRATANDO</span>
                        </div>
                    </div>
                </div>

                <div class="rodape-card vazio-rodape">
                    <div class="frase-efeito">
                        "O conhecimento espera..."
                    </div>
                </div>
            </div>

        </div>
    </div>
    </div>

    <div class="divisor-secao">Mesas de Estudo</div>

    <div class="mesa-estudos">
        <div class="info-ciencia-total">
            ⚛️ Pontos Atuais: <b>{{ Math.floor(jogo.ciencia).toLocaleString() }}</b>
        </div>

        <div class="grid-slots-estudo">
            <div v-for="(slot, index) in jogo.estudos" :key="'estudo-'+index" class="slot-estudo">
                
                <div v-if="!slot.item" class="estudo-vazio" @click="abrirSelecaoItem(index)">
                    <span class="icone-add-livro">📖</span>
                    <span>Selecionar Estudo</span>
                </div>

                <div v-else class="estudo-ativo">
                    <div class="header-estudo">
                        <span class="nome-item">{{ DADOS_ESTUDO[slot.item].nome }}</span>
                        <button class="btn-cancelar" @click.stop="cancelarEstudo(index)">✖</button>
                    </div>
                    
                    <div class="barra-container">
                        <div class="barra-fill" :style="{ width: slot.progresso + '%' }"></div>
                        <span class="texto-barra">{{ formatarTempo(slot.tempoRestante) }}</span>
                    </div>

                    <div class="info-xp">
                        Recompensa: <span class="xp-val">+{{ DADOS_ESTUDO[slot.item].xp }} XP</span>
                    </div>
                </div>

            </div>
        </div>
    </div>

    <div class="divisor-secao">Árvore do Conhecimento</div>
    <div class="arvore-placeholder">
        <p>Utilize os pontos gerados acima para desbloquear novas tecnologias aqui.</p>
        </div>

    <div v-if="modalFuncionarioAberto" class="modal-overlay" @click.self="modalFuncionarioAberto = false">
        <div class="modal-content">
            <h3>Alocar Acadêmico</h3>
            <div v-if="academicosDisponiveis.length === 0" class="aviso-vazio">Sem acadêmicos disponíveis.</div>
            <div class="lista-selecao">
                <div v-for="func in academicosDisponiveis" :key="func.id" class="item-lista" @click="alocarFunc(func)">
                    <img :src="func.img || '/assets/ui/i_academico.png'" width="30">
                    <div>
                        <strong>{{ func.nome }}</strong>
                        <div class="stat-sabedoria">Sabedoria: {{ func.bonus.toFixed(2) }}</div>
                    </div>
                </div>
            </div>
            <button class="btn-fechar" @click="modalFuncionarioAberto = false">Fechar</button>
        </div>
    </div>

    <div v-if="modalItemAberto" class="modal-overlay" @click.self="modalItemAberto = false">
        <div class="modal-content">
            <h3>O que estudar?</h3>
            <div v-if="inventarioEstudo.length === 0" class="aviso-vazio">
                Você não possui Pergaminhos ou Tomos.<br>
                <small>(Eles serão dropados em missões futuras)</small>
            </div>
            <div class="lista-selecao">
                <div v-for="item in inventarioEstudo" :key="item.id" class="item-lista item-estudo" @click="iniciarEstudo(item)">
                    <div class="icone-item-lista">📜</div>
                    <div class="detalhes-item">
                        <strong>{{ item.nome }}</strong>
                        <small>Tempo Base: {{ formatarTempo(item.tempo) }} | XP: {{ item.xp }}</small>
                    </div>
                    <div class="qtd-badge">x{{ item.qtd }}</div>
                </div>
            </div>
            <button class="btn-fechar" @click="modalItemAberto = false">Fechar</button>
        </div>
    </div>

</div>
</template>

<style scoped>
    @import '../css/importantes.css';

/* PAINEL TOPO (EQUIPE) */
.painel-topo {
    background: white; border-radius: 12px; padding: 15px;
    border: 1px solid #bdc3c7; box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    margin-bottom: 20px;
}
.info-velocidade { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
.icone-vel { font-size: 2em; }
.info-velocidade h2 { margin: 0; font-size: 1.2em; }
.text-zero { color: #e74c3c; }
.text-bom { color: #27ae60; }

.slots-funcionarios { display: flex; gap: 10px; }
.slot-func { 
    flex: 1; height: 70px; background: #f7f9fa; 
    border: 2px dashed #bdc3c7; border-radius: 8px; position: relative;
}
.slot-func-vazio { 
    height: 100%; display: flex; align-items: center; justify-content: center; 
    font-size: 2em; color: #bdc3c7; cursor: pointer;
}
.slot-func-ocupado {
    height: 100%; display: flex; align-items: center; padding: 5px; gap: 8px;
    background: #ebf5fb; border: 2px solid #3498db; border-radius: 8px; overflow: hidden;
}
.img-avatar { width: 35px; height: 35px; border-radius: 50%; border: 1px solid #ccc; background: white;}
.dados-func { display: flex; flex-direction: column; overflow: hidden; }
.dados-func .nome { font-size: 0.8em; font-weight: bold; }
.dados-func .sabedoria { font-size: 0.75em; color: #8e44ad; font-weight: bold; }
.btn-remove { 
    position: absolute; top: -5px; right: -5px; 
    background: #c0392b; color: white; border: none; 
    width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
}

/* DIVISOR */
.divisor-secao {
    text-align: center; text-transform: uppercase; font-weight: bold;
    color: #95a5a6; margin: 20px 0 10px 0; font-size: 0.9em; letter-spacing: 1px;
}

/* PAINEL ESTUDOS (ITENS) */
.mesa-estudos {
    background: #fdfefe; border: 1px solid #bdc3c7; border-radius: 12px; padding: 15px;
}
.info-ciencia-total { text-align: right; margin-bottom: 10px; font-size: 0.9em; color: #2c3e50; }

.grid-slots-estudo { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }

.slot-estudo {
    height: 100px; border-radius: 8px; overflow: hidden;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

/* Estudo Vazio */
.estudo-vazio {
    background: #ecf0f1; border: 2px dashed #bdc3c7;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; cursor: pointer; color: #7f8c8d; transition: all 0.2s;
}
.estudo-vazio:hover { background: #dfe6e9; border-color: #7f8c8d; }
.icone-add-livro { font-size: 1.8em; margin-bottom: 5px; }

/* Estudo Ativo */
.estudo-ativo {
    background: white; border: 1px solid #bdc3c7; padding: 10px;
    display: flex; flex-direction: column; justify-content: space-between; height: 100%;
}
.header-estudo { display: flex; justify-content: space-between; align-items: center; }
.nome-item { font-weight: bold; font-size: 0.9em; color: #2c3e50; }
.btn-cancelar { background: none; border: none; color: #e74c3c; cursor: pointer; font-weight: bold; }

.barra-container {
    height: 15px; background: #ecf0f1; border-radius: 10px; overflow: hidden; position: relative;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
}
.barra-fill { height: 100%; background: linear-gradient(90deg, #f1c40f, #f39c12); transition: width 1s linear; }
.texto-barra { 
    position: absolute; top: 0; left: 0; width: 100%; height: 100%; 
    display: flex; align-items: center; justify-content: center; 
    font-size: 0.7em; font-weight: bold; color: rgba(0,0,0,0.6);
}
.info-xp { font-size: 0.8em; text-align: center; color: #27ae60; font-weight: bold; }

/* MODAL */
.modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.6); z-index: 999;
    display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-content {
    background: white; padding: 20px; border-radius: 10px; width: 100%; max-width: 350px;
}
.lista-selecao { display: flex; flex-direction: column; gap: 8px; margin: 15px 0; max-height: 50vh; overflow-y: auto; }
.item-lista {
    display: flex; align-items: center; gap: 10px; padding: 10px; 
    background: #f1f2f6; border-radius: 8px; cursor: pointer; border: 1px solid transparent;
}
.item-lista:hover { border-color: #3498db; background: #ebf5fb; }
.stat-sabedoria { color: #8e44ad; font-size: 0.8em; font-weight: bold; }

.qtd-badge { background: #2c3e50; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; font-weight: bold; margin-left: auto; }
.icone-item-lista { font-size: 1.5em; }

.btn-fechar { width: 100%; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
.aviso-vazio { text-align: center; color: #7f8c8d; padding: 20px; }

/* RESPONSIVO */
@media (max-width: 600px) {
    .grid-slots-estudo { grid-template-columns: 1fr; }
    .slot-estudo { height: 90px; }
}









/* --- INICIO DA SUBSTITUIÇÃO DO CSS --- */

/* Container que alinha os 3 slots */
.slots-funcionarios { 
    display: flex; 
    gap: 15px; 
    padding: 5px;
    align-items: stretch; /* Garante altura igual para todos */
}

.slot-wrapper {
    flex: 1;
    min-width: 230px; 
    max-width: 280px;
    display: flex;
    flex-direction: column;
    position: relative; /* Importante para o botão X saber onde ficar */
    transition: transform 0.2s; /* Animação suave */
}

/* === ESTILO DO CARD === */
.card-funcionario {
    width: 100%;
    height: 100%; /* Estica o card para ocupar o slot todo */
    background: #ffffff;
    border-width: 2px; border-style: solid;
    border-radius: 8px; 
    display: flex; flex-direction: column; 
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
    position: relative;
    justify-content: space-between;
    overflow: hidden; /* Garante que nada saia das bordas arredondadas */
}

/* --- O BOTÃO "X" (Corrigido: Menor e Hover) --- */
.btn-remove-card {
    position: absolute; 
    top: -8px; right: -8px; 
    background: #c0392b; color: white; 
    
    /* 1. Tamanho reduzido (era 26px) */
    width: 20px; height: 20px; 
    
    border-radius: 50%;
    border: 2px solid #fff;
    cursor: pointer;
    font-weight: bold; 
    font-size: 10px; /* Letra menor */
    z-index: 50;
    
    /* Centralizar o X */
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    
    /* 2. Segredo do Hover: Começa invisível */
    opacity: 0; 
    transition: all 0.2s ease-in-out;
}

/* Quando passar o mouse no SLOT (quadrado inteiro), o botão aparece */
.slot-wrapper:hover .btn-remove-card {
    opacity: 1;
    transform: scale(1.1); /* Um leve efeito de "pop" */
}
.btn-remove-card:hover { background: #e74c3c; }

/* Topo Colorido */
.card-topo {
    position: relative;
    display: flex; align-items: center;
    padding: 2px 5px; padding-right: 35px;
    color: #fff; font-weight: bold; height: 32px;
    flex-shrink: 0;
}
.topo-esquerda { display: flex; align-items: center; gap: 6px; }
.tier-badge { background: rgba(0,0,0,0.3); padding: 1px 5px; border-radius: 4px; font-size: 0.9em; }
.card-nome { font-size: 0.85em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px;}

/* Ícone Profissão */
.molde-icone-prof {
    position: absolute; top: 3px; right: 5px;
    background-color: #ffffff; width: 24px; height: 24px;
    border-radius: 50%; display: flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    border: 2px solid rgba(255, 255, 255, 0.5); z-index: 10;
}
.img-prof-inner { width: 18px; height: 18px; object-fit: contain; }

/* Meio do Card */
.card-mid { 
    flex: 1; 
    display: flex; align-items: stretch; /* Estica a altura */
    background: #fff; 
}

/* --- CORREÇÃO DA IMAGEM --- */
.avatar-box {
    /* Largura fixa ajustada */
    width: 95px; 
    min-width: 95px;
    
    display: flex; align-items: center; justify-content: center;
    background: #f1f2f6; 
    border-right: 1px solid #dfe4ea;
    padding: 5px; /* Espacinho interno para a foto "respirar" */
}

.avatar-func { 
    width: 100%; /* Ocupa todo o espaço disponível do box */
    height: auto; /* Mantém a proporção */
    aspect-ratio: 1/1; /* Força ser quadrado */
    border-radius: 4px; 
    border: 1px solid #ced6e0; 
    background: #fff; 
    object-fit: cover; /* Garante que a imagem preencha o quadrado sem distorcer */
}

.tabela-dados-func { 
    flex: 1; 
    display: flex; flex-direction: column; 
    font-size: 0.75em; 
    justify-content: center; 
    padding-left: 5px; 
}

.linha-dado {
    display: flex; justify-content: space-between; align-items: center;
    padding: 4px 8px; 
    border-bottom: 1px solid #f1f2f6; color: #2f3542;
}
.linha-dado:last-child { border-bottom: none; }
.dado-label { color: #747d8c; font-weight: 600; }
.dado-valor { font-weight: bold; color: #2f3542; display: flex; align-items: center; gap: 3px; }
.capitalize { text-transform: capitalize; }
.tiny-coin { width: 11px; height: 11px; }

/* Rodapé */
.rodape-card {
    background: #fff; border-top: 1px solid #f1f2f6;
    padding: 8px 4px; text-align: center;
    flex-shrink: 0;
}
.info-produtividade { font-size: 0.8em; color: #2c3e50; font-weight: 600; }
.verde { color: #27ae60; font-weight: bold; }
.frase-efeito { font-size: 0.7em; font-style: italic; color: #a4b0be; margin-top: 2px; }

/* === CARD VAZIO (AJUSTADO) === */
.vazio-ferreiro-card {
    background: #f8f9fa; border: 2px dashed #bdc3c7;
    box-shadow: none; 
}
.vazio-topo { background-color: #95a5a6; color: #ecf0f1; }
.vazio-badge { background: rgba(0,0,0,0.1); }
.icon-prof-topo { width: 20px; height: 20px; filter: drop-shadow(0 1px 1px rgba(0,0,0,0.5)); opacity: 0.8; }
.grayscale { filter: grayscale(100%); }

.vazio-avatar-box { 
    width: 95px; /* Mesma largura do normal */
    min-width: 95px;
    background: #ecf0f1; border-right: 1px dashed #bdc3c7; 
    display: flex; align-items: center; justify-content: center;
}
.avatar-vazio { width: 45px; height: 45px; opacity: 0.3; filter: grayscale(100%); }

.vazio-dados { align-items: center; text-align: center; padding: 5px; flex: 1; }
.titulo-vazio { font-weight: 800; color: #7f8c8d; text-transform: uppercase; font-size: 0.85em; }
.subtitulo-vazio { font-size: 0.65em; color: #95a5a6; margin-top: 2px; }

.vazio-rodape { background: #ecf0f1; border-top: 1px dashed #bdc3c7; color: #95a5a6; }

@media (max-width: 600px) {
    .slots-funcionarios { flex-direction: column; }
    .slot-wrapper { max-width: 100%; margin-bottom: 15px; }
    /* No celular, o botão X fica sempre visível, pois não tem "mouse hover" */
    .btn-remove-card { opacity: 1; }
}

/* --- FIM DA SUBSTITUIÇÃO --- */
</style>