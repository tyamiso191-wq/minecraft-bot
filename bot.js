const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoalNear, GoalFollow } = goals
const Groq = require('groq-sdk')

const config = {
  host: 'mc.quiltanarchy.xyz',
  port: 25565,
  username: 'MisotyBot',
  version: '1.20.1',
  owner: 'Misoty',
  groqApiKey: 'GROQ_API_KEY_BURAYA',
  password: 'Egecan11'
}

const groq = new Groq({ apiKey: config.groqApiKey })
const sohbetGecmisi = []

async function botYanit(mesaj) {
  sohbetGecmisi.push({ role: 'user', content: mesaj })
  if (sohbetGecmisi.length > 20) sohbetGecmisi.splice(0, 2)
  const yanit = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    max_tokens: 150,
    messages: [
      { role: 'system', content: 'Sen "MisotyBot" adinda eglenceli bir Minecraft botusun. Sahibin Misoty. Kisa ve samimi Turkce cevaplar ver. Cevaplarin 200 karakteri gecmesin.' },
      ...sohbetGecmisi
    ]
  })
  const metin = yanit.choices[0].message.content
  sohbetGecmisi.push({ role: 'assistant', content: metin })
  return metin
}

const bot = mineflayer.createBot(config)
bot.loadPlugin(pathfinder)

let collecting = false
let attacking = false
let attackInterval = null
let registered = false

// =============================
//   TAKILMA ÖNLEME
// =============================
let lastPos = null
let stuckTicks = 0

setInterval(() => {
  if (!bot.entity) return
  const pos = bot.entity.position
  if (lastPos) {
    const dist = pos.distanceTo(lastPos)
    const isMoving = bot.pathfinder.isMoving ? bot.pathfinder.isMoving() : true
    if (isMoving && dist < 0.05) {
      stuckTicks++
      if (stuckTicks >= 3) {
        bot.setControlState('jump', true)
        setTimeout(() => bot.setControlState('jump', false), 400)
        const yaw = Math.random() * Math.PI * 2
        bot.entity.yaw = yaw
        bot.setControlState('forward', true)
        setTimeout(() => bot.setControlState('forward', false), 600)
        stuckTicks = 0
        console.log('Takildi, ziplandı')
      }
    } else {
      stuckTicks = 0
    }
  }
  lastPos = pos.clone()
}, 1000)

// =============================
//   OTOMATİK KAYIT / GİRİŞ
// =============================
bot.on('message', (jsonMsg) => {
  const msg = jsonMsg.toString().toLowerCase()
  if (msg.includes('register') || msg.includes('kayit') || msg.includes('/register')) {
    if (!registered) {
      setTimeout(() => {
        bot.chat(`/register ${config.password} ${config.password}`)
        registered = true
        console.log('/register gonderildi')
      }, 1000)
    }
  }
  if (msg.includes('login') || msg.includes('giris') || msg.includes('/login') || msg.includes('please login')) {
    setTimeout(() => {
      bot.chat(`/login ${config.password}`)
      console.log('/login gonderildi')
    }, 1000)
  }
})

bot.on('spawn', () => {
  console.log('Bot baglandi!')
  setTimeout(() => { bot.chat(`/login ${config.password}`) }, 2000)
  setTimeout(() => autoArmor(), 3000)
  const defaultMov = new Movements(bot)
  defaultMov.canDig = false
  defaultMov.allowParkour = true
  defaultMov.allowSprinting = true
  defaultMov.maxDropDown = 4
  bot.pathfinder.setMovements(defaultMov)
})

// =============================
//   AUTO TOTEM
// =============================
bot.on('health', () => { autoTotem() })

function autoTotem() {
  const offhand = bot.inventory.slots[45]
  if (offhand && offhand.name === 'totem_of_undying') return
  const totem = bot.inventory.items().find(item => item.name === 'totem_of_undying')
  if (!totem) return
  bot.equip(totem, 'off-hand').catch(() => {})
}

// =============================
//   AUTO ARMOR
// =============================
async function autoArmor() {
  const armorSlots = {
    'head':  ['netherite_helmet','diamond_helmet','iron_helmet','golden_helmet','chainmail_helmet','leather_helmet'],
    'torso': ['netherite_chestplate','diamond_chestplate','iron_chestplate','golden_chestplate','chainmail_chestplate','leather_chestplate'],
    'legs':  ['netherite_leggings','diamond_leggings','iron_leggings','golden_leggings','chainmail_leggings','leather_leggings'],
    'feet':  ['netherite_boots','diamond_boots','iron_boots','golden_boots','chainmail_boots','leather_boots'],
  }
  for (const [slot, items] of Object.entries(armorSlots)) {
    for (const itemName of items) {
      const item = bot.inventory.items().find(i => i.name === itemName)
      if (item) {
        try { await bot.equip(item, slot); console.log(`${itemName} giyildi (${slot})`); break } catch (e) {}
      }
    }
  }
}

// =============================
//   ÇERÇEVE DUPE
// =============================
let dupeCalisiyor = false

