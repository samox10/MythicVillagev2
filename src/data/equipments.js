// src/data/equipments.js

export const PROJETOS_FORJA = [
  {
    id: 'armadura_ferro',
    nome: 'Armadura de Ferro Fundido',
    tipo: 'Armadura',
    level: 15,
    tempoBase: 20, 
    img: '/assets/itens/armadura_ferro.png',
    bonusNivel10: 'Dano aumentado em 15% contra Chefes de Mundo (World Boss).',
    stats: [
      { id: 'def_fisica', nome: 'Defesa Física', min: 50, max: 70, icone: '/assets/icons/stat_def_fisica.png' },
      { id: 'vida', nome: 'Vida', min: 100, max: 150, icone: '/assets/icons/stat_vida.png' }
    ],
    custo: [
      { id: 'ferro', tipo: 'inventario', nome: 'Ferro', qtd: 50, img: '/assets/recursos/min_ferro.png' },
      { id: 'goldCoin', tipo: 'recurso', nome: 'Ouro', qtd: 500, img: '/assets/ui/i_tesoureiro.png' }
    ]
  },
  {
    id: 'espada_divina',
    nome: 'Espada Longa',
    tipo: 'Arma',
    level: 25,
    tempoBase: 45, 
    img: '/assets/itens/espada_longa.png',
    bonusNivel10: 'Dano aumentado em 15% contra Chefes de Mundo (World Boss).',
    stats: [
      // Aqui os atributos foram fundidos para o padrão clássico de RPG
      { id: 'atk_fisico', nome: 'Ataque Físico', min: 10, max: 28, icone: '/assets/icons/stat_atk.png' },
      { id: 'atk_magico', nome: 'Ataque Mágico', min: 5, max: 18, icone: '/assets/icons/stat_atk_magico.png' },
      { id: 'crit_chance', nome: 'Chance Crítico', min: 2, max: 5, icone: '/assets/icons/stat_crit.png' }
    ],
    custo: [
      { id: 'obsidiana', tipo: 'inventario', nome: 'Obsidiana', qtd: 30, img: '/assets/recursos/min_aco.png' },
      { id: 'goldCoin', tipo: 'recurso', nome: 'Ouro', qtd: 1200, img: '/assets/ui/i_tesoureiro.png' }
    ]
  },
  {
    id: 'espada_divin2a',
    nome: 'Espada Longa',
    tipo: 'Arma',
    level: 25,
    tempoBase: 45, 
    img: '/assets/itens/espada_longa.png',
    bonusNivel10: 'Dano aumentado em 15% contra Chefes de Mundo (World Boss).',
    stats: [
      // Aqui os atributos foram fundidos para o padrão clássico de RPG
      { id: 'atk_fisico', nome: 'Ataque Físico', min: 10, max: 28, icone: '/assets/icons/stat_atk.png' },
      { id: 'atk_magico', nome: 'Ataque Mágico', min: 5, max: 18, icone: '/assets/icons/stat_atk_magico.png' },
      { id: 'crit_chance', nome: 'Chance Crítico', min: 2, max: 5, icone: '/assets/icons/stat_crit.png' }
    ],
    custo: [
      { id: 'obsidiana', tipo: 'inventario', nome: 'Obsidiana', qtd: 30, img: '/assets/recursos/min_aco.png' },
      { id: 'goldCoin', tipo: 'recurso', nome: 'Ouro', qtd: 1200, img: '/assets/ui/i_tesoureiro.png' }
    ]
  },
  {
    id: 'espada_divina3',
    nome: 'Espada Longa',
    tipo: 'Arma',
    level: 25,
    tempoBase: 45, 
    img: '/assets/itens/espada_longa.png',
    bonusNivel10: 'Dano aumentado em 15% contra Chefes de Mundo (World Boss).',
    stats: [
      // Aqui os atributos foram fundidos para o padrão clássico de RPG
      { id: 'atk_fisico', nome: 'Ataque Físico', min: 10, max: 28, icone: '/assets/icons/stat_atk.png' },
      { id: 'atk_magico', nome: 'Ataque Mágico', min: 5, max: 18, icone: '/assets/icons/stat_atk_magico.png' },
      { id: 'crit_chance', nome: 'Chance Crítico', min: 2, max: 5, icone: '/assets/icons/stat_crit.png' }
    ],
    custo: [
      { id: 'obsidiana', tipo: 'inventario', nome: 'Obsidiana', qtd: 30, img: '/assets/recursos/min_aco.png' },
      { id: 'goldCoin', tipo: 'recurso', nome: 'Ouro', qtd: 1200, img: '/assets/ui/i_tesoureiro.png' }
    ]
  },
  {
    id: 'espada_divina4',
    nome: 'Espada Longa',
    tipo: 'Arma',
    level: 25,
    tempoBase: 45, 
    img: '/assets/itens/espada_longa.png',
    bonusNivel10: 'Dano aumentado em 15% contra Chefes de Mundo (World Boss).',
    stats: [
      // Aqui os atributos foram fundidos para o padrão clássico de RPG
      { id: 'atk_fisico', nome: 'Ataque Físico', min: 10, max: 28, icone: '/assets/icons/stat_atk.png' },
      { id: 'atk_magico', nome: 'Ataque Mágico', min: 5, max: 18, icone: '/assets/icons/stat_atk_magico.png' },
      { id: 'crit_chance', nome: 'Chance Crítico', min: 2, max: 5, icone: '/assets/icons/stat_crit.png' }
    ],
    custo: [
      { id: 'obsidiana', tipo: 'inventario', nome: 'Obsidiana', qtd: 30, img: '/assets/recursos/min_aco.png' },
      { id: 'goldCoin', tipo: 'recurso', nome: 'Ouro', qtd: 1200, img: '/assets/ui/i_tesoureiro.png' }
    ]
  },
  {
    id: 'espada_divina5',
    nome: 'Espada Longa',
    tipo: 'Arma',
    level: 25,
    tempoBase: 45, 
    img: '/assets/itens/espada_longa.png',
    bonusNivel10: 'Dano aumentado em 15% contra Chefes de Mundo (World Boss).',
    stats: [
      // Aqui os atributos foram fundidos para o padrão clássico de RPG
      { id: 'atk_fisico', nome: 'Ataque Físico', min: 10, max: 28, icone: '/assets/icons/stat_atk.png' },
      { id: 'atk_magico', nome: 'Ataque Mágico', min: 5, max: 18, icone: '/assets/icons/stat_atk_magico.png' },
      { id: 'crit_chance', nome: 'Chance Crítico', min: 2, max: 5, icone: '/assets/icons/stat_crit.png' }
    ],
    custo: [
      { id: 'obsidiana', tipo: 'inventario', nome: 'Obsidiana', qtd: 30, img: '/assets/recursos/min_aco.png' },
      { id: 'goldCoin', tipo: 'recurso', nome: 'Ouro', qtd: 1200, img: '/assets/ui/i_tesoureiro.png' }
    ]
  },
  {
    id: 'espada_divina6',
    nome: 'Espada Longa',
    tipo: 'Arma',
    level: 25,
    tempoBase: 45, 
    img: '/assets/itens/espada_longa.png',
    bonusNivel10: 'Dano aumentado em 15% contra Chefes de Mundo (World Boss).',
    stats: [
      // Aqui os atributos foram fundidos para o padrão clássico de RPG
      { id: 'atk_fisico', nome: 'Ataque Físico', min: 10, max: 28, icone: '/assets/icons/stat_atk.png' },
      { id: 'atk_magico', nome: 'Ataque Mágico', min: 5, max: 18, icone: '/assets/icons/stat_atk_magico.png' },
      { id: 'crit_chance', nome: 'Chance Crítico', min: 2, max: 5, icone: '/assets/icons/stat_crit.png' },
      { id: 'atk_elemental', nome: 'Ataque Elemental', min: 3, max: 10, icone: '/assets/icons/stat_atk_elemental.png' },
      { id: 'res_elemental', nome: 'Resistência Elemental', min: 2, max: 8, icone: '/assets/icons/stat_res_elemental.png' },
      { id: 'atk_velocidade', nome: 'Velocidade de Ataque', min: 1, max: 4, icone: '/assets/icons/stat_atk_velocidade.png' },
      { id: 'atk_penetracao', nome: 'Penetração de Ataque', min: 2, max: 6, icone: '/assets/icons/stat_atk_penetracao.png' },
      { id: 'atk_sangramento', nome: 'Dano de Sangramento', min: 4, max: 12, icone: '/assets/icons/stat_atk_sangramento.png' },
    ],
    custo: [
      { id: 'obsidiana', tipo: 'inventario', nome: 'Obsidiana', qtd: 30, img: '/assets/recursos/min_obsidiana.png' },
      { id: 'ferro', tipo: 'inventario', nome: 'Ferro', qtd: 50, img: '/assets/recursos/min_ferro.png' },
      { id: 'goldCoin', tipo: 'recurso', nome: 'Ouro', qtd: 1200, img: '/assets/ui/i_tesoureiro.png' },
      { id: 'cristal', tipo: 'inventario', nome: 'Cristal', qtd: 40, img: '/assets/recursos/min_cristal.png' },
    ]
  },
  {
    id: 'espada_divin7a',
    nome: 'Espada Longa',
    tipo: 'Arma',
    level: 25,
    tempoBase: 45, 
    img: '/assets/itens/espada_longa.png',
    bonusNivel10: 'Dano aumentado em 15% contra Chefes de Mundo (World Boss).',
    stats: [
      // Aqui os atributos foram fundidos para o padrão clássico de RPG
      { id: 'atk_fisico', nome: 'Ataque Físico', min: 10, max: 28, icone: '/assets/icons/stat_atk.png' },
      { id: 'atk_magico', nome: 'Ataque Mágico', min: 5, max: 18, icone: '/assets/icons/stat_atk_magico.png' },
      { id: 'crit_chance', nome: 'Chance Crítico', min: 2, max: 5, icone: '/assets/icons/stat_crit.png' }
    ],
    custo: [
      { id: 'obsidiana', tipo: 'inventario', nome: 'Obsidiana', qtd: 30, img: '/assets/recursos/min_aco.png' },
      { id: 'goldCoin', tipo: 'recurso', nome: 'Ouro', qtd: 1200, img: '/assets/ui/i_tesoureiro.png' }
    ]
  }
]