async function cerceveDupe() {
  if (dupeCalisiyor) { bot.chat('Dupe zaten calisiyor!'); return }
  const cerceve = bot.findBlock({
    matching: (b) => b.name === 'item_frame' || b.name === 'glow_item_frame',
    maxDistance: 6
  })
  if (!cerceve) { bot.chat('Yakinda item frame bulamadim!'); return }
  dupeCalisiyor = true
  try {
    await bot.lookAt(cerceve.position.offset(0.5, 0.5, 0.5))
    await new Promise(r => setTimeout(r, 150))
    await bot.activateBlock(cerceve)
    await new Promise(r => setTimeout(r, 300))
    await bot.activateBlock(cerceve)
  } catch (e) {
    console.log('Dupe hatasi:', e.message)
  } finally {
    dupeCalisiyor = false
  }
}

// =============================
//   MESAJ DİNLEYİCİ
// =============================
bot.on('chat', async (username, message) => {
  if (username === bot.username) return
  if (username !== config.owner) return
  const msg = message.trim()

  if (msg.startsWith('!')) {
    const args = msg.slice(1).trim().split(' ')
    const komut = args[0].toLowerCase()

    switch (komut) {

      case 'topla':
        if (!args[1]) { bot.chat('Kullanim: !topla <kaynak>'); break }
        topla(args[1]); break

      case 'dur':
        collecting = false; attacking = false
        clearInterval(attackInterval)
        bot.pathfinder.stop()
        bot.chat('Durdum.'); break

      case 'saldir':
        if (!args[1]) { bot.chat('Kullanim: !saldir <oyuncu>'); break }
        saldir(args[1]); break

      case 'gel': {
        const p = bot.players[username]
        if (!p?.entity) { bot.chat('Seni goremiyorum!'); break }
        bot.chat('Geliyorum!')
        const mov = new Movements(bot)
        mov.allowParkour = true; mov.allowSprinting = true
        bot.pathfinder.setMovements(mov)
        bot.pathfinder.setGoal(new GoalNear(p.entity.position.x, p.entity.position.y, p.entity.position.z, 2))
        break
      }

      case 'takip': {
        const hedefAdi = args[1] || username
        const hp = bot.players[hedefAdi]
        if (!hp?.entity) { bot.chat(`${hedefAdi} bulunamadi!`); break }
        bot.chat(`${hedefAdi} takip ediyorum!`)
        const mov = new Movements(bot)
        mov.allowParkour = true; mov.allowSprinting = true
        bot.pathfinder.setMovements(mov)
        bot.pathfinder.setGoal(new GoalFollow(hp.entity, 3), true); break
      }

      case 'envanter': {
        const items = bot.inventory.items()
        bot.chat(items.length === 0 ? 'Envanterim bos.' : 'Envanter: ' + items.map(i => `${i.name} x${i.count}`).join(', '))
        break
      }

      case 'tpa':
        bot.chat(`/tpa ${config.owner}`)
        bot.chat(`${config.owner} oyuncusuna TPA attim!`)
        break

      case 'zirh':
        await autoArmor()
        bot.chat('Zirhlari giydim!')
        break

      case 'totem':
        autoTotem()
        bot.chat('Totemi offhanda aldim!')
        break

      case 'dupe':
        await cerceveDupe()
        break

      case 'sifirla':
        sohbetGecmisi.length = 0
        bot.chat('Sohbet hafizami temizledim!'); break

      case 'yardim':
        bot.chat('Komutlar: !topla | !saldir | !takip | !gel | !tpa | !zirh | !totem | !dupe | !envanter | !dur | !sifirla')
        break

      default:
        try {
          const yanit = await botYanit(msg.slice(1).trim())
          bot.chat(yanit.length <= 256 ? yanit : yanit.substring(0, 253) + '...')
        } catch (e) {
          console.error('Groq hatasi:', e.message)
          bot.chat('Su an konusamiyorum.')
        }
    }
    return
  }

  // ! yoksa sohbet
  try {
    const yanit = await botYanit(msg)
    bot.chat(yanit.length <= 256 ? yanit : yanit.substring(0, 253) + '...')
  } catch (e) {
    console.error('Groq hatasi:', e.message)
    bot.chat('Su an konusamiyorum.')
  }
})

// =============================
//   KAYNAK TOPLAMA
// =============================
async function aletEkip(blokAdi) {
  const kazmaBloklari = ['stone','cobblestone','coal_ore','deepslate_coal_ore','iron_ore','deepslate_iron_ore',
    'gold_ore','deepslate_gold_ore','diamond_ore','deepslate_diamond_ore','redstone_ore','deepslate_redstone_ore',
    'lapis_ore','deepslate_lapis_ore','gravel','sand']
  const baltaBloklari = ['oak_log','birch_log','spruce_log','jungle_log','acacia_log','dark_oak_log','mangrove_log']
  const kurekBloklari = ['dirt','grass_block']

  let aletSiralama = []
  if (kazmaBloklari.includes(blokAdi))
    aletSiralama = ['netherite_pickaxe','diamond_pickaxe','iron_pickaxe','stone_pickaxe','wooden_pickaxe','golden_pickaxe']
  else if (baltaBloklari.includes(blokAdi))
    aletSiralama = ['netherite_axe','diamond_axe','iron_axe','stone_axe','wooden_axe','golden_axe']
  else if (kurekBloklari.includes(blokAdi))
    aletSiralama = ['netherite_shovel','diamond_shovel','iron_shovel','stone_shovel','wooden_shovel','golden_shovel']

  for (const aletAdi of aletSiralama) {
    const alet = bot.inventory.items().find(i => i.name === aletAdi)
    if (alet) {
      try { await bot.equip(alet, 'hand') } catch(e) {}
      return
    }
  }
}

async function yerdekiEsyalariTopla() {
  const itemlar = Object.values(bot.entities).filter(e =>
    e.name === 'item' && e.position.distanceTo(bot.entity.position) < 8
  )
  for (const item of itemlar) {
    if (!collecting) break
    try {
      await bot.pathfinder.goto(new GoalNear(item.position.x, item.position.y, item.position.z, 1))
      await new Promise(r => setTimeout(r, 200))
    } catch(e) {}
  }
}

async function topla(kaynak) {
  const kaynakMap = {
    'odun':    ['oak_log','birch_log','spruce_log','jungle_log','acacia_log','dark_oak_log','mangrove_log'],
    'tas':     ['stone','cobblestone'],
    'komur':   ['coal_ore','deepslate_coal_ore'],
    'demir':   ['iron_ore','deepslate_iron_ore'],
    'altin':   ['gold_ore','deepslate_gold_ore'],
    'elmas':   ['diamond_ore','deepslate_diamond_ore'],
    'redstone':['redstone_ore','deepslate_redstone_ore'],
    'lapis':   ['lapis_ore','deepslate_lapis_ore'],
    'toprak':  ['dirt','grass_block'],
    'kum':     ['sand'],
    'cakil':   ['gravel'],
  }

  const bloklar = kaynakMap[kaynak.toLowerCase()]
  if (!bloklar) {
    bot.chat(`"${kaynak}" tanimiyor. Bilinen: ${Object.keys(kaynakMap).join(', ')}`)
    return
  }

  collecting = true
  bot.chat(`${kaynak} toplamaya basliyorum!`)
  let bulamadiSayac = 0

  while (collecting) {
    let hedefBlok = null
    for (const mesafe of [32, 64]) {
      for (const blokAdi of bloklar) {
        const id = bot.registry.blocksByName[blokAdi]?.id
        if (!id) continue
        const b = bot.findBlock({ matching: id, maxDistance: mesafe })
        if (b) { hedefBlok = b; break }
      }
      if (hedefBlok) break
    }

    if (!hedefBlok) {
      bulamadiSayac++
      if (bulamadiSayac >= 3) {
        bot.chat(`Yakinda ${kaynak} bulamadim, duruyorum.`)
        collecting = false
        break
      }
      bot.setControlState('forward', true)
      await new Promise(r => setTimeout(r, 1500))
      bot.setControlState('forward', false)
      await new Promise(r => setTimeout(r, 300))
      continue
    }

    bulamadiSayac = 0

    try {
      await aletEkip(hedefBlok.name)
      await bot.pathfinder.goto(new GoalNear(hedefBlok.position.x, hedefBlok.position.y, hedefBlok.position.z, 1))
      if (bot.canDigBlock(hedefBlok)) await bot.dig(hedefBlok)
      await new Promise(r => setTimeout(r, 300))
      await yerdekiEsyalariTopla()
    } catch (e) {
      console.log('Toplama hatasi:', e.message)
    }

    await new Promise(r => setTimeout(r, 150))
  }
}

// =============================
//   SALDIRI
// =============================
function saldir(hedefAdi) {
  attacking = false; clearInterval(attackInterval)
  if (!bot.players[hedefAdi]?.entity) { bot.chat(`${hedefAdi} bulunamadi!`); return }
  bot.chat(`${hedefAdi} saldiriyorum!`)
  attacking = true
  const mov = new Movements(bot)
  mov.allowParkour = true; mov.allowSprinting = true
  bot.pathfinder.setMovements(mov)
  attackInterval = setInterval(() => {
    if (!attacking) { clearInterval(attackInterval); return }
    const hedef = bot.players[hedefAdi]?.entity
    if (!hedef) { bot.chat(`${hedefAdi} kayboldu.`); attacking = false; clearInterval(attackInterval); return }
    bot.pathfinder.setGoal(new GoalNear(hedef.position.x, hedef.position.y, hedef.position.z, 2), true)
    if (bot.entity.position.distanceTo(hedef.position) <= 3.5) bot.attack(hedef)
  }, 500)
}

// =============================
//   HATALAR
// =============================
bot.on('error', err => console.log('Hata:', err))
bot.on('end', () => {
  console.log('Baglanti kesildi, yeniden baglaniliyor...')
  registered = false
  setTimeout(() => process.exit(1), 5000)
})